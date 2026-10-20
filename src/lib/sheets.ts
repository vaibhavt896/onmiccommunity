import "server-only";
import { createSign } from "node:crypto";
import { query } from "./db";
import { passLabel } from "./format";

/**
 * Copies form data into a Google Sheet through the Sheets API v4, signing a
 * service-account JWT with node:crypto (no dependencies). Postgres stays the
 * source of truth: every call here is best-effort and never throws, so a Sheet
 * problem can never delay or break a visitor's submission.
 *
 *   Waitlist, Performers  append-only rows, as laid out in GOOGLE_SHEET_INTEGRATION.md
 *   Jam Bookings          one row per booking, updated in place as its status changes
 *
 * Without GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY and GOOGLE_SHEET_ID every call is a no-op.
 * Pass links and QR tokens are never written.
 */
type Cfg = { email: string; key: string; sheetId: string };

function cfg(): Cfg | null {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const sheetId = process.env.GOOGLE_SHEET_ID?.trim();
  return email && key && sheetId ? { email, key, sheetId } : null;
}
export const sheetsEnabled = () => cfg() !== null;

// Overridable only so the sync can be tested against a local stand-in for Google.
const TOKEN_URL = () => process.env.GOOGLE_TOKEN_URL || "https://oauth2.googleapis.com/token";
const API = () => process.env.GOOGLE_SHEETS_API || "https://sheets.googleapis.com/v4/spreadsheets";

let cached: { token: string; exp: number } | null = null;

async function accessToken(c: Cfg): Promise<string> {
  if (cached && Date.now() < cached.exp) return cached.token;
  const now = Math.floor(Date.now() / 1000);
  const enc = (v: unknown) => Buffer.from(JSON.stringify(v)).toString("base64url");
  const unsigned = `${enc({ alg: "RS256", typ: "JWT" })}.${enc({
    iss: c.email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })}`;
  const sig = createSign("RSA-SHA256").update(unsigned).sign(c.key).toString("base64url");
  const res = await fetch(TOKEN_URL(), {
    method: "POST",
    signal: AbortSignal.timeout(8000),
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${sig}`,
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed (${res.status})`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: data.access_token, exp: Date.now() + (data.expires_in - 60) * 1000 };
  return cached.token;
}

async function g<T = unknown>(c: Cfg, what: string, path: string, init: { method?: string; json?: unknown } = {}): Promise<T> {
  // A 401 means the cached access token went stale (revoked, or expired early): fetch a fresh one and retry once.
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${API()}/${c.sheetId}${path}`, {
      method: init.method ?? "GET",
      signal: AbortSignal.timeout(8000),
      headers: { authorization: `Bearer ${await accessToken(c)}`, ...(init.json ? { "content-type": "application/json" } : {}) },
      body: init.json ? JSON.stringify(init.json) : undefined,
    });
    if (res.status === 401 && attempt === 0) { cached = null; continue; }
    if (!res.ok) throw new Error(`Sheets ${what} failed (${res.status})`);
    return (await res.json()) as T;
  }
}

/** Stops values starting with = + - @ from being read as formulas if the sheet is exported and opened elsewhere. */
const safe = (v: string) => (/^\s*[=+\-@]/.test(v) ? `'${v}` : v);

const a1 = (tab: string, range: string) => encodeURIComponent(`'${tab.replace(/'/g, "''")}'!${range}`);

async function guarded<T>(fn: (c: Cfg) => Promise<T>): Promise<T | false> {
  const c = cfg();
  if (!c) return false;
  try {
    return await fn(c);
  } catch (e) {
    console.error("[sheets]", e instanceof Error ? e.message : e);
    return false;
  }
}

/** Best-effort append. Never throws. Returns false if not configured or the call failed. */
export const appendRow = async (tab: string, row: string[]): Promise<boolean> =>
  (await guarded(async (c) => {
    await g(c, "append", `/values/${a1(tab, "A:Z")}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
      method: "POST",
      json: { values: [row.map(safe)] },
    });
    return true;
  })) === true;

export const tabs = {
  waitlist: process.env.GOOGLE_SHEET_WAITLIST_TAB?.trim() || "Waitlist",
  performer: process.env.GOOGLE_SHEET_PERFORMER_TAB?.trim() || "Performers",
};

// ------------------------------------------------------------ bookings tab

const BOOKING_HEADERS = [
  "Pass", "Status", "Name", "WhatsApp", "Instagram", "Ticket", "Amount (Rs)", "UTR", "Jam", "Source", "Medium", "Campaign",
  "Booked at (IST)", "UTR sent at (IST)", "Confirmed at (IST)", "Checked in at (IST)", "Mocktail served (IST)", "ID",
];
const ID_COL = "R"; // BOOKING_HEADERS.length === 18

/** Tab name for bookings; GOOGLE_SHEET_BOOKINGS_TAB=off disables the booking mirror. */
const bookingsTab = (): string | null => {
  const t = process.env.GOOGLE_SHEET_BOOKINGS_TAB?.trim() || "Jam Bookings";
  return t.toLowerCase() === "off" ? null : t;
};

const fmt = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
const ist = (d: Date | string | null) => (d ? fmt.format(new Date(d)) : "");

type BookingJoin = {
  id: string; pass_no: string; name: string; phone: string; instagram: string; tier: string; state: string;
  amount_inr: number; utr: string | null; utm_source: string | null; utm_medium: string | null; utm_campaign: string | null;
  created_at: Date; utr_submitted_at: Date | null; confirmed_at: Date | null; checked_in_at: Date | null;
  jam_title: string; jam_starts: Date; mocktail_at: Date | null;
};
const BOOKING_SQL = `
  select b.*, j.title as jam_title, j.starts_at as jam_starts,
         (select served_at from token_use t where t.booking_id = b.id and t.item = 'mocktail') as mocktail_at
    from booking b join jam j on j.id = b.jam_id`;

const bookingRow = (b: BookingJoin): string[] => [
  passLabel(b.pass_no), b.state, b.name, b.phone, b.instagram, b.tier, String(b.amount_inr), b.utr ?? "",
  `${b.jam_title} · ${ist(b.jam_starts)}`, b.utm_source ?? "", b.utm_medium ?? "", b.utm_campaign ?? "",
  ist(b.created_at), ist(b.utr_submitted_at), ist(b.confirmed_at), ist(b.checked_in_at), ist(b.mocktail_at), b.id,
].map(safe);

const readyTabs = new Set<string>();

/** Creates the bookings tab and its header row the first time, so no manual setup is needed. */
async function ensureBookingsTab(c: Cfg, tab: string) {
  if (readyTabs.has(tab)) return;
  const meta = await g<{ sheets?: { properties: { title: string } }[] }>(c, "read tabs", "?fields=sheets.properties.title");
  if (!meta.sheets?.some((s) => s.properties.title === tab)) {
    await g(c, "add tab", ":batchUpdate", {
      method: "POST",
      json: { requests: [{ addSheet: { properties: { title: tab, gridProperties: { frozenRowCount: 1 } } } }] },
    });
  }
  const head = await g<{ values?: string[][] }>(c, "read header", `/values/${a1(tab, "A1:R1")}`);
  if (!head.values?.[0]?.length) {
    await g(c, "write header", `/values/${a1(tab, "A1:R1")}?valueInputOption=RAW`, { method: "PUT", json: { values: [BOOKING_HEADERS] } });
  }
  readyTabs.add(tab);
}

/** Updates each booking's row in place (matched on the ID column) or appends it. */
async function upsertBookings(rows: BookingJoin[]): Promise<boolean> {
  const tab = bookingsTab();
  if (!tab || rows.length === 0) return false;
  return (await guarded(async (c) => {
    await ensureBookingsTab(c, tab);
    const col = await g<{ values?: string[][] }>(c, "read ids", `/values/${a1(tab, `${ID_COL}:${ID_COL}`)}`);
    const at = new Map<string, number>();
    (col.values ?? []).forEach((v, i) => v[0] && at.set(v[0], i + 1));
    const updates: { range: string; values: string[][] }[] = [];
    const fresh: string[][] = [];
    for (const b of rows) {
      const n = at.get(b.id);
      if (n && n > 1) updates.push({ range: `'${tab.replace(/'/g, "''")}'!A${n}:${ID_COL}${n}`, values: [bookingRow(b)] });
      else fresh.push(bookingRow(b));
    }
    if (updates.length) await g(c, "update", "/values:batchUpdate", { method: "POST", json: { valueInputOption: "RAW", data: updates } });
    if (fresh.length) {
      await g(c, "append", `/values/${a1(tab, "A:R")}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, { method: "POST", json: { values: fresh } });
    }
    return true;
  })) === true;
}

async function syncWhere(where: string, params: unknown[]) {
  if (!sheetsEnabled() || !bookingsTab()) return;
  try {
    await upsertBookings(await query<BookingJoin>(`${BOOKING_SQL} where ${where}`, params));
  } catch (e) {
    console.error("[sheets]", e instanceof Error ? e.message : e);
  }
}

export const syncBooking = (id: string) => syncWhere("b.id = $1", [id]);
export const syncBookings = async (ids: string[]) => { if (ids.length) await syncWhere("b.id = any($1::uuid[])", [ids]); };
export const syncBookingByToken = (hash: string) => syncWhere("b.pass_token_hash = $1", [hash]);
export const syncBookingByPassNo = (passNo: string) =>
  syncWhere("b.pass_no = $1 and b.created_at = (select max(created_at) from booking where pass_no = $1)", [passNo]);

/** Holds that just timed out are flipped to EXPIRED lazily; mirror them too. */
const expiredQueue = new Set<string>();
export const noteExpired = (ids: string[]) => ids.forEach((i) => expiredQueue.add(i));
export async function syncExpired() {
  const ids = [...expiredQueue];
  expiredQueue.clear();
  await syncBookings(ids);
}

/** Admin "Sync bookings": re-push every booking (safe to repeat; rows are matched on ID). */
export async function syncAllBookings(): Promise<{ ok: boolean; bookings: number }> {
  const rows = await query<BookingJoin>(`${BOOKING_SQL} order by b.created_at`);
  let ok = true;
  for (let i = 0; i < rows.length; i += 100) ok = (await upsertBookings(rows.slice(i, i + 100))) && ok;
  return { ok: rows.length === 0 ? true : ok, bookings: rows.length };
}
