import { whatsappLink, type BookingRow } from "@/lib/booking";
import { query } from "@/lib/db";
import { json } from "@/lib/http";
import { bookedCount, currentJamRow, TAKEN_SQL } from "@/lib/jam";
import { requireStaff } from "@/lib/staff";
import { toIstInput } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET() {
  const staff = await requireStaff("admin");
  if (staff instanceof Response) return staff;

  const jam = await currentJamRow();
  const latest = jam ?? (await query<NonNullable<typeof jam>>("select * from jam order by created_at desc limit 1"))[0] ?? null;
  if (!latest) return json({ staff, jam: null });

  const rows = await query<BookingRow & { served_at: Date | null; taken: boolean }>(
    `select b.*, t.served_at, ${TAKEN_SQL} as taken
       from booking b left join token_use t on t.booking_id = b.id and t.item = 'mocktail'
      where b.jam_id = $1 order by coalesce(b.utr_submitted_at, b.created_at) desc`,
    [latest.id],
  );
  const count = (s: string) => rows.filter((r) => r.state === s).length;
  const view = (r: (typeof rows)[number]) => ({
    id: r.id, name: r.name, phone: r.phone, instagram: r.instagram, tier: r.tier, state: r.state,
    passNo: r.pass_no, utr: r.utr, amount: r.amount_inr,
    submittedAt: r.utr_submitted_at?.toISOString() ?? null,
    checkedInAt: r.checked_in_at?.toISOString() ?? null,
    servedAt: r.served_at?.toISOString() ?? null,
    whatsapp: whatsappLink(r),
  });

  const [performers, waitlist, sources, events] = await Promise.all([
    query("select id, name, phone, acts, notes, created_at from performer_request where jam_id = $1 order by created_at desc", [latest.id]),
    query("select id, name, phone, created_at from waitlist where jam_id = $1 order by created_at", [latest.id]),
    query(
      `select coalesce(utm_source, 'direct') as source, coalesce(utm_medium, '-') as medium,
              count(*)::int as bookings,
              count(*) filter (where state in ('CONFIRMED','CHECKED_IN'))::int as confirmed
         from booking where jam_id = $1 group by 1, 2 order by 3 desc`, [latest.id]),
    query(
      `select name, coalesce(utm_source, 'direct') as source, count(*)::int as n
         from analytics_event where created_at > now() - interval '30 days'
        group by 1, 2 order by 1, 3 desc`),
  ]);

  return json({
    staff,
    jam: {
      id: latest.id, title: latest.title, status: latest.status,
      startsAt: toIstInput(latest.starts_at.toISOString()),
      cutoffAt: toIstInput(latest.booking_cutoff_at.toISOString()),
      capacity: latest.seat_capacity, price: latest.price_inr,
      venueName: latest.venue_name, venueMapUrl: latest.venue_map_url,
    },
    counts: {
      booked: await bookedCount(latest.id),
      held: rows.filter((r) => r.state === "HELD" && r.taken).length,
      pending: count("PAID_PENDING"),
      confirmed: count("CONFIRMED") + count("CHECKED_IN"),
      checkedIn: count("CHECKED_IN"),
      served: rows.filter((r) => r.served_at).length,
    },
    pending: rows.filter((r) => r.state === "PAID_PENDING").map(view),
    confirmed: rows.filter((r) => r.state === "CONFIRMED" || r.state === "CHECKED_IN").map(view),
    performers, waitlist, sources, events,
  });
}
