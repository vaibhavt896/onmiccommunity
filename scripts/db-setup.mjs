// Applies db/schema.sql, seeds the sample jam and staff if missing.
//   npm run db:setup            schema + seed
//   npm run db:setup -- --demo  also adds demo attendees (local testing only)
import { createHash, createHmac, randomUUID, scryptSync } from "node:crypto";
import { readFileSync } from "node:fs";
import pg from "pg";

const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
await db.query(readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8"));
console.log("schema applied");

const hashPin = (pin) => scryptSync(pin, process.env.STAFF_PIN_SALT, 32).toString("hex");
const passToken = (id, rev) =>
  createHmac("sha256", process.env.TOKEN_SECRET).update(`pass:${id}:${rev}`).digest("base64url").slice(0, 32);
const sha = (s) => createHash("sha256").update(s).digest("hex");

let { rows: [jam] } = await db.query("select * from jam order by created_at desc limit 1");
if (!jam) {
  // Sample values from the Figma design (brief §10). Edit them in /admin.
  ({ rows: [jam] } = await db.query(
    `insert into jam (title, starts_at, booking_cutoff_at, seat_capacity, price_inr, venue_name, venue_map_url, status)
     values ('On Mic Jam', '2026-10-10 18:00+05:30', '2026-10-09 18:00+05:30', 50, 300,
             '[ Venue name ]', 'https://maps.google.com/?q=Kanpur', 'open') returning *`));
  console.log("seeded jam: SAT 10 OCT 6:00 PM, 50 seats, Rs 300");
}

const { rows: [{ n }] } = await db.query("select count(*)::int as n from staff");
if (n === 0) {
  const staff = [
    ["Core team", "admin", process.env.SEED_ADMIN_PIN || "246810"],
    ["Door", "door", process.env.SEED_DOOR_PIN || "135790"],
    ["Cafe counter", "counter", process.env.SEED_COUNTER_PIN || "112233"],
  ];
  for (const [name, role, pin] of staff) {
    await db.query("insert into staff (name, role, pin_hash) values ($1,$2,$3)", [name, role, hashPin(pin)]);
    console.log(`staff: ${role.padEnd(8)} PIN ${pin}`);
  }
}

if (process.argv.includes("--demo")) {
  const first = ["Aarav", "Ishita", "Kabir", "Meher", "Rohan", "Sana", "Vihaan", "Zoya", "Arjun", "Tara", "Dev", "Anya"];
  const last = ["Sharma", "Verma", "Gupta", "Singh", "Mishra", "Khan", "Agarwal", "Tiwari", "Yadav", "Saxena"];
  const alpha = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const pass = () => Array.from({ length: 5 }, () => alpha[Math.floor(Math.random() * alpha.length)]).join("");
  let demo;
  for (let i = 0; i < 36; i++) {
    const id = randomUUID();
    const state = i < 33 ? "CONFIRMED" : "PAID_PENDING";
    const phone = `9${String(100000000 + i * 7919).slice(0, 9)}`;
    const utr = String(400000000000 + i * 104729);
    await db.query(
      `insert into booking (id, jam_id, pass_no, name, phone, state, utr, amount_inr, pass_token_hash,
                            utm_source, utm_medium, utr_submitted_at, confirmed_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, now() - make_interval(mins => $12),
               case when $6 = 'CONFIRMED' then now() else null end)
       on conflict do nothing`,
      [id, jam.id, pass(), `${first[i % 12]} ${last[i % 10]}`, phone, state, utr, jam.price_inr,
       sha(passToken(id, 0)), i % 3 ? "instagram" : null, i % 3 === 1 ? "reel" : i % 3 === 2 ? "story" : null, 200 - i]);
    if (i === 0) demo = id;
  }
  console.log(`demo attendees added. A confirmed demo pass: ${process.env.NEXT_PUBLIC_SITE_URL}/pass/${passToken(demo, 0)}`);
}

await db.end();
