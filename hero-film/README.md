# On Mic — hero film source

A 12-second seamless loop rendered entirely from code (no video editor).
Every frame is a pure function of time: `window.seek(t)` in `film.js` paints frame *t*,
Playwright captures it, ffmpeg stitches it. Same input → identical video, every run.

## Files
- `index.html` — stage, fonts (Anton, Instrument Serif, Space Mono, DM Sans), layers
- `film.js` — the whole film: springs, 3D mic + vinyl (Three.js), type, ticket, timeline
- `render.mjs` — renderer (60 fps, 3 subframes per frame blended for real motion blur)
- `docs/style_guide.md`, `docs/shotlist.md` — the direction the film was built against

## Preview live
```
npm i three playwright @fontsource/anton @fontsource/instrument-serif @fontsource/space-mono @fontsource/dm-sans
python3 -m http.server 8800
open "http://localhost:8800/index.html?w=1920&h=1080"     # or ?w=1080&h=1920 for mobile
```

## Render
```
node render.mjs --w 1920 --h 1080 --fps 60 --sub 3 --out out/master-16x9.mp4
node render.mjs --w 1080 --h 1920 --fps 60 --sub 3 --out out/master-9x16.mp4
node render.mjs --w 1920 --h 1080 --stills 1.2,2.25,4.4 --out out/stills     # check frames
```
(`render.mjs` points at a Chromium path in `executablePath`; delete that option on your Mac
and run `npx playwright install chromium` once.)

## Editing
- Timings live in `seek(t)`, one block per shot, on a 120 BPM grid (beat = 0.5 s).
- Words in the flash sequence: the `WORDS` array.
- Ticket copy: `buildTicket()`.
- Colours: `C` at the top — same tokens as the site.

## Encode for the website
The site serves one H.264 file per cut from `public/hero/`, starting on the poster frame (2.30 s).
Keep the keyframe at 2.3 s so that start seek is instant.
```
for c in 16x9 9x16; do
  ffmpeg -i out/master-$c.mp4 -an -c:v libx264 -preset veryslow -crf 29 -profile:v high -pix_fmt yuv420p \
    -g 60 -keyint_min 60 -sc_threshold 0 -force_key_frames "0,2.3" -movflags +faststart ../public/hero/onmic-hero-$c.mp4
  ffmpeg -ss 2.3 -i out/master-$c.mp4 -frames:v 1 -q:v 4 ../public/hero/onmic-hero-$c.jpg
  ffmpeg -i ../public/hero/onmic-hero-$c.jpg -c:v libaom-av1 -still-picture 1 -crf 32 ../public/hero/onmic-hero-$c.avif
  ffmpeg -i ../public/hero/onmic-hero-$c.jpg -c:v libwebp -quality 80 ../public/hero/onmic-hero-$c.webp
done
```
CRF 29 scores VMAF ~93 against the master at a little over half the size. If you change the poster
frame, update `POSTER_T` in `src/components/landing/HeroFilm.tsx`.
