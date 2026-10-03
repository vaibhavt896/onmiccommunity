"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ComponentType } from "react";
import type { PublicJam } from "@/lib/types";
import { captureUtm, track } from "@/lib/track";

export type SheetState =
  | { kind: "book"; resume?: string }
  | { kind: "waitlist" }
  | { kind: "performer"; acts: string[] }
  | null;

export type SheetsProps = {
  sheet: NonNullable<SheetState>;
  jam: PublicJam | null;
  onClose: () => void;
  onChanged: () => void;
};

type Ctx = {
  jam: PublicJam | null;
  openBook: () => void;
  openPerformer: (acts: string[]) => void;
  refresh: () => void;
};

const JamCtx = createContext<Ctx | null>(null);

export function useJam(): Ctx {
  const c = useContext(JamCtx);
  if (!c) throw new Error("useJam outside JamProvider");
  return c;
}

const loadSheets = () => import("./Sheets").then((m) => m.default);

/**
 * One "current jam" record drives the date chip, seats meter and every CTA
 * (brief §3). The booking sheet is code-split and only fetched on idle or on
 * the first tap, so it never weighs on first load.
 */
export function JamProvider({
  initialJam,
  openOnLoad = false,
  children,
}: {
  initialJam: PublicJam | null;
  openOnLoad?: boolean;
  children: React.ReactNode;
}) {
  const [jam, setJam] = useState(initialJam);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [Sheets, setSheets] = useState<ComponentType<SheetsProps> | null>(null);
  const jamRef = useRef(jam);
  jamRef.current = jam;

  const ensureSheets = useCallback(() => {
    loadSheets().then((C) => setSheets(() => C));
  }, []);

  const refresh = useCallback(() => {
    fetch("/api/jam/current", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setJam(d.jam))
      .catch(() => {});
  }, []);

  const openBook = useCallback(() => {
    ensureSheets();
    const j = jamRef.current;
    setSheet(j && j.sale === "open" ? { kind: "book" } : { kind: "waitlist" });
  }, [ensureSheets]);

  const openPerformer = useCallback((acts: string[]) => {
    ensureSheets();
    setSheet({ kind: "performer", acts });
  }, [ensureSheets]);

  useEffect(() => {
    captureUtm();
    track("pageview");

    // /book deep link (Instagram stories): open straight away. ?t= resumes a hold.
    if (openOnLoad) {
      ensureSheets();
      const t = new URLSearchParams(location.search).get("t");
      if (t) setSheet({ kind: "book", resume: t });
      else setSheet(jamRef.current && jamRef.current.sale === "open" ? { kind: "book" } : { kind: "waitlist" });
    }

    const idle = window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 2500));
    const idleId = setTimeout(() => idle(() => ensureSheets()), 3000);

    // Live seats: refresh every 30s while the tab is visible.
    const iv = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 30_000);
    return () => {
      clearTimeout(idleId);
      clearInterval(iv);
    };
  }, [openOnLoad, ensureSheets, refresh]);

  const close = useCallback(() => {
    setSheet(null);
    if (location.pathname === "/book") history.replaceState(null, "", "/" + location.hash);
  }, []);

  return (
    <JamCtx.Provider value={{ jam, openBook, openPerformer, refresh }}>
      {children}
      {sheet && Sheets && <Sheets sheet={sheet} jam={jam} onClose={close} onChanged={refresh} />}
    </JamCtx.Provider>
  );
}
