import { query } from "@/lib/db";
import { body, clientIp, fail, json } from "@/lib/http";
import { currentJamRow } from "@/lib/jam";
import { rateLimit } from "@/lib/ratelimit";
import { cleanName, cleanPhone } from "@/lib/validate";

export async function POST(req: Request) {
  const b = await body(req);
  const name = cleanName(b.name);
  if (!name) return fail(400, "bad_name", "Enter your name (2 to 40 characters).");
  const phone = cleanPhone(b.phone);
  if (!phone) return fail(400, "bad_phone", "Enter a valid 10-digit Indian WhatsApp number.");
  if (!(await rateLimit(`waitlist:ip:${clientIp(req)}`, 5, 3600))) {
    return fail(429, "rate_limited", "Too many requests. Try again later.");
  }
  const jam = await currentJamRow();
  await query("insert into waitlist (jam_id, name, phone) values ($1,$2,$3) on conflict (jam_id, phone) do nothing", [
    jam?.id ?? null, name, phone,
  ]);
  return json({ ok: true }, 201);
}
