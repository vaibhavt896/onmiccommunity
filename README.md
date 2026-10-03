# On Mic Community site

The one-page booking site for On Mic Community (open mic and jam nights, Kanpur), built to
`../On Mic Community — Developer Build Brief.md`. It has the landing page, the booking sheet,
UPI payment without a gateway, QR passes, the door scanner, the cafe counter and the admin screen.

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind 4 · GSAP + ScrollTrigger · Postgres (`pg`).

## Run locally

```bash
npm install
cp .env.example .env.local        # fill TOKEN_SECRET and STAFF_PIN_SALT (openssl rand -hex 32 / 16)
npm run db:setup                  # schema + sample jam + 3 staff PINs
npm run db:setup -- --demo        # optional: ~36 demo attendees so the meter and admin have data
npm run dev                       # http://localhost:3100
```

Local Postgres (Homebrew): `initdb -D .pgdata -U postgres --auth=trust && pg_ctl -D .pgdata -o "-p 55432" start && createdb -h 127.0.0.1 -p 55432 -U postgres onmic`.

The seeded staff PINs are for local use only (admin `246810`, door `135790`, counter `112233`).
In production, set `SEED_ADMIN_PIN` / `SEED_DOOR_PIN` / `SEED_COUNTER_PIN` before `db:setup`, or add people with
`npm run staff:add -- "Aditya" admin 482910`.

## Tests

```bash
npm run build && npm test
```

This runs the §11 acceptance checks against a real server and a throwaway `<db>_test` database:
a full booking (hold → UTR → approve → pass → scan → already used → mocktail once), no venue leaks,
duplicate UTR, one seat per phone, expired holds returning seats, 12 simultaneous requests for the last
seat, the cutoff and early close, rate limits, QR rotation, role gating, CSV export, and performer and waitlist requests.

## Routes

| Path | Who | What |
| --- | --- | --- |
| `/` | public | Landing page with the live jam record |
| `/book` | public | Same page with the booking sheet open (Instagram story links). `/book?t=<token>` resumes a hold |
| `/pass/<token>` | attendee | QR pass. Venue only once `CONFIRMED`. Works offline after the first load |
| `/admin` | admin | Jam editor, pending queue (approve/reject + WhatsApp link), confirmed list, CSV, close early, comp passes, stage requests, waitlist, sources |
| `/door` | door, admin | Camera QR scan (BarcodeDetector, jsQR fallback), manual pass number, live `IN` count |
| `/counter` | counter, admin | Checked-in list; one "Mocktail served" per person |
| `/login` | staff | PIN login; sessions last 14 hours |

API: `GET /api/jam/current`, `POST /api/booking/hold`, `POST /api/booking/submit-utr`, `GET /api/pass/[token]`,
`POST /api/admin/{approve,reject,cancel,rotate,issue,jam}`, `GET /api/admin/{overview,export}`, `POST /api/door/scan`,
`POST /api/counter/serve`, `POST /api/performer`, `POST /api/waitlist`, `POST /api/track`.

## How the rules are enforced

- **No double-booking:** `createHold` locks the jam row `FOR UPDATE`, so holds are serialised per jam.
- **10-minute holds:** a `HELD` booking only counts while `hold_expires_at > now()`. Stale holds flip to `EXPIRED`
  inside the next hold transaction. A late UTR is still accepted if a seat is free.
- **One seat per phone:** a partial unique index on `(jam_id, phone)` over active states.
- **UTR used once:** a unique index on `booking.utr`.
- **Secret venue:** only `passView()` reads it, and only returns it for `CONFIRMED` / `CHECKED_IN`.
- **Pass token:** `HMAC(TOKEN_SECRET, id:rev)`, 192 bits. Only its SHA-256 is stored. "New QR" bumps `rev`.
- **One-time entry:** a single `UPDATE … WHERE state = 'CONFIRMED'`. Every scan goes to `scan_log`.

## Instagram tracking

Tag links as `https://<domain>/?utm_source=instagram&utm_medium=reel&utm_campaign=<name>` (medium: `bio`, `story` or `reel`).
The UTM is kept for the visit, stored on the booking, and summarised on `/admin` under "Bookings by source".
Analytics are first-party and cookieless (`analytics_event`, no IPs).

## Deploy (Vercel + Neon or Supabase)

Set the project's **Root Directory** to `onmic-site`. Add the variables from `.env.example`, using the pooled Postgres
URL for `DATABASE_URL`, then run `npm run db:setup` once against it.

## Still placeholder (brief §10)

These are marked `PLACEHOLDER` in the code:

- **Logo:** `src/components/Logo.tsx` is drawn from the description. Swap in the real SVG.
- **Vibes photos and clips:** `VIBES` in `src/lib/content.ts`.
- **Testimonials:** `QUOTES` in `src/lib/content.ts`.
- **Refund wording:** `REFUND_LINE` in `src/lib/content.ts`.
- **UPI ID, Instagram and WhatsApp links:** env vars.
- **Venue, date, price and capacity:** edit in `/admin`.

Headings for sections 03, 06 and 07 ("NEXT JAM, your seat's waiting.", "HEARD AT the last jam.",
"GOOD TO know.") are not in the brief. Confirm them against Figma.

Phase 2 (Jam Assist, brief §8) is intentionally not built. The brief schedules it after the first live jam.
