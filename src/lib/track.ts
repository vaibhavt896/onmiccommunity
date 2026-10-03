"use client";

type Utm = { source: string | null; medium: string | null; campaign: string | null };
const KEY = "onmic_utm";

/** Remember the Instagram UTM for this visit so a later booking is attributed. */
export function captureUtm(): void {
  try {
    const p = new URLSearchParams(location.search);
    if (p.get("utm_source")) {
      sessionStorage.setItem(KEY, JSON.stringify({
        source: p.get("utm_source"), medium: p.get("utm_medium"), campaign: p.get("utm_campaign"),
      }));
    }
  } catch {}
}

export function getUtm(): Utm {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { source: null, medium: null, campaign: null };
}

export type TrackEvent =
  | "pageview" | "hero_cta_click" | "ticket_cta_click" | "booking_hold" | "utr_submitted" | "pass_viewed" | "performer_request";

export function track(name: TrackEvent): void {
  try {
    const body = JSON.stringify({ name, path: location.pathname, utm: getUtm(), ref: document.referrer });
    const blob = new Blob([body], { type: "application/json" });
    if (!navigator.sendBeacon?.("/api/track", blob)) {
      fetch("/api/track", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true });
    }
  } catch {}
}

export function haptic(ms = 10): void {
  try { navigator.vibrate?.(ms); } catch {}
}

export function reducedMotion(): boolean {
  try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
}
