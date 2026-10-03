"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Logo } from "@/components/Logo";
import { passLabel, timeOf } from "@/lib/format";
import { haptic } from "@/lib/track";
import { TIER_LABEL, type Tier } from "@/lib/types";

type Result =
  | { result: "VERIFIED"; name: string; tier: Tier; passNo: string }
  | { result: "ALREADY_USED"; name: string; tier: Tier; passNo: string; firstScanAt: string }
  | { result: "INVALID"; reason: string };
type Counts = { inside: number; capacity: number; confirmed: number };

type Detector = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };

export function Door() {
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [cam, setCam] = useState<"off" | "starting" | "on" | "error">("off");
  const [result, setResult] = useState<Result | null>(null);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [manual, setManual] = useState("");
  const [busy, setBusy] = useState(false);
  const hold = useRef(false); // true while a result is on screen
  const last = useRef({ code: "", at: 0 });
  const clearTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const loadCounts = useCallback(() => {
    fetch("/api/door/stats", { cache: "no-store" }).then(async (r) => {
      if (r.status === 401 || r.status === 403) location.href = "/login?next=/door";
      else setCounts(await r.json());
    });
  }, []);

  useEffect(() => {
    loadCounts();
    const iv = setInterval(loadCounts, 10_000);
    return () => clearInterval(iv);
  }, [loadCounts]);

  const next = useCallback(() => {
    clearTimeout(clearTimer.current);
    hold.current = false;
    setResult(null);
  }, []);

  const check = useCallback(async (code: string) => {
    if (hold.current) return;
    hold.current = true;
    setBusy(true);
    try {
      const r = await fetch("/api/door/scan", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code }) });
      if (r.status === 401 || r.status === 403) { location.href = "/login?next=/door"; return; }
      const d = await r.json();
      setResult(d);
      if (d.counts) setCounts(d.counts);
      haptic(d.result === "VERIFIED" ? 10 : 60);
      if (d.result === "VERIFIED") clearTimer.current = setTimeout(next, 4000);
    } catch {
      setResult({ result: "INVALID", reason: "No connection. Try again." });
    } finally {
      setBusy(false);
    }
  }, [next]);

  // Camera + decode loop: BarcodeDetector where supported, jsQR otherwise.
  useEffect(() => {
    if (cam !== "starting") return;
    let stream: MediaStream | null = null;
    let raf = 0;
    let stop = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        const v = video.current!;
        v.srcObject = stream;
        await v.play();
        let detector: Detector | null = null;
        const BD = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
        if (BD) {
          try { detector = new BD({ formats: ["qr_code"] }); } catch { detector = null; }
        }
        const jsQR = detector ? null : (await import("jsqr")).default;
        setCam("on");
        let lastTick = 0;
        const tick = async (now: number) => {
          if (stop) return;
          raf = requestAnimationFrame(tick);
          if (now - lastTick < 160 || hold.current || v.readyState < 2) return;
          lastTick = now;
          let code: string | undefined;
          if (detector) {
            code = (await detector.detect(v).catch(() => []))[0]?.rawValue;
          } else if (jsQR) {
            const c = canvas.current!;
            const w = 480, h = Math.round((v.videoHeight / v.videoWidth) * 480) || 480;
            c.width = w; c.height = h;
            const g = c.getContext("2d", { willReadFrequently: true })!;
            g.drawImage(v, 0, 0, w, h);
            code = jsQR(g.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: "dontInvert" })?.data;
          }
          if (code && !(code === last.current.code && now - last.current.at < 5000)) {
            last.current = { code, at: now };
            check(code);
          }
        };
        raf = requestAnimationFrame(tick);
      } catch {
        setCam("error");
      }
    })();
    return () => {
      stop = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [cam, check]);

  const ok = result?.result === "VERIFIED";

  return (
    <main className="min-h-dvh bg-ink pb-10 text-cream">
      <header className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Logo size={40} />
          <p className="font-display text-[24px]">Door</p>
        </div>
        <p className="font-display text-[34px] leading-none text-lime" aria-live="polite">
          {counts ? `${counts.inside} / ${counts.capacity} IN` : "…"}
        </p>
      </header>
      {counts && <p className="mono -mt-1 px-4 text-right text-[11px] text-cream/70">{counts.confirmed} CONFIRMED FOR TONIGHT</p>}

      <div className="mx-auto mt-3 max-w-[480px] px-4">
        <div className="relative aspect-square overflow-hidden rounded-[24px] border-[3px] border-cream bg-black">
          <video ref={video} className="h-full w-full object-cover" playsInline muted aria-label="Camera preview" />
          <canvas ref={canvas} className="hidden" />
          {cam === "on" && !result && <div className="scanline" aria-hidden="true" />}
          {cam !== "on" && (
            <div className="absolute inset-0 grid place-items-center p-6 text-center">
              <div>
                {cam === "error" && <p className="mb-4">Camera blocked or unavailable. Allow camera access, or type the pass number below.</p>}
                <button className="btn" onClick={() => setCam("starting")} disabled={cam === "starting"}>
                  {cam === "starting" ? "Starting…" : "Start scanning"}
                </button>
              </div>
            </div>
          )}

          {result && (
            <div
              key={JSON.stringify(result)}
              className={`absolute inset-0 flex flex-col justify-center p-6 text-ink ${ok ? "bg-lime flash-ok" : "bg-magenta shake"}`}
              role="alert"
            >
              {ok ? (
                <svg viewBox="0 0 48 48" className="draw-check mb-2 h-16 w-16" aria-hidden="true">
                  <path d="M10 25l9 9 19-20" fill="none" stroke="#0d0616" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <p className="font-display text-[64px] leading-none" aria-hidden="true">✕</p>
              )}
              {result.result === "VERIFIED" && (
                <>
                  <p className="font-display text-[48px] leading-[0.9]">Verified</p>
                  <p className="mt-2 text-[26px] font-bold">{result.name}</p>
                  <p className="mono text-[13px]">{passLabel(result.passNo)} · {TIER_LABEL[result.tier].toUpperCase()}</p>
                  <p className="mt-3 inline-block rounded-full border-[3px] border-ink bg-cream px-4 py-2 font-bold">1 mocktail token issued</p>
                </>
              )}
              {result.result === "ALREADY_USED" && (
                <>
                  <p className="font-display text-[48px] leading-[0.9]">Already used</p>
                  <p className="mt-2 text-[24px] font-bold">{result.name}</p>
                  <p className="mono text-[13px]">{passLabel(result.passNo)} · FIRST SCANNED {timeOf(result.firstScanAt)}</p>
                  <p className="mt-3 font-bold">Don't admit without a core-team check.</p>
                </>
              )}
              {result.result === "INVALID" && (
                <>
                  <p className="font-display text-[48px] leading-[0.9]">Not a valid pass</p>
                  <p className="mt-2 text-[18px] font-bold">{result.reason}</p>
                </>
              )}
              <button className="btn btn-dark btn-sm mt-5 self-start" onClick={next}>Scan next</button>
            </div>
          )}
        </div>

        <form
          className="mt-5 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!manual.trim()) return;
            hold.current = false;
            check(manual.trim());
            setManual("");
          }}
        >
          <label className="sr-only" htmlFor="manual">Pass number</label>
          <input id="manual" className="input mono uppercase" placeholder="OM-7K2Q9" value={manual} onChange={(e) => setManual(e.target.value)} autoCapitalize="characters" autoComplete="off" />
          <button className="btn btn-sm" disabled={busy}>Check</button>
        </form>
        <p className="mt-2 text-[13px] text-cream/70">Backup: type the pass number and check the name matches.</p>

        <div className="mt-8 flex justify-between text-[14px]">
          <a className="underline" href="/counter">Counter view</a>
          <button className="underline" onClick={async () => { await fetch("/api/staff/logout", { method: "POST" }); location.href = "/login"; }}>Sign out</button>
        </div>
      </div>
    </main>
  );
}
