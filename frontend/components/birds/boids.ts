// Tiny boids flock + pigeon renderer for canvas 2D. No dependencies.
//
// Boids = each bird follows three local rules: keep apart from neighbours (separation), match
// their heading (alignment), drift toward their centre (cohesion). Add a gentle left-to-right
// wind on a curved path, cursor avoidance and an upward "scroll pull", and you get a flock.

export interface Bird {
  x: number;
  y: number;
  vx: number;
  vy: number;
  depth: number; // 0.45 (far) .. 1 (near): scales size, speed and opacity
  phase: number; // wing-flap phase
  flapSpeed: number;
}

export interface FlockEnv {
  w: number;
  h: number;
  t: number; // seconds
  mouse: { x: number; y: number; active: boolean };
  lift: number; // 0..1 scroll pull: birds climb and fade as the hero leaves
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

export function makeFlock(n: number, w: number, h: number): Bird[] {
  // Start as a loose cluster in the upper middle, like the reference art.
  const cx = w * 0.55, cy = h * 0.22;
  return Array.from({ length: n }, () => {
    const depth = rand(0.45, 1);
    return {
      x: cx + rand(-w * 0.18, w * 0.18),
      y: cy + rand(-h * 0.08, h * 0.08),
      vx: rand(0.6, 1.2) * depth,
      vy: rand(-0.2, 0.2),
      depth,
      phase: rand(0, Math.PI * 2),
      flapSpeed: rand(7, 11),
    };
  });
}

export function stepFlock(birds: Bird[], env: FlockEnv, dt: number) {
  const { w, h, t, mouse, lift } = env;
  const k = Math.min(dt * 60, 3); // frame-rate independent factor
  for (const b of birds) {
    let sx = 0, sy = 0, ax = 0, ay = 0, cx = 0, cy = 0, n = 0;
    for (const o of birds) {
      if (o === b) continue;
      const dx = o.x - b.x, dy = o.y - b.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > 110 * 110) continue;
      n++;
      ax += o.vx; ay += o.vy; cx += o.x; cy += o.y;
      if (d2 < 28 * 28 * b.depth) { sx -= dx / (d2 + 1); sy -= dy / (d2 + 1); }
    }
    if (n) {
      b.vx += ((ax / n - b.vx) * 0.04 + (cx / n - b.x) * 0.0006 + sx * 6) * k;
      b.vy += ((ay / n - b.vy) * 0.04 + (cy / n - b.y) * 0.0006 + sy * 6) * k;
    }
    // Wind: drift right on a slow curved path (sine bob), staying in the upper sky.
    b.vx += (1.15 * b.depth - b.vx) * 0.012 * k;
    b.vy += (Math.sin(t * 0.35 + b.x * 0.004) * 0.35 - b.vy) * 0.01 * k;
    if (b.y > h * 0.55) b.vy -= 0.03 * k;
    if (b.y < h * 0.05) b.vy += 0.03 * k;
    // Cursor: steer away gently.
    if (mouse.active) {
      const dx = b.x - mouse.x, dy = b.y - mouse.y, d = Math.hypot(dx, dy);
      if (d < 150) { b.vx += (dx / d) * 0.12 * k; b.vy += (dy / d) * 0.12 * k; }
    }
    // Scroll pull: climb out of frame as the hero exits.
    b.vy -= lift * 0.25 * k;
    // Clamp speed (far birds are slower).
    const sp = Math.hypot(b.vx, b.vy), max = 2.4 * b.depth + lift * 2;
    if (sp > max) { b.vx = (b.vx / sp) * max; b.vy = (b.vy / sp) * max; }
    b.x += b.vx * k;
    b.y += b.vy * k;
    b.phase += b.flapSpeed * dt * (0.8 + b.depth * 0.4);
    // Wrap / respawn off-screen on the left.
    if (b.x > w + 40 || b.y < -80 - lift * 400 || b.y > h + 40) {
      if (lift > 0.6) continue; // while leaving, don't respawn
      b.x = -30 - Math.random() * 120;
      b.y = rand(h * 0.08, h * 0.4);
      b.vx = rand(0.8, 1.2) * b.depth;
      b.vy = rand(-0.2, 0.2);
    }
  }
}

/**
 * Draw one pigeon silhouette heading along (vx, vy). `flap` in [-1, 1] drives the wings
 * (a scaleY-style morph of two curved wings). `size` ~ wingspan/2 in px.
 */
export function drawPigeon(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, vx: number, vy: number,
  size: number, flap: number, color: string, alpha: number, folded = false,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.atan2(vy, vx));
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  const s = size;
  // body + head + tail
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.55, s * 0.17, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(s * 0.55, -s * 0.04, s * 0.13, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-s * 0.45, 0);
  ctx.lineTo(-s * 0.85, -s * 0.14);
  ctx.lineTo(-s * 0.85, s * 0.14);
  ctx.closePath();
  ctx.fill();
  if (folded) {
    ctx.beginPath();
    ctx.ellipse(-s * 0.05, -s * 0.06, s * 0.42, s * 0.13, -0.15, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // two wings; tip height follows the flap (seen from the side/top, so they overlap)
    const tip = flap * s * 0.95;
    for (const side of [1, -0.55]) {
      ctx.beginPath();
      ctx.moveTo(s * 0.18, 0);
      ctx.quadraticCurveTo(s * 0.05, -tip * side * 0.6, -s * 0.25, -tip * side);
      ctx.quadraticCurveTo(-s * 0.15, -tip * side * 0.35, -s * 0.22, 0);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();
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
