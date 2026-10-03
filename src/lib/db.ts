import "server-only";
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { env } from "./env";

const g = globalThis as typeof globalThis & { __onmicPool?: Pool };

function pool(): Pool {
  if (!g.__onmicPool) {
    g.__onmicPool = new Pool({ connectionString: env.DATABASE_URL, max: 5 });
  }
  return g.__onmicPool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const { rows } = await pool().query<T>(sql, params);
  return rows;
}

/** Runs fn inside BEGIN/COMMIT; rolls back on any throw. */
export async function tx<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const c = await pool().connect();
  try {
    await c.query("begin");
    const out = await fn(c);
    await c.query("commit");
    return out;
  } catch (e) {
    await c.query("rollback").catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

export function isUniqueViolation(e: unknown, constraint?: string): boolean {
  const err = e as { code?: string; constraint?: string };
  return err?.code === "23505" && (!constraint || err.constraint === constraint);
}
