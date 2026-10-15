"use client";

import { useRef } from "react";
import { useGsap, gsap } from "@/hooks/useGsap";
import { AshokaChakra } from "@/components/ui/Ornaments";

/** Seconds until the curtain has cleared; the hero starts its reveal from here. */
export const CURTAIN_DURATION = 1.15;

/** Page-load intro: two parchment panels part like a curtain to reveal the hero. */
export function Curtain() {
  const root = useRef<HTMLDivElement>(null);
  useGsap(root, ({ reduced }) => {
    // Desktop only: on phones the intro would just delay the first paint of the artwork.
    if (reduced || !window.matchMedia("(min-width: 768px)").matches) {
      gsap.set(root.current, { display: "none" });
      return;
    }
    gsap
      .timeline()
      .from(".curtain-mark", { opacity: 0, scale: 0.9, duration: 0.35, ease: "power3.out" })
      .to(".curtain-mark", { opacity: 0, duration: 0.25, delay: 0.1 })
      .to(".curtain-l", { xPercent: -100, duration: 0.9, ease: "expo.inOut" }, "-=0.1")
      .to(".curtain-r", { xPercent: 100, duration: 0.9, ease: "expo.inOut" }, "<")
      .set(root.current, { display: "none" });
  });
  return (
    <div ref={root} aria-hidden="true" className="curtain-failsafe pointer-events-none fixed inset-0 z-[80] hidden motion-safe:md:block">
      <div className="curtain-l absolute inset-y-0 left-0 w-1/2 bg-parchment-deep shadow-[inset_-30px_0_40px_-30px_rgb(46_33_24/0.35)]" />
      <div className="curtain-r absolute inset-y-0 right-0 w-1/2 bg-parchment-deep shadow-[inset_30px_0_40px_-30px_rgb(46_33_24/0.35)]" />
      <div className="curtain-mark absolute inset-0 flex flex-col items-center justify-center gap-3 text-brass">
        <AshokaChakra className="h-12 w-12" />
        <span className="font-display text-2xl tracking-tight text-ink">CaseCompass</span>
      </div>
    </div>
  );
}
