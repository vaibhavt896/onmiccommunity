import { query } from "@/lib/db";
import { body, clientIp } from "@/lib/http";
import { rateLimit } from "@/lib/ratelimit";
import { cleanUtm } from "@/lib/validate";

const EVENTS = new Set([
  "pageview", "hero_cta_click", "ticket_cta_click", "booking_hold", "utr_submitted", "pass_viewed", "performer_request",
]);

/** First-party, cookieless analytics. Stores no IP and no identifiers. */
export async function POST(req: Request) {
  const b = await body(req);
  if (typeof b.name !== "string" || !EVENTS.has(b.name)) return new Response(null, { status: 204 });
  if (!(await rateLimit(`track:${clientIp(req)}`, 120, 3600))) return new Response(null, { status: 204 });
  const utm = (b.utm ?? {}) as Record<string, unknown>;
  const path = typeof b.path === "string" ? b.path.replace(/\/pass\/[^/?]+/, "/pass/:token").slice(0, 200) : "";
  let referrer: string | null = null;
  try { referrer = typeof b.ref === "string" && b.ref ? new URL(b.ref).hostname : null; } catch {}
  await query(
    "insert into analytics_event (name, path, utm_source, utm_medium, utm_campaign, referrer) values ($1,$2,$3,$4,$5,$6)",
    [b.name, path, cleanUtm(utm.source), cleanUtm(utm.medium), cleanUtm(utm.campaign), referrer],
  );
  return new Response(null, { status: 204 });
}
