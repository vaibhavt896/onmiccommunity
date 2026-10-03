import "server-only";
import type { PoolClient } from "pg";
import { query } from "./db";
import type { PublicJam } from "./types";

export type JamRow = {
  id: string;
  title: string;
  starts_at: Date;
  booking_cutoff_at: Date;
  seat_capacity: number;
  price_inr: number;
  venue_name: string;
  venue_map_url: string;
  status: PublicJam["status"];
};

/** A seat is taken by any live booking; a HELD one only until its timer ends. */
export const TAKEN_SQL = `(state in ('PAID_PENDING','CONFIRMED','CHECKED_IN')
  or (state = 'HELD' and hold_expires_at > now()))`;

/** The "current jam": the latest one that is open or closed (not draft, not done). */
export async function currentJamRow(c?: PoolClient, lock = false): Promise<JamRow | null> {
  const sql = `select * from jam where status in ('open','closed')
               order by starts_at desc limit 1 ${lock ? "for update" : ""}`;
  const rows = c ? (await c.query<JamRow>(sql)).rows : await query<JamRow>(sql);
  return rows[0] ?? null;
}

export async function bookedCount(jamId: string, c?: PoolClient): Promise<number> {
  const sql = `select count(*)::int as n from booking where jam_id = $1 and ${TAKEN_SQL}`;
  const rows = c ? (await c.query<{ n: number }>(sql, [jamId])).rows : await query<{ n: number }>(sql, [jamId]);
  return rows[0].n;
}

export function isBookable(jam: JamRow, booked: number): boolean {
  return jam.status === "open" && Date.now() < jam.booking_cutoff_at.getTime() && booked < jam.seat_capacity;
}

export function toPublic(jam: JamRow, booked: number): PublicJam {
  return {
    id: jam.id,
    title: jam.title,
    startsAt: jam.starts_at.toISOString(),
    cutoffAt: jam.booking_cutoff_at.toISOString(),
    capacity: jam.seat_capacity,
    price: jam.price_inr,
    booked: Math.min(booked, jam.seat_capacity),
    seatsLeft: Math.max(0, jam.seat_capacity - booked),
    status: jam.status,
    sale: isBookable(jam, booked) ? "open" : "soldout",
  };
}

export async function currentPublicJam(): Promise<PublicJam | null> {
  const jam = await currentJamRow();
  if (!jam) return null;
  return toPublic(jam, await bookedCount(jam.id));
}
