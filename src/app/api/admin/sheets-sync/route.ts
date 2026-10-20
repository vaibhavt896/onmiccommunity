import { fail, json } from "@/lib/http";
import { sheetsEnabled, syncAllBookings } from "@/lib/sheets";
import { requireStaff } from "@/lib/staff";

/** Admin button: push every booking to the Google Sheet again (rows are matched on ID, so repeating is safe). */
export async function POST() {
  const staff = await requireStaff("admin");
  if (staff instanceof Response) return staff;
  if (!sheetsEnabled()) return fail(400, "sheets_off", "Google Sheet sync isn't set up yet (GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_SHEET_ID).");
  const r = await syncAllBookings();
  if (!r.ok) return fail(502, "sheets_failed", "The Google Sheet didn't accept the data. Check the web app URL and secret.");
  return json(r);
}
