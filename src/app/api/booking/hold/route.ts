import { BookingError, createHold } from "@/lib/booking";
import { body, clientIp, fail, json } from "@/lib/http";
import { rateLimit } from "@/lib/ratelimit";
import { cleanInstagram, cleanName, cleanPhone, cleanUtm } from "@/lib/validate";

export async function POST(req: Request) {
  const b = await body(req);
  const name = cleanName(b.name);
  if (!name) return fail(400, "bad_name", "Enter your name (2 to 40 characters).");
  const phone = cleanPhone(b.phone);
  if (!phone) return fail(400, "bad_phone", "Enter a valid 10-digit Indian WhatsApp number.");
  const instagram = cleanInstagram(b.instagram);
  if (instagram === null) return fail(400, "bad_instagram", "That Instagram handle doesn't look right.");

  const ip = clientIp(req);
  if (!(await rateLimit(`hold:ip:${ip}`, 5, 3600)) || !(await rateLimit(`hold:phone:${phone}`, 5, 3600))) {
    return fail(429, "rate_limited", "Too many tries. Take a breather and try again in a bit.");
  }

  const utm = (b.utm ?? {}) as Record<string, unknown>;
  try {
    const hold = await createHold({
      name, phone, instagram,
      utm: { source: cleanUtm(utm.source), medium: cleanUtm(utm.medium), campaign: cleanUtm(utm.campaign) },
    });
    return json(hold, 201);
  } catch (e) {
    if (e instanceof BookingError) return fail(e.status, e.code, e.message);
    throw e;
  }
}
