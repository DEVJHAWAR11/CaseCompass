"use client";

import { useEffect, useRef } from "react";
import { BIRD_COUNT } from "@/lib/constants";
import { motionReduced } from "@/lib/motion";
import { drawPigeon, makeFlock, stepFlock } from "./boids";

/**
 * Hero overlay: a boids flock of pigeons plus warm dust motes drifting in the sunbeam.
 * Decorative only (aria-hidden). Pauses when the tab is hidden or the hero is off-screen,
 * caps DPR at 2, and renders nothing under prefers-reduced-motion.
 * `liftRef` (0..1) is written by the hero's ScrollTrigger as the hero scrolls away.
 */
export function FlockCanvas({ liftRef }: { liftRef: React.MutableRefObject<number> }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = canvas.current;
    if (!cv || motionReduced()) return;
    const ctx = cv.getContext("2d")!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    let w = 0, h = 0;
    const resize = () => {
      w = cv.clientWidth;
      h = cv.clientHeight;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const birds = makeFlock(mobile ? Math.round(BIRD_COUNT * 0.4) : BIRD_COUNT, w, h);
    // Dust motes live in the sunbeam (upper-middle to right of the art).
    const motes = Array.from({ length: mobile ? 14 : 30 }, () => ({
      x: w * (0.45 + Math.random() * 0.5),
      y: h * (0.15 + Math.random() * 0.6),
      r: 0.6 + Math.random() * 1.6,
      vx: -0.05 + Math.random() * 0.15,
      vy: -0.12 - Math.random() * 0.12,
      tw: Math.random() * Math.PI * 2,
    }));
    const mouse = { x: 0, y: 0, active: false };
    const onMove = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
      mouse.active = mouse.y > 0 && mouse.y < h;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    const ro = new ResizeObserver(resize);
    ro.observe(cv);

    let raf = 0, last = performance.now(), running = true, visible = true;
    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const t = now / 1000, lift = liftRef.current;
      ctx.clearRect(0, 0, w, h);
      // motes
      for (const m of motes) {
        m.x += m.vx; m.y += m.vy; m.tw += dt * 2;
        if (m.y < h * 0.05) { m.y = h * (0.6 + Math.random() * 0.2); m.x = w * (0.45 + Math.random() * 0.5); }
        ctx.globalAlpha = (0.25 + 0.35 * Math.sin(m.tw) ** 2) * (1 - lift);
        ctx.fillStyle = "#FFF3D6";
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fill();
      }
      // flock
      stepFlock(birds, { w, h, t, mouse, lift }, dt);
      for (const b of birds) {
        const size = 7 + b.depth * 9;
        const alpha = (0.35 + b.depth * 0.5) * (1 - lift * 0.9);
        drawPigeon(ctx, b.x, b.y, b.vx, b.vy, size, Math.sin(b.phase), "#4A3B33", alpha);
      }
      ctx.globalAlpha = 1;
      if (running && visible) raf = requestAnimationFrame(frame);
    };
    const start = () => {
      cancelAnimationFrame(raf);
      last = performance.now();
      if (running && visible) raf = requestAnimationFrame(frame);
    };
    const onVis = () => { running = !document.hidden; start(); };
    document.addEventListener("visibilitychange", onVis);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; start(); });
    io.observe(cv);
    start();
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [liftRef]);

  return <canvas ref={canvas} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />;
}
