"use client";

import { useEffect } from "react";
import { Logo } from "@/components/Logo";
import { PassCard } from "@/components/pass/PassCard";
import { track } from "@/lib/track";
import type { PassView } from "@/lib/types";

export function PassPage({ token, view }: { token: string; view: PassView }) {
  useEffect(() => {
    track("pass_viewed");
    // Works offline after the first load: cafe wifi can be weak.
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return (
    <main className="min-h-dvh bg-violet px-5 pb-12 pt-6 text-ink" style={{ background: "linear-gradient(180deg,#4a16d6,#2a0c7a 60%,#0d0616)" }}>
      <div className="mx-auto max-w-[440px]">
        <a href="/" className="inline-flex items-center gap-3 text-cream" aria-label="On Mic Community home">
          <Logo size={64} />
          <span className="font-display text-[22px]">On Mic Community</span>
        </a>
        <div className="mt-6 rounded-[28px] border-[3px] border-ink bg-cream p-5 shadow-[8px_8px_0_#0d0616]">
          {view.state === "HELD" ? (
            <div>
              <PassCard token={token} initial={view} />
              <a href={`/book?t=${token}`} className="btn btn-block mt-6">Finish paying</a>
            </div>
          ) : (
            <PassCard token={token} initial={view} />
          )}
        </div>
      </div>
    </main>
  );
}
