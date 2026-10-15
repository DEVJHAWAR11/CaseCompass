// The five tweakable knobs for the landing page. Everything else derives from these.

/** Most birds in the hero sky at once (desktop; phones get half). Reduced motion shows none. */
export const MAX_BIRDS = 6;

/** A new group of 1-3 birds appears every [min, max] seconds. */
export const BIRD_SPAWN_SECONDS: [number, number] = [4, 9];

/** Max mouse-parallax shift for the front art layer, in px (back layers move less). */
export const PARALLAX_STRENGTH = 12;

/** Lenis smoothing: lower = smoother/slower (0.05-0.15 is sensible). */
export const SCROLL_LERP = 0.08;

/** Paper grain overlay opacity (also set as --grain-opacity in globals.css). */
export const GRAIN_OPACITY = 0.06;

/** Palette, mirrored from the @theme tokens in globals.css, for canvas drawing. */
export const PALETTE = {
  parchment: "#F6EAD0",
  parchmentDeep: "#E9D3A6",
  saffron: "#E8A33D",
  terracotta: "#B5523B",
  sandstone: "#D9A87A",
  brass: "#B8893B",
  duskIndigo: "#8E93C4",
  ashokaNavy: "#1F2A5C",
  ink: "#2E2118",
  sage: "#7C8B5A",
} as const;

/** Hero artwork natural sizes (used to map image coordinates onto the screen). */
export const HERO_2 = { src: "/images/hero-2.webp", w: 2000, h: 1116 };
export const HERO_1 = { src: "/images/hero-1.webp", w: 1672, h: 941 };
