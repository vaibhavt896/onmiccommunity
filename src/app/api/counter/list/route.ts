import { query } from "@/lib/db";
import { json } from "@/lib/http";
import { currentJamRow } from "@/lib/jam";
import { requireStaff } from "@/lib/staff";

export const dynamic = "force-dynamic";

/** Checked-in attendees with their mocktail token state. Read-only. */
export async function GET() {
  const staff = await requireStaff("counter");
  if (staff instanceof Response) return staff;
  const jam = await currentJamRow();
  if (!jam) return json({ people: [] });
  const people = await query(
    `select b.id, b.name, b.pass_no as "passNo", b.tier, b.checked_in_at as "checkedInAt", t.served_at as "servedAt"
       from booking b left join token_use t on t.booking_id = b.id and t.item = 'mocktail'
      where b.jam_id = $1 and b.state = 'CHECKED_IN' order by b.name`,
    [jam.id],
  );
  return json({ people });
}
