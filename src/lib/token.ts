import "server-only";
import { createHash, createHmac } from "node:crypto";
import { env } from "./env";

/**
 * Pass token = HMAC(TOKEN_SECRET, booking id + revision), 192 bits, base64url.
 * Signed and unguessable, yet derivable on the server so the admin can build
 * the WhatsApp link. Only its SHA-256 is stored. Bumping token_rev rotates it
 * and kills the old link.
 */
export function passToken(bookingId: string, rev: number): string {
  return createHmac("sha256", env.TOKEN_SECRET)
    .update(`pass:${bookingId}:${rev}`)
    .digest("base64url")
    .slice(0, 32);
}

export function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function looksLikeToken(t: unknown): t is string {
  return typeof t === "string" && /^[A-Za-z0-9_-]{32}$/.test(t);
}

export function passUrl(token: string): string {
  return `${env.SITE_URL}/pass/${token}`;
}
