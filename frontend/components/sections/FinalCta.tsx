"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { useGsap, gsap } from "@/hooks/useGsap";
import { Magnet } from "@/components/ui/Interactive";
import { PerchCanvas } from "@/components/birds/PerchCanvas";
import { HERO_1 } from "@/lib/constants";

/** Sunset scene; signature moment: headline rises while birds settle on the pillar. */
export function FinalCta() {
  const root = useRef<HTMLElement>(null);
  useGsap(root, ({ reduced }) => {
    if (reduced) return;
    gsap
      .timeline({ scrollTrigger: { trigger: root.current, start: "top 55%" } })
      .from(".cta-line > span", { yPercent: 110, filter: "blur(8px)", duration: 1.2, stagger: 0.1, ease: "expo.out" })
      .from(".cta-sub, .cta-btn", { y: 20, opacity: 0, duration: 0.9, stagger: 0.1, ease: "power3.out" }, "-=0.7");
    gsap.fromTo(".cta-art", { scale: 1.12 }, { scale: 1, ease: "none", scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom bottom", scrub: true } });
  });

  return (
    <section ref={root} aria-labelledby="cta-title" className="relative flex min-h-[100svh] items-center overflow-hidden">
      <div className="cta-art absolute inset-0 origin-top-right">
        <Image src={HERO_1.src} alt="" fill sizes="100vw" loading="lazy" className="object-cover object-[100%_0%]" />
        <PerchCanvas posX={1} posY={0} />
      </div>
      {/* sunset wash for legibility */}
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-[#f3d9a6]/95 via-[#f3d9a6]/60 to-transparent" />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#e8a33d]/35 to-transparent" />
      <div className="relative z-10 mx-auto w-full max-w-7xl px-5 py-24 md:px-10">
        <div className="max-w-xl">
          <h2 id="cta-title" className="font-display text-[clamp(2.6rem,6.4vw,5.4rem)] font-medium leading-[0.95] tracking-[-0.02em]">
            {["Every dispute", "has a precedent."].map((l, i) => (
              <span key={l} className="cta-line block overflow-hidden pb-[0.08em]">
                <span className={`block ${i === 1 ? "italic text-terracotta" : ""}`}>{l}</span>
              </span>
            ))}
          </h2>
          <p className="cta-sub mt-6 max-w-md text-lg text-ink-soft">
            Tell us what happened. It takes a minute, and you will leave knowing what similar cases decided.
          </p>
          <div className="cta-btn mt-9">
            <Magnet>
              <Link href="/search" data-cursor="grow" className="btn-brass inline-block rounded-full px-9 py-4 font-ui text-lg font-semibold">
                Search a case
              </Link>
            </Magnet>
          </div>
        </div>
      </div>
    </section>
  );
}
