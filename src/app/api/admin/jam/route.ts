import { query } from "@/lib/db";
import { fromIstInput } from "@/lib/format";
import { body, fail, json } from "@/lib/http";
import { requireStaff } from "@/lib/staff";

const STATUSES = ["draft", "open", "closed", "done"];

/**
 * Save the current jam (id given) or create a new one (no id).
 * Also used for "close bookings early": { id, status: "closed" } alone.
 */
export async function POST(req: Request) {
  const staff = await requireStaff("admin");
  if (staff instanceof Response) return staff;
  const b = await body(req);
  const id = typeof b.id === "string" && /^[0-9a-f-]{36}$/.test(b.id) ? b.id : null;

  if (id && Object.keys(b).length === 2 && typeof b.status === "string") {
    if (!STATUSES.includes(b.status)) return fail(400, "bad_status", "Unknown status.");
    await query("update jam set status = $2 where id = $1", [id, b.status]);
    return json({ ok: true });
  }

  const title = typeof b.title === "string" ? b.title.trim().slice(0, 80) : "";
  const startsAt = typeof b.startsAt === "string" ? fromIstInput(b.startsAt) : null;
  const cutoffAt = typeof b.cutoffAt === "string" ? fromIstInput(b.cutoffAt) : null;
  const capacity = Number(b.capacity);
  const price = Number(b.price);
  const status = typeof b.status === "string" && STATUSES.includes(b.status) ? b.status : null;
  const venueName = typeof b.venueName === "string" ? b.venueName.trim().slice(0, 200) : "";
  const venueMapUrl = typeof b.venueMapUrl === "string" ? b.venueMapUrl.trim().slice(0, 500) : "";

  if (!title) return fail(400, "bad_title", "Give the jam a title.");
  if (!startsAt || !cutoffAt) return fail(400, "bad_date", "Set both the start time and the booking cutoff.");
  if (new Date(cutoffAt) > new Date(startsAt)) return fail(400, "bad_cutoff", "The booking cutoff must be before the jam starts.");
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 1000) return fail(400, "bad_capacity", "Capacity must be a whole number.");
  if (!Number.isInteger(price) || price < 0 || price > 100000) return fail(400, "bad_price", "Price must be a whole number of rupees.");
  if (!status) return fail(400, "bad_status", "Pick a status.");
  if (venueMapUrl && !/^https?:\/\//.test(venueMapUrl)) return fail(400, "bad_map", "The maps link must start with https://");

  const params = [title, startsAt, cutoffAt, capacity, price, venueName, venueMapUrl, status];
  if (id) {
    await query(
      `update jam set title=$2, starts_at=$3, booking_cutoff_at=$4, seat_capacity=$5, price_inr=$6,
              venue_name=$7, venue_map_url=$8, status=$9 where id=$1`,
      [id, ...params],
    );
    return json({ ok: true, id });
  }
  const rows = await query<{ id: string }>(
    `insert into jam (title, starts_at, booking_cutoff_at, seat_capacity, price_inr, venue_name, venue_map_url, status)
     values ($1,$2,$3,$4,$5,$6,$7,$8) returning id`,
    params,
  );
  return json({ ok: true, id: rows[0].id });
}
