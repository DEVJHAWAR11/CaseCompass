"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { useGsap, gsap } from "@/hooks/useGsap";
import { useLenis } from "@/hooks/useLenis";
import { FlockCanvas } from "@/components/birds/FlockCanvas";
import { HERO_2, PARALLAX_STRENGTH } from "@/lib/constants";
import { CURTAIN_DURATION } from "./Curtain";

const AR = HERO_2.w / HERO_2.h;

// Fake depth from one flat painting: the same image is stacked several times, each copy masked
// to one depth band (sky / far architecture / foreground props) and moved at its own speed.
// The masks are in % of the "art plane", which always has the painting's exact aspect ratio,
// so every copy lines up pixel-for-pixel at rest.
const LAYERS = [
  { key: "sky", depth: 0.25, scroll: 10, mask: undefined },
  { key: "front", depth: 1, scroll: -6, mask: "radial-gradient(ellipse 34% 40% at 80% 86%, #000 55%, transparent 88%)" },
];
// Scales of justice in hero-2 (image px): pivot at the finial (1725, 650); pans around y≈780.
const SCALES_MASK = "radial-gradient(ellipse 9% 19% at 86.25% 70%, #000 60%, transparent 100%)";
const SCALES_PIVOT = "86.25% 58.2%";

function Art() {
  return <Image src={HERO_2.src} alt="" fill sizes="(min-width: 768px) 100vw, 120vw" className="select-none object-cover" draggable={false} />;
}

export function Hero() {
  const root = useRef<HTMLElement>(null);
  const lift = useRef(0);
  const lenis = useLenis();

  useGsap(root, ({ reduced }) => {
    if (reduced) return;
    const delay = window.matchMedia("(min-width: 768px)").matches ? CURTAIN_DURATION - 0.15 : 0.1;

    // 1. Headline: lines rise from a mask, blur-to-sharp, staggered.
    gsap
      .timeline({ delay })
      .from(".hero-eyebrow", { y: 16, opacity: 0, duration: 0.8, ease: "power3.out" })
      .from(".hero-line > span", { yPercent: 110, filter: "blur(10px)", duration: 1.2, stagger: 0.1, ease: "expo.out" }, "-=0.5")
      .from(".hero-sub", { y: 20, opacity: 0, filter: "blur(6px)", duration: 1, ease: "power3.out" }, "-=0.8")
      .from(".hero-cta > *", { y: 18, opacity: 0, duration: 0.8, stagger: 0.08, ease: "power3.out" }, "-=0.7");

    // 2. Idle sway on the scales (±1.5° keeps the duplicated layer from ghosting).
    gsap.fromTo(".hero-scales", { rotate: -1.5 }, { rotate: 1.5, duration: 3.6, ease: "sine.inOut", yoyo: true, repeat: -1 });

    // 3. Scroll parallax: layers move at different speeds; flock is pulled upward and fades.
    const st = { trigger: root.current, start: "top top", end: "bottom top", scrub: true };
    LAYERS.forEach((l) => gsap.to(`.hero-layer-${l.key}`, { yPercent: l.scroll, ease: "none", scrollTrigger: st }));
    gsap.to(".hero-copy", { y: -80, opacity: 0, ease: "none", scrollTrigger: { ...st, end: "70% top" } });
    gsap.to(lift, { current: 1, ease: "none", scrollTrigger: st });

    // 4. Mouse parallax (fine pointers only), max PARALLAX_STRENGTH px on the front layer.
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const movers = LAYERS.map((l) => ({
      x: gsap.quickTo(`.hero-mouse-${l.key}`, "x", { duration: 1.2, ease: "power3.out" }),
      y: gsap.quickTo(`.hero-mouse-${l.key}`, "y", { duration: 1.2, ease: "power3.out" }),
      d: l.depth,
    }));
    const onMove = (e: PointerEvent) => {
      const nx = e.clientX / window.innerWidth - 0.5, ny = e.clientY / window.innerHeight - 0.5;
      movers.forEach((m) => { m.x(-nx * 2 * PARALLAX_STRENGTH * m.d); m.y(-ny * 2 * PARALLAX_STRENGTH * m.d); });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  });

  return (
    <section ref={root} aria-labelledby="hero-title" className="relative overflow-hidden md:h-[100svh] md:min-h-[640px]">
      {/* ART: full-bleed on desktop; a band on top on mobile */}
      <div className="relative h-[54svh] overflow-hidden [--art-h:54svh] md:absolute md:inset-0 md:h-full md:[--art-h:max(100svh,640px)]">
        <div
          className="absolute right-0 top-1/2 -translate-y-1/2"
          style={{ width: `max(100%, calc(var(--art-h) * ${AR}))`, aspectRatio: `${HERO_2.w} / ${HERO_2.h}` }}
        >
          {LAYERS.map((l) => (
            // Phones get one flat copy: the masked depth layers cost 3 extra decodes + mask compositing.
            <div key={l.key} className={`hero-layer-${l.key} absolute inset-0 will-change-transform ${l.key === "sky" ? "" : "hidden md:block"}`}>
              <div
                className={`hero-mouse-${l.key} absolute inset-0 scale-[1.04]`}
                style={l.mask ? { maskImage: l.mask, WebkitMaskImage: l.mask } : undefined}
              >
                {l.key === "sky" ? (
                  <Image src={HERO_2.src} alt="" fill preload sizes="(min-width: 768px) 100vw, 120vw" className="select-none object-cover" draggable={false} />
                ) : (
                  <Art />
                )}
                {l.key === "front" && (
                  <div
                    className="hero-scales absolute inset-0"
                    style={{ maskImage: SCALES_MASK, WebkitMaskImage: SCALES_MASK, transformOrigin: SCALES_PIVOT }}
                  >
                    <Art />
                  </div>
                )}
              </div>
            </div>
          ))}
          {/* warm light rays in the sunbeam */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              background:
                "conic-gradient(from 200deg at 62% -10%, transparent 0deg, rgb(255 240 205 / 0.35) 12deg, transparent 22deg, rgb(255 240 205 / 0.25) 34deg, transparent 46deg, rgb(255 240 205 / 0.18) 58deg, transparent 70deg)",
            }}
          />
        </div>
        {/* left wash so the headline sits on calm paper (desktop) / soft bottom fade (mobile) */}
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-parchment via-transparent to-transparent md:bg-gradient-to-r md:from-parchment/90 md:via-parchment/35 md:to-transparent" />
        <FlockCanvas liftRef={lift} />
      </div>

      {/* COPY: left half on desktop, below the art on mobile */}
      <div className="hero-copy relative z-10 mx-auto flex max-w-7xl flex-col justify-center px-5 pb-14 pt-2 md:h-full md:px-10 md:pb-0 md:pt-16">
        <div className="max-w-xl">
          <p className="hero-eyebrow mb-4 font-deva text-lg text-terracotta">
            उपभोक्ता न्याय · <span className="font-ui text-sm uppercase tracking-[0.2em] text-ink-soft">consumer justice, explained</span>
          </p>
          <h1 id="hero-title" className="font-display text-[clamp(2.8rem,7vw,5.8rem)] font-medium leading-[0.95] tracking-[-0.02em] text-ink">
            {["Know how cases", "like yours", "were decided."].map((line, i) => (
              <span key={line} className="hero-line block overflow-hidden pb-[0.08em]">
                <span className={`block ${i === 1 ? "italic text-terracotta" : ""}`}>{line}</span>
              </span>
            ))}
          </h1>
          <p className="hero-sub mt-6 max-w-md text-lg leading-relaxed text-ink-soft">
            Describe your airline or travel dispute in plain words. We find similar consumer-commission
            judgments and show who won, what was refunded, and the law they cited.
          </p>
          <div className="hero-cta mt-8 flex flex-wrap gap-3 font-ui">
            <Link href="/search" className="btn-brass rounded-full px-7 py-3 text-base font-semibold transition-shadow duration-300">
              Search a case
            </Link>
            <a
              href="#how"
              onClick={(e) => {
                const l = lenis?.current;
                if (!l) return;
                e.preventDefault();
                l.scrollTo("#how", { duration: 1.4 });
              }}
              className="btn-ghost rounded-full px-7 py-3 text-base transition-colors duration-300"
            >
              How it works
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
