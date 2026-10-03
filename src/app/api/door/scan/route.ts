import { doorCounts, doorScan } from "@/lib/booking";
import { body, fail, json } from "@/lib/http";
import { requireStaff } from "@/lib/staff";

export async function POST(req: Request) {
  const staff = await requireStaff("door");
  if (staff instanceof Response) return staff;
  const { code } = await body(req);
  if (typeof code !== "string" || !code.trim()) return fail(400, "bad_code", "Scan a pass or type a pass number.");
  const result = await doorScan(code, staff.id);
  return json({ ...result, counts: await doorCounts() });
}
