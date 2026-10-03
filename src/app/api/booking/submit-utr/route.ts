import { BookingError, submitUtr } from "@/lib/booking";
import { body, clientIp, fail, json } from "@/lib/http";
import { rateLimit } from "@/lib/ratelimit";
import { looksLikeToken } from "@/lib/token";
import { cleanUtr } from "@/lib/validate";

export async function POST(req: Request) {
  const b = await body(req);
  if (!looksLikeToken(b.token)) return fail(400, "bad_token", "This booking link is broken. Start again.");
  const utr = cleanUtr(b.utr);
  if (!utr) return fail(400, "bad_utr", "The UPI reference (UTR) is the 12-digit number in your payment details.");
  if (!(await rateLimit(`utr:ip:${clientIp(req)}`, 20, 3600))) {
    return fail(429, "rate_limited", "Too many tries. Try again in a bit.");
  }
  try {
    return json(await submitUtr(b.token, utr));
  } catch (e) {
    if (e instanceof BookingError) return fail(e.status, e.code, e.message);
    throw e;
  }
}
