"use client";

import { useRef } from "react";
import { useGsap, gsap } from "@/hooks/useGsap";
import { MatchIcon, QuillIcon, ScalesIcon } from "@/components/ui/Icons";

const STEPS = [
  {
    n: "१", title: "Describe", Icon: QuillIcon,
    body: "Tell us what happened in your own words, the way you would tell a friend. No forms, no legal terms.",
    detail: "An AI rewrites your story into up to three legal-style queries, e.g. “deficiency in service, refund of cancelled ticket”.",
  },
  {
    n: "२", title: "Match", Icon: MatchIcon,
    body: "We search judgments by meaning and by exact words at once, and merge the two result lists into one ranking.",
    detail: "Hybrid search: vector similarity + Postgres full-text, fused by Reciprocal Rank Fusion. Tested against a reranker; the simpler version scored as well.",
  },
  {
    n: "३", title: "Learn the outcome", Icon: ScalesIcon,
    body: "See who won, what was refunded or awarded, and the law cited, with a link to every judgment.",
    detail: "Counts like “7 of 10 cases” are computed by code from the extracted fields, never guessed.",
  },
];

/** Jharokha-style arch frame around each step. */
function Jharokha({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto aspect-[3/4] w-full max-w-sm">
      <svg viewBox="0 0 300 400" className="absolute inset-0 h-full w-full text-brass" aria-hidden="true" fill="none" stroke="currentColor" preserveAspectRatio="none">
        <defs>
          <linearGradient id="jharokha-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fbf2dc" />
            <stop offset="1" stopColor="#e9d3a6" />
          </linearGradient>
        </defs>
        <path d="M28 396 V166 C28 112 70 72 116 52 C134 44 144 36 150 26 C156 36 166 44 184 52 C230 72 272 112 272 166 V396 Z" fill="url(#jharokha-fill)" stroke="none" />
        <path d="M14 396 V160 C14 100 60 56 110 36 C130 28 142 18 150 6 C158 18 170 28 190 36 C240 56 286 100 286 160 V396" strokeWidth="2" />
        <path d="M28 396 V166 C28 112 70 72 116 52 C134 44 144 36 150 26 C156 36 166 44 184 52 C230 72 272 112 272 166 V396" strokeWidth="1" opacity="0.6" />
        <path d="M6 396 H294" strokeWidth="2" />
        {[60, 100, 140, 180, 220, 260].map((x) => (
          <circle key={x} cx={x} cy="388" r="2.5" fill="currentColor" />
        ))}
      </svg>
      <div className="relative flex h-full flex-col items-center justify-center px-10 pt-10 text-center">{children}</div>
    </div>
  );
}

/** Signature moment: the three arches slide past horizontally while the section is pinned. */
export function HowItWorks() {
  const root = useRef<HTMLElement>(null);
  useGsap(root, ({ reduced }) => {
    if (reduced || !window.matchMedia("(min-width: 768px)").matches) return;
    const track = root.current!.querySelector<HTMLElement>(".how-track")!;
    const distance = () => track.scrollWidth - window.innerWidth;
    const tween = gsap.to(track, {
      x: () => -distance(),
      ease: "none",
      scrollTrigger: { trigger: root.current, start: "top top", end: () => `+=${distance()}`, pin: true, scrub: 0.7, invalidateOnRefresh: true },
    });
    gsap.utils.toArray<HTMLElement>(".how-panel").forEach((p) =>
      gsap.from(p.querySelector(".how-icon"), {
        rotate: -12, scale: 0.8, opacity: 0, duration: 1, ease: "expo.out",
        scrollTrigger: { trigger: p, containerAnimation: tween, start: "left 75%" },
      }),
    );
  });

  return (
    <section id="how" ref={root} aria-labelledby="how-title" className="relative overflow-hidden py-20 md:flex md:h-[100svh] md:items-center md:py-0">
      <div className="how-track flex flex-col gap-14 px-5 md:w-max md:flex-row md:items-center md:gap-[8vw] md:pl-[8vw] md:pr-[12vw]">
        <div className="max-w-sm md:w-[30vw]">
          <p className="font-deva text-terracotta">कैसे काम करता है</p>
          <h2 id="how-title" className="mt-2 font-display text-[clamp(2.4rem,5vw,4rem)] leading-none tracking-tight">
            Three steps, <em className="text-terracotta">one story.</em>
          </h2>
          <p className="mt-4 text-ink-soft">Scroll to walk through what happens when you press search.</p>
        </div>
        {STEPS.map(({ n, title, Icon, body, detail }) => (
          <article key={title} className="how-panel w-full md:w-[34vw] md:max-w-md">
            <Jharokha>
              <span className="font-deva text-3xl text-brass">{n}</span>
              <Icon className="how-icon my-4 h-20 w-20 text-ashoka-navy" />
              <h3 className="font-display text-3xl">{title}</h3>
              <p className="mt-3 text-[0.95rem] leading-relaxed">{body}</p>
              <p className="mt-3 font-ui text-xs leading-relaxed text-ink-soft">{detail}</p>
            </Jharokha>
          </article>
        ))}
      </div>
    </section>
  );
}
