"use client";

import { useState } from "react";
import { Logo } from "@/components/Logo";

const HOME: Record<string, string> = { admin: "/admin", door: "/door", counter: "/counter" };

export function LoginForm({ next }: { next: string }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <main className="grid min-h-dvh place-items-center bg-ink px-5 text-cream">
      <form
        className="w-full max-w-[360px]"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const r = await fetch("/api/staff/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pin }) });
          const d = await r.json().catch(() => ({}));
          setBusy(false);
          if (!r.ok) return setError(d.message ?? "That didn't work.");
          location.href = next && (d.role === "admin" || next === `/${d.role}`) ? next : HOME[d.role];
        }}
      >
        <Logo size={72} />
        <h1 className="font-display mt-6 text-[52px] leading-[0.9]">Staff only</h1>
        <p className="mt-2 text-cream/80">Enter your PIN. Sessions last for the evening.</p>
        <label className="mt-8 block">
          <span className="field-label mb-2 block">PIN</span>
          <input className="input mono text-center !text-[28px] tracking-[0.5em]" type="password" inputMode="numeric" autoComplete="current-password"
            maxLength={8} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} autoFocus aria-invalid={!!error || undefined} />
        </label>
        {error && <p className="mt-3 font-bold text-magenta" role="alert">{error}</p>}
        <button className="btn btn-block mt-6" disabled={busy || pin.length < 4}>{busy ? "Checking…" : "Unlock"}</button>
      </form>
    </main>
  );
}
