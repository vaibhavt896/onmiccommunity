# On Mic Community: complete asset brief

> Written before the creative kit arrived. Most items marked missing are now delivered; see [developer-handoff.md](developer-handoff.md) and [remaining-content.md](remaining-content.md) for the current state.

Everything the website needs from photographers, designers and the core team to go from "built" to "launch-ready".
Sizes are measured from the live CSS (1240px max content width, 20px mobile gutter, 48px desktop gutter), checked at 390px (phone) and 1440px (desktop).

**Legend**
- ✅ Done: already in the site.
- 🔴 P0: launch-blocking. The site looks unfinished or wrong without it.
- 🟠 P1: strongly recommended. This is what gets the "premium" feel.
- 🟢 P2: nice to have.
- **Wired** means the code already reads the file. **New slot** means I need to add a small code change when the file arrives.

---

## 0. Global delivery rules (apply to every file)

| Rule | Spec |
|---|---|
| Photo format | JPG or WebP (AVIF welcome as an extra), quality about 80, **sRGB**, no embedded EXIF or GPS |
| Photo weight | **250 KB or less** each (hero and background 300 KB or less) |
| Shoot / master size | Shoot at 24 MP or more and deliver the exact export sizes below, so the crop is intentional |
| Video | H.264 MP4, **no audio**, 8 s loop at most (hero: 12 s), **1.5 MB or less** (hero: 3.5 MB or less), plus a poster JPG |
| Vector | SVG with **outlined text** (no live fonts), no embedded raster |
| Naming | lowercase, hyphens, no spaces: `crowd.jpg`, `quote-riya.jpg` |
| Grade | Warm, dark, high-contrast venue look. Shadows toward violet/magenta, highlights warm. Avoid flat white walls and blown-out lights |
| Label safe zone | Tile labels sit **bottom-left**. Keep that corner calm (no faces, no bright highlights) |
| Consent | Written permission from every identifiable person; no minors without guardian consent; venue permission to publish |

**Palette (site tokens, for grading and artwork):** ink `#0d0616`, violet `#6b2cff`, violet-deep `#3a12a8`, magenta `#ff2e93`, lime `#c6ff3d`, orange `#ff7a2f`, sky `#47d7ff`, cream `#fff3e2`.
**Fonts (Google, nothing to supply):** Anton (display), Instrument Serif italic, DM Sans, Space Mono, Permanent Marker.

---

## 1. Brand and identity

| # | Asset | Spec | Where used | Priority | Status |
|---|---|---|---|---|---|
| 1.1 | Main logo, transparent raster | 1536 × 1024 (3:2), PNG and WebP, white lettering | Nav, footer, login, door, counter, admin, pass page, social card | | ✅ |
| 1.2 | **Main logo, true vector SVG** (outlined text, orange and white) | SVG, 3:2 artboard with the same clear space | Sharp at any size, print, LED screen at the venue | 🔴 P0 | Missing. The kit's raster is an AI reproduction, so the original design file is needed |
| 1.3 | **Simplified symbol** (ON waveform or "M" note, no small script) | SVG, **1:1**, designed to read at 16 px | Favicon, app icon, avatar, tiny nav use | 🟠 P1 | Missing. The current favicon is the full logo shrunk to 16–32 px, where "Community" is unreadable |
| 1.4 | Dark-lettered logo variant (ink `#0d0616` instead of white) | SVG, 3:2 | Cream or light backgrounds, printed flyers, invoices | 🟢 P2 | Missing |
| 1.5 | One-colour logo (all white, all ink) | SVG, 3:2 | Stamps, merch, watermark on photos | 🟢 P2 | Missing |
| 1.6 | Browser icons (16, 32, 48, 180, 192, 512, ICO) | PNG, ICO | Tabs, bookmarks, home screen | | ✅ (fallback, replace after 1.3) |
| 1.7 | **Maskable app icon** | **512 × 512**, PNG, full bleed. Artwork inside the central **80% circle (410 px)** | Android home-screen install (avoids ugly crop) | 🟠 P1 | Missing |
| 1.8 | Apple touch icon (from symbol) | 180 × 180, **opaque** (no transparency), full-bleed ink `#0d0616` | iOS home screen | 🟠 P1 | Existing one has a grey square. Redo from 1.3 |
| 1.9 | Brand guideline (1 page) | PDF, covering clear space, minimum size, do and don't | Keeps designers consistent | 🟢 P2 | Missing |

**Minimum logo sizes to design for:** 90 × 60 px (mobile nav), 120 × 80 px (desktop nav), 165 × 110 px (footer), 180 × 120 px (login).

---

## 2. Hero (top of the page)

The hero is currently a film rendered from code (`/hero-film`), already shipped in `public/hero/`. **Nothing is needed here unless you want real footage in place of it.**

Current delivery: 16:9 (1920 × 1080, about 3.1 MB MP4) and 9:16 (1080 × 1920, about 2.8 MB MP4), each with JPG, WebP and AVIF posters.

If you shoot **real hero footage** instead, deliver both cuts:

| Asset | Spec | Notes |
|---|---|---|
| Desktop cut | **16:9, 1920 × 1080**, 30 or 60 fps, H.264 High, `yuv420p`, no audio, 12 s **seamless loop**, 3.5 MB or less (CRF about 28–30) | On wide short screens the box can be slightly shorter than 16:9, so keep action in the **central 80% vertically** (object-position is about 40%) |
| Mobile cut | **9:16, 1080 × 1920**, same codec, 12 s loop, 3.5 MB or less | The phone hero is exactly 9:16 |
| Poster stills (both cuts) | JPG, WebP and AVIF, 180 KB or less each. Frame at **2.30 s** | Paints before the video loads (this is the largest paint on the page, so keep it light) |
| Safe zones | Top **90 px** (1080-wide scale: top 7%) stays quiet for the nav and logo. Bottom **25%** stays quiet for the "Grab your seat" button and pause control | Both cuts |
| Content | Stage lights, mic close-up, crowd hands, ticket moment; a violet/magenta wash so cream type stays legible | |

---

## 3. "The vibes" photo wall (section 04) ✅ **Wired**: the tile code supports `image` and `video`; once the files are in `public/vibes/` I add the four paths in `src/lib/content.ts`

Four tiles. Each uses one image on phone **and** desktop, cropped with `cover`. Sizes below include the 24 px top and bottom overscan the scroll-parallax needs.

| Tile | Phone box | Desktop box | **Aspect to deliver** | **Export** | File |
|---|---|---|---|---|---|
| The crowd (large, has the LIVE chip top-right) | 350 × 362 | 562 × 488 | **5:4** | **1600 × 1280** | `public/vibes/crowd.jpg` |
| Mic drop | 168 × 198 | 271 × 258 | **1:1** | **1200 × 1200** | `public/vibes/drop.jpg` |
| Live jam | 168 × 198 | 271 × 258 | **1:1** | **1200 × 1200** | `public/vibes/jam.jpg` |
| Open stage. Open hearts. (wide) | 350 × 198 | 562 × 258 | **2:1** | **2000 × 1000** | `public/vibes/open.jpg` |

- Subject in the **central 70–80%**. Phones trim about 10–15% off the left and right edges.
- Bottom-left stays calm for the label (34 px phone, 48 px desktop, cream with a hard ink shadow).
- **Suggested content:** Crowd = wide shot, hands up, warm stage glow. Mic drop = close-up of a performer at the mic or a mic being handed over. Live jam = guitar, keys or beatbox close-up. Open stage = wide, welcoming, lots of faces smiling or clapping.
- **Optional video:** each tile also accepts a looping clip at the same aspect ratio, 1280 px wide at most, 5–8 s, 1.5 MB or less, no audio, plus a poster still.

---

## 4. Section-by-section: what else would lift the page

The rest of the page is typographic by design. These are the optional image slots that would add the "real community" feeling. All of these need me to add a small code change (**new slot**).

### 4.1 "The vibe, in numbers" (section 01, cream): 🟢 P2
No images are needed. The three stat cards (60+, 10K, price) are typographic.
- **Data to confirm:** "60+ humans on a normal jam night" and "10K average reel views" must be real and current.

### 4.2 "How it works" (section 02, ink): 🟠 P1
Three step cards (01 Book, 02 QR pass, 03 Scan and shine). Add a small illustration per card for a more finished look.

| Asset | Spec |
|---|---|
| 3 sticker-style illustrations or 3D icons (phone with UPI, QR ticket, mic and mocktail) | **SVG or transparent PNG, 1:1, 320 × 320** (displayed at about 96–128 px), palette limited to the tokens above, thick ink outline to match the cards |

### 4.3 "Next jam" ticket (section 03, magenta): 🟢 P2
Fully coded (date, seats, price are live). Optional: a subtle halftone or paper-grain texture, **transparent PNG, 1024 × 1024, tileable**.

### 4.4 "Got something to say?" (section 05, lime): 🟠 P1
Seven act chips: SING, RAP, POETRY, STAND-UP, GUITAR / KEYS, BEATBOX, JUST VIBE.

| Asset | Spec |
|---|---|
| 7 small act icons or stickers (one per chip) | SVG, **1:1**, drawn on a 24 px grid, single colour (ink), so they can sit inside the chips at 20–24 px |
| Optional large side visual: a performer cut-out on the stage | **Transparent PNG/WebP, 4:5, 1000 × 1250**, 200 KB or less; desktop shows it beside the chips |

### 4.5 "Heard at the last jam" quotes (section 06): 🔴 P0 for content, 🟠 P1 for photos
Three sticky-note quotes. The current names and quotes (Riya, Aman, Sneha) are **invented placeholders**.

| Asset | Spec |
|---|---|
| **3 real quotes** with first name and descriptor, each written permission | Text, 140 characters or less each |
| Optional face for each quote | **1:1, 480 × 480**, JPG or WebP, 40 KB or less, face centred, shown as a circle at about 56–64 px |

### 4.6 Final call to action (violet, "YOUR SEAT. YOUR STAGE."): 🟠 P1
Currently an animated colour wash. A real photo behind it would make the close feel alive.

| Asset | Spec |
|---|---|
| Desktop background | **16:9, 2560 × 1440**, JPG or WebP, 300 KB or less. Crowd or stage, dark, we overlay a violet gradient |
| Mobile background | **4:5, 1200 × 1500**, 200 KB or less. Same mood, subject in the upper half |

### 4.7 Footer: 🟠 P1
| Asset | Spec |
|---|---|
| Instagram and WhatsApp links | Real URLs (see section 7) |
| Partner or venue logos strip (optional) | SVG, white one-colour, **height 40 px**, any width |

---

## 5. Booking, pass and staff screens

| # | Asset | Spec | Priority | Status |
|---|---|---|---|---|
| 5.1 | **Venue cover photo** per jam, shown on the pass once payment is verified (reveals the secret venue) | **16:9, 1600 × 900**, 200 KB or less, one per venue | 🟠 P1 | New slot. Needs a database field and a code change |
| 5.2 | Venue name and Google Maps link per jam | Text and URL | 🔴 P0 | Entered in the admin screen per jam |
| 5.3 | UPI QR | Generated live from your UPI ID. **No design file needed**, just the UPI ID | 🔴 P0 | Wired. Needs the real UPI ID (section 7) |
| 5.4 | Downloadable pass image | Generated by the code | | ✅ |
| 5.5 | Confetti, haptics, sounds | Coded | | ✅ |
| 5.6 | Door scanner, counter, admin | Utility screens, the logo is the only asset | | ✅ |

---

## 6. Social and sharing (off-site, but part of the "full vibe")

| # | Asset | Spec | Priority | Status |
|---|---|---|---|---|
| 6.1 | Open Graph / Twitter / WhatsApp link card | **1200 × 630** (1.91:1) PNG | | ✅ Auto-generated with the live date |
| 6.2 | Instagram story template for "Book now" (deep link `/book`) | **1080 × 1920** (9:16). Keep top and bottom **250 px** free for the platform UI | 🟠 P1 | Missing |
| 6.3 | Instagram feed post template | **1080 × 1350** (4:5) | 🟠 P1 | Missing |
| 6.4 | Reel cover template | **1080 × 1920**, key content inside the centre **1080 × 1440** (3:4 grid crop) and inside the centre 1:1 square | 🟠 P1 | Missing |
| 6.5 | Instagram profile photo | **320 × 320**, 1:1, centred in a circle (use the simplified symbol 1.3) | 🟠 P1 | Missing |
| 6.6 | Story highlight covers (4–5) | **1080 × 1920**, icon centred in the central 1:1 | 🟢 P2 | Missing |
| 6.7 | WhatsApp community / profile icon | **640 × 640**, 1:1 | 🟠 P1 | Missing |
| 6.8 | WhatsApp pass-message image (optional) | 800 × 418 (1.91:1) | 🟢 P2 | Missing |

---

## 7. Content and data (not images, but the site cannot launch without them)

| # | Item | Needed | Priority |
|---|---|---|---|
| 7.1 | **UPI ID** and the account name shown at payment | `NEXT_PUBLIC_UPI_ID`, `NEXT_PUBLIC_UPI_NAME` | 🔴 P0 |
| 7.2 | **Instagram URL** | `NEXT_PUBLIC_INSTAGRAM_URL` | 🔴 P0 |
| 7.3 | **WhatsApp community invite link** | `NEXT_PUBLIC_WHATSAPP_URL` | 🔴 P0 |
| 7.4 | **Live domain** | `NEXT_PUBLIC_SITE_URL`, so social cards and the sitemap use the right address | 🔴 P0 |
| 7.5 | **Database URL** (Postgres) | `DATABASE_URL`, then run `npm run db:setup` | 🔴 P0 |
| 7.6 | Staff PINs and roles | Create with `npm run staff:add` | 🔴 P0 |
| 7.7 | **Refund and cancellation wording** | Final text from the core team. The current line is a placeholder | 🔴 P0 |
| 7.8 | **Privacy page** review | Contact person and how deletion requests are handled. Legal check | 🟠 P1 |
| 7.9 | Real stats (60+, 10K) | Confirm or correct | 🔴 P0 |
| 7.10 | Next jam: date, time, seat count (50 now), price, venue | Entered in the admin screen | 🔴 P0 |
| 7.11 | FAQ review (venue, friends, payment, performing) | Confirm the wording is accurate | 🟠 P1 |
| 7.12 | Legal entity name and address (footer, privacy) | Text | 🟠 P1 |
| 7.13 | Sponsor and venue partner permissions to show their logos | Written OK | 🟢 P2 |

---

## 8. Shoot list (one session covers most of this)

If you only book **one photo and video session**, capture these:

1. **Crowd wide**: hands up, warm glow. Used for the crowd tile and the final background (sections 3, 4.6).
2. **Open stage wide**: welcoming room, smiles, applause (section 3).
3. **Mic drop close-up**: performer at the mic (section 3).
4. **Live jam close-up**: guitar, keys, beatbox (section 3).
5. **Portrait headshots** of 3 regulars who gave quotes, plain dark background, face centred (4.5).
6. **Venue interior** for each jam location, daylight and night (5.1).
7. **Performer cut-out shot**: single performer on a plain backdrop for the stage section (4.4).
8. **8-second loops** of 2–3 moments (crowd clap, guitar, mic hand-off) in both 1:1 and 2:1 framing for video tiles (section 3).
9. **Hero footage** only if you want to replace the coded film (section 2).

Shoot tips: shoot vertical and horizontal of every moment, keep subjects central, leave room at the bottom-left, shoot RAW or high-quality JPG at 24 MP or more, and grade warm with violet shadows.

---

## 9. Launch priority summary

**🔴 P0 (cannot launch without):** 4 vibe photos (section 3), real quotes (4.5), vector logo (1.2), UPI/IG/WA/domain/DB/PINs (7.1–7.6), refund text (7.7), real stats (7.9), first jam entered (7.10).

**🟠 P1 (makes it look premium):** simplified symbol and proper favicon/app icons (1.3, 1.7, 1.8), step illustrations (4.2), act icons (4.4), quote portraits (4.5), final CTA background (4.6), venue cover photo (5.1), social templates (6.2–6.5, 6.7), privacy review (7.8), FAQ review (7.11).

**🟢 P2 (polish):** dark and one-colour logo variants, brand guideline, ticket texture, partner logos, highlight covers.

---

## 10. Where files go

```
public/
  vibes/      crowd.jpg  drop.jpg  jam.jpg  open.jpg        (+ optional .mp4 and poster)
  brand/      onmic-logo.svg  onmic-symbol.svg  onmic-logo-ink.svg   (+ the existing PNG/WebP sizes)
    icons/    onmic-icon-maskable-512.png  apple-touch-180.png
  hero/       (existing; replace only if using real footage)
  people/     quote-<name>.jpg                                (480 × 480)
  stage/      performer.webp                                  (1000 × 1250, transparent)
  final/      crowd-16x9.jpg  crowd-4x5.jpg
  steps/      book.svg  pass.svg  scan.svg
  acts/       sing.svg  rap.svg  poetry.svg  standup.svg  keys.svg  beatbox.svg  vibe.svg
  venues/     <venue-name>.jpg                                (1600 × 900)
```
