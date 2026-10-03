"use client";

import { useEffect, useRef, useState } from "react";
import { useMotionState } from "./motion-state";

/**
 * The hero film: a 12 s seamless loop rendered from code (source in /hero-film).
 * Phone-shaped screens (w/h ≤ 0.7) get the 9:16 cut, everything else (tablets included) the
 * 16:9 cut; only one file downloads. Keep TALL in sync with the hero CSS in globals.css.
 *
 * The poster is server-rendered, so it paints (and counts as LCP) before any JS runs.
 * Both posters are the film's frame at 2.30 s, so the video seeks there before it plays and
 * is only revealed once frames are flowing: the poster → film handoff is invisible.
 * The video itself is fetched only after the page has loaded, so it never competes with
 * fonts, JS or the poster.
 *
 * H.264 only: at matched visual quality VP9 was no smaller on this film, and at the size
 * where it won it showed blocking in the dark gradients.
 *
 * Poster only, no video: reduced motion, Save-Data, or autoplay refused (iOS Low Power Mode).
 */
const BASE = "/hero";
const POSTER_T = 2.3 + 1 / 120; // middle of the poster frame at 60 fps

type Cut = "9x16" | "16x9";
const TALL = "(max-aspect-ratio: 7/10)";

/** Resolves after window load plus an idle moment. */
function afterLoad(cb: () => void): () => void {
  let cancelled = false;
  const idle = window.requestIdleCallback ?? ((f: () => void) => window.setTimeout(f, 300));
  const go = () => idle(() => !cancelled && cb(), { timeout: 1500 });
  if (document.readyState === "complete") go();
  else window.addEventListener("load", go, { once: true });
  return () => {
    cancelled = true;
    window.removeEventListener("load", go);
  };
}

export function HeroFilm() {
  const ref = useRef<HTMLVideoElement>(null);
  const [cut, setCut] = useState<Cut | null>(null);
  const [live, setLive] = useState(false);
  const { paused } = useMotionState();
  const pausedRef = useRef(paused);
  const visibleRef = useRef(true);
  const readyRef = useRef(false);

  const sync = () => {
    const v = ref.current;
    if (!v || !readyRef.current) return;
    if (visibleRef.current && !pausedRef.current) v.play().catch(() => {});
    else v.pause();
  };

  useEffect(() => {
    const portrait = matchMedia(TALL);
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
    const update = () => {
      readyRef.current = false;
      setLive(false);
      setCut(reduce.matches || saveData ? null : portrait.matches ? "9x16" : "16x9");
    };
    update();
    portrait.addEventListener("change", update);
    reduce.addEventListener("change", update);
    return () => {
      portrait.removeEventListener("change", update);
      reduce.removeEventListener("change", update);
    };
  }, []);

  // Load the chosen cut; pause while the hero is offscreen.
  useEffect(() => {
    const v = ref.current;
    if (!v || !cut) return;
    v.muted = true; // iOS needs the property, not only the attribute
    const cancelLoad = afterLoad(() => {
      v.src = `${BASE}/onmic-hero-${cut}.mp4`;
      v.load();
    });
    const io = new IntersectionObserver(([e]) => {
      visibleRef.current = e.isIntersecting;
      sync();
    }, { threshold: 0.1 });
    io.observe(v);
    return () => {
      cancelLoad();
      io.disconnect();
      v.pause();
      v.removeAttribute("src");
      v.load();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cut]);

  // Global "pause motion" control.
  useEffect(() => {
    pausedRef.current = paused;
    sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused]);

  return (
    <>
      <picture>
        <source media={TALL} type="image/avif" srcSet={`${BASE}/onmic-hero-9x16.avif`} />
        <source media={TALL} type="image/webp" srcSet={`${BASE}/onmic-hero-9x16.webp`} />
        <source media={TALL} srcSet={`${BASE}/onmic-hero-9x16.jpg`} />
        <source type="image/avif" srcSet={`${BASE}/onmic-hero-16x9.avif`} />
        <source type="image/webp" srcSet={`${BASE}/onmic-hero-16x9.webp`} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${BASE}/onmic-hero-16x9.jpg`} alt="" width={1920} height={1080} fetchPriority="high" className="hero-media" />
      </picture>
      {cut && (
        <video
          key={cut}
          ref={ref}
          className="hero-media hero-video"
          data-live={live}
          muted
          loop
          playsInline
          preload="auto"
          disablePictureInPicture
          disableRemotePlayback
          aria-hidden="true"
          tabIndex={-1}
          onLoadedMetadata={(e) => {
            e.currentTarget.currentTime = POSTER_T;
          }}
          onSeeked={() => {
            if (readyRef.current) return;
            readyRef.current = true;
            sync();
          }}
          onPlaying={() => setLive(true)}
        />
      )}
    </>
  );
}
