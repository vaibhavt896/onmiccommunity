import { JamProvider } from "../JamProvider";
import { Logo } from "../Logo";
import { Arrow, Instagram, Lock, WhatsApp } from "../icons";
import { ActPicker } from "./ActPicker";
import { Faq } from "./Faq";
import { BookButton, DateChip, Nav, Price, SeatMeter, TicketDate } from "./live";
import { HeroFilm } from "./HeroFilm";
import { HeroControls, Motion } from "./Motion";
import { QUOTES, STATS, STEPS, VIBES } from "@/lib/content";
import { INSTAGRAM_HANDLE, INSTAGRAM_URL, WHATSAPP_URL } from "@/lib/public-config";
import type { PublicJam } from "@/lib/types";

/**
 * Runs during HTML parse, before the hero paints: hides the hero pieces that
 * the load sequence reveals, but only when motion is allowed. If GSAP has not
 * booted within 3.5s, everything is shown anyway.
 */
const MOTION_BOOT = `try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches){document.documentElement.classList.add('js-motion');setTimeout(function(){if(!window.__onmicMotion)document.documentElement.classList.remove('js-motion')},3500)}}catch(e){}`;

function Heading({ line, serif, kicker, dark = false, className = "" }: { line: string; serif: string; kicker: string; dark?: boolean; className?: string }) {
  return (
    <div className={`mb-[var(--heading-gap)] ${className}`} data-heading>
      <p className={`kicker mb-4 ${dark ? "text-lime" : ""}`}>{kicker}</p>
      <h2 aria-label={`${line} ${serif}`}>
        <span className="mask" aria-hidden="true">
          <span className="h-display" data-hline>{line}</span>
        </span>
        <span className="h-serif block" data-hserif aria-hidden="true">{serif}</span>
      </h2>
    </div>
  );
}

function Tape({ text, cls }: { text: string; cls: string }) {
  const items = Array.from({ length: 8 }, () => text);
  return (
    <div className={`tape ${cls}`} aria-hidden="true">
      <div className="tape-track" data-tape>
        {items.map((t, i) => <span key={i}>{t}</span>)}
        {items.map((t, i) => <span key={`b${i}`}>{t}</span>)}
      </div>
    </div>
  );
}

export function Landing({ jam, openOnLoad = false }: { jam: PublicJam | null; openOnLoad?: boolean }) {
  return (
    <JamProvider initialJam={jam} openOnLoad={openOnLoad}>
      <script dangerouslySetInnerHTML={{ __html: MOTION_BOOT }} />
      <Nav />
      <main id="main">
        {/* ============================================================ HERO */}
        <section className="hero" id="top" aria-labelledby="hero-title">
          <h1 id="hero-title" className="sr-only">Get on the mic. Your turn. Open mic + jam nights in Kanpur.</h1>

          <div className="hero-film">
            <HeroFilm />
            {/* Only the CTA and the pause control ride on the film; they cover the least possible of it. */}
            <div className="hero-dock wrap">
              <div className="dock-cta" data-hero="cta">
                <BookButton source="hero_cta_click" className="btn btn-block" data-herocta>
                  Grab your seat <Arrow className="cta-arrow" />
                </BookButton>
              </div>
              <HeroControls />
            </div>
          </div>

          <div className="hero-meta wrap">
            <DateChip />
            <p className="mono flex items-center gap-2 text-[12px] tracking-wider text-cream/90" data-hero="note">
              <Lock size={14} /> VENUE IS A SECRET · REVEALED AFTER BOOKING
            </p>
          </div>

          <div className="tapes">
            <Tape cls="tape-lime" text="GET ON THE MIC ★ OPEN MIC ★ JAM NIGHTS ★ KANPUR ★" />
            <Tape cls="tape-mag" text="SING ★ RAP ★ POETRY ★ STAND-UP ★ BEATBOX ★ JUST VIBE ★" />
          </div>
        </section>

        {/* ============================================================ 01 PROOF */}
        <section className="section bg-cream text-ink" id="proof">
          <div className="wrap">
            <Heading kicker="01 / The proof" line="THE VIBE," serif="in numbers." />
            <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
              {STATS.map((s, i) => {
                const value = i === 2 ? (jam?.price ?? 300) : s.value;
                return (
                  <div key={s.label} className="tilt" style={{ ["--r" as string]: `${s.r}deg` }} data-stat data-r={s.r}>
                    <div className={`card tilt-inner ${s.bg} px-6 py-6`} data-tilt>
                      <p className="font-display text-[88px] leading-[0.9] lg:text-[110px]" aria-label={`${s.prefix}${value}${s.suffix}`}>
                        <span aria-hidden="true"><span className="normal-case">{s.prefix}</span><span data-count={value}>{value}</span>{s.suffix}</span>
                      </p>
                      <p className="mt-2 text-[17px] font-bold">{s.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ============================================================ 02 HOW IT WORKS */}
        <section className="section bg-ink text-cream" id="how">
          <div className="wrap">
            <Heading kicker="02 / How it works" line="3 STEPS." serif="zero stress." dark />
            <ol className="grid gap-5 lg:grid-cols-3 lg:gap-8">
              {STEPS.map((s) => (
                <li key={s.n} className="rounded-[24px] border-[3px] border-cream p-6 shadow-[5px_5px_0_var(--color-violet)]" data-step>
                  <img src={s.icon} alt="" width={112} height={112} loading="lazy" decoding="async" className="float-right -mr-1 -mt-1 h-24 w-24 lg:h-28 lg:w-28" />
                  <p className={`font-display text-[80px] leading-[0.85] ${s.color}`} data-stepnum>{s.n}</p>
                  <h3 className="font-display mt-3 text-[34px] leading-[0.95]">{s.title}</h3>
                  <p className="mt-2 text-[16px] text-cream/80">{s.sub}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ============================================================ 03 NEXT JAM TICKET */}
        <section className="section bg-magenta text-ink" id="ticket">
          <div className="wrap lg:grid lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-16">
            <div>
              <Heading kicker="03 / Next jam" line="NEXT JAM," serif="your seat's waiting." />
              <ul className="mb-10 hidden space-y-4 lg:block">
                {STEPS.map((s) => (
                  <li key={s.n} className="flex items-baseline gap-4">
                    <span className="font-display text-[34px] leading-none">{s.n}</span>
                    <span className="text-[19px] font-bold">{s.title} <span className="font-normal">· {s.sub}</span></span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="tilt mx-1 max-w-[520px] lg:mx-0" style={{ ["--r" as string]: "-1.5deg" }} data-ticket>
              <article className="ticket px-6 pb-6 pt-6" style={{ ["--perf" as string]: "58%" }} aria-label="Next jam ticket">
                <div className="flex items-center justify-between">
                  <span className="kicker">On Mic Jam · Admit one</span>
                  <span className="chip bg-lime">1 SEAT</span>
                </div>
                <div className="mt-4"><TicketDate /></div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="chip">ENTRY</span>
                  <span className="chip bg-lime">+ MOCKTAIL</span>
                  <span className="chip bg-sky">LIVE STAGE</span>
                </div>
                <div className="mt-4 flex items-center gap-3 rounded-[14px] border-2 border-ink bg-white px-3 py-3">
                  <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-ink text-lime" data-lock><Lock size={16} /></span>
                  <div className="min-w-0">
                    <p className="kicker text-[11px]">Venue</p>
                    <p className="flex items-center gap-2 text-[14px] font-bold">
                      <span className="redact w-24" aria-hidden="true" /> Revealed in your pass
                    </p>
                  </div>
                </div>

                <div className="notch l" aria-hidden="true" />
                <div className="notch r" aria-hidden="true" />
                <div className="perf" aria-hidden="true" />

                <div className="mt-12">
                  <SeatMeter />
                  <BookButton source="ticket_cta_click" className="btn btn-block mt-5 justify-between gap-2 px-4 text-[21px]">
                    <span>Book my seat</span><span className="flex items-center gap-2"><Price /> <Arrow size={22} /></span>
                  </BookButton>
                  <p className="mono mt-4 text-center text-[11px] tracking-wider">1 SEAT = 1 PERSON · FRIENDS BOOK THEIR OWN</p>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* ============================================================ 04 VIBES */}
        <section className="section bg-ink text-cream" id="vibes">
          <div className="wrap">
            <Heading kicker="04 / The vibes" line="WHAT IT" serif="feels like." dark />
            <div className="bento">
              {VIBES.map((v) => (
                <figure key={v.key} className={`tile ${v.cls}`} data-tile>
                  {v.video ? (
                    <video className="media h-[calc(100%+48px)] w-full object-cover" src={v.video} poster={v.poster} muted loop playsInline preload="none" data-media data-video aria-hidden="true" />
                  ) : v.image ? (
                    <img className="media h-[calc(100%+48px)] w-full object-cover" src={v.image} width={v.size?.[0]} height={v.size?.[1]} alt="" loading="lazy" decoding="async" data-media />
                  ) : (
                    <div className="media grain" data-media style={{ backgroundImage: v.gradient }} />
                  )}
                  <figcaption className="label">{v.label}</figcaption>
                  {v.live && (
                    <span className="chip absolute right-3 top-3 -rotate-6 bg-cream" data-live>
                      <span className="live-dot" aria-hidden="true" /> LIVE
                    </span>
                  )}
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================ 05 STAGE */}
        <section className="section overflow-hidden bg-lime text-ink" id="stage">
          <div className="wrap lg:grid lg:grid-cols-[1fr_1fr] lg:gap-16">
            <div>
              <Heading kicker="05 / The stage" line="GOT SOMETHING" serif="to say?" />
            </div>
            <div>
              <p className="mb-6 max-w-[34ch] text-[17px] font-bold">Pick your thing. We'll line you up for a slot on the night.</p>
              <ActPicker />
            </div>
          </div>

          <div className="lineup wrap" aria-hidden="true">
            <img src="/stage/guitarist.webp" alt="" width={521} height={900} loading="lazy" decoding="async" />
            <img src="/stage/singer.webp" alt="" width={375} height={900} loading="lazy" decoding="async" />
            <img src="/stage/poet.webp" alt="" width={358} height={900} loading="lazy" decoding="async" />
          </div>
        </section>

        {/* ============================================================ 06 WORD */}
        <section className="section bg-violet-deep text-cream" id="word">
          <div className="wrap">
            <Heading kicker="06 / The word" line="HEARD AT" serif="the last jam." dark />
            <div className="grid gap-10 pt-2 lg:grid-cols-3 lg:gap-10">
              {QUOTES.map((q) => (
                <figure key={q.who} className="tilt" style={{ ["--r" as string]: `${q.r}deg` }} data-note data-r={q.r}>
                  <div className={`note tilt-inner ${q.bg}`} data-tilt>
                    <blockquote>“{q.text}”</blockquote>
                    <figcaption className="mono mt-4 text-[12px] tracking-wider">— {q.who.toUpperCase()}</figcaption>
                  </div>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================ 07 FINE PRINT */}
        <section className="section bg-cream text-ink" id="faq">
          <div className="wrap max-w-[900px]">
            <Heading kicker="07 / The fine print" line="GOOD TO" serif="know." />
            <Faq />
          </div>
        </section>

        {/* ============================================================ FINAL CTA + FOOTER */}
        <section className="section relative overflow-hidden bg-violet text-cream" id="final">
          <div className="final-bg" aria-hidden="true" />
          <div className="wrap relative">
            <h2 className="final-h font-display leading-[0.9]" aria-label="Your seat. Your stage. See you there.">
              <span className="mask" aria-hidden="true"><span data-fline>YOUR SEAT.</span></span>
              <span className="mask text-lime" aria-hidden="true"><span data-fline>YOUR STAGE.</span></span>
              <span className="h-serif block normal-case" data-fline aria-hidden="true">see you there.</span>
            </h2>
            <div className="mt-9 lg:max-w-[480px]">
              <BookButton source="hero_cta_click" className="btn btn-block">
                Grab your seat <Arrow />
              </BookButton>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <a className="pill" href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label={`On Mic Community on Instagram, ${INSTAGRAM_HANDLE}`}><Instagram /> {INSTAGRAM_HANDLE}</a>
              <a className="pill bg-lime" href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer"><WhatsApp /> WhatsApp community</a>
            </div>

            <footer className="mt-16 border-t-[3px] border-cream/30 pt-8">
              <div className="flex items-center gap-4">
                <Logo size={110} />
                <div>
                  <p className="font-display text-[28px] leading-none">On Mic Community</p>
                  <p className="font-serif-i text-[20px]">open mic + jam nights · Kanpur</p>
                </div>
              </div>
              <div className="mono mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-[12px] tracking-wider text-cream/80">
                <a href="/privacy" className="underline underline-offset-4">PRIVACY</a>
                <span>PREPAID SEATS · 1 SEAT = 1 PERSON</span>
                <HeroControls compact />
                <span>© {new Date().getFullYear()} ON MIC COMMUNITY</span>
              </div>
            </footer>
          </div>
        </section>
      </main>
      <Motion />
    </JamProvider>
  );
}
