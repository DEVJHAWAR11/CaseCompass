"use client";

import { useRef } from "react";
import { useGsap, gsap } from "@/hooks/useGsap";

// Our own commitments (not customer testimonials: this is a learning project with no users to quote).
const PROMISES = [
  { quote: "We will never tell you that you will win.", by: "Our first rule", tilt: -2.5 },
  { quote: "Every outcome links to the judgment it came from.", by: "Sources first", tilt: 1.8 },
  { quote: "Numbers are counted by code, not guessed by AI.", by: "How the stats are made", tilt: -1.2 },
  { quote: "When the AI is not sure, it says unclear instead of guessing.", by: "Honest labels", tilt: 2.4 },
];

/** Signature moment: torn-paper notes fall into place, straightening as you scroll. */
export function Trust() {
  const root = useRef<HTMLElement>(null);
  useGsap(root, ({ reduced }) => {
    if (reduced) return;
    gsap.utils.toArray<HTMLElement>(".trust-card").forEach((card, i) =>
      gsap.fromTo(
        card,
        { y: 120, rotate: PROMISES[i].tilt * 4, opacity: 0 },
        { y: 0, rotate: PROMISES[i].tilt, opacity: 1, ease: "power3.out", scrollTrigger: { trigger: card, start: "top 95%", end: "top 55%", scrub: 0.8 } },
      ),
    );
  });
  return (
    <section ref={root} aria-labelledby="trust-title" className="px-5 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <p className="font-deva text-terracotta">हमारा वचन</p>
        <h2 id="trust-title" className="mt-2 font-display text-[clamp(2.2rem,4.6vw,3.6rem)] leading-none tracking-tight">
          Promises, on paper.
        </h2>
        <ul className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {PROMISES.map((p) => (
            <li key={p.quote} className="trust-card" style={{ transform: `rotate(${p.tilt}deg)` }}>
              <figure className="deckled h-full p-7">
                <blockquote className="font-display text-2xl leading-snug">“{p.quote}”</blockquote>
                <figcaption className="mt-5 font-ui text-xs uppercase tracking-[0.16em] text-terracotta">{p.by}</figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
