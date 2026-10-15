"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/hooks/useGsap";
import { TiltCard } from "@/components/ui/Interactive";
import { IKanoonLogo } from "@/components/Attribution";

const STORY = "SpiceJet cancelled my flight and still hasn't refunded the ticket";

// Real cases from our index; outcomes and amounts are AI-extracted (see /about).
const CARDS = [
  { name: "Spicejet Ltd. vs Sanyam Aggarwal", forum: "State Commission", year: 2017, outcome: "Complainant won", relief: "Refund Rs 21,013", chip: "Close match", url: "https://indiankanoon.org/doc/169861168/" },
  { name: "Mr. Ravi Poddar vs Spice Jet Airlines", forum: "State Commission", year: 2017, outcome: "Partly allowed", relief: "Rs 8,890 + Rs 10,000 costs", chip: "Close match", url: "https://indiankanoon.org/doc/197246167/" },
  { name: "Shailendra Garg vs Air India & Ors.", forum: "State Commission", year: 2009, outcome: "Complainant won", relief: "Compensation Rs 12,000", chip: "Related", url: "https://indiankanoon.org/doc/124686657/" },
];

const OUTCOME_CLS: Record<string, string> = {
  "Complainant won": "bg-sage/20 text-[#3f4a26]",
  "Partly allowed": "bg-dusk-indigo/25 text-ashoka-navy",
};

/** Signature moment: the story types itself, then result cards drop in on parchment. */
export function LiveDemo() {
  const root = useRef<HTMLElement>(null);
  const [typed, setTyped] = useState(STORY);
  const [showCards, setShowCards] = useState(true);

  useEffect(() => {
    if (!root.current || prefersReducedMotion()) return;
    setTyped("");
    setShowCards(false);
    let timer: ReturnType<typeof setInterval> | undefined;
    const st = ScrollTrigger.create({
      trigger: root.current,
      start: "top 60%",
      once: true,
      onEnter: () => {
        let i = 0;
        timer = setInterval(() => {
          i++;
          setTyped(STORY.slice(0, i));
          if (i >= STORY.length) {
            clearInterval(timer);
            setTimeout(() => setShowCards(true), 350);
          }
        }, 38);
      },
    });
    return () => { st.kill(); if (timer) clearInterval(timer); };
  }, []);

  useEffect(() => {
    if (!showCards || prefersReducedMotion() || !root.current) return;
    const ctx = gsap.context(() => {
      gsap.from(".demo-card", { y: 40, opacity: 0, rotate: (i) => (i % 2 ? 1.5 : -1.5), duration: 1, stagger: 0.12, ease: "expo.out" });
    }, root);
    return () => ctx.revert();
  }, [showCards]);

  const done = typed.length === STORY.length;

  return (
    <section id="demo" ref={root} aria-labelledby="demo-title" className="relative px-5 py-24 md:py-32">
      <div className="mx-auto max-w-5xl">
        <p className="font-deva text-terracotta">एक झलक</p>
        <h2 id="demo-title" className="mt-2 font-display text-[clamp(2.2rem,4.6vw,3.6rem)] leading-none tracking-tight">
          Watch a story become precedent.
        </h2>
        <div className="deckled mt-10 p-6 md:p-10">
          <label className="font-ui text-xs uppercase tracking-[0.18em] text-ink-soft" htmlFor="demo-box">
            Your story
          </label>
          <div
            id="demo-box"
            role="textbox"
            aria-readonly="true"
            aria-label="Example story"
            className="mt-2 min-h-[3.5rem] rounded-xl border border-brass/60 bg-[#fffaf0]/70 px-4 py-3 text-lg shadow-inner"
          >
            <span className={done ? "" : "caret"}>{typed}</span>
          </div>
          <div className="mt-6 flex items-center justify-between gap-4">
            <p className="font-ui text-sm text-ink-soft">
              {showCards ? "In 3 of 3 cases shown, the commission ruled fully or partly for the passenger." : "Searching judgments…"}
            </p>
            <IKanoonLogo />
          </div>
          <ul className="mt-5 grid gap-5 md:grid-cols-3" aria-live="polite">
            {showCards &&
              CARDS.map((c) => (
                <li key={c.name} className="demo-card">
                  <TiltCard className="h-full">
                    <a href={c.url} target="_blank" rel="noopener noreferrer" className="deckled block h-full p-5 transition-transform">
                      <div className="flex items-center justify-between gap-2 font-ui text-xs">
                        <span className={`rounded-full px-2 py-0.5 ${OUTCOME_CLS[c.outcome]}`}>{c.outcome}</span>
                        <span className="rounded-full border border-brass/60 px-2 py-0.5 text-ink-soft">{c.chip}</span>
                      </div>
                      <h3 className="mt-3 font-display text-xl leading-tight">{c.name}</h3>
                      <p className="mt-1 font-ui text-xs text-ink-soft">{c.forum} · {c.year}</p>
                      <p className="mt-4 font-display text-2xl text-terracotta">{c.relief}</p>
                      <p className="mt-3 font-ui text-xs text-ashoka-navy underline underline-offset-4">Read the judgment</p>
                    </a>
                  </TiltCard>
                </li>
              ))}
          </ul>
          <p className="mt-6 font-ui text-xs text-ink-soft">
            A replay with real cases from our index. Outcomes and amounts are AI-generated from the judgments and may contain errors.
          </p>
        </div>
        <div className="mt-8 text-center">
          <Link href="/search" className="btn-brass inline-block rounded-full px-7 py-3 font-ui font-semibold">
            Try it with your own story
          </Link>
        </div>
      </div>
    </section>
  );
}
