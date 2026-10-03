"use client";

import { useEffect, useState } from "react";
import { useJam } from "../JamProvider";
import { Logo } from "../Logo";
import { chipDate, timeOf } from "@/lib/format";
import { track, type TrackEvent } from "@/lib/track";

const SOLD_OUT = "Sold out / Join the waitlist";

/** Any "Book" button. Switches to the waitlist when sold out or past cutoff. */
export function BookButton({
  source,
  className = "btn",
  soldOutLabel = SOLD_OUT,
  children,
  ...rest
}: {
  source?: TrackEvent;
  className?: string;
  soldOutLabel?: React.ReactNode;
  children: React.ReactNode;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children">) {
  const { jam, openBook } = useJam();
  const sold = !jam || jam.sale === "soldout";
  return (
    <button
      type="button"
      className={className}
      data-sold={sold || undefined}
      onClick={() => {
        if (source) track(source);
        openBook();
      }}
      {...rest}
    >
      {sold ? soldOutLabel : children}
    </button>
  );
}

/** Transparent over the hero; solid ink with a lime pill once past it. */
export function Nav() {
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const hero = document.getElementById("top");
    if (!hero) return setSolid(true);
    const io = new IntersectionObserver(([e]) => setSolid(!e.isIntersecting), { rootMargin: "-72px 0px 0px 0px" });
    io.observe(hero);
    return () => io.disconnect();
  }, []);
  return (
    <header className="nav" data-solid={solid}>
      <a href="#main" className="sr-only-focusable absolute left-3 top-3 z-50 rounded-full bg-lime px-4 py-2 font-bold text-ink">
        Skip to content
      </a>
      <div className="wrap flex h-[68px] items-center justify-between">
        <a href="#top" aria-label="On Mic Community, back to top" data-hero="logo" className="block">
          <Logo size={50} />
        </a>
        <span data-hero="navpill">
          <BookButton className="pill" soldOutLabel="Sold out / Waitlist">
            Book seat
          </BookButton>
        </span>
      </div>
    </header>
  );
}

export function DateChip() {
  const { jam } = useJam();
  return (
    <span className="chip" data-hero="chip">
      <span className="pulse-dot" aria-hidden="true" />
      {jam ? <>NEXT JAM / {chipDate(jam.startsAt)} / KANPUR</> : <>NEXT JAM / DATE SOON / KANPUR</>}
    </span>
  );
}

export function TicketDate() {
  const { jam } = useJam();
  if (!jam) return <p className="font-display text-[56px] leading-[0.9]">Date soon</p>;
  return (
    <div className="flex items-end justify-between gap-3 whitespace-nowrap">
      <p className="font-display text-[clamp(38px,12vw,56px)] leading-[0.88]">{chipDate(jam.startsAt)}</p>
      <p className="font-display pb-1 text-[22px] leading-none">{timeOf(jam.startsAt)}</p>
    </div>
  );
}

export function SeatMeter() {
  const { jam } = useJam();
  const cap = jam?.capacity ?? 50;
  const booked = jam ? (jam.sale === "soldout" ? cap : jam.booked) : 0;
  const fill = jam ? (jam.sale === "soldout" ? 1 : booked / cap) : 0;
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="kicker">Seats</span>
        <span className="mono text-[13px]" aria-live="polite">
          {jam?.sale === "soldout" ? "SOLD OUT" : `${booked} / ${cap} TAKEN · ${jam?.seatsLeft ?? cap} LEFT`}
        </span>
      </div>
      <div className="meter" role="meter" aria-label="Seats taken" aria-valuemin={0} aria-valuemax={cap} aria-valuenow={booked}>
        <div className="meter-fill" data-meter style={{ ["--fill" as string]: fill }} />
      </div>
    </div>
  );
}

export function Price({ prefix = "Rs " }: { prefix?: string }) {
  const { jam } = useJam();
  return <span className="normal-case">{prefix}{jam?.price ?? 300}</span>;
}
