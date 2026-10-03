import { currentPublicJam } from "@/lib/jam";
import { json } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Public jam data and live seats. Never returns the venue. */
export async function GET() {
  return json({ jam: await currentPublicJam() });
}
