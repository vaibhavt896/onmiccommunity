// npm run staff:add -- "Aditya" admin 482910
import { scryptSync } from "node:crypto";
import pg from "pg";

const [name, role, pin] = process.argv.slice(2);
if (!name || !["admin", "door", "counter"].includes(role) || !/^\d{4,8}$/.test(pin ?? "")) {
  console.error('usage: npm run staff:add -- "<name>" <admin|door|counter> <4-8 digit PIN>');
  process.exit(1);
}
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
try {
  await db.query("insert into staff (name, role, pin_hash) values ($1,$2,$3)", [
    name, role, scryptSync(pin, process.env.STAFF_PIN_SALT, 32).toString("hex"),
  ]);
  console.log(`added ${role} "${name}"`);
} catch (e) {
  console.error(e.code === "23505" ? "That PIN is already taken. Pick another." : e.message);
  process.exitCode = 1;
}
await db.end();
