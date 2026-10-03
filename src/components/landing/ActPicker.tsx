"use client";

import { useState } from "react";
import { useJam } from "../JamProvider";
import { ACTS } from "@/lib/validate";
import { ACT_ROTATIONS } from "@/lib/content";

/** Selectable act chips that feed the performer sign-up form. */
export function ActPicker() {
  const { openPerformer } = useJam();
  const [picked, setPicked] = useState<string[]>([]);
  const toggle = (a: string) => setPicked((p) => (p.includes(a) ? p.filter((x) => x !== a) : [...p, a]));
  return (
    <>
      <div className="flex flex-wrap gap-x-3 gap-y-4" role="group" aria-label="Pick your acts">
        {ACTS.map((a, i) => (
          <button
            key={a}
            type="button"
            className="act"
            data-act
            aria-pressed={picked.includes(a)}
            style={{ ["--r" as string]: `${ACT_ROTATIONS[i]}deg` }}
            onClick={() => toggle(a)}
          >
            {a}
          </button>
        ))}
      </div>
      <p className="mono mt-6 text-[12px] tracking-wider" aria-live="polite">
        {picked.length ? `${picked.length} PICKED · ${picked.join(" + ")}` : "TAP EVERYTHING YOU DO"}
      </p>
      <button type="button" className="btn btn-dark btn-block mt-5 lg:w-auto" onClick={() => openPerformer(picked)}>
        Claim a stage slot
      </button>
    </>
  );
}
