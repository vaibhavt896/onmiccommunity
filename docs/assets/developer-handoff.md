# Developer handoff

## Apply the visual kit

1. Merge this kit's `public/` contents into the project's `public/`. The four vibe filenames match the brief. Existing hero and full-logo rasters are included for convenience and were not redesigned.
2. Review `website-assets.patch` against the current branch. It was prepared from the user's supplied source folder, not fetched from the deployment's Git branch. Check with `git apply --check /path/to/website-assets.patch` before applying. Equivalent full replacement files are under `integration/src/`; choose the patch or the replacement files, not both.
3. Run the project's typecheck and build in its configured development environment. The patch applies cleanly to the supplied source. The patched app passed TypeScript checking in an isolated copy; the full Next.js application was not built or deployed.
4. Review the website at 390 px and desktop width, especially the bento labels, stage cut-out, selected act icons and final CTA. The standalone `index.html` in this kit previews the crop layout without booting the booking app.

## What the patch changes

- `src/lib/content.ts`: adds WebP image paths to four existing VIBES entries; adds three step icon paths.
- `Landing.tsx`: renders the three decorative step stickers and a desktop-only transparent stage performer.
- `ActPicker.tsx`: renders seven act icons as CSS masks, so selected chips inherit the correct foreground colour.
- `globals.css`: adds icon-mask sizing, desktop/mobile final CTA backgrounds, and a light ticket texture.
- `manifest.ts`: adds the maskable 512 icon.
- `layout.tsx`: references the new favicon family and opaque Apple touch icon.

The patch retains the existing hero, live jam state and booking logic. It does not remove the current invented testimonials, because real replacements must come from the community. Do not publish them as real quotes.

## Optional brand switch

`public/brand/onmic-logo.svg` is a cleaned vector reconstruction of the local site's supplied raster logo. It has outlined geometry, no embedded raster and the same 3:2 artboard. `onmic-logo-ink.svg`, `onmic-logo-white.svg` and `onmic-logo-mono-ink.svg` are included. Existing `Logo.tsx` continues to use the preserved raster family; switch to the vector only after a visual brand review. The original designer source remains the preferred reference for print-critical accuracy.

`onmic-symbol.svg` is the new simple music/waveform mark. All tab, app and profile exports use this mark. The maskable artwork stays within the central 80% circle. Apple touch is fully opaque with an ink background.

## File use and compression

Prefer WebP on the website; JPG companions are provided. Crop using `cover`, centered, with the existing 24 px parallax overscan. Do not bake text into the vibe photos. The desktop open tile crops the top/bottom more than the mobile version; central performers remain visible.

`photo-exports.json` records actual dimensions, bytes and quality values. All new website JPG/WebP photos are within their brief budgets. New photo exports contain no EXIF/GPS. The transparent performer PNG is intentionally a lossless working companion; use the smaller WebP in production.

The preserved existing hero files are not new AI video footage and were not re-encoded. The existing auto-generated social share card and pass image stay in code. New optional tile videos were not created from stills and are not needed for the image implementation.

## Social assets

- Book-now story: 1080 x 1920, top/bottom 250 px clear.
- Community feed: 1080 x 1350.
- Reel cover: 1080 x 1920; important headline within central square and 3:4 crop.
- Instagram profile: 320 x 320. WhatsApp profile: 640 x 640.
- Five highlight covers: 1080 x 1920, central square icon.
- WhatsApp pass message: 800 x 418, evergreen artwork without fake booking details or QR codes.

`social/templates/*.svg` contains editable copy and relative links into `public/vibes/`; retain the folder structure when editing. The final PNG files are ready to upload. Condensed display, Georgia italic and monospaced detail typography are used in social exports; the website's existing Google-font configuration remains Anton / Instrument Serif / DM Sans / Space Mono / Permanent Marker. Editable SVGs declare common font fallbacks so another editor can substitute the website fonts. No system font binaries are redistributed.

For a story link sticker, set the actual destination to `https://onmiccommunity.vercel.app/book`. Check availability first. The `/book` route exists in the supplied app but the live homepage currently shows a waitlist state.

## Venue cover

`public/venues/reference-cafe.*` is a crop of the supplied `IMG20260530191525.jpg`, not an invented venue. It contains actual attendees. Confirm the cafe name, date and publication permission before mapping it to a jam. No made-up venue name or map link is included. The pass screen has no wired venue-image field yet; add an explicit cover field or static mapping only after venue identity is known. Never reveal a secret venue image publicly before booking if the venue policy requires privacy.

## Accessibility and provenance

Decorative stickers and act glyphs use empty alt text / aria-hidden. The new stage performer has descriptive alt text. Existing bento captions remain the accessible text. AI promotional scenes should not be attached to named quote authors or described as actual attendees. Use real portraits only for consented testimonials.

See `REMAINING-CONTENT.md` for launch inputs that visual assets cannot supply.
