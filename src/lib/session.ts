/**
 * Staff session cookie, verified with Web Crypto so the same code runs in
 * middleware (Edge) and route handlers.
 * value: <staffId>.<role>.<expiryMs>.<hmac>
 */
export type Role = "admin" | "door" | "counter";
export type Session = { staffId: string; role: Role; exp: number };

export const SESSION_COOKIE = "onmic_staff";
export const SESSION_HOURS = 14; // "sessions last for the evening"

async function hmac(payload: string): Promise<string> {
  const secret = process.env.TOKEN_SECRET;
  if (!secret || secret.length < 32) throw new Error("[env] TOKEN_SECRET missing");
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`staff:${payload}`));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export async function signSession(staffId: string, role: Role): Promise<string> {
  const payload = `${staffId}.${role}.${Date.now() + SESSION_HOURS * 3600_000}`;
  return `${payload}.${await hmac(payload)}`;
}

export async function readSession(value: string | undefined | null): Promise<Session | null> {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 4) return null;
  const [staffId, role, exp, sig] = parts;
  if (!["admin", "door", "counter"].includes(role) || !/^\d+$/.test(exp)) return null;
  if (!safeEqual(sig, await hmac(`${staffId}.${role}.${exp}`))) return null;
  if (Number(exp) < Date.now()) return null;
  return { staffId, role: role as Role, exp: Number(exp) };
}

/** Which roles may open which area. Admin can do everything. */
export function allowed(role: Role, area: "admin" | "door" | "counter"): boolean {
  return role === "admin" || role === area;
}
