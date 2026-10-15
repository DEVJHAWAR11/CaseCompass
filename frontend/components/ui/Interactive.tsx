"use client";
// Small interactive primitives in the spirit of React Bits (CountUp, Magnet, SpotlightCard,
// TiltCard), written here directly so they share our GSAP setup and add no dependencies.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/hooks/useGsap";

/** Number that counts up once when scrolled into view. */
export function CountUp({ to, duration = 1.6, suffix = "", className = "" }: { to: number; duration?: number; suffix?: string; className?: string }) {
  const el = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(to); // SSR / reduced motion show the final value
  useEffect(() => {
    if (!el.current || prefersReducedMotion()) return;
    const obj = { v: 0 };
    setVal(0);
    const st = ScrollTrigger.create({
      trigger: el.current,
      start: "top 85%",
      once: true,
      onEnter: () =>
        gsap.to(obj, { v: to, duration, ease: "power3.out", onUpdate: () => setVal(Math.round(obj.v)) }),
    });
    return () => st.kill();
  }, [to, duration]);
  return (
    <span ref={el} className={className}>
      {val.toLocaleString("en-IN")}
      {suffix}
    </span>
  );
}

/** Element drifts toward the pointer when it is near (magnetic button). */
export function Magnet({ children, strength = 0.35, className = "" }: { children: ReactNode; strength?: number; className?: string }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = el.current;
    if (!node || prefersReducedMotion() || !window.matchMedia("(pointer: fine)").matches) return;
    const xTo = gsap.quickTo(node, "x", { duration: 0.6, ease: "power3.out" });
    const yTo = gsap.quickTo(node, "y", { duration: 0.6, ease: "power3.out" });
    const move = (e: PointerEvent) => {
      const r = node.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const near = Math.hypot(dx, dy) < Math.max(r.width, r.height) * 1.2;
      xTo(near ? dx * strength : 0);
      yTo(near ? dy * strength : 0);
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, [strength]);
  return (
    <div ref={el} className={`inline-block will-change-transform ${className}`}>
      {children}
    </div>
  );
}

/** Card with a soft saffron glow that follows the cursor. */
export function SpotlightCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  const el = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={el}
      onPointerMove={(e) => {
        const r = el.current!.getBoundingClientRect();
        el.current!.style.setProperty("--mx", `${e.clientX - r.left}px`);
        el.current!.style.setProperty("--my", `${e.clientY - r.top}px`);
      }}
      className={`group relative overflow-hidden ${className}`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: "radial-gradient(260px circle at var(--mx) var(--my), rgb(232 163 61 / 0.28), transparent 70%)" }}
      />
      {children}
    </div>
  );
}

/** Card that tilts slightly toward the cursor on hover. */
export function TiltCard({ children, className = "", max = 5 }: { children: ReactNode; className?: string; max?: number }) {
  const el = useRef<HTMLDivElement>(null);
  const reset = () => gsap.to(el.current, { rotateX: 0, rotateY: 0, duration: 0.8, ease: "expo.out" });
  return (
    <div style={{ perspective: 900 }} className={className}>
      <div
        ref={el}
        className="h-full will-change-transform"
        onPointerMove={(e) => {
          if (prefersReducedMotion()) return;
          const r = el.current!.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - 0.5;
          const py = (e.clientY - r.top) / r.height - 0.5;
          gsap.to(el.current, { rotateY: px * max * 2, rotateX: -py * max * 2, duration: 0.5, ease: "power3.out" });
        }}
        onPointerLeave={reset}
      >
        {children}
      </div>
    </div>
  );
}
