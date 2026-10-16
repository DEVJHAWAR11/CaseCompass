"use client";

import { useRef } from "react";
import { useGsap, gsap } from "@/hooks/useGsap";
import { CountUp } from "@/components/ui/Interactive";
import { BrassDivider } from "@/components/ui/Ornaments";

// Numbers are real counts from the project's first collection (see docs/guide-notes.md).
const STATS = [
  { to: 614, label: "consumer-commission judgments read" },
  { to: 6821, label: "citation links mapped between cases" },
  { to: 2213, label: "key passages indexed (facts, issues, orders)" },
];

function Roller({ className = "" }: { className?: string }) {
  return (
    <div className={`relative h-6 w-[calc(100%+3rem)] -mx-6 ${className}`} aria-hidden="true">
      <div className="absolute inset-0 rounded-full bg-gradient-to-b from-[#d6b47a] via-[#b8893b] to-[#7e5a22] shadow-[0_6px_14px_-6px_rgb(46_33_24/0.6)]" />
      <div className="absolute -left-2 top-1/2 h-8 w-4 -translate-y-1/2 rounded-full bg-terracotta" />
      <div className="absolute -right-2 top-1/2 h-8 w-4 -translate-y-1/2 rounded-full bg-terracotta" />
    </div>
  );
}

/** Signature moment: a parchment scroll unrolls as you scroll (pinned + scrubbed). */
export function Problem() {
  const root = useRef<HTMLElement>(null);
  useGsap(root, ({ reduced }) => {
    if (reduced) return;
    // Pin only where the whole scroll fits on screen; on phones/short screens it unrolls in place.
    const fits = window.matchMedia("(min-width: 768px) and (min-height: 700px)").matches;
    const trigger = fits
      ? { trigger: root.current, start: "top top", end: "+=120%", pin: true, scrub: 0.6 }
      : { trigger: root.current, start: "top 75%", end: "bottom 85%", scrub: 0.6 };
    gsap
      .timeline({ scrollTrigger: trigger })
      .fromTo(".scroll-paper", { clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)", ease: "none" })
      .fromTo(".scroll-bottom", { y: () => -document.querySelector<HTMLElement>(".scroll-paper")!.offsetHeight }, { y: 0, ease: "none" }, 0)
      .from(".problem-line", { opacity: 0, y: 20, stagger: 0.15, ease: "power2.out" }, 0.25);
  });

  return (
    <section ref={root} aria-labelledby="problem-title" className="relative flex min-h-[100svh] items-center justify-center px-5 py-20">
      <div className="w-full max-w-2xl">
        <Roller />
        <div className="scroll-paper deckled relative px-8 py-12 text-center md:px-14 md:py-16 [@media(max-height:760px)]:py-7">
          <p className="problem-line font-deva text-terracotta">समस्या</p>
          <h2 id="problem-title" className="problem-line mt-2 font-display text-[clamp(2rem,4.6vw,3.4rem)] leading-[1.05] tracking-tight">
            A cancelled flight. A refund that never comes.
          </h2>
          <p className="problem-line mx-auto mt-5 max-w-lg text-lg leading-relaxed text-ink-soft [@media(max-height:760px)]:text-base">
            Most people give up on small disputes, not because they are wrong, but because they cannot
            tell whether a complaint would succeed. Keyword legal search does not understand a story
            told in plain words.
          </p>
          <BrassDivider className="problem-line my-9 [@media(max-height:760px)]:my-5" />
          <dl className="grid gap-6 sm:grid-cols-3">
            {STATS.map((s) => (
              <div key={s.label} className="problem-line">
                <dt className="sr-only">{s.label}</dt>
                <dd>
                  <CountUp to={s.to} className="block font-display text-5xl text-ashoka-navy [@media(max-height:760px)]:text-4xl" />
                  <span className="mt-1 block font-ui text-sm text-ink-soft">{s.label}</span>
                </dd>
              </div>
            ))}
          </dl>
          <p className="problem-line mt-6 font-ui text-xs text-ink-soft">Counts from our current collection: travel, insurance, property, banking, medical and more.</p>
        </div>
        <Roller className="scroll-bottom" />
      </div>
    </section>
  );
}
