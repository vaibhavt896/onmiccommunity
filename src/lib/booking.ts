import "server-only";
import { randomInt, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { isUniqueViolation, query, tx } from "./db";
import { bookedCount, currentJamRow, type JamRow } from "./jam";
import { passToken, passUrl, tokenHash } from "./token";
import type { BookingState, PassView, Tier } from "./types";
import { passLabel } from "./format";
import { WHATSAPP_URL } from "./public-config";
import { noteExpired } from "./sheets";

export const HOLD_MINUTES = 10;
const ACTIVE = `('HELD','PAID_PENDING','CONFIRMED','CHECKED_IN')`;

export type BookingRow = {
  id: string;
  jam_id: string;
  pass_no: string;
  name: string;
  phone: string;
  instagram: string;
  tier: Tier;
  state: BookingState;
  hold_expires_at: Date | null;
  utr: string | null;
  amount_inr: number;
  token_rev: number;
  utm_source: string | null;
  created_at: Date;
  utr_submitted_at: Date | null;
  confirmed_at: Date | null;
  checked_in_at: Date | null;
};

export class BookingError extends Error {
  constructor(public code: string, message: string, public status = 409) {
    super(message);
  }
}

const PASS_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

async function newPassNo(c: PoolClient, jamId: string): Promise<string> {
  for (;;) {
    const p = Array.from({ length: 5 }, () => PASS_ALPHABET[randomInt(PASS_ALPHABET.length)]).join("");
    const { rowCount } = await c.query("select 1 from booking where jam_id = $1 and pass_no = $2", [jamId, p]);
    if (!rowCount) return p;
  }
}

async function expireStaleHolds(c: PoolClient, jamId: string) {
  const { rows } = await c.query<{ id: string }>(
    `update booking set state = 'EXPIRED'
      where jam_id = $1 and state = 'HELD' and hold_expires_at <= now() returning id`,
    [jamId],
  );
  noteExpired(rows.map((r) => r.id));
}

async function assertPhoneFree(c: PoolClient, jamId: string, phone: string, exceptId?: string) {
  const { rows } = await c.query<{ state: BookingState }>(
    `select state from booking where jam_id = $1 and phone = $2 and state in ${ACTIVE}
       and ($3::uuid is null or id <> $3::uuid) limit 1`,
    [jamId, phone, exceptId ?? null],
  );
  if (!rows[0]) return;
  if (rows[0].state === "HELD") {
    throw new BookingError("phone_held", "This number already has a seat on hold. Finish paying for it, or try again in 10 minutes.");
  }
  throw new BookingError("phone_taken", "This number already has a seat for this jam. Each friend books their own seat with their own number.");
}

/**
 * POST /api/booking/hold. The jam row is locked FOR UPDATE, so holds are
 * serialised per jam: two people can never both take the last seat.
 */
export async function createHold(input: {
  name: string;
  phone: string;
  instagram: string;
  utm: { source: string | null; medium: string | null; campaign: string | null };
}) {
  return tx(async (c) => {
    const jam = await currentJamRow(c, true);
    if (!jam || jam.status !== "open" || Date.now() >= jam.booking_cutoff_at.getTime()) {
      throw new BookingError("closed", "Bookings for this jam are closed.");
    }
    await expireStaleHolds(c, jam.id);
    if ((await bookedCount(jam.id, c)) >= jam.seat_capacity) {
      throw new BookingError("sold_out", "Sold out. Every seat is taken. Join the waitlist instead.");
    }
    await assertPhoneFree(c, jam.id, input.phone);

    const id = randomUUID();
    const passNo = await newPassNo(c, jam.id);
    const token = passToken(id, 0);
    const { rows } = await c.query<{ hold_expires_at: Date }>(
      `insert into booking (id, jam_id, pass_no, name, phone, instagram, amount_inr,
                            pass_token_hash, hold_expires_at, utm_source, utm_medium, utm_campaign)
       values ($1, $2, $3, $4, $5, $6, $7, $8, now() + make_interval(mins => $9), $10, $11, $12)
       returning hold_expires_at`,
      [id, jam.id, passNo, input.name, input.phone, input.instagram, jam.price_inr, tokenHash(token),
       HOLD_MINUTES, input.utm.source, input.utm.medium, input.utm.campaign],
    );
    return {
      id,
      token,
      passNo,
      amount: jam.price_inr,
      holdExpiresAt: rows[0].hold_expires_at.toISOString(),
    };
  });
}

async function bookingByToken(token: string, c?: PoolClient, lock = false): Promise<BookingRow | null> {
  const sql = `select * from booking where pass_token_hash = $1 ${lock ? "for update" : ""}`;
  const rows = c ? (await c.query<BookingRow>(sql, [tokenHash(token)])).rows : await query<BookingRow>(sql, [tokenHash(token)]);
  return rows[0] ?? null;
}

/** POST /api/booking/submit-utr: HELD → PAID_PENDING. */
export async function submitUtr(token: string, utr: string): Promise<{ state: BookingState }> {
  try {
    return await tx(async (c) => {
      const peek = await bookingByToken(token, c);
      if (!peek) throw new BookingError("not_found", "We couldn't find that booking.", 404);
      // Lock order is always jam → booking, same as createHold.
      const { rows: jr } = await c.query<JamRow>("select * from jam where id = $1 for update", [peek.jam_id]);
      const jam = jr[0];
      const b = (await bookingByToken(token, c, true))!;

      if (["PAID_PENDING", "CONFIRMED", "CHECKED_IN"].includes(b.state)) {
        if (b.utr === utr) return { state: b.state };
        throw new BookingError("already_submitted", "A payment reference is already attached to this booking.");
      }
      if (b.state === "REJECTED" || b.state === "CANCELLED") {
        throw new BookingError("not_allowed", "This booking was closed by the core team. Message us on WhatsApp if that's a mistake.");
      }

      const heldAndLive = b.state === "HELD" && b.hold_expires_at && b.hold_expires_at.getTime() > Date.now();
      if (!heldAndLive) {
        // The timer ran out. If a seat is still free, let the payment count.
        await expireStaleHolds(c, jam.id);
        const free = (await bookedCount(jam.id, c)) < jam.seat_capacity;
        if (!free) {
          throw new BookingError("hold_expired",
            "Your 10-minute hold ran out and the seat went to someone else. If you already paid, message us on WhatsApp with your UTR and we'll sort it.");
        }
        await assertPhoneFree(c, jam.id, b.phone, b.id);
      }

      await c.query(
        `update booking set state = 'PAID_PENDING', utr = $2, utr_submitted_at = now(), hold_expires_at = null
          where id = $1`,
        [b.id, utr],
      );
      return { state: "PAID_PENDING" as const };
    });
  } catch (e) {
    if (isUniqueViolation(e, "booking_utr_key")) {
      throw new BookingError("utr_used", "That UTR has already been used for a booking. Double-check the 12-digit number in your UPI app.");
    }
    throw e;
  }
}

/** GET /api/pass/[token]. The venue is attached only for CONFIRMED / CHECKED_IN. */
export async function passView(token: string): Promise<PassView | null> {
  const rows = await query<BookingRow & { title: string; starts_at: Date; venue_name: string; venue_map_url: string }>(
    `select b.*, j.title, j.starts_at, j.venue_name, j.venue_map_url
       from booking b join jam j on j.id = b.jam_id
      where b.pass_token_hash = $1`,
    [tokenHash(token)],
  );
  const r = rows[0];
  if (!r) return null;
  let state = r.state;
  if (state === "HELD" && r.hold_expires_at && r.hold_expires_at.getTime() <= Date.now()) state = "EXPIRED";
  const verified = state === "CONFIRMED" || state === "CHECKED_IN";
  return {
    state,
    name: r.name,
    passNo: r.pass_no,
    tier: r.tier,
    amount: r.amount_inr,
    holdExpiresAt: state === "HELD" ? r.hold_expires_at!.toISOString() : null,
    checkedInAt: r.checked_in_at ? r.checked_in_at.toISOString() : null,
    jam: { title: r.title, startsAt: r.starts_at.toISOString() },
    venue: verified ? { name: r.venue_name, mapUrl: r.venue_map_url } : null,
  };
}

// ---------------------------------------------------------------- admin

export function whatsappLink(b: Pick<BookingRow, "id" | "name" | "phone" | "pass_no" | "token_rev">): string {
  const url = passUrl(passToken(b.id, b.token_rev));
  const text = `Hey ${b.name.split(" ")[0]}! Your On Mic pass is confirmed (${passLabel(b.pass_no)}). ` +
    `Open it here, the venue is inside: ${url}\nShow the QR at the door. Join the community: ${WHATSAPP_URL}\nSee you there!`;
  return `https://wa.me/91${b.phone}?text=${encodeURIComponent(text)}`;
}

async function transition(id: string, from: BookingState[], to: BookingState, extra = ""): Promise<BookingRow> {
  const rows = await query<BookingRow>(
    `update booking set state = $2 ${extra} where id = $1 and state = any($3) returning *`,
    [id, to, from],
  );
  if (!rows[0]) throw new BookingError("bad_state", "That booking has already changed. Refresh and try again.");
  return rows[0];
}

export const approve = (id: string) => transition(id, ["PAID_PENDING"], "CONFIRMED", ", confirmed_at = now()");
export const reject = (id: string) => transition(id, ["PAID_PENDING"], "REJECTED");
export const cancel = (id: string) => transition(id, ["CONFIRMED"], "CANCELLED");

/** Regenerates the pass token. The old link and QR stop working at once. */
export async function rotateToken(id: string): Promise<BookingRow> {
  const cur = await query<{ token_rev: number }>("select token_rev from booking where id = $1", [id]);
  if (!cur[0]) throw new BookingError("not_found", "No such booking.", 404);
  const rev = cur[0].token_rev + 1;
  const rows = await query<BookingRow>(
    "update booking set token_rev = $2, pass_token_hash = $3 where id = $1 returning *",
    [id, rev, tokenHash(passToken(id, rev))],
  );
  return rows[0];
}

/** Comp pass for core team, performers and special guests. Confirmed at once. */
export async function issuePass(input: { name: string; phone: string; tier: Tier }): Promise<BookingRow> {
  try {
    return await tx(async (c) => {
      const jam = await currentJamRow(c, true);
      if (!jam) throw new BookingError("no_jam", "Create a jam first.");
      await expireStaleHolds(c, jam.id);
      await assertPhoneFree(c, jam.id, input.phone);
      const id = randomUUID();
      const { rows } = await c.query<BookingRow>(
        `insert into booking (id, jam_id, pass_no, name, phone, tier, state, amount_inr, pass_token_hash, confirmed_at)
         values ($1, $2, $3, $4, $5, $6, 'CONFIRMED', 0, $7, now()) returning *`,
        [id, jam.id, await newPassNo(c, jam.id), input.name, input.phone, input.tier, tokenHash(passToken(id, 0))],
      );
      return rows[0];
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw new BookingError("phone_taken", "This number already has a seat for this jam.");
    throw e;
  }
}

// ---------------------------------------------------------------- door

export type ScanResult =
  | { result: "VERIFIED"; name: string; tier: Tier; passNo: string }
  | { result: "ALREADY_USED"; name: string; tier: Tier; passNo: string; firstScanAt: string }
  | { result: "INVALID"; reason: string };

/** Accepts the QR payload (token or a pass URL) or a typed pass number. */
function parseScanInput(raw: string): { token?: string; passNo?: string } {
  const s = raw.trim();
  const fromUrl = s.match(/\/pass\/([A-Za-z0-9_-]{32})/);
  if (fromUrl) return { token: fromUrl[1] };
  if (/^[A-Za-z0-9_-]{32}$/.test(s)) return { token: s };
  const p = s.toUpperCase().replace(/^#?OM-?/, "").replace(/[^A-Z0-9]/g, "");
  return p.length === 5 ? { passNo: p } : {};
}

export async function doorScan(raw: string, staffId: string): Promise<ScanResult> {
  const jam = await currentJamRow();
  const parsed = parseScanInput(raw);
  let b: BookingRow | undefined;
  if (jam && parsed.token) {
    b = (await query<BookingRow>("select * from booking where pass_token_hash = $1", [tokenHash(parsed.token)]))[0];
  } else if (jam && parsed.passNo) {
    b = (await query<BookingRow>("select * from booking where jam_id = $1 and pass_no = $2", [jam.id, parsed.passNo]))[0];
  }

  let out: ScanResult;
  if (!jam || !b || b.jam_id !== jam.id) {
    out = { result: "INVALID", reason: b ? "This pass is for a different jam." : "No pass matches this code." };
  } else {
    // One atomic statement: only a CONFIRMED pass can flip, and only once.
    const flipped = await query<BookingRow>(
      `update booking set state = 'CHECKED_IN', checked_in_at = now()
        where id = $1 and state = 'CONFIRMED' returning *`,
      [b.id],
    );
    if (flipped[0]) {
      out = { result: "VERIFIED", name: b.name, tier: b.tier, passNo: b.pass_no };
    } else {
      const now = (await query<BookingRow>("select * from booking where id = $1", [b.id]))[0];
      if (now.state === "CHECKED_IN") {
        out = { result: "ALREADY_USED", name: now.name, tier: now.tier, passNo: now.pass_no, firstScanAt: now.checked_in_at!.toISOString() };
      } else {
        const why: Record<string, string> = {
          HELD: "Payment not submitted.",
          PAID_PENDING: "Payment not verified yet. Ask a core-team member.",
          EXPIRED: "This booking expired unpaid.",
          REJECTED: "Payment was rejected.",
          CANCELLED: "This pass was cancelled.",
        };
        out = { result: "INVALID", reason: why[now.state] ?? "Not a valid pass." };
      }
    }
  }

  await query("insert into scan_log (booking_id, staff_id, result, input) values ($1, $2, $3, $4)", [
    b?.id ?? null, staffId, out.result, raw.slice(0, 200),
  ]);
  return out;
}

export async function doorCounts() {
  const jam = await currentJamRow();
  if (!jam) return { inside: 0, capacity: 0, confirmed: 0 };
  const [r] = await query<{ inside: number; confirmed: number }>(
    `select count(*) filter (where state = 'CHECKED_IN')::int as inside,
            count(*) filter (where state in ('CONFIRMED','CHECKED_IN'))::int as confirmed
       from booking where jam_id = $1`,
    [jam.id],
  );
  return { inside: r.inside, confirmed: r.confirmed, capacity: jam.seat_capacity };
}

// ---------------------------------------------------------------- counter

export async function serveToken(bookingId: string, staffId: string) {
  const b = (await query<BookingRow>("select * from booking where id = $1", [bookingId]))[0];
  if (!b || b.state !== "CHECKED_IN") {
    throw new BookingError("not_checked_in", "This person hasn't been checked in at the door.");
  }
  const ins = await query<{ served_at: Date }>(
    `insert into token_use (booking_id, item, staff_id) values ($1, 'mocktail', $2)
     on conflict (booking_id, item) do nothing returning served_at`,
    [bookingId, staffId],
  );
  if (ins[0]) return { served: true, servedAt: ins[0].served_at.toISOString(), already: false };
  const prev = await query<{ served_at: Date }>(
    "select served_at from token_use where booking_id = $1 and item = 'mocktail'", [bookingId]);
  return { served: true, servedAt: prev[0].served_at.toISOString(), already: true };
}
