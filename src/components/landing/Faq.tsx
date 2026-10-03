"use client";

import { useState } from "react";
import { Chevron } from "../icons";
import { FAQS } from "@/lib/content";

/** Single-open accordion; the first item is open by default. */
export function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <div className="space-y-4">
      {FAQS.map((f, i) => {
        const on = open === i;
        return (
          <div key={f.q} className="card bg-white" data-faq>
            <h3>
              <button
                type="button"
                className="flex min-h-[64px] w-full items-center justify-between gap-4 px-5 py-4 text-left"
                aria-expanded={on}
                aria-controls={`faq-${i}`}
                id={`faq-q-${i}`}
                onClick={() => setOpen(on ? -1 : i)}
              >
                <span className="font-display text-[24px] leading-[1.05] lg:text-[30px]">{f.q}</span>
                <span className="acc-icon grid h-10 w-10 flex-none place-items-center rounded-full border-[3px] border-ink bg-lime">
                  <Chevron />
                </span>
              </button>
            </h3>
            <div className="acc-panel" data-open={on} id={`faq-${i}`} role="region" aria-labelledby={`faq-q-${i}`}>
              <div>
                <p className="px-5 pb-5 text-[16px] leading-[1.5] lg:text-[18px]">{f.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
