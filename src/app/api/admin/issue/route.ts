import { BookingError, issuePass, whatsappLink } from "@/lib/booking";
import { body, fail, json } from "@/lib/http";
import { requireStaff } from "@/lib/staff";
import type { Tier } from "@/lib/types";
import { cleanName, cleanPhone } from "@/lib/validate";

const TIERS: Tier[] = ["regular", "performer", "core", "guest"];

export async function POST(req: Request) {
  const staff = await requireStaff("admin");
  if (staff instanceof Response) return staff;
  const b = await body(req);
  const name = cleanName(b.name);
  const phone = cleanPhone(b.phone);
  const tier = TIERS.includes(b.tier as Tier) ? (b.tier as Tier) : null;
  if (!name || !phone || !tier) return fail(400, "bad_input", "Name, a valid 10-digit number and a ticket type are required.");
  try {
    const row = await issuePass({ name, phone, tier });
    return json({ ok: true, whatsapp: whatsappLink(row) });
  } catch (e) {
    if (e instanceof BookingError) return fail(e.status, e.code, e.message);
    throw e;
  }
}
