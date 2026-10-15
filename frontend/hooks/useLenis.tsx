"use client";

import { createContext, useContext, useEffect, useRef, type ReactNode, type RefObject } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "@/hooks/useGsap";
import { SCROLL_LERP } from "@/lib/constants";
import { motionReduced } from "@/lib/motion";

const LenisContext = createContext<RefObject<Lenis | null> | null>(null);

/** Ref to the shared Lenis instance; read `.current` in event handlers (null under reduced motion). */
export function useLenis() {
  return useContext(LenisContext);
}

/**
 * Smooth scrolling wired into GSAP: Lenis is driven by gsap.ticker (one RAF loop for both),
 * and every Lenis scroll tells ScrollTrigger to update, so pinned/scrubbed timelines stay in sync.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const lenis = useRef<Lenis | null>(null);

  useEffect(() => {
    if (motionReduced()) return;
    const instance = new Lenis({ lerp: SCROLL_LERP, smoothWheel: true });
    instance.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => instance.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    lenis.current = instance;
    return () => {
      gsap.ticker.remove(tick);
      instance.destroy();
      lenis.current = null;
    };
  }, []);

  return <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>;
}
