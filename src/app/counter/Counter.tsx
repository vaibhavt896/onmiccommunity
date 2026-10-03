"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Logo } from "@/components/Logo";
import { passLabel, timeOf } from "@/lib/format";
import { haptic } from "@/lib/track";
import { TIER_LABEL, type Tier } from "@/lib/types";

type Person = { id: string; name: string; passNo: string; tier: Tier; checkedInAt: string; servedAt: string | null };

/** Cafe counter: read-only list of who's in, plus one action: "mocktail served". */
export function Counter() {
  const [people, setPeople] = useState<Person[] | null>(null);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(() => {
    fetch("/api/counter/list", { cache: "no-store" }).then(async (r) => {
      if (r.status === 401 || r.status === 403) location.href = "/login?next=/counter";
      else setPeople((await r.json()).people);
    });
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(() => document.visibilityState === "visible" && load(), 10_000);
    return () => clearInterval(iv);
  }, [load]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase().replace(/^om-?/, "");
    return (people ?? []).filter((p) => !s || p.name.toLowerCase().includes(s) || p.passNo.toLowerCase().includes(s));
  }, [people, q]);

  const serve = async (p: Person) => {
    const r = await fetch("/api/counter/serve", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: p.id }) });
    const d = await r.json();
    if (!r.ok) return setMsg(d.message ?? "Failed");
    haptic(10);
    setMsg(d.already ? `${p.name} was already served at ${timeOf(d.servedAt)}.` : `Mocktail served to ${p.name}.`);
    setTimeout(() => setMsg(""), 3500);
    load();
  };

  const served = (people ?? []).filter((p) => p.servedAt).length;

  return (
    <main className="min-h-dvh bg-cream pb-16 text-ink">
      <header className="sticky top-0 z-10 border-b-[3px] border-ink bg-ink px-4 py-3 text-cream">
        <div className="mx-auto flex max-w-[640px] items-center justify-between">
          <div className="flex items-center gap-3"><Logo size={40} /><p className="font-display text-[24px]">Counter</p></div>
          <p className="mono text-[12px]">{people ? `${served} / ${people.length} SERVED` : "…"}</p>
        </div>
      </header>
      <div className="mx-auto max-w-[640px] px-4 pt-5">
        <input className="input" placeholder="Search a name or pass number" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
        <p className="mt-2 text-[13px] text-ink/70">Only people checked in at the door appear here. Each gets one mocktail.</p>
        {msg && <p className="mt-3 rounded-[14px] border-[3px] border-ink bg-lime p-3 font-bold" role="status">{msg}</p>}
        <ul className="mt-4 space-y-3">
          {list.map((p) => (
            <li key={p.id} className="card flex items-center justify-between gap-3 bg-white p-3">
              <div className="min-w-0">
                <p className="truncate text-[18px] font-bold">{p.name}</p>
                <p className="mono text-[12px]">{passLabel(p.passNo)} · {TIER_LABEL[p.tier].toUpperCase()}</p>
              </div>
              {p.servedAt ? (
                <span className="chip flex-none bg-sky">SERVED {timeOf(p.servedAt)}</span>
              ) : (
                <button className="btn btn-sm flex-none !text-[16px]" onClick={() => serve(p)}>Mocktail served</button>
              )}
            </li>
          ))}
        </ul>
        {people && list.length === 0 && <p className="mt-6 text-center text-ink/70">No one matches.</p>}
        <button className="mt-10 underline" onClick={async () => { await fetch("/api/staff/logout", { method: "POST" }); location.href = "/login"; }}>Sign out</button>
      </div>
    </main>
  );
}
