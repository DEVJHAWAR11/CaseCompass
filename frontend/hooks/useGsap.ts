"use client";

import { useEffect, useLayoutEffect, useState, type DependencyList, type RefObject } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motionReduced } from "@/lib/motion";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** True when the user asked the OS to reduce motion (updates live). */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const set = () => setReduced(mq.matches);
    set();
    mq.addEventListener("change", set);
    return () => mq.removeEventListener("change", set);
  }, []);
  return reduced;
}

export function prefersReducedMotion() {
  return motionReduced();
}

/**
 * Run GSAP code scoped to a container; everything created inside is reverted on unmount
 * (gsap.context), so ScrollTriggers and tweens never leak between pages.
 */
export function useGsap(
  scope: RefObject<HTMLElement | null>,
  setup: (ctx: { reduced: boolean }) => void | (() => void),
  deps: DependencyList = [],
) {
  useIsoLayoutEffect(() => {
    if (!scope.current) return;
    const reduced = prefersReducedMotion();
    let cleanup: void | (() => void);
    const ctx = gsap.context(() => {
      cleanup = setup({ reduced });
    }, scope);
    return () => {
      if (typeof cleanup === "function") cleanup();
      ctx.revert();
    };
  }, deps); // setup is intentionally captured once per deps change
}

export { gsap, ScrollTrigger };
