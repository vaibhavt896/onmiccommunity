"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Logo } from "@/components/Logo";
import { passLabel } from "@/lib/format";
import { TIER_LABEL, type Tier } from "@/lib/types";

type Person = {
  id: string; name: string; phone: string; instagram: string; tier: Tier; state: string; passNo: string;
  utr: string | null; amount: number; submittedAt: string | null; checkedInAt: string | null; servedAt: string | null; whatsapp: string;
};
type JamForm = {
  id?: string; title: string; status: string; startsAt: string; cutoffAt: string;
  capacity: number | string; price: number | string; venueName: string; venueMapUrl: string;
};
type Overview = {
  staff: { name: string };
  jam: JamForm | null;
  counts: { booked: number; held: number; pending: number; confirmed: number; checkedIn: number; served: number };
  pending: Person[];
  confirmed: Person[];
  performers: { id: string; name: string; phone: string; acts: string[]; notes: string; created_at: string }[];
  waitlist: { id: string; name: string; phone: string; created_at: string }[];
  sources: { source: string; medium: string; bookings: number; confirmed: number }[];
  events: { name: string; source: string; n: number }[];
};

const t = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }) : "";

async function post(url: string, data: unknown) {
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
  const d = await r.json().catch(() => ({}));
  return { ok: r.ok, data: d as Record<string, string> };
}

function Box({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="card bg-white p-4 md:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-display text-[26px] leading-none">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

export function Admin() {
  const [o, setO] = useState<Overview | null>(null);
  const [q, setQ] = useState("");
  const [toast, setToast] = useState("");
  const [sent, setSent] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    fetch("/api/admin/overview", { cache: "no-store" }).then(async (r) => {
      if (r.status === 401 || r.status === 403) location.href = "/login?next=/admin";
      else setO(await r.json());
    });
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(() => document.visibilityState === "visible" && load(), 10_000);
    return () => clearInterval(iv);
  }, [load]);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 3000);
  };

  const act = async (path: string, id: string, confirmText?: string) => {
    if (confirmText && !confirm(confirmText)) return;
    const r = await post(`/api/admin/${path}`, { id });
    if (!r.ok) return flash(r.data.message ?? "Failed");
    if (path === "approve" || path === "rotate") setSent((s) => ({ ...s, [id]: r.data.whatsapp }));
    flash(path === "approve" ? "Approved. Send the pass on WhatsApp." : path === "rotate" ? "New QR issued. The old link is dead; send the new one." : "Done");
    load();
  };

  const confirmed = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = o?.confirmed ?? [];
    return s ? list.filter((p) => `${p.name} ${p.phone} ${p.passNo} ${p.instagram}`.toLowerCase().includes(s)) : list;
  }, [o, q]);

  if (!o) return <main className="grid min-h-dvh place-items-center bg-cream text-ink"><span className="bars text-violet"><i /><i /><i /></span></main>;

  return (
    <main className="min-h-dvh bg-cream pb-20 text-ink">
      <header className="sticky top-0 z-20 border-b-[3px] border-ink bg-ink text-cream">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Logo size={46} />
            <div>
              <p className="font-display text-[22px] leading-none">Admin</p>
              <p className="mono text-[11px] text-cream/70">{o.staff.name.toUpperCase()}</p>
            </div>
          </div>
          <nav className="flex gap-2">
            <a className="pill !min-h-[40px] !text-[15px]" href="/door">Door</a>
            <a className="pill !min-h-[40px] !text-[15px]" href="/counter">Counter</a>
            <button className="pill !min-h-[40px] !bg-magenta !text-[15px]" onClick={async () => { await post("/api/staff/logout", {}); location.href = "/login"; }}>Out</button>
          </nav>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1100px] grid-cols-1 gap-6 px-4 pt-6">
        {o.jam && (
          <section className="grid grid-cols-3 gap-3 md:grid-cols-6" aria-label="Live headcount">
            {[
              ["Booked", `${o.counts.booked}/${o.jam.capacity}`, "bg-lime"],
              ["Confirmed", o.counts.confirmed, "bg-white"],
              ["Pending", o.counts.pending, o.counts.pending ? "bg-orange" : "bg-white"],
              ["On hold", o.counts.held, "bg-white"],
              ["Inside", o.counts.checkedIn, "bg-sky"],
              ["Mocktails", o.counts.served, "bg-white"],
            ].map(([k, v, bg]) => (
              <div key={k as string} className={`card ${bg} p-3`}>
                <p className="kicker text-[10px]">{k}</p>
                <p className="font-display text-[34px] leading-none">{v}</p>
              </div>
            ))}
          </section>
        )}

        <Box title={`Pending payments (${o.pending.length})`}>
          {o.pending.length === 0 && <p className="text-ink/70">Nothing waiting. Nice.</p>}
          <ul className="space-y-3">
            {o.pending.map((p) => (
              <li key={p.id} className="rounded-[16px] border-[3px] border-ink bg-cream p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-[18px] font-bold">{p.name}</p>
                  <p className="font-display text-[24px] leading-none normal-case">Rs {p.amount}</p>
                </div>
                <p className="mono mt-1 text-[13px]">UTR {p.utr}</p>
                <p className="text-[14px]"><a className="underline" href={`tel:+91${p.phone}`}>+91 {p.phone}</a> · {passLabel(p.passNo)} · {t(p.submittedAt)}</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button className="btn btn-sm" onClick={() => act("approve", p.id)}>Approve</button>
                  <button className="btn btn-sm btn-white" onClick={() => act("reject", p.id, `Reject ${p.name}'s payment? The seat goes back to the pool.`)}>Reject</button>
                </div>
              </li>
            ))}
          </ul>
        </Box>

        {Object.keys(sent).length > 0 && (
          <Box title="Send passes on WhatsApp">
            <ul className="space-y-2">
              {o.confirmed.filter((p) => sent[p.id]).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3">
                  <span className="font-bold">{p.name}</span>
                  <a className="btn btn-sm btn-dark" href={sent[p.id]} target="_blank" rel="noopener noreferrer"
                    onClick={() => setSent((s) => { const n = { ...s }; delete n[p.id]; return n; })}>WhatsApp pass</a>
                </li>
              ))}
            </ul>
          </Box>
        )}

        <Box title={`Confirmed (${o.confirmed.length})`} right={<a className="btn btn-sm btn-white" href="/api/admin/export">CSV</a>}>
          <input className="input mb-3" placeholder="Search name, phone, pass…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search confirmed attendees" />
          <ul className="divide-y-2 divide-ink/10">
            {confirmed.map((p) => (
              <li key={p.id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-bold">{p.name} {p.instagram && <span className="font-normal text-ink/60">@{p.instagram}</span>}</p>
                    <p className="mono text-[12px]">{passLabel(p.passNo)} · +91 {p.phone} · {TIER_LABEL[p.tier]}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {p.state === "CHECKED_IN" && <span className="chip bg-sky">IN {t(p.checkedInAt)}</span>}
                    {p.servedAt && <span className="chip bg-lime">MOCKTAIL ✓</span>}
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <a className="chip min-h-[40px] bg-lime" href={p.whatsapp} target="_blank" rel="noopener noreferrer">WHATSAPP PASS</a>
                  <button className="chip min-h-[40px]" onClick={() => act("rotate", p.id, `Issue a new QR for ${p.name}? The old link and QR stop working.`)}>NEW QR</button>
                  {p.state === "CONFIRMED" && (
                    <button className="chip min-h-[40px] bg-magenta" onClick={() => act("cancel", p.id, `Cancel ${p.name}'s pass?`)}>CANCEL</button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Box>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <JamEditor jam={o.jam} onSaved={(m) => { flash(m); load(); }} />
          <IssuePass onDone={(link) => { flash("Pass issued."); window.open(link, "_blank", "noopener"); load(); }} />
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Box title={`Stage requests (${o.performers.length})`}>
            {o.performers.length === 0 && <p className="text-ink/70">None yet.</p>}
            <ul className="space-y-3">
              {o.performers.map((p) => (
                <li key={p.id} className="rounded-[14px] border-2 border-ink p-3">
                  <p className="font-bold">{p.name} · <a className="underline" href={`https://wa.me/91${p.phone}`} target="_blank" rel="noopener noreferrer">+91 {p.phone}</a></p>
                  <p className="mono text-[12px]">{p.acts.join(" + ")}</p>
                  {p.notes && <p className="mt-1 text-[14px]">{p.notes}</p>}
                </li>
              ))}
            </ul>
          </Box>
          <Box title={`Waitlist (${o.waitlist.length})`}>
            {o.waitlist.length === 0 && <p className="text-ink/70">Empty.</p>}
            <ul className="space-y-1">
              {o.waitlist.map((w) => (
                <li key={w.id} className="flex justify-between gap-2"><span className="font-bold">{w.name}</span>
                  <a className="underline" href={`https://wa.me/91${w.phone}`} target="_blank" rel="noopener noreferrer">+91 {w.phone}</a></li>
              ))}
            </ul>
          </Box>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Box title="Bookings by source">
            <table className="w-full text-left text-[14px]">
              <thead className="mono text-[11px]"><tr><th>SOURCE</th><th>MEDIUM</th><th className="text-right">BOOKED</th><th className="text-right">PAID</th></tr></thead>
              <tbody>
                {o.sources.map((s) => (
                  <tr key={s.source + s.medium} className="border-t border-ink/10"><td className="py-1.5 font-bold">{s.source}</td><td>{s.medium}</td><td className="text-right">{s.bookings}</td><td className="text-right">{s.confirmed}</td></tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-[13px] text-ink/70">Tag links like <span className="mono break-all">/?utm_source=instagram&amp;utm_medium=reel&amp;utm_campaign=jam-oct</span> (medium: bio, story or reel).</p>
          </Box>
          <Box title="Events (30 days)">
            <table className="w-full text-left text-[14px]">
              <thead className="mono text-[11px]"><tr><th>EVENT</th><th>SOURCE</th><th className="text-right">COUNT</th></tr></thead>
              <tbody>
                {o.events.map((e) => (
                  <tr key={e.name + e.source} className="border-t border-ink/10"><td className="py-1.5 font-bold">{e.name}</td><td>{e.source}</td><td className="text-right">{e.n}</td></tr>
                ))}
              </tbody>
            </table>
          </Box>
        </div>
      </div>

      {toast && (
        <div className="fixed inset-x-4 bottom-5 z-50 mx-auto max-w-[480px] rounded-[16px] border-[3px] border-ink bg-lime p-4 font-bold shadow-[5px_5px_0_#0d0616]" role="status">
          {toast}
        </div>
      )}
    </main>
  );
}

function JamEditor({ jam, onSaved }: { jam: JamForm | null; onSaved: (m: string) => void }) {
  const blank: JamForm = { title: "On Mic Jam", status: "draft", startsAt: "", cutoffAt: "", capacity: 50, price: 300, venueName: "", venueMapUrl: "" };
  const [f, setF] = useState<JamForm>(jam ?? blank);
  const [err, setErr] = useState("");
  const [dirty, setDirty] = useState(false);
  useEffect(() => { if (!dirty && jam) setF(jam); }, [jam, dirty]);
  const set = (k: keyof JamForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { setDirty(true); setF({ ...f, [k]: e.target.value }); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await post("/api/admin/jam", { ...f, capacity: Number(f.capacity), price: Number(f.price) });
    if (!r.ok) return setErr(r.data.message ?? "Failed");
    setErr("");
    setDirty(false);
    onSaved(f.id ? "Jam saved." : "New jam created.");
  };
  const setStatus = async (status: string) => {
    if (!f.id) return;
    if (status === "closed" && !confirm("Close bookings now? Every CTA switches to the waitlist.")) return;
    await post("/api/admin/jam", { id: f.id, status });
    setDirty(false);
    onSaved(status === "closed" ? "Bookings closed." : "Bookings reopened.");
  };

  return (
    <Box title={f.id ? "Current jam" : "New jam"} right={
      f.id ? (
        f.status === "open"
          ? <button className="btn btn-sm !bg-magenta" onClick={() => setStatus("closed")}>Close bookings</button>
          : f.status === "closed" ? <button className="btn btn-sm" onClick={() => setStatus("open")}>Reopen</button> : null
      ) : null
    }>
      <form className="grid gap-3" onSubmit={save}>
        <label><span className="field-label">Title</span><input className="input" value={f.title} onChange={set("title")} /></label>
        <div className="grid grid-cols-2 gap-3">
          <label><span className="field-label">Starts (IST)</span><input className="input !text-[15px]" type="datetime-local" value={f.startsAt} onChange={set("startsAt")} /></label>
          <label><span className="field-label">Booking cutoff</span><input className="input !text-[15px]" type="datetime-local" value={f.cutoffAt} onChange={set("cutoffAt")} /></label>
          <label><span className="field-label">Capacity</span><input className="input" type="number" min={1} value={f.capacity} onChange={set("capacity")} /></label>
          <label><span className="field-label">Price (Rs)</span><input className="input" type="number" min={0} value={f.price} onChange={set("price")} /></label>
        </div>
        <label><span className="field-label">Venue name (secret)</span><input className="input" value={f.venueName} onChange={set("venueName")} /></label>
        <label><span className="field-label">Maps link (secret)</span><input className="input" value={f.venueMapUrl} onChange={set("venueMapUrl")} placeholder="https://maps.app.goo.gl/…" /></label>
        <label><span className="field-label">Status</span>
          <select className="input" value={f.status} onChange={set("status")}>
            <option value="draft">Draft (hidden)</option><option value="open">Open</option><option value="closed">Closed</option><option value="done">Done</option>
          </select>
        </label>
        {err && <p className="error-text" role="alert">{err}</p>}
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-sm">{f.id ? "Save" : "Create jam"}</button>
          {f.id && <button type="button" className="btn btn-sm btn-white" onClick={() => { setDirty(true); setF({ ...blank }); }}>Start a new jam</button>}
        </div>
        <p className="text-[13px] text-ink/70">The venue only ever shows inside confirmed passes. Default cutoff: 24 hours before the start.</p>
      </form>
    </Box>
  );
}

function IssuePass({ onDone }: { onDone: (whatsapp: string) => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [tier, setTier] = useState<Tier>("guest");
  const [err, setErr] = useState("");
  return (
    <Box title="Issue a pass">
      <form className="grid gap-3" onSubmit={async (e) => {
        e.preventDefault();
        const r = await post("/api/admin/issue", { name, phone, tier });
        if (!r.ok) return setErr(r.data.message ?? "Failed");
        setErr(""); setName(""); setPhone("");
        onDone(r.data.whatsapp);
      }}>
        <p className="text-[14px] text-ink/70">Comp passes for performers, core team and special guests. Confirmed straight away; scanned at the door like any other.</p>
        <label><span className="field-label">Name</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label><span className="field-label">WhatsApp (10 digits)</span><input className="input" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
        <label><span className="field-label">Ticket type</span>
          <select className="input" value={tier} onChange={(e) => setTier(e.target.value as Tier)}>
            {(Object.keys(TIER_LABEL) as Tier[]).map((k) => <option key={k} value={k}>{TIER_LABEL[k]}</option>)}
          </select>
        </label>
        {err && <p className="error-text" role="alert">{err}</p>}
        <button className="btn btn-sm btn-dark">Issue + WhatsApp</button>
      </form>
    </Box>
  );
}
