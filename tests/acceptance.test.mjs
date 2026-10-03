// Acceptance checks from brief §11, run against a real server + Postgres.
//   npm run build && npm test
// Uses its own database (<DATABASE_URL db>_test) and port 3101.
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { scryptSync } from "node:crypto";
import { fileURLToPath } from "node:url";
import pg from "pg";

const PORT = 3101;
const BASE = `http://127.0.0.1:${PORT}`;
const mainUrl = new URL(process.env.DATABASE_URL);
const testDb = `${mainUrl.pathname.slice(1)}_test`;
const TEST_URL = Object.assign(new URL(mainUrl), { pathname: `/${testDb}` }).toString();
const VENUE = "Secret Cafe Swaroop Nagar";
const PINS = { admin: "900001", door: "900002", counter: "900003" };

let server;
let db;
let jamId;
let ipSeq = 0;
const ip = () => `10.0.${Math.floor(++ipSeq / 250)}.${ipSeq % 250}`;
const phone = (n) => `9${String(800000000 + n).padStart(9, "0")}`;

async function call(path, { method = "GET", body, cookie, xff = ip() } = {}) {
  const r = await fetch(BASE + path, {
    method,
    headers: { "content-type": "application/json", "x-forwarded-for": xff, ...(cookie ? { cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  const text = await r.text();
  let data = null;
  try { data = JSON.parse(text); } catch {}
  return { status: r.status, data, text, headers: r.headers };
}

async function login(role) {
  const r = await call("/api/staff/login", { method: "POST", body: { pin: PINS[role] } });
  assert.equal(r.status, 200, `login ${role}`);
  return r.headers.get("set-cookie").split(";")[0];
}

const hold = (n, extra = {}) => call("/api/booking/hold", { method: "POST", body: { name: `Tester ${n}`, phone: phone(n), ...extra } });

before(async () => {
  const admin = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await admin.connect();
  await admin.query(`drop database if exists ${testDb} with (force)`);
  await admin.query(`create database ${testDb}`);
  await admin.end();

  db = new pg.Client({ connectionString: TEST_URL });
  await db.connect();
  await db.query(readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8"));
  const salt = process.env.STAFF_PIN_SALT;
  for (const [role, pin] of Object.entries(PINS)) {
    await db.query("insert into staff (name, role, pin_hash) values ($1,$2,$3)", [role, role, scryptSync(pin, salt, 32).toString("hex")]);
  }
  ({ rows: [{ id: jamId }] } = await db.query(
    `insert into jam (title, starts_at, booking_cutoff_at, seat_capacity, price_inr, venue_name, venue_map_url, status)
     values ('Test Jam', now() + interval '10 days', now() + interval '9 days', 50, 300, $1, 'https://maps.example/x', 'open')
     returning id`, [VENUE]));

  server = spawn("npx", ["next", "start", "-p", String(PORT)], {
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    env: { ...process.env, DATABASE_URL: TEST_URL },
    stdio: ["ignore", "ignore", "inherit"],
  });
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(`${BASE}/api/jam/current`)).ok) return; } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("server did not start");
});

after(async () => {
  server?.kill();
  await db?.end();
});

test("full booking: hold → UTR → approve → pass → scan → used → mocktail", async () => {
  const h = await hold(1, { instagram: "@tester1", utm: { source: "instagram", medium: "reel", campaign: "oct" } });
  assert.equal(h.status, 201, h.text);
  assert.match(h.data.token, /^[A-Za-z0-9_-]{32}$/);

  let pass = await call(`/api/pass/${h.data.token}`);
  assert.equal(pass.data.state, "HELD");
  assert.equal(pass.data.venue, null);

  const u = await call("/api/booking/submit-utr", { method: "POST", body: { token: h.data.token, utr: "123456789012" } });
  assert.equal(u.status, 200, u.text);
  assert.equal(u.data.state, "PAID_PENDING");

  pass = await call(`/api/pass/${h.data.token}`);
  assert.equal(pass.data.state, "PAID_PENDING");
  assert.ok(!pass.text.includes(VENUE), "venue leaked before confirmation");
  const page = await call(`/pass/${h.data.token}`);
  assert.ok(!page.text.includes(VENUE), "venue leaked in pending pass page source");

  const adminCookie = await login("admin");
  const ov = await call("/api/admin/overview", { cookie: adminCookie });
  const row = ov.data.pending.find((p) => p.utr === "123456789012");
  assert.ok(row, "booking in pending queue");
  const ap = await call("/api/admin/approve", { method: "POST", body: { id: row.id }, cookie: adminCookie });
  assert.equal(ap.status, 200, ap.text);
  assert.match(ap.data.whatsapp, /^https:\/\/wa\.me\/91\d{10}\?text=/);

  pass = await call(`/api/pass/${h.data.token}`);
  assert.equal(pass.data.state, "CONFIRMED");
  assert.equal(pass.data.venue.name, VENUE);

  const doorCookie = await login("door");
  const s1 = await call("/api/door/scan", { method: "POST", body: { code: h.data.token }, cookie: doorCookie });
  assert.equal(s1.data.result, "VERIFIED", s1.text);
  assert.equal(s1.data.counts.inside, 1);
  const s2 = await call("/api/door/scan", { method: "POST", body: { code: h.data.token }, cookie: doorCookie });
  assert.equal(s2.data.result, "ALREADY_USED");
  assert.ok(s2.data.firstScanAt);

  const counterCookie = await login("counter");
  const c1 = await call("/api/counter/serve", { method: "POST", body: { id: row.id }, cookie: counterCookie });
  assert.equal(c1.data.already, false);
  const c2 = await call("/api/counter/serve", { method: "POST", body: { id: row.id }, cookie: counterCookie });
  assert.equal(c2.data.already, true, "mocktail must not be served twice");

  const { rows } = await db.query("select result from scan_log order by id");
  assert.deepEqual(rows.map((r) => r.result), ["VERIFIED", "ALREADY_USED"]);
});

test("venue never appears in public page source or public API", async () => {
  for (const path of ["/", "/book", "/api/jam/current", "/opengraph-image", "/sitemap.xml"]) {
    const r = await call(path);
    assert.ok(!r.text.includes(VENUE), `venue leaked on ${path}`);
    assert.ok(!r.text.includes("maps.example"), `map link leaked on ${path}`);
  }
});

test("duplicate UTR is rejected with a friendly message", async () => {
  const a = await hold(2);
  const b = await hold(3);
  assert.equal((await call("/api/booking/submit-utr", { method: "POST", body: { token: a.data.token, utr: "555555555555" } })).status, 200);
  const dup = await call("/api/booking/submit-utr", { method: "POST", body: { token: b.data.token, utr: "555555555555" } });
  assert.equal(dup.status, 409);
  assert.equal(dup.data.error, "utr_used");
});

test("one active seat per phone", async () => {
  assert.equal((await hold(4)).status, 201);
  const again = await hold(4);
  assert.equal(again.status, 409);
  assert.equal(again.data.error, "phone_held");
});

test("validation: bad name, phone, UTR", async () => {
  assert.equal((await call("/api/booking/hold", { method: "POST", body: { name: "A", phone: phone(5) } })).data.error, "bad_name");
  assert.equal((await call("/api/booking/hold", { method: "POST", body: { name: "Ab", phone: "12345" } })).data.error, "bad_phone");
  const h = await hold(6);
  assert.equal((await call("/api/booking/submit-utr", { method: "POST", body: { token: h.data.token, utr: "12345" } })).data.error, "bad_utr");
});

test("expired holds return their seats", async () => {
  const before = (await call("/api/jam/current")).data.jam.booked;
  const h = await hold(7);
  assert.equal((await call("/api/jam/current")).data.jam.booked, before + 1);
  await db.query("update booking set hold_expires_at = now() - interval '1 second' where phone = $1", [phone(7)]);
  assert.equal((await call("/api/jam/current")).data.jam.booked, before);
  const pass = await call(`/api/pass/${h.data.token}`);
  assert.equal(pass.data.state, "EXPIRED");
  // Same phone can book again once the hold has lapsed.
  assert.equal((await hold(7)).status, 201);
});

test("the last seat cannot be double-booked under simultaneous requests", async () => {
  const booked = (await call("/api/jam/current")).data.jam.booked;
  await db.query("update jam set seat_capacity = $2 where id = $1", [jamId, booked + 1]);
  const results = await Promise.all(Array.from({ length: 12 }, (_, i) => hold(100 + i)));
  const ok = results.filter((r) => r.status === 201).length;
  const sold = results.filter((r) => r.data?.error === "sold_out").length;
  assert.equal(ok, 1, `exactly one winner, got ${ok}`);
  assert.equal(sold, 11);
  const jam = (await call("/api/jam/current")).data.jam;
  assert.equal(jam.seatsLeft, 0);
  assert.equal(jam.sale, "soldout");
  await db.query("update jam set seat_capacity = 50 where id = $1", [jamId]);
});

test("bookings refuse holds after the cutoff and when closed early", async () => {
  await db.query("update jam set booking_cutoff_at = now() - interval '1 minute' where id = $1", [jamId]);
  assert.equal((await hold(200)).data.error, "closed");
  assert.equal((await call("/api/jam/current")).data.jam.sale, "soldout");
  await db.query("update jam set booking_cutoff_at = now() + interval '9 days' where id = $1", [jamId]);

  const adminCookie = await login("admin");
  assert.equal((await call("/api/admin/jam", { method: "POST", body: { id: jamId, status: "closed" }, cookie: adminCookie })).status, 200);
  assert.equal((await hold(201)).data.error, "closed");
  await call("/api/admin/jam", { method: "POST", body: { id: jamId, status: "open" }, cookie: adminCookie });
});

test("rate limit: 5 holds per hour per IP", async () => {
  const xff = "10.99.99.99";
  const codes = [];
  for (let i = 0; i < 6; i++) {
    codes.push((await call("/api/booking/hold", { method: "POST", xff, body: { name: "Rate Test", phone: phone(300 + i) } })).status);
  }
  assert.deepEqual(codes, [201, 201, 201, 201, 201, 429]);
});

test("rotating the QR kills the old token", async () => {
  const adminCookie = await login("admin");
  const issued = await call("/api/admin/issue", { method: "POST", body: { name: "Guest Star", phone: phone(400), tier: "guest" }, cookie: adminCookie });
  assert.equal(issued.status, 200, issued.text);
  const oldToken = decodeURIComponent(issued.data.whatsapp).match(/\/pass\/([A-Za-z0-9_-]{32})/)[1];
  assert.equal((await call(`/api/pass/${oldToken}`)).data.tier, "guest");
  const { rows: [b] } = await db.query("select id from booking where phone = $1", [phone(400)]);
  const rot = await call("/api/admin/rotate", { method: "POST", body: { id: b.id }, cookie: adminCookie });
  const newToken = decodeURIComponent(rot.data.whatsapp).match(/\/pass\/([A-Za-z0-9_-]{32})/)[1];
  assert.notEqual(newToken, oldToken);
  assert.equal((await call(`/api/pass/${oldToken}`)).status, 404);
  const doorCookie = await login("door");
  assert.equal((await call("/api/door/scan", { method: "POST", body: { code: oldToken }, cookie: doorCookie })).data.result, "INVALID");
  assert.equal((await call("/api/door/scan", { method: "POST", body: { code: `${BASE}/pass/${newToken}` }, cookie: doorCookie })).data.result, "VERIFIED");
});

test("door rejects unpaid passes; manual pass-number entry works", async () => {
  const h = await hold(500);
  const doorCookie = await login("door");
  const r = await call("/api/door/scan", { method: "POST", body: { code: h.data.token }, cookie: doorCookie });
  assert.equal(r.data.result, "INVALID");
  assert.match(r.data.reason, /Payment not submitted/);

  const adminCookie = await login("admin");
  const issued = await call("/api/admin/issue", { method: "POST", body: { name: "Core Member", phone: phone(501), tier: "core" }, cookie: adminCookie });
  assert.equal(issued.status, 200);
  const { rows: [b] } = await db.query("select pass_no from booking where phone = $1", [phone(501)]);
  const m = await call("/api/door/scan", { method: "POST", body: { code: `om-${b.pass_no.toLowerCase()}` }, cookie: doorCookie });
  assert.equal(m.data.result, "VERIFIED");
  assert.equal(m.data.tier, "core");
});

test("staff areas are role-gated", async () => {
  assert.equal((await call("/api/admin/overview")).status, 401);
  const counterCookie = await login("counter");
  assert.equal((await call("/api/door/scan", { method: "POST", body: { code: "x" }, cookie: counterCookie })).status, 403);
  assert.equal((await call("/api/admin/overview", { cookie: counterCookie })).status, 403);
  assert.equal((await call("/admin")).status, 307);
  assert.equal((await call("/api/staff/login", { method: "POST", body: { pin: "000000" } })).status, 401);
});

test("admin CSV export downloads confirmed attendees", async () => {
  const adminCookie = await login("admin");
  const r = await call("/api/admin/export", { cookie: adminCookie });
  assert.equal(r.status, 200);
  assert.match(r.headers.get("content-type"), /text\/csv/);
  assert.match(r.headers.get("content-disposition"), /attachment/);
  const lines = r.text.trim().split("\n");
  assert.equal(lines[0], "pass,name,phone,instagram,tier,state,amount_inr,utr,confirmed_at,checked_in_at");
  assert.ok(lines.some((l) => l.includes("Tester 1")));
});

test("performer request and waitlist are stored", async () => {
  const p = await call("/api/performer", { method: "POST", body: { name: "Singer", phone: phone(600), acts: ["SING", "GUITAR / KEYS", "NOPE"], notes: "2 songs" } });
  assert.equal(p.status, 201);
  const { rows: [pr] } = await db.query("select acts from performer_request where phone = $1", [phone(600)]);
  assert.deepEqual(pr.acts, ["SING", "GUITAR / KEYS"]);
  assert.equal((await call("/api/waitlist", { method: "POST", body: { name: "Late Comer", phone: phone(601) } })).status, 201);
});
