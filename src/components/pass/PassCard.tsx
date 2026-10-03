"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import type { PassView } from "@/lib/types";
import { TIER_LABEL } from "@/lib/types";
import { chipDate, longDate, passLabel, timeOf } from "@/lib/format";
import { haptic } from "@/lib/track";
import { Lock } from "../icons";
import { confetti } from "./confetti";
import { downloadIcs, downloadPng } from "./files";

const MESSAGES: Partial<Record<PassView["state"], { title: string; body: string }>> = {
  HELD: { title: "Almost there", body: "Your seat is held but we haven't got your payment reference yet." },
  EXPIRED: { title: "Hold expired", body: "The 10-minute hold ran out before a payment reference came in, so the seat went back to the pool." },
  REJECTED: { title: "Payment not found", body: "The core team couldn't match your payment. If you did pay, message us on WhatsApp with your UTR." },
  CANCELLED: { title: "Pass cancelled", body: "This pass was cancelled by the core team. Message us on WhatsApp if that's a mistake." },
};

/** The pass itself: QR (token only), pass number, venue block once verified. */
export function PassCard({ token, initial, celebrate = false }: { token: string; initial: PassView; celebrate?: boolean }) {
  const [v, setV] = useState(initial);
  const [qr, setQr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const prev = useRef(initial.state);
  const passUrl = typeof window === "undefined" ? "" : `${location.origin}/pass/${token}`;
  const verified = v.state === "CONFIRMED" || v.state === "CHECKED_IN";

  useEffect(() => {
    if (celebrate) {
      confetti();
      haptic(10);
    }
  }, [celebrate]);

  // Poll while waiting on the core team; flip live when approved.
  useEffect(() => {
    if (v.state !== "PAID_PENDING" && v.state !== "CONFIRMED") return;
    const iv = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const r = await fetch(`/api/pass/${token}`, { cache: "no-store" });
        if (r.ok) setV(await r.json());
      } catch {}
    }, v.state === "PAID_PENDING" ? 8000 : 20000);
    return () => clearInterval(iv);
  }, [v.state, token]);

  useEffect(() => {
    if (prev.current === "PAID_PENDING" && v.state === "CONFIRMED") {
      confetti();
      haptic(10);
    }
    prev.current = v.state;
  }, [v.state]);

  useEffect(() => {
    if (!verified) return;
    QRCode.toDataURL(token, { width: 480, margin: 1, errorCorrectionLevel: "M", color: { dark: "#0d0616", light: "#ffffff" } })
      .then(setQr)
      .catch(() => {});
  }, [verified, token]);

  const msg = MESSAGES[v.state];

  return (
    <div>
      <h2 className="font-display text-[46px] leading-[0.92]">
        {msg ? msg.title : <>You're in,<br /><span className="text-violet">{v.name.split(" ")[0]}</span></>}
      </h2>
      {msg && <p className="mt-3 text-[16px]">{msg.body}</p>}

      <div className="ticket flip-in mt-6 px-5 pb-5 pt-5" style={{ ["--perf" as string]: "66%", ["--notch" as string]: "var(--color-cream)" }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="kicker text-[11px]">On Mic · Pass</p>
            <p className="font-display text-[40px] leading-none">{passLabel(v.passNo)}</p>
            <p className="mt-1 font-bold">{v.name}</p>
          </div>
          <span className={`chip ${v.state === "CHECKED_IN" ? "bg-sky" : verified ? "bg-lime" : "bg-orange"}`}>
            {v.state === "CHECKED_IN" ? "CHECKED IN" : verified ? "VERIFIED" : v.state === "PAID_PENDING" ? "PENDING" : v.state}
          </span>
        </div>

        <div className="mx-auto mt-5 aspect-square w-full max-w-[250px] overflow-hidden rounded-[16px] border-[3px] border-ink bg-white">
          {verified && qr ? (
            <div className="relative h-full w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt={`QR code for pass ${passLabel(v.passNo)}`} className={`h-full w-full ${v.state === "CHECKED_IN" ? "opacity-25" : ""}`} />
              {v.state === "CHECKED_IN" && (
                <p className="font-display absolute inset-0 grid -rotate-12 place-items-center text-center text-[34px] leading-none text-magenta">
                  USED<br />{v.checkedInAt ? timeOf(v.checkedInAt) : ""}
                </p>
              )}
            </div>
          ) : (
            <div className="grid h-full w-full place-items-center p-6 text-center" style={{ background: "repeating-linear-gradient(45deg,#fff 0 12px,#f1e6d6 12px 24px)" }}>
              <div>
                {v.state === "PAID_PENDING" && <span className="bars mx-auto mb-3 text-violet" aria-hidden="true"><i /><i /><i /></span>}
                <p className="font-display text-[26px] leading-none">{v.state === "PAID_PENDING" ? "Pending verification" : "No QR"}</p>
                {v.state === "PAID_PENDING" && <p className="mt-2 text-[13px]">The core team checks payments against the bank app. This page updates by itself.</p>}
              </div>
            </div>
          )}
        </div>

        <div className="notch l" aria-hidden="true" />
        <div className="notch r" aria-hidden="true" />
        <div className="perf" aria-hidden="true" />

        <div className="mt-12 flex items-end justify-between">
          <p className="font-display text-[34px] leading-none">{chipDate(v.jam.startsAt)}</p>
          <p className="font-display text-[22px] leading-none">{timeOf(v.jam.startsAt)}</p>
        </div>
        <p className="mono mt-2 text-[11px] tracking-wider">{TIER_LABEL[v.tier].toUpperCase()} · 1 SEAT · + MOCKTAIL TOKEN</p>

        <div className="mt-4 rounded-[14px] border-2 border-ink bg-white px-4 py-3">
          <p className="kicker text-[11px]">Venue</p>
          {v.venue ? (
            <>
              <p className="text-[18px] font-bold">{v.venue.name}</p>
              {v.venue.mapUrl && (
                <a href={v.venue.mapUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block font-bold text-violet underline underline-offset-4">
                  Open in Maps →
                </a>
              )}
            </>
          ) : (
            <p className="flex items-center gap-2 text-[14px] font-bold"><Lock size={14} /> Unlocks once your payment is verified</p>
          )}
        </div>
      </div>

      {verified && (
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button type="button" className="btn btn-sm btn-white whitespace-nowrap !px-3 !text-[16px]" disabled={busy}
            onClick={async () => { setBusy(true); try { await downloadPng(v, token); } finally { setBusy(false); } }}>
            Save to phone
          </button>
          <button type="button" className="btn btn-sm btn-white whitespace-nowrap !px-3 !text-[16px]" onClick={() => downloadIcs(v, passUrl)}>
            Add to calendar
          </button>
        </div>
      )}
      {v.state === "PAID_PENDING" && (
        <button type="button" className="btn btn-sm btn-white btn-block mt-6" onClick={() => downloadIcs(v, passUrl)}>
          Add to calendar
        </button>
      )}
      <p className="mono mt-5 text-center text-[11px] leading-relaxed tracking-wider">
        {verified ? `SHOW THIS QR AT THE DOOR · ONE-TIME ENTRY · ${longDate(v.jam.startsAt).toUpperCase()}` : "KEEP THIS LINK. IT'S YOUR PASS."}
      </p>
    </div>
  );
}
