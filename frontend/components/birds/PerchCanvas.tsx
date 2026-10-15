"use client";

import { useEffect, useRef } from "react";
import { HERO_1 } from "@/lib/constants";
import { motionReduced } from "@/lib/motion";
import { coverMap, drawBird } from "./birds";

// Perch points on the Ashoka pillar in hero-1.webp, in the image's own pixels
// (top of the lion capital and the ledge of the abacus below it).
const PERCHES = [
  { x: 1512, y: 72 },
  { x: 1558, y: 58 },
  { x: 1604, y: 70 },
  { x: 1488, y: 238 },
  { x: 1630, y: 238 },
];

/**
 * Final-CTA overlay: a few birds fly in along curved paths and settle on the pillar.
 * Image is drawn with object-fit: cover and object-position (posX, posY); we map perch
 * points through the same cover math so birds land on the artwork at any screen size.
 */
export function PerchCanvas({ posX = 1, posY = 0 }: { posX?: number; posY?: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = canvas.current;
    if (!cv || motionReduced()) return;
    const ctx = cv.getContext("2d")!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0;
    const resize = () => {
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cv);

    // Each bird: start off-screen left/top, delayed, flies a quadratic curve to its perch.
    const birds = PERCHES.map((p, i) => ({
      p, delay: i * 0.45, dur: 3.2 + Math.random() * 1.2,
      sx: -60 - Math.random() * 200, sy: 40 + Math.random() * 120,
      phase: Math.random() * 6, bob: Math.random() * 6,
    }));
    let started = -1, raf = 0, active = false;
    const frame = (now: number) => {
      const t = now / 1000;
      if (started < 0) started = t;
      const el = t - started;
      ctx.clearRect(0, 0, w, h);
      for (const b of birds) {
        const target = coverMap(b.p.x, b.p.y, HERO_1, { w, h }, posX, posY);
        const size = Math.max(6, 20 * target.scale);
        const u = Math.min(Math.max((el - b.delay) / b.dur, 0), 1);
        if (u <= 0) continue;
        const e = 1 - Math.pow(1 - u, 3); // ease-out cubic: slows into the landing
        const cx = (b.sx + target.x) / 2, cy = Math.min(b.sy, target.y) - h * 0.25;
        const x = (1 - e) * (1 - e) * b.sx + 2 * (1 - e) * e * cx + e * e * target.x;
        const y = (1 - e) * (1 - e) * b.sy + 2 * (1 - e) * e * cy + e * e * target.y;
        const landed = u >= 1;
        // flap hard on the way in, wings spread wide (raised) just before touching down
        const flap = u > 0.85 ? 0.9 : Math.sin(t * 11 + b.phase);
        const tilt = landed ? 0 : Math.max(-0.3, Math.min(0.3, (target.y - y) / (Math.abs(target.x - x) + 40)));
        const bob = landed ? Math.sin(t * 1.6 + b.bob) * 0.6 : 0;
        drawBird(ctx, x, y - size * 0.38 + bob, 1, size, flap, tilt, "#3B2E27", 0.92, landed);
      }
      if (active) raf = requestAnimationFrame(frame);
    };
    const io = new IntersectionObserver(([e]) => {
      active = e.isIntersecting && !document.hidden;
      cancelAnimationFrame(raf);
      if (active) raf = requestAnimationFrame(frame);
    }, { threshold: 0.35 });
    io.observe(cv);
    return () => { cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); };
  }, [posX, posY]);

  return <canvas ref={canvas} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />;
}
