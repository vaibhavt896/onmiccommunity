import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { body, clientIp, fail } from "@/lib/http";
import { hashPin } from "@/lib/pin";
import { rateLimit } from "@/lib/ratelimit";
import { SESSION_COOKIE, SESSION_HOURS, signSession, type Role } from "@/lib/session";

export async function POST(req: Request) {
  if (!(await rateLimit(`login:${clientIp(req)}`, 10, 900))) {
    return fail(429, "rate_limited", "Too many attempts. Wait 15 minutes.");
  }
  const { pin } = await body(req);
  if (typeof pin !== "string" || !/^\d{4,8}$/.test(pin)) return fail(400, "bad_pin", "Enter your 4 to 8 digit PIN.");
  const rows = await query<{ id: string; name: string; role: Role }>(
    "select id, name, role from staff where pin_hash = $1", [hashPin(pin)]);
  if (!rows[0]) return fail(401, "wrong_pin", "That PIN didn't work.");
  const res = NextResponse.json({ ok: true, role: rows[0].role, name: rows[0].name });
  res.cookies.set(SESSION_COOKIE, await signSession(rows[0].id, rows[0].role), {
    httpOnly: true, sameSite: "lax", path: "/", maxAge: SESSION_HOURS * 3600,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
