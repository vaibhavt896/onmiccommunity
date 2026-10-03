import { passView } from "@/lib/booking";
import { fail, json } from "@/lib/http";
import { looksLikeToken } from "@/lib/token";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!looksLikeToken(token)) return fail(404, "not_found", "Pass not found.");
  const view = await passView(token);
  if (!view) return fail(404, "not_found", "Pass not found.");
  return json(view);
}
