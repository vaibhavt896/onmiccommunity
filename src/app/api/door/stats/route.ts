import { doorCounts } from "@/lib/booking";
import { json } from "@/lib/http";
import { requireStaff } from "@/lib/staff";

export const dynamic = "force-dynamic";

export async function GET() {
  const staff = await requireStaff("door");
  if (staff instanceof Response) return staff;
  return json(await doorCounts());
}
