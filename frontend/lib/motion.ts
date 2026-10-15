/**
 * Single source of truth for "should we animate?". Honors prefers-reduced-motion.
 * For QA on machines that have reduced motion turned on, add `?motion=force` to the URL to
 * preview the full animated experience (CSS-only animations still follow the OS setting).
 */
export function motionReduced(): boolean {
  if (typeof window === "undefined") return true;
  if (new URLSearchParams(window.location.search).get("motion") === "force") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
