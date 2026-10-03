"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import QRCode from "qrcode";
import type { SheetsProps } from "./JamProvider";
import { PassCard } from "./pass/PassCard";
import { Close } from "./icons";
import { chipDate, passLabel, timeOf } from "@/lib/format";
import { UPI_ID, UPI_NAME } from "@/lib/public-config";
import { REFUND_LINE, ACT_ROTATIONS } from "@/lib/content";
import { ACTS } from "@/lib/validate";
import { getUtm, haptic, reducedMotion, track } from "@/lib/track";
import type { PassView, PublicJam } from "@/lib/types";

const STORE = "onmic_booking";

/* ------------------------------------------------------------------ sheet shell
   Bottom sheet on mobile, centred modal on desktop. */
function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    const el = ref.current!;
    const prevFocus = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const desktop = matchMedia("(min-width: 768px)").matches;
    if (reducedMotion()) el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150 });
    else if (desktop) el.animate([{ opacity: 0, transform: "scale(.94)" }, { opacity: 1, transform: "scale(1)" }], { duration: 260, easing: "cubic-bezier(.34,1.56,.64,1)" });
    else el.animate([{ transform: "translateY(100%)" }, { transform: "translateY(0)" }], { duration: 380, easing: "cubic-bezier(.22,1,.36,1)" });
    el.querySelector<HTMLElement>("input, button:not([data-close])")?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab") return;
      const f = [...el.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, textarea, [tabindex]:not([tabindex="-1"])')];
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.({ preventScroll: true });
    };
  }, [onClose]);

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} aria-hidden="true" />
      <div ref={ref} className="sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="sticky top-0 z-10 flex items-center justify-between bg-cream px-5 pb-3 pt-4">
          <span className="mx-auto mb-1 block h-1.5 w-12 rounded-full bg-ink/25 md:hidden" aria-hidden="true" />
        </div>
        <div className="px-5 pb-8 md:px-7">
          <div className="-mt-3 mb-4 flex items-start justify-between gap-4">
            <h2 id={titleId} className="kicker pt-3">{title}</h2>
            <button type="button" data-close className="grid h-11 w-11 flex-none place-items-center rounded-full border-[3px] border-ink bg-white" onClick={onClose} aria-label="Close">
              <Close />
            </button>
          </div>
          {children}
        </div>
      </div>
    </>
  );
}

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="field-label mb-2 block">{label}</span>
      {children}
      {hint && !error && <span className="mt-1.5 block text-[13px] text-ink/70">{hint}</span>}
      {error && <span className="error-text mt-1.5 block" role="alert">{error}</span>}
    </label>
  );
}

function PhoneInput({ value, onChange, invalid }: { value: string; onChange: (v: string) => void; invalid?: boolean }) {
  return (
    <div className="flex">
      <span className="grid place-items-center rounded-l-[16px] border-[3px] border-r-0 border-ink bg-lime px-3 font-bold">+91</span>
      <input
        className="input !rounded-l-none" inputMode="numeric" autoComplete="tel-national" placeholder="98765 43210"
        value={value} maxLength={11} aria-invalid={invalid || undefined}
        onChange={(e) => onChange(e.target.value.replace(/[^\d ]/g, ""))}
      />
    </div>
  );
}

function Loader() {
  return <span className="bars" role="status" aria-label="Working"><i /><i /><i /></span>;
}

async function post(url: string, data: unknown): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  try {
    const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
    const d = await r.json().catch(() => ({}));
    return { ok: r.ok, data: d };
  } catch {
    return { ok: false, data: { message: "No connection. Check your internet and try again." } };
  }
}

/* ------------------------------------------------------------------ booking */
type Hold = { token: string; passNo: string; amount: number; holdExpiresAt: string };

function Progress({ step }: { step: number }) {
  return (
    <div className="progress mb-6" aria-label={`Step ${step} of 3`}>
      {[1, 2, 3].map((i) => <span key={i} data-on={i <= step} />)}
    </div>
  );
}

function useCountdown(until: string | null) {
  const [left, setLeft] = useState(() => (until ? new Date(until).getTime() - Date.now() : 0));
  useEffect(() => {
    if (!until) return;
    const tick = () => setLeft(new Date(until).getTime() - Date.now());
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [until]);
  const s = Math.max(0, Math.floor(left / 1000));
  return { expired: s <= 0, label: `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}` };
}

function BookingFlow({ jam, resume, onChanged }: { jam: PublicJam | null; resume?: string; onChanged: () => void }) {
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [hold, setHold] = useState<Hold | null>(null);
  const [pass, setPass] = useState<{ token: string; view: PassView; fresh: boolean } | null>(null);

  // Resume a booking in progress (?t= link, or this browser's last booking).
  useEffect(() => {
    let token = resume;
    if (!token) {
      try {
        const saved = JSON.parse(localStorage.getItem(STORE) ?? "null");
        if (saved && saved.jamId === jam?.id) token = saved.token;
      } catch {}
    }
    if (!token) return setStep(1);
    fetch(`/api/pass/${token}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((v: PassView | null) => {
        if (!v) return setStep(1);
        if (v.state === "HELD" && v.holdExpiresAt) {
          setHold({ token: token!, passNo: v.passNo, amount: v.amount, holdExpiresAt: v.holdExpiresAt });
          setStep(2);
        } else if (["PAID_PENDING", "CONFIRMED", "CHECKED_IN"].includes(v.state)) {
          setPass({ token: token!, view: v, fresh: false });
          setStep(3);
        } else {
          try { localStorage.removeItem(STORE); } catch {}
          setStep(1);
        }
      })
      .catch(() => setStep(1));
  }, [resume, jam?.id]);

  if (step === 0) return <div className="grid h-40 place-items-center text-violet"><Loader /></div>;
  return (
    <>
      <Progress step={step} />
      {step === 1 && jam && (
        <StepDetails jam={jam} onHeld={(h) => {
          setHold(h);
          try { localStorage.setItem(STORE, JSON.stringify({ token: h.token, jamId: jam.id })); } catch {}
          track("booking_hold");
          onChanged();
          setStep(2);
        }} />
      )}
      {step === 1 && !jam && <p>There's no jam open for booking right now.</p>}
      {step === 2 && hold && (
        <StepPay hold={hold} onRestart={() => { try { localStorage.removeItem(STORE); } catch {} setHold(null); setStep(1); }}
          onPaid={(view) => {
            track("utr_submitted");
            setPass({ token: hold.token, view, fresh: true });
            onChanged();
            setStep(3);
          }} />
      )}
      {step === 3 && pass && (
        <div>
          <PassCard token={pass.token} initial={pass.view} celebrate={pass.fresh} />
          <a href={`/pass/${pass.token}`} className="btn btn-block mt-5">Open my pass</a>
          <p className="mt-3 text-center text-[14px]">Bookmark that link. Once we verify your payment, we'll also send it to you on WhatsApp.</p>
        </div>
      )}
    </>
  );
}

function StepDetails({ jam, onHeld }: { jam: PublicJam; onHeld: (h: Hold) => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [ig, setIg] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const n = name.trim().replace(/\s+/g, " ");
    const p = phone.replace(/\D/g, "");
    if (n.length < 2 || n.length > 40) errs.name = "Your name, 2 to 40 characters.";
    if (!/^[6-9]\d{9}$/.test(p)) errs.phone = "A 10-digit Indian WhatsApp number.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    const r = await post("/api/booking/hold", { name: n, phone: p, instagram: ig, utm: getUtm() });
    setBusy(false);
    if (!r.ok) {
      const code = String(r.data.error ?? "");
      const key = code === "bad_name" ? "name" : code.includes("phone") ? "phone" : code === "bad_instagram" ? "ig" : "form";
      return setErrors({ [key]: String(r.data.message ?? "Something went wrong. Try again.") });
    }
    onHeld(r.data as unknown as Hold);
  };

  return (
    <form onSubmit={submit} noValidate>
      <h3 className="font-display text-[44px] leading-[0.92]">Lock your seat</h3>
      <div className="mt-6 space-y-5">
        <Field label="Name" error={errors.name}>
          <input className="input" autoComplete="name" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name || undefined} placeholder="What should we call you?" />
        </Field>
        <Field label="WhatsApp number" error={errors.phone} hint="Your pass link comes here. One seat per number.">
          <PhoneInput value={phone} onChange={setPhone} invalid={!!errors.phone} />
        </Field>
        <Field label="Instagram (optional)" error={errors.ig}>
          <div className="flex">
            <span className="grid place-items-center rounded-l-[16px] border-[3px] border-r-0 border-ink bg-sky px-3 font-bold">@</span>
            <input className="input !rounded-l-none" autoCapitalize="none" autoCorrect="off" value={ig} maxLength={31} onChange={(e) => setIg(e.target.value.replace(/^@/, ""))} placeholder="yourhandle" />
          </div>
        </Field>
      </div>

      <div className="card mt-6 bg-lime p-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="kicker text-[11px]">{jam.title}</p>
            <p className="font-display whitespace-nowrap text-[26px] leading-none">{chipDate(jam.startsAt)} · {timeOf(jam.startsAt)}</p>
            <p className="mono mt-1 text-[11px] tracking-wider">1 SEAT · 1 PERSON · ENTRY + MOCKTAIL</p>
          </div>
          <p className="font-display text-[38px] leading-none normal-case">Rs {jam.price}</p>
        </div>
      </div>

      {errors.form && <p className="error-text mt-4" role="alert">{errors.form}</p>}
      <button type="submit" className="btn btn-block mt-6" disabled={busy}>
        {busy ? <Loader /> : "Continue to pay"}
      </button>
      <p className="mt-4 text-[13px] leading-snug text-ink/80">
        Continuing holds your seat for 10 minutes. {REFUND_LINE} We use your name and number only for this jam. <a href="/privacy" className="underline">Privacy</a>.
      </p>
    </form>
  );
}

function StepPay({ hold, onPaid, onRestart }: { hold: Hold; onPaid: (v: PassView) => void; onRestart: () => void }) {
  const [qr, setQr] = useState<string | null>(null);
  const [utr, setUtr] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mobile, setMobile] = useState(false);
  const { expired, label } = useCountdown(hold.holdExpiresAt);
  const upi = `upi://pay?${new URLSearchParams({
    pa: UPI_ID, pn: UPI_NAME, am: hold.amount.toFixed(2), cu: "INR", tn: `OnMic ${passLabel(hold.passNo)}`,
  }).toString()}`;

  useEffect(() => {
    setMobile(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
    QRCode.toDataURL(upi, { width: 440, margin: 1, errorCorrectionLevel: "M" }).then(setQr).catch(() => {});
  }, [upi]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(UPI_ID);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const d = utr.replace(/\s/g, "");
    if (!/^\d{12}$/.test(d)) return setError("The UTR is the 12-digit number in your UPI app's payment details.");
    setError("");
    setBusy(true);
    const r = await post("/api/booking/submit-utr", { token: hold.token, utr: d });
    if (!r.ok) {
      setBusy(false);
      return setError(String(r.data.message ?? "Something went wrong. Try again."));
    }
    const v = await fetch(`/api/pass/${hold.token}`, { cache: "no-store" }).then((x) => x.json());
    haptic(10);
    onPaid(v);
  };

  return (
    <form onSubmit={submit} noValidate>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display whitespace-nowrap text-[44px] leading-[0.92]">Pay via UPI</h3>
        <span className={`chip ${expired ? "bg-magenta" : "bg-orange"}`} aria-live="polite">
          {expired ? "HOLD EXPIRED" : <>Seat held for {label}</>}
        </span>
      </div>

      <div className="card mt-5 bg-white p-5 text-center">
        <p className="kicker text-[11px]">Amount</p>
        <p className="font-display text-[56px] leading-none normal-case">Rs {hold.amount}</p>
        <div className="mx-auto mt-4 aspect-square w-[210px] overflow-hidden rounded-[14px] border-[3px] border-ink bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {qr ? <img src={qr} alt={`UPI QR code to pay Rs ${hold.amount} to ${UPI_ID}`} className="h-full w-full" /> : null}
        </div>
        <div className="mt-4 flex items-center justify-between gap-2 rounded-[14px] border-2 border-ink bg-cream px-3 py-2">
          <span className="mono truncate text-[14px]">{UPI_ID}</span>
          <button type="button" className="chip min-h-[40px] bg-lime" onClick={copy} aria-live="polite">{copied ? "COPIED" : "COPY"}</button>
        </div>
        {mobile && <a href={upi} className="btn btn-dark btn-sm btn-block mt-4">Open UPI app</a>}
        <p className="mt-3 text-[13px]">Pay exactly Rs {hold.amount}. Any UPI app works.</p>
      </div>

      {expired && (
        <p className="mt-4 rounded-[14px] border-2 border-ink bg-orange/40 p-3 text-[14px]">
          Your 10-minute hold ran out. Already paid? Enter the UTR anyway and we'll keep your seat if one is still free.{" "}
          <button type="button" className="font-bold underline" onClick={onRestart}>Start over</button>
        </p>
      )}

      <div className="mt-5">
        <Field label="12-digit UPI reference (UTR)" error={error} hint="Find it under transaction details: “UPI Ref No.” or “UTR”.">
          <input className="input mono tracking-[0.18em]" inputMode="numeric" autoComplete="off" maxLength={14} placeholder="123456789012"
            value={utr} onChange={(e) => setUtr(e.target.value.replace(/[^\d ]/g, ""))} aria-invalid={!!error || undefined} />
        </Field>
      </div>
      <button type="submit" className="btn btn-block mt-6" disabled={busy}>
        {busy ? <Loader /> : "I've paid, get my pass"}
      </button>
      <p className="mt-4 text-[13px] text-ink/80">{REFUND_LINE}</p>
    </form>
  );
}

/* ------------------------------------------------------------------ waitlist */
function Waitlist() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  if (done) {
    return (
      <div>
        <h3 className="font-display text-[44px] leading-[0.92]">You're on the list</h3>
        <p className="mt-3">If a seat frees up, or the next jam drops, we'll WhatsApp you first.</p>
      </div>
    );
  }
  return (
    <form noValidate onSubmit={async (e) => {
      e.preventDefault();
      setBusy(true);
      const r = await post("/api/waitlist", { name, phone: phone.replace(/\D/g, "") });
      setBusy(false);
      if (!r.ok) return setError(String(r.data.message ?? "Something went wrong."));
      setDone(true);
    }}>
      <h3 className="font-display text-[44px] leading-[0.92]">Sold out.<br /><span className="text-violet">Join the waitlist.</span></h3>
      <p className="mt-3">Every seat for this jam is taken, or bookings have closed. Drop your number and you'll hear first.</p>
      <div className="mt-6 space-y-5">
        <Field label="Name"><input className="input" autoComplete="name" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="WhatsApp number"><PhoneInput value={phone} onChange={setPhone} /></Field>
      </div>
      {error && <p className="error-text mt-4" role="alert">{error}</p>}
      <button type="submit" className="btn btn-block mt-6" disabled={busy}>{busy ? <Loader /> : "Join the waitlist"}</button>
    </form>
  );
}

/* ------------------------------------------------------------------ performer */
function Performer({ acts: initial }: { acts: string[] }) {
  const [acts, setActs] = useState<string[]>(initial);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  if (done) {
    return (
      <div>
        <h3 className="font-display text-[44px] leading-[0.92]">Slot request in</h3>
        <p className="mt-3">The core team will WhatsApp you to lock your spot in the line-up. You still need your own seat to get in.</p>
      </div>
    );
  }
  return (
    <form noValidate onSubmit={async (e) => {
      e.preventDefault();
      if (!acts.length) return setError("Pick at least one act.");
      setBusy(true);
      const r = await post("/api/performer", { name, phone: phone.replace(/\D/g, ""), acts, notes });
      setBusy(false);
      if (!r.ok) return setError(String(r.data.message ?? "Something went wrong."));
      track("performer_request");
      setDone(true);
    }}>
      <h3 className="font-display text-[44px] leading-[0.92]">Claim a stage slot</h3>
      <fieldset className="mt-5">
        <legend className="field-label mb-3">What do you do?</legend>
        <div className="flex flex-wrap gap-2.5">
          {ACTS.map((a, i) => (
            <button key={a} type="button" className="act !min-h-[44px] !text-[18px]" style={{ ["--r" as string]: `${ACT_ROTATIONS[i] / 2}deg` }}
              aria-pressed={acts.includes(a)} onClick={() => setActs((p) => (p.includes(a) ? p.filter((x) => x !== a) : [...p, a]))}>
              {a}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="mt-6 space-y-5">
        <Field label="Name"><input className="input" autoComplete="name" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="WhatsApp number"><PhoneInput value={phone} onChange={setPhone} /></Field>
        <Field label="Anything we should know? (optional)">
          <textarea className="input min-h-[96px]" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Song, set length, gear you need..." />
        </Field>
      </div>
      {error && <p className="error-text mt-4" role="alert">{error}</p>}
      <button type="submit" className="btn btn-dark btn-block mt-6" disabled={busy}>{busy ? <Loader /> : "Send my request"}</button>
    </form>
  );
}

export default function Sheets({ sheet, jam, onClose, onChanged }: SheetsProps) {
  const close = useCallback(() => onClose(), [onClose]);
  const title = sheet.kind === "book" ? "Book a seat" : sheet.kind === "waitlist" ? "Waitlist" : "The stage";
  return (
    <Sheet title={title} onClose={close}>
      {sheet.kind === "book" && <BookingFlow jam={jam} resume={sheet.resume} onChanged={onChanged} />}
      {sheet.kind === "waitlist" && <Waitlist />}
      {sheet.kind === "performer" && <Performer acts={sheet.acts} />}
    </Sheet>
  );
}
