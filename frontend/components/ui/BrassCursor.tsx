"use client";

import { useEffect, useRef } from "react";
import { motionReduced } from "@/lib/motion";

/**
 * Small brass ring that trails the pointer and grows over links/buttons.
 * Only on fine pointers (mouse) and when motion is allowed; touch devices keep the native UI.
 */
export function BrassCursor() {
  const ring = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduced = motionReduced();
    if (!fine || reduced || !ring.current || !dot.current) return;
    document.documentElement.classList.add("has-brass-cursor");
    const r = ring.current, d = dot.current;
    let x = -100, y = -100, rx = -100, ry = -100, scale = 1, target = 1, raf = 0;

    const move = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      const el = e.target as HTMLElement | null;
      target = el?.closest("a, button, [role='radio'], input, textarea, [data-cursor='grow']") ? 2.2 : 1;
    };
    const leave = () => { x = y = -100; };
    const loop = () => {
      rx += (x - rx) * 0.2;
      ry += (y - ry) * 0.2;
      scale += (target - scale) * 0.18;
      r.style.transform = `translate3d(${rx - 14}px, ${ry - 14}px, 0) scale(${scale})`;
      d.style.transform = `translate3d(${x - 2}px, ${y - 2}px, 0)`;
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", leave);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", leave);
      document.documentElement.classList.remove("has-brass-cursor");
    };
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[70] hidden [@media(pointer:fine)]:block">
      <div
        ref={ring}
        className="absolute left-0 top-0 h-7 w-7 rounded-full border-[1.5px] border-brass mix-blend-multiply will-change-transform"
        style={{ transform: "translate3d(-100px,-100px,0)" }}
      />
      <div
        ref={dot}
        className="absolute left-0 top-0 h-1 w-1 rounded-full bg-ink will-change-transform"
        style={{ transform: "translate3d(-100px,-100px,0)" }}
      />
    </div>
  );
}
