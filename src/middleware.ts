import { NextResponse, type NextRequest } from "next/server";
import { allowed, readSession, SESSION_COOKIE } from "@/lib/session";

/** Staff screens redirect to /login. API routes check the session themselves. */
export async function middleware(req: NextRequest) {
  const area = req.nextUrl.pathname.split("/")[1] as "admin" | "door" | "counter";
  const s = await readSession(req.cookies.get(SESSION_COOKIE)?.value);
  if (s && allowed(s.role, area)) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=/${area}`;
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/admin/:path*", "/door/:path*", "/counter/:path*"] };
