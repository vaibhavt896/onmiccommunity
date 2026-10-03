import "server-only";
import { cookies } from "next/headers";
import { query } from "./db";
import { allowed, readSession, SESSION_COOKIE, type Role } from "./session";
import { fail } from "./http";

export type StaffMember = { id: string; name: string; role: Role };

export async function currentStaff(): Promise<StaffMember | null> {
  const s = await readSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!s) return null;
  const rows = await query<StaffMember>("select id, name, role from staff where id = $1", [s.staffId]);
  return rows[0] ?? null; // deleted staff lose access immediately
}

/** For route handlers: returns the staff member, or a 401/403 response. */
export async function requireStaff(area: "admin" | "door" | "counter"): Promise<StaffMember | Response> {
  const staff = await currentStaff();
  if (!staff) return fail(401, "unauthorized", "Please log in with your staff PIN.");
  if (!allowed(staff.role, area)) return fail(403, "forbidden", "Your PIN doesn't open this screen.");
  return staff;
}
