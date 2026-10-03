# On Mic hero film — style guide

## The film in one line
The stage light snaps on, the mic is yours, the room is waiting: **your turn.**
The viewer should feel the adrenaline right before you step up to the mic, then want a seat.

## Reference grammar (taken, not copied)
- **Apple product films:** one hero object lit on black, glossy reflections and rim light,
  slow push-ins during holds, huge type that sits *behind* the object, hard cuts on the beat.
- **Viral Opus/HyperFrames reels:** a new technique every 1.5–2 s, kinetic type in masks
  (never fades), match cuts between shapes, springs with a hair of overshoot.
- **Gen Z brand spots (Spotify Wrapped / Nike):** full-bleed colour-block flashes on
  8th-notes, mixed type styles (filled / outline / serif italic) in one sequence.

## Palette (from the live site)
| token   | hex       | use |
|---------|-----------|-----|
| ink     | `#0D0616` | stage black, base of every shot |
| cream   | `#FFF4E6` | primary type |
| lime    | `#C6FF3D` | the one hero accent: mic ring, dot, outlines |
| magenta | `#FF2E93` | "TURN.", colour-block flash, rim light |
| violet  | `#4A1FE0` | hero glow, colour-block flash |
| orange  | `#FF7A2F` | vinyl label, sticker, flash |
| cyan    | `#3FD0FF` | one flash only |

## Type (the site's own system)
- **Anton** — every display word. Tight tracking (-1 to -2%), cropped by the frame when huge.
- **Instrument Serif Italic** — one soft line per film ("open mic + jam nights", "poetry").
- **Space Mono Bold** — small UI details on the ticket only. Never in corners.

## Motion rules
- Every value is a pure function of time (`seek(t)`); closed-form springs only.
- Snappy (k 320, d 30) for type slams, default (170/26) for objects, heavy (90/20) for camera.
- Nothing is ever static: holds get a 3–6 % push-in or a slow orbit.
- Type enters through masks or scale slams, leaves by cut or mask. No fade-ins.
- Transitions are match cuts on the **circle motif** (dot → shockwave → mic grille →
  record → dot) or a shape morph (flash background → ticket).
- 120 BPM grid: cuts on beats (0.5 s), flashes on 8ths (0.25 s).

## Banned
Centered title on a gradient · everything fading in · corner labels · frame borders ·
generic particle bursts · glow on UI · stale facts baked in (dates, prices, seat counts).

## Loop
Last frame = first frame: the lockup collapses into the lime dot the film opens on.
