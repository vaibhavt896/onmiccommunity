import { query } from "@/lib/db";
import { passLabel } from "@/lib/format";
import { currentJamRow } from "@/lib/jam";
import { requireStaff } from "@/lib/staff";

export const dynamic = "force-dynamic";

function cell(v: unknown): string {
  const s = v == null ? "" : v instanceof Date ? v.toISOString() : String(v);
  return /[",\n]/.test(s) || /^[=+\-@]/.test(s) ? `"${s.replace(/^([=+\-@])/, "'$1").replace(/"/g, '""')}"` : s;
}

/** CSV of confirmed attendees for the current jam. */
export async function GET() {
  const staff = await requireStaff("admin");
  if (staff instanceof Response) return staff;
  const jam = await currentJamRow();
  const rows = jam
    ? await query(
        `select pass_no, name, phone, instagram, tier, state, amount_inr, utr, confirmed_at, checked_in_at
           from booking where jam_id = $1 and state in ('CONFIRMED','CHECKED_IN') order by name`,
        [jam.id])
    : [];
  const head = ["pass", "name", "phone", "instagram", "tier", "state", "amount_inr", "utr", "confirmed_at", "checked_in_at"];
  const lines = [head.join(",")].concat(
    rows.map((r) => [passLabel(r.pass_no), r.name, `+91${r.phone}`, r.instagram, r.tier, r.state, r.amount_inr, r.utr,
      r.confirmed_at, r.checked_in_at].map(cell).join(",")),
  );
  return new Response(lines.join("\n") + "\n", {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="onmic-confirmed-${jam ? jam.starts_at.toISOString().slice(0, 10) : "none"}.csv"`,
      "cache-control": "no-store",
    },
  });
}
