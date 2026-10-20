import { after } from "next/server";
import { query } from "@/lib/db";
import { body, clientIp, fail, json } from "@/lib/http";
import { currentJamRow } from "@/lib/jam";
import { rateLimit } from "@/lib/ratelimit";
import { appendRow, tabs } from "@/lib/sheets";
import { ACTS, cleanName, cleanPhone, cleanText } from "@/lib/validate";

/** Stage-slot request from "The stage" section. */
export async function POST(req: Request) {
  const b = await body(req);
  const name = cleanName(b.name);
  if (!name) return fail(400, "bad_name", "Enter your name (2 to 40 characters).");
  const phone = cleanPhone(b.phone);
  if (!phone) return fail(400, "bad_phone", "Enter a valid 10-digit Indian WhatsApp number.");
  const acts = Array.isArray(b.acts) ? b.acts.filter((a): a is string => (ACTS as readonly string[]).includes(a as string)) : [];
  if (acts.length === 0) return fail(400, "bad_acts", "Pick at least one act.");
  if (!(await rateLimit(`performer:ip:${clientIp(req)}`, 5, 3600))) {
    return fail(429, "rate_limited", "Too many requests. Try again later.");
  }
  const jam = await currentJamRow();
  const notes = cleanText(b.notes, 500);
  await query("insert into performer_request (jam_id, name, phone, acts, notes) values ($1,$2,$3,$4,$5)", [
    jam?.id ?? null, name, phone, acts, notes,
  ]);
  after(() => appendRow(tabs.performer, [new Date().toISOString(), name, phone, acts.join(", "), notes]));
  return json({ ok: true }, 201);
}
