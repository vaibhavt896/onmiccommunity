import "server-only";
import { query } from "./db";

/**
 * Postgres-backed so it holds across serverless instances.
 * Returns false when `key` already has `limit` hits inside the window.
 */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<boolean> {
  const [{ n }] = await query<{ n: number }>(
    "select count(*)::int as n from rate_hit where key = $1 and at > now() - make_interval(secs => $2)",
    [key, windowSec],
  );
  if (n >= limit) return false;
  await query("insert into rate_hit (key) values ($1)", [key]);
  if (Math.random() < 0.02) await query("delete from rate_hit where at < now() - interval '1 day'");
  return true;
}
