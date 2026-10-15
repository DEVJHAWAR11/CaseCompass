// Side-profile pigeon drawing + a light "small groups cross the sky now and then" simulation.
// Canvas 2D only, no dependencies.

const rand = (a: number, b: number) => a + Math.random() * (b - a);

/**
 * Draw a pigeon in side profile, facing right when dir = 1 (left when -1).
 * `wing` is the flap amount in [-1, 1]: 1 = wings fully raised, 0 = edge-on (gliding),
 * -1 = fully lowered. It is applied as a scaleY on a wing drawn pointing upward, which is
 * how a flap reads from the side. `s` is roughly half the body length in px.
 */
export function drawBird(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, dir: 1 | -1, s: number, wing: number, tilt: number,
  color: string, alpha: number, perched = false,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  ctx.rotate(perched ? -0.18 : tilt);
  ctx.fillStyle = color;

  // far wing first (behind the body, slightly lighter and lagging)
  if (!perched) {
    ctx.globalAlpha = alpha * 0.6;
    wingPath(ctx, s, 0.06 * s, wing * 0.85);
  }
  ctx.globalAlpha = alpha;
  // body: a teardrop, heavier at the chest
  ctx.beginPath();
  ctx.moveTo(0.72 * s, -0.12 * s);
  ctx.bezierCurveTo(0.55 * s, 0.24 * s, -0.25 * s, 0.26 * s, -0.55 * s, 0.04 * s);
  ctx.bezierCurveTo(-0.3 * s, -0.16 * s, 0.35 * s, -0.3 * s, 0.72 * s, -0.12 * s);
  ctx.fill();
  // head + beak
  ctx.beginPath();
  ctx.arc(0.7 * s, -0.2 * s, 0.16 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0.84 * s, -0.22 * s);
  ctx.lineTo(0.98 * s, -0.17 * s);
  ctx.lineTo(0.84 * s, -0.13 * s);
  ctx.fill();
  // fanned tail
  ctx.beginPath();
  ctx.moveTo(-0.45 * s, -0.02 * s);
  ctx.lineTo(-0.98 * s, -0.14 * s);
  ctx.quadraticCurveTo(-1.04 * s, 0.02 * s, -0.96 * s, 0.16 * s);
  ctx.lineTo(-0.45 * s, 0.1 * s);
  ctx.fill();
  if (perched) {
    // folded wing over the back + feet
    ctx.beginPath();
    ctx.ellipse(-0.08 * s, -0.08 * s, 0.5 * s, 0.15 * s, -0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = Math.max(1, 0.06 * s);
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(0.1 * s, 0.2 * s);
    ctx.lineTo(0.12 * s, 0.38 * s);
    ctx.moveTo(-0.05 * s, 0.2 * s);
    ctx.lineTo(-0.06 * s, 0.38 * s);
    ctx.stroke();
  } else {
    wingPath(ctx, s, 0, wing);
  }
  ctx.restore();
}

/** One wing, pointing up-and-back from the shoulder, squashed vertically by `k`. */
function wingPath(ctx: CanvasRenderingContext2D, s: number, dx: number, k: number) {
  ctx.save();
  ctx.translate(0.18 * s + dx, -0.14 * s);
  // wings ~1.35x the body length so the silhouette reads as a pigeon, not a sparrow
  ctx.scale(1.35, 1.35 * (k === 0 ? 0.04 : k)); // never fully zero: a hairline still reads as a wing
  ctx.beginPath();
  ctx.moveTo(0.12 * s, 0);
  ctx.bezierCurveTo(0.2 * s, -0.55 * s, 0.02 * s, -0.95 * s, -0.42 * s, -1.12 * s); // leading edge to tip
  // primary feathers: a few stepped notches on the trailing edge
  ctx.lineTo(-0.44 * s, -0.95 * s);
  ctx.lineTo(-0.56 * s, -0.9 * s);
  ctx.lineTo(-0.54 * s, -0.74 * s);
  ctx.lineTo(-0.64 * s, -0.68 * s);
  ctx.lineTo(-0.58 * s, -0.52 * s);
  ctx.quadraticCurveTo(-0.5 * s, -0.2 * s, -0.32 * s, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ---- simulation ---------------------------------------------------------------------------

export interface Bird {
  x: number; y: number; vx: number; vy: number;
  dir: 1 | -1;
  s: number; // size
  alpha: number;
  phase: number; // flap phase (radians)
  flapRate: number;
  glide: number; // seconds left in the current glide (0 = flapping)
  burst: number; // seconds left in the current flapping burst
  bob: number; // sine path offset
  wing: number; // eased wing value actually drawn
}

export interface SkyEnv {
  w: number; h: number; t: number;
  mouse: { x: number; y: number; active: boolean };
  lift: number; // 0..1 as the hero scrolls away: birds climb and fade
}

/** A group of 1-3 birds entering from one side at a random height in the upper sky. */
export function spawnGroup(w: number, h: number, mobile: boolean): Bird[] {
  const n = Math.random() < 0.3 ? 1 : Math.random() < 0.6 ? 2 : 3;
  const dir: 1 | -1 = Math.random() < 0.72 ? 1 : -1; // mostly with the light, left to right
  const depth = rand(0.6, 1); // nearer birds are bigger, faster and darker
  const speed = rand(55, 95) * depth * (mobile ? 0.8 : 1);
  // desktop: stay in the sky above the headline; phones: the canvas is only the art band
  const y0 = h * (mobile ? rand(0.08, 0.4) : rand(0.05, 0.2));
  const x0 = dir === 1 ? -40 : w + 40;
  return Array.from({ length: n }, (_, i) => ({
    x: x0 - dir * i * rand(28, 55),
    y: y0 + (i === 0 ? 0 : rand(-26, 26)),
    vx: dir * speed * rand(0.94, 1.06),
    vy: rand(-6, 2),
    dir,
    s: rand(9, 14) * depth * (mobile ? 0.85 : 1),
    alpha: 0.55 + depth * 0.35,
    phase: rand(0, Math.PI * 2),
    flapRate: rand(10, 13),
    glide: 0,
    burst: rand(0.8, 1.8),
    bob: rand(0, Math.PI * 2),
    wing: 0.3,
  }));
}

/** Advance birds by dt seconds; returns only the birds still on screen. */
export function stepBirds(birds: Bird[], env: SkyEnv, dt: number): Bird[] {
  const { w, h, t, mouse, lift } = env;
  for (const b of birds) {
    // flap in bursts, then glide: much more natural than constant flapping
    if (b.glide > 0) {
      b.glide -= dt;
      if (b.glide <= 0) b.burst = rand(0.8, 1.8);
    } else {
      b.burst -= dt;
      b.phase += b.flapRate * dt;
      if (b.burst <= 0) b.glide = rand(0.6, 1.6);
    }
    const target = b.glide > 0 ? 0.22 + Math.sin(t * 2 + b.bob) * 0.06 : Math.sin(b.phase);
    b.wing += (target - b.wing) * Math.min(1, dt * (b.glide > 0 ? 6 : 30));
    // gentle undulating path; flapping climbs a little, gliding sinks a little
    b.vy += ((b.glide > 0 ? 7 : -5) + Math.sin(t * 0.7 + b.bob) * 6 - b.vy) * dt * 0.8;
    if (mouse.active) {
      const dx = b.x - mouse.x, dy = b.y - mouse.y, d = Math.hypot(dx, dy);
      if (d < 140 && d > 0) b.vy += (dy / d) * 220 * dt; // swerve up/down away from the cursor
    }
    b.vy -= lift * 260 * dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
  }
  return birds.filter((b) => b.x > -120 && b.x < w + 120 && b.y > -80 && b.y < h + 40);
}

/** Map a point in the artwork's own pixels to screen pixels for an object-fit: cover box. */
export function coverMap(
  ix: number, iy: number, img: { w: number; h: number },
  box: { w: number; h: number }, posX = 0.5, posY = 0.5,
) {
  const scale = Math.max(box.w / img.w, box.h / img.h);
  const ox = (box.w - img.w * scale) * posX;
  const oy = (box.h - img.h * scale) * posY;
  return { x: ox + ix * scale, y: oy + iy * scale, scale };
}

export { rand };
