"use client";

import { useRef } from "react";
import { useGsap, gsap } from "@/hooks/useGsap";
import { AshokaChakra } from "@/components/ui/Ornaments";

// Architecture silhouettes, drawn on a 160x100 grid, filled with ink.
const SHAPES: { name: string; d: string }[] = [
  { name: "fort", d: "M0 100 V52 h8 v-8 h6 v8 h8 v-8 h6 v8 h8 v-8 h6 v8 h8 V40 l10 -12 l10 12 v12 h8 v-8 h6 v8 h8 v-8 h6 v8 h8 v-8 h6 v8 h8 V100 h-58 V72 a12 12 0 0 0 -24 0 V100 Z" },
  { name: "dome", d: "M20 100 V64 h12 V52 c0 -22 18 -34 48 -40 c30 6 48 18 48 40 v12 h12 V100 Z M6 100 V30 l4 -8 l4 8 V100 Z M146 100 V30 l4 -8 l4 8 V100 Z M78 12 v-10 h4 v10 Z" },
  { name: "shikhara", d: "M30 100 V78 h14 V60 c0 -14 8 -24 12 -36 c2 -8 6 -14 8 -20 h2 c2 6 6 12 8 20 c4 12 12 22 12 36 V78 h14 V100 Z M60 4 h10 l-5 -4 Z M96 100 V70 h10 V56 c4 -8 6 -12 8 -16 c2 4 4 8 8 16 v14 h10 V100 Z" },
  { name: "stepwell", d: "M0 100 V40 H160 V100 Z M8 46 V94 H152 V46 H140 V56 H128 V66 H116 V76 H104 V86 H56 V76 H44 V66 H32 V56 H20 V46 Z" },
  { name: "chhatri", d: "M24 100 V88 h112 V100 Z M36 88 V56 h8 V88 Z M76 88 V56 h8 V88 Z M116 88 V56 h8 V88 Z M28 56 V48 h104 v8 Z M40 48 c0 -22 18 -32 40 -36 c22 4 40 14 40 36 Z M78 12 v-10 h4 v10 Z" },
];

function Strip() {
  return (
    <div className="flex shrink-0 items-end gap-16 pr-16">
      {SHAPES.map((s) => (
        <svg key={s.name} viewBox="0 0 160 100" className="h-20 w-auto shrink-0 text-ink/70 md:h-28" aria-hidden="true">
          <path d={s.d} fill="currentColor" fillRule="evenodd" />
        </svg>
      ))}
    </div>
  );
}

/** Slow marquee of Indian architecture. Signature moment: the chakra turns with your scroll. */
export function Heritage() {
  const root = useRef<HTMLElement>(null);
  useGsap(root, ({ reduced }) => {
    if (reduced) return;
    gsap.to(".heritage-chakra", {
      rotate: 180, ease: "none",
      scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom top", scrub: true },
    });
  });
  return (
    <section ref={root} aria-label="Heritage" className="relative overflow-hidden border-y border-brass/40 bg-parchment-deep/60 py-14">
      <div className="flex w-max marquee-track motion-reduce:w-full motion-reduce:justify-center">
        <Strip />
        <div aria-hidden="true" className="contents motion-reduce:hidden">
          <Strip />
        </div>
      </div>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
        <div className="rounded-full bg-parchment/90 p-3 shadow-[0_0_40px_20px_rgb(246_234_208/0.9)]">
          <div className="heritage-chakra">
            <AshokaChakra className="spin-slow h-20 w-20 text-ashoka-navy md:h-24 md:w-24" />
          </div>
        </div>
      </div>
    </section>
  );
}
