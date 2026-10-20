// Local stand-in for Google's OAuth token endpoint and Sheets API v4, for testing the sync offline.
//
//   openssl genrsa -out /tmp/mock-key.pem 2048 && openssl rsa -in /tmp/mock-key.pem -pubout -out /tmp/mock-pub.pem
//   MOCK_PUBLIC_KEY_FILE=/tmp/mock-pub.pem node integrations/google-sheets/mock-google.mjs
//
// then in .env.local:
//   GOOGLE_SHEET_ID=test-sheet  GOOGLE_SERVICE_ACCOUNT_EMAIL=bot@test.iam.gserviceaccount.com
//   GOOGLE_PRIVATE_KEY="$(awk '{printf "%s\\n", $0}' /tmp/mock-key.pem)"
//   GOOGLE_TOKEN_URL=http://127.0.0.1:8789/token  GOOGLE_SHEETS_API=http://127.0.0.1:8789/v4/spreadsheets
//
// It verifies the RS256 JWT signature like Google does, requires a bearer token on every API call, and
// returns 403 on every API call when MOCK_FORBID=1 (simulates a sheet not shared with the service account), serves GET /dump so you can inspect every tab. Tabs "Waitlist" and "Performers" exist with headers
// (as the owner would create them), plus a "Community Signups" tab that must never be touched.
import { createServer } from "node:http";
import { createPublicKey, createVerify } from "node:crypto";
import { readFileSync } from "node:fs";

const PORT = Number(process.env.PORT || 8789);
const EMAIL = process.env.MOCK_EMAIL || "bot@test.iam.gserviceaccount.com";
const pub = createPublicKey(readFileSync(process.env.MOCK_PUBLIC_KEY_FILE));
const tokens = new Set();
const tabs = new Map([
  ["Waitlist", [["Submitted at", "Name", "WhatsApp"]]],
  ["Performers", [["Submitted at", "Name", "WhatsApp", "Acts", "Notes"]]],
  ["Community Signups", [["Other site", "Do not touch"], ["keep", "me"]]],
]);
let calls = 0;

const colNum = (s) => [...s].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
function parseRange(r) {
  const m = r.match(/^(?:'((?:[^']|'')+)'|([^!]+))!(.+)$/);
  if (!m) throw new Error("bad range " + r);
  const tab = (m[1] ?? m[2]).replace(/''/g, "'");
  const [a, b = a] = m[3].split(":");
  const p = (x) => { const k = x.match(/^([A-Z]*)(\d*)$/); return { col: k[1] ? colNum(k[1]) : null, row: k[2] ? Number(k[2]) : null }; };
  return { tab, from: p(a), to: p(b) };
}
const lastRow = (rows) => rows.reduce((n, r, i) => (r.some((c) => c !== "" && c != null) ? i + 1 : n), 0);

function send(res, code, obj) { res.writeHead(code, { "content-type": "application/json" }).end(JSON.stringify(obj)); }

createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  let raw = "";
  req.on("data", (c) => (raw += c));
  req.on("end", () => {
    try {
      if (url.pathname === "/dump") return send(res, 200, { calls, tabs: Object.fromEntries(tabs) });
      if (url.pathname === "/token") {
        const a = new URLSearchParams(raw);
        if (a.get("grant_type") !== "urn:ietf:params:oauth:grant-type:jwt-bearer") return send(res, 400, { error: "bad grant" });
        const [h, p, s] = (a.get("assertion") || "").split(".");
        const ok = createVerify("RSA-SHA256").update(`${h}.${p}`).verify(pub, Buffer.from(s || "", "base64url"));
        const claims = JSON.parse(Buffer.from(p || "", "base64url").toString() || "{}");
        if (!ok || claims.iss !== EMAIL || claims.aud !== "https://oauth2.googleapis.com/token" || claims.exp < Date.now() / 1000 || !String(claims.scope).includes("spreadsheets")) {
          return send(res, 401, { error: "invalid_grant" });
        }
        const t = "tok-" + Math.random().toString(36).slice(2);
        tokens.add(t);
        return send(res, 200, { access_token: t, expires_in: 3600 });
      }
      if (!url.pathname.startsWith("/v4/spreadsheets/")) return send(res, 404, {});
      if (!tokens.has((req.headers.authorization || "").replace("Bearer ", ""))) return send(res, 401, { error: "unauthenticated" });
      if (process.env.MOCK_FORBID) return send(res, 403, { error: "The caller does not have permission" });
      calls++;
      const rest = decodeURIComponent(url.pathname.slice("/v4/spreadsheets/".length)).replace(/^[^/:]+/, "");
      const body = raw ? JSON.parse(raw) : {};

      if (rest === "" && req.method === "GET") return send(res, 200, { sheets: [...tabs.keys()].map((title) => ({ properties: { title } })) });
      if (rest === ":batchUpdate") {
        for (const r of body.requests ?? []) if (r.addSheet) tabs.set(r.addSheet.properties.title, []);
        return send(res, 200, {});
      }
      if (rest === "/values:batchUpdate") {
        for (const d of body.data) {
          const { tab, from } = parseRange(d.range);
          const rows = tabs.get(tab); if (!rows) return send(res, 400, { error: "Unable to parse range" });
          d.values.forEach((v, i) => { rows[from.row - 1 + i] = v; });
        }
        return send(res, 200, {});
      }
      const m = rest.match(/^\/values\/(.+?)(:append)?$/);
      if (m) {
        const { tab, from, to } = parseRange(m[1]);
        const rows = tabs.get(tab);
        if (!rows) return send(res, 400, { error: { message: `Unable to parse range: ${m[1]}` } });
        if (m[2]) { // append
          const at = lastRow(rows);
          body.values.forEach((v, i) => { rows[at + i] = v; });
          return send(res, 200, { updates: { updatedRows: body.values.length } });
        }
        if (req.method === "PUT") { body.values.forEach((v, i) => { rows[from.row - 1 + i] = v; }); return send(res, 200, {}); }
        // read
        let out;
        if (from.row && from.row === to.row) out = [rows[from.row - 1] ?? []].filter((r) => r.length);
        else out = rows.slice(0, lastRow(rows)).map((r) => (r[from.col - 1] === undefined || r[from.col - 1] === "" ? [] : [r[from.col - 1]]));
        return send(res, 200, out.length ? { values: out } : {});
      }
      send(res, 404, { error: "unknown " + rest });
    } catch (e) { send(res, 500, { error: String(e) }); }
  });
}).listen(PORT, "127.0.0.1", () => console.log(`[mock-google] http://127.0.0.1:${PORT} (dump at /dump)`));
