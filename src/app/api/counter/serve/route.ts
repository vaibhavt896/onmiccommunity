import { after } from "next/server";
import { BookingError, serveToken } from "@/lib/booking";
import { body, fail, json } from "@/lib/http";
import { syncBooking } from "@/lib/sheets";
import { requireStaff } from "@/lib/staff";

export async function POST(req: Request) {
  const staff = await requireStaff("counter");
  if (staff instanceof Response) return staff;
  const { id } = await body(req);
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/.test(id)) return fail(400, "bad_id", "Missing attendee.");
  try {
    const served = await serveToken(id, staff.id);
    after(() => syncBooking(id));
    return json(served);
  } catch (e) {
    if (e instanceof BookingError) return fail(e.status, e.code, e.message);
    throw e;
  }
}
