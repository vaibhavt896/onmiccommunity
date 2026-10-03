"use client";

import { useEffect } from "react";
import { reducedMotion } from "@/lib/track";
import { getMotionState, setMotionState, subscribeMotion, useMotionState } from "./motion-state";

/** Pause / play for every loop on the page, including the hero film (WCAG 2.2.2). */
export function HeroControls({ compact = false }: { compact?: boolean }) {
  const { paused } = useMotionState();
  const toggle = () => setMotionState({ paused: !paused });
  if (compact) {
    return (
      <button type="button" className="min-h-[44px] underline underline-offset-4" aria-pressed={paused} onClick={toggle}>
        {paused ? "▶ PLAY MOTION" : "❚❚ PAUSE MOTION"}
      </button>
    );
  }
  return (
    <button type="button" className="hero-pause" data-hero="pause" aria-pressed={paused} aria-label={paused ? "Play motion" : "Pause motion"} onClick={toggle}>
      {paused ? (
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M7 4.5v15l12.5-7.5z" fill="currentColor" /></svg>
      ) : (
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><rect x="5.5" y="4.5" width="4.5" height="15" rx="1.2" fill="currentColor" /><rect x="14" y="4.5" width="4.5" height="15" rx="1.2" fill="currentColor" /></svg>
      )}
    </button>
  );
}

declare global {
  interface Window { __onmicMotion?: boolean }
}

/* ------------------------------------------------------------------ motion */
export function Motion() {
  useEffect(() => {
    let dead = false;
    const cleanups: Array<() => void> = [];
    const reduce = reducedMotion();
    const $ = <T extends Element = HTMLElement>(s: string, root: ParentNode = document) => [...root.querySelectorAll<T>(s)];

    (async () => {
      const { gsap } = await import("gsap");
      if (dead) return;
      window.__onmicMotion = true;

      const hero = document.getElementById("top")!;
      const heroLoops: gsap.core.Animation[] = [];

      /* ---------- global pause ---------- */
      const applyPause = () => {
        const { paused } = getMotionState();
        document.documentElement.classList.toggle("motion-paused", paused);
        if (paused) gsap.globalTimeline.pause();
        else gsap.globalTimeline.resume();
      };
      cleanups.push(subscribeMotion(applyPause));

      if (reduce) {
        // Final states instantly; only a 150ms fade.
        gsap.fromTo("#main", { opacity: 0 }, { opacity: 1, duration: 0.15 });
        return;
      }

      const ctx = gsap.context(() => {
        /* ---------- hero load sequence ----------
           The film is the headline now, so the chrome lands fast around it and
           the CTA is on screen by ~1s (tappable from the first frame regardless). */
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
        tl.fromTo('[data-hero="logo"]', { y: -70 }, { y: 0, duration: 0.7, ease: "back.out(1.7)" }, 0.15);
        tl.fromTo('[data-hero="navpill"]', { x: 90, opacity: 0 }, { x: 0, opacity: 1, duration: 0.6, ease: "back.out(1.7)" }, 0.15);
        tl.fromTo('[data-hero="chip"]', { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(2)" }, 0.3);
        tl.fromTo('[data-hero="pause"]', { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(2)" }, 0.35);
        tl.fromTo('[data-hero="cta"]', { y: 44, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, 0.45);
        tl.fromTo('[data-hero="note"]', { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0.6);
        tl.fromTo(".tape-lime", { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.7, ease: "power3.inOut" }, 0.7);
        tl.fromTo(".tape-mag", { clipPath: "inset(0 0 0 100%)" }, { clipPath: "inset(0 0 0 0%)", duration: 0.7, ease: "power3.inOut" }, 0.7);

        /* ---------- idle loops ---------- */
        // CTA arrow nudges right every 2.5s.
        const arrow = document.querySelector("[data-herocta] .cta-arrow");
        if (arrow) {
          const nudge = gsap.timeline({ repeat: -1, repeatDelay: 2.14, delay: 1.2 });
          nudge.to(arrow, { x: 7, duration: 0.18, ease: "power2.out", yoyo: true, repeat: 1 });
          heroLoops.push(nudge);
        }
        // Tapes: lime left at 40px/s, magenta right at 55px/s.
        const [limeTrack, magTrack] = $("[data-tape]");
        const halfL = limeTrack.scrollWidth / 2;
        const halfM = magTrack.scrollWidth / 2;
        heroLoops.push(gsap.fromTo(limeTrack, { x: 0 }, { x: -halfL, duration: halfL / 40, ease: "none", repeat: -1 }));
        heroLoops.push(gsap.fromTo(magTrack, { x: -halfM }, { x: 0, duration: halfM / 55, ease: "none", repeat: -1 }));
      });
      cleanups.push(() => ctx.revert());

      // Kill hero loops while the hero is offscreen.
      const io = new IntersectionObserver(([e]) => {
        heroLoops.forEach((l) => (e.isIntersecting ? l.resume() : l.pause()));
      });
      io.observe(hero);
      cleanups.push(() => io.disconnect());

      /* ---------- tilt toward touch or cursor (max 4°) ---------- */
      $("[data-tilt]").forEach((el) => {
        const move = (e: PointerEvent) => {
          const r = el.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - 0.5;
          const py = (e.clientY - r.top) / r.height - 0.5;
          gsap.to(el, { rotationY: gsap.utils.clamp(-4, 4, px * 8), rotationX: gsap.utils.clamp(-4, 4, -py * 8), transformPerspective: 700, duration: 0.3, ease: "power2.out" });
        };
        const release = () => gsap.to(el, { rotationX: 0, rotationY: 0, duration: 0.6, ease: "elastic.out(1, 0.5)" });
        el.addEventListener("pointermove", move);
        el.addEventListener("pointerdown", move);
        el.addEventListener("pointerleave", release);
        el.addEventListener("pointerup", release);
        el.addEventListener("pointercancel", release);
        cleanups.push(() => {
          el.removeEventListener("pointermove", move);
          el.removeEventListener("pointerdown", move);
          el.removeEventListener("pointerleave", release);
          el.removeEventListener("pointerup", release);
          el.removeEventListener("pointercancel", release);
        });
      });

      /* ---------- scroll choreography (lazy: ScrollTrigger loads after the hero starts) ---------- */
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      if (dead) return;
      gsap.registerPlugin(ScrollTrigger);
      const st = gsap.context(() => {
        const at = (trigger: Element) => ({ trigger, start: "top 85%", once: true });

        $("[data-heading]").forEach((h) => {
          const t = gsap.timeline({ scrollTrigger: at(h) });
          t.fromTo($("[data-hline]", h), { yPercent: 110 }, { yPercent: 0, duration: 0.8, ease: "expo.out" });
          t.fromTo($("[data-hserif]", h), { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" }, 0.15);
        });

        $("[data-stat]").forEach((card, i) => {
          const r = Number(card.dataset.r ?? 0);
          const num = card.querySelector<HTMLElement>("[data-count]")!;
          const target = Number(num.dataset.count);
          const t = gsap.timeline({ scrollTrigger: at(card), delay: i * 0.12 });
          t.fromTo(card, { rotation: 0, y: 50, opacity: 0 }, { rotation: r, y: 0, opacity: 1, duration: 0.8, ease: "back.out(1.6)" });
          const o = { v: 0 };
          t.to(o, { v: target, duration: 1.2, ease: "power2.out", onUpdate: () => { num.textContent = String(Math.round(o.v)); } }, 0);
        });

        const steps = $("[data-step]");
        if (steps.length) {
          const t = gsap.timeline({ scrollTrigger: at(steps[0]) });
          t.fromTo(steps, { x: -70, opacity: 0 }, { x: 0, opacity: 1, duration: 0.7, stagger: 0.14, ease: "power3.out" });
          t.fromTo($("[data-stepnum]"), { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.6, stagger: 0.14, ease: "power2.inOut" }, 0.2);
        }

        const ticket = document.querySelector<HTMLElement>("[data-ticket]");
        if (ticket) {
          const meter = ticket.querySelector<HTMLElement>("[data-meter]")!;
          const fill = Number(getComputedStyle(meter).getPropertyValue("--fill")) || 0;
          const t = gsap.timeline({ scrollTrigger: at(ticket) });
          t.fromTo(ticket, { y: -130, rotation: -9, opacity: 0 }, { y: 0, rotation: -1.5, opacity: 1, duration: 0.95, ease: "back.out(1.3)" });
          t.fromTo(meter, { "--fill": 0 }, { "--fill": fill, duration: 1.2, ease: "power3.out" }, 0.5);
          t.fromTo("[data-lock]", { rotation: 0 }, { keyframes: { rotation: [0, -20, 16, -10, 6, 0] }, duration: 0.6, ease: "none" }, 0.75);
        }

        const tiles = $("[data-tile]");
        if (tiles.length) {
          gsap.fromTo(tiles, { scale: 0.92, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.7, stagger: 0.1, ease: "power3.out", scrollTrigger: at(tiles[0]) });
          tiles.forEach((tile) => {
            const media = tile.querySelector("[data-media]");
            if (media) gsap.fromTo(media, { y: -20 }, { y: 20, ease: "none", scrollTrigger: { trigger: tile, start: "top bottom", end: "bottom top", scrub: true } });
          });
        }

        const notes = $("[data-note]");
        notes.forEach((n, i) => {
          const r = Number(n.dataset.r ?? 0);
          gsap.fromTo(n, { y: -90, rotation: r + 12, opacity: 0 }, { y: 0, rotation: r, opacity: 1, duration: 0.8, delay: i * 0.12, ease: "back.out(2)", scrollTrigger: at(notes[0]) });
        });

        const flines = $("[data-fline]");
        if (flines.length) {
          gsap.fromTo(flines, { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.8, stagger: 0.15, ease: "power3.inOut", scrollTrigger: at(flines[0]) });
        }
      });
      cleanups.push(() => st.revert());
      document.fonts?.ready.then(() => ScrollTrigger.refresh());

      // Bento clips play only while on screen.
      const vio = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          const v = e.target as HTMLVideoElement;
          if (e.isIntersecting && !getMotionState().paused) v.play().catch(() => {});
          else v.pause();
        });
      });
      $("[data-video]").forEach((v) => vio.observe(v));
      cleanups.push(() => vio.disconnect());
    })();

    return () => {
      dead = true;
      cleanups.forEach((c) => c());
    };
  }, []);

  return null;
}
