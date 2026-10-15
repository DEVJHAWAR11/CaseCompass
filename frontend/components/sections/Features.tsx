"use client";

import { useRef } from "react";
import { useGsap, gsap } from "@/hooks/useGsap";
import { SpotlightCard } from "@/components/ui/Interactive";
import { CornerCurl } from "@/components/ui/Icons";

const FEATURES = [
  { title: "Plain words in, legal matches out", body: "Your story is rewritten into the language judgments actually use, so “they kept my money” finds “deficiency in service, refund withheld”.", span: "md:col-span-4 md:row-span-2", big: true },
  { title: "Outcome at a glance", body: "Allowed, partly allowed, dismissed or unclear, with refund and compensation amounts where the order states them.", span: "md:col-span-2" },
  { title: "Every claim cited", body: "Each card links to the full judgment on Indian Kanoon. Read it yourself.", span: "md:col-span-2" },
  { title: "Meaning + exact words", body: "Vector search finds paraphrases; full-text search catches section numbers and airline names. Results are fused by rank.", span: "md:col-span-3" },
  { title: "Connected through citations", body: "Cases that rely on the same precedents surface as related reading, from a graph of 851 citation links.", span: "md:col-span-3" },
  { title: "Honest by design", body: "We never predict that you will win. When the AI cannot tell an outcome, it says “unclear” instead of guessing.", span: "md:col-span-6", wide: true },
];

/** The big card's illustration: a plain sentence turning into legal search terms. */
function RewriteSketch() {
  return (
    <div aria-hidden="true" className="mb-auto flex flex-col gap-3 pt-6 font-ui text-sm">
      <span className="w-fit -rotate-1 rounded-full border border-ink/20 bg-parchment px-4 py-1.5 text-ink-soft shadow-sm">
        “the airline kept my money for months”
      </span>
      <svg viewBox="0 0 120 40" className="ml-10 h-10 w-28 text-brass" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <path d="M4 4 C20 34 70 34 110 22" strokeDasharray="4 5" />
        <path d="M102 16 L110 22 L101 27" />
      </svg>
      <div className="ml-16 flex flex-wrap gap-2">
        {["deficiency in service", "refund withheld", "Consumer Protection Act"].map((t) => (
          <span key={t} className="rounded-full bg-ashoka-navy px-3 py-1 text-parchment">{t}</span>
        ))}
      </div>
    </div>
  );
}

/** Signature moment: brass hairlines draw across each card as the grid enters. */
export function Features() {
  const root = useRef<HTMLElement>(null);
  useGsap(root, ({ reduced }) => {
    if (reduced) return;
    const tl = gsap.timeline({ scrollTrigger: { trigger: root.current, start: "top 70%" } });
    tl.from(".bento-card", { y: 50, opacity: 0, duration: 1, stagger: 0.08, ease: "expo.out" })
      .from(".bento-line", { scaleX: 0, transformOrigin: "left", duration: 1.2, stagger: 0.08, ease: "power3.out" }, 0.3);
  });

  return (
    <section ref={root} aria-labelledby="features-title" className="px-5 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <p className="font-deva text-terracotta">विशेषताएँ</p>
        <h2 id="features-title" className="mt-2 max-w-2xl font-display text-[clamp(2.2rem,4.6vw,3.6rem)] leading-none tracking-tight">
          Built like a careful clerk, <em className="text-terracotta">not a fortune teller.</em>
        </h2>
        <div className="mt-12 grid auto-rows-[minmax(180px,auto)] gap-5 md:grid-cols-6">
          {FEATURES.map((f) => (
            <SpotlightCard key={f.title} className={`bento-card rounded-2xl border border-brass/40 bg-[#fbf3e0]/80 p-7 ${f.span}`}>
              <CornerCurl className="absolute left-3 top-3 h-7 w-7 text-brass/70" />
              <CornerCurl className="absolute bottom-3 right-3 h-7 w-7 rotate-180 text-brass/70" />
              <div className={`relative flex h-full flex-col ${f.big ? "justify-end" : "justify-between"}`}>
                {f.big && <RewriteSketch />}
                <h3 className={`font-display leading-tight ${f.big ? "text-[clamp(2rem,3.6vw,3rem)]" : "text-2xl"}`}>{f.title}</h3>
                <div className="bento-line brass-line my-4" />
                <p className={`text-ink-soft ${f.big ? "max-w-md text-lg" : ""}`}>{f.body}</p>
              </div>
            </SpotlightCard>
          ))}
        </div>
      </div>
    </section>
  );
}
