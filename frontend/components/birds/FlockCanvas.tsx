"use client";

import { useEffect, useRef } from "react";
import { BIRD_SPAWN_SECONDS, MAX_BIRDS } from "@/lib/constants";
import { motionReduced } from "@/lib/motion";
import { drawBird, rand, spawnGroup, stepBirds, type Bird } from "./birds";

/**
 * Hero overlay: every few seconds a small group (1-3) of pigeons crosses the sky, plus a few
 * warm dust motes in the sunbeam. Decorative only (aria-hidden). Pauses when the tab is hidden
 * or the hero is off-screen, caps DPR at 2, idles when nothing is on screen, and renders
 * nothing under prefers-reduced-motion. `liftRef` (0..1) comes from the hero's ScrollTrigger.
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

    let birds: Bird[] = [];
    let nextSpawn = 0.2; // first group right after the (delayed) start
    const motes = Array.from({ length: mobile ? 8 : 18 }, () => ({
      x: Math.random(), y: 0.2 + Math.random() * 0.55,
      r: 0.6 + Math.random() * 1.4, v: 0.008 + Math.random() * 0.012, tw: Math.random() * 6,
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

    let raf = 0, last = performance.now(), clock = 0, running = true, visible = true;
    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      clock += dt;
      const lift = liftRef.current;
      ctx.clearRect(0, 0, w, h);

      // dust motes rising slowly through the sunbeam (right half of the art)
      ctx.fillStyle = "#FFF3D6";
      for (const m of motes) {
        m.y -= m.v * dt;
        m.tw += dt * 1.5;
        if (m.y < 0.08) { m.y = 0.75; m.x = Math.random(); }
        ctx.globalAlpha = (0.2 + 0.3 * Math.sin(m.tw) ** 2) * (1 - lift);
        ctx.beginPath();
        ctx.arc(w * (0.5 + m.x * 0.48), h * m.y, m.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // occasional small groups instead of one big flock
      if (clock >= nextSpawn && lift < 0.3 && birds.length < (mobile ? Math.ceil(MAX_BIRDS / 2) : MAX_BIRDS)) {
        birds.push(...spawnGroup(w, h, mobile));
        nextSpawn = clock + rand(BIRD_SPAWN_SECONDS[0], BIRD_SPAWN_SECONDS[1]);
      }
      birds = stepBirds(birds, { w, h, t: clock, mouse, lift }, dt);
      for (const b of birds) {
        const tilt = Math.max(-0.25, Math.min(0.25, Math.atan2(b.vy, Math.abs(b.vx))));
        drawBird(ctx, b.x, b.y, b.dir, b.s, b.wing, tilt, "#3E302A", b.alpha * (1 - lift * 0.9));
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
    // Start after the page has painted, so the sky animation never competes with first load.
    const boot = window.setTimeout(() => { io.observe(cv); start(); }, 1200);
    return () => {
      window.clearTimeout(boot);
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [liftRef]);

  return <canvas ref={canvas} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />;
}
