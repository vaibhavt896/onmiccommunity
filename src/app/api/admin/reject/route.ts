import { after } from "next/server";
import { BookingError, reject, whatsappLink } from "@/lib/booking";
import { body, fail, json } from "@/lib/http";
import { syncBooking } from "@/lib/sheets";
import { requireStaff } from "@/lib/staff";

export async function POST(req: Request) {
  const staff = await requireStaff("admin");
  if (staff instanceof Response) return staff;
  const { id } = await body(req);
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/.test(id)) return fail(400, "bad_id", "Missing booking id.");
  try {
    const b = await reject(id);
    after(() => syncBooking(id));
    return json({ ok: true, state: b.state, whatsapp: whatsappLink(b) });
  } catch (e) {
    if (e instanceof BookingError) return fail(e.status, e.code, e.message);
    throw e;
  }
}
