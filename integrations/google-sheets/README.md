# Google Sheet sync

Form submissions are copied to a Google Sheet for the core team, using a Google **service account** and the Sheets API v4 (no extra npm packages). Postgres stays the source of truth: every sheet write runs after the response is sent and never throws, so a Sheet problem can never delay or break a visitor's submission.

| Tab | Written when | Columns |
| --- | --- | --- |
| `Waitlist` | someone joins the waitlist (a repeat signup with the same number adds nothing) | Submitted at (ISO), Name, WhatsApp |
| `Performers` | someone requests a stage slot | Submitted at (ISO), Name, WhatsApp, Acts, Notes |
| `Jam Bookings` | a seat is held, a UTR is sent, the team approves / rejects / cancels, a comp pass is issued, the person is scanned in, a mocktail is served, or a hold expires. One row per booking, **updated in place**. | Pass, Status, Name, WhatsApp, Instagram, Ticket, Amount, UTR, Jam, UTM source/medium/campaign, Booked / UTR sent / Confirmed / Checked in / Mocktail times (IST), ID |

`Waitlist` and `Performers` must already exist with the headers above in row 1. `Jam Bookings` is created automatically (header row included). Set `GOOGLE_SHEET_BOOKINGS_TAB=off` to skip booking rows. The code never writes to any other tab (the other site's `Community Signups`, `Bookings`, … are left alone). Pass links and QR tokens are never written.

## Set up

1. In Google Cloud, create a **service account**, enable the **Google Sheets API** for the project, and create a JSON key.
2. **Share the spreadsheet with the service account's `client_email` as Editor.** Never ask the sheet owner for their private key.
3. Add the variables to `.env.local` and to Vercel (Production and Preview). See `.env.example`; none of them may start with `NEXT_PUBLIC_`:
   ```
   GOOGLE_SHEET_ID=1ZwNLGliOkhG6dua-EwA-EQw5vBtP_llF1dnSylkOppE
   GOOGLE_SERVICE_ACCOUNT_EMAIL=<client_email>
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
   GOOGLE_SHEET_WAITLIST_TAB=Waitlist
   GOOGLE_SHEET_PERFORMER_TAB=Performers
   GOOGLE_SHEET_BOOKINGS_TAB=Jam Bookings
   ```
   `GOOGLE_PRIVATE_KEY` is one line with literal `\n` sequences inside double quotes.
4. Redeploy. Optional: in **/admin → Sync bookings to Sheet**, load every existing booking once (safe to repeat; rows are matched on ID).

If the variables are unset the site works as before and simply skips the sheet.

## Troubleshooting (server log lines)

| Log | Cause |
| --- | --- |
| `Google token exchange failed (400/401)` | Wrong `GOOGLE_SERVICE_ACCOUNT_EMAIL`, or `GOOGLE_PRIVATE_KEY` is malformed (check the `\n` handling) |
| `Sheets append failed (403)` | Sheet not shared with the service account as Editor, or the Sheets API isn't enabled |
| `Sheets append failed (400)` | The tab doesn't exist (check the `GOOGLE_SHEET_*_TAB` names) |
| `fetch failed` | Google couldn't be reached; the row is still in Postgres |
| nothing logged, no row | Env vars missing: the sync silently does nothing when not configured |

## Test without Google

`mock-google.mjs` stands in for Google's token endpoint and Sheets API. It checks the RS256 signature of the service-account JWT, requires a bearer token, and serves `GET /dump` to inspect every tab (including a pre-filled `Community Signups` tab that must stay untouched). Instructions are at the top of the file. `GOOGLE_TOKEN_URL` and `GOOGLE_SHEETS_API` exist only to point the app at it.
