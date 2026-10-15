// Hand-drawn style line icons (single stroke weight, round caps). Decorative => aria-hidden.
type P = { className?: string };
const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

/** Wordmark glyph: an eight-point compass rose. */
export function CompassMark({ className }: P) {
  return (
    <svg viewBox="0 0 32 32" className={className} {...base}>
      <circle cx="16" cy="16" r="13" />
      <path d="M16 4 L18.5 16 L16 28 L13.5 16 Z" fill="currentColor" fillOpacity="0.25" />
      <path d="M4 16 L16 13.5 L28 16 L16 18.5 Z" />
      <circle cx="16" cy="16" r="1.6" fill="currentColor" />
    </svg>
  );
}

/** Step 1: quill writing on a sheet. */
export function QuillIcon({ className }: P) {
  return (
    <svg viewBox="0 0 96 96" className={className} {...base}>
      <path d="M18 78 C30 76 44 77 58 74" />
      <path d="M20 84 C34 82 46 83 62 80" opacity="0.6" />
      <path d="M26 72 C38 50 56 26 82 12 C76 32 62 54 34 70 Z" />
      <path d="M26 72 L40 56 M36 64 C46 52 58 38 70 26" />
      <path d="M24 74 L20 82" />
    </svg>
  );
}

/** Step 2: magnifier over stacked judgments. */
export function MatchIcon({ className }: P) {
  return (
    <svg viewBox="0 0 96 96" className={className} {...base}>
      <path d="M14 20 h40 v52 h-40 z" />
      <path d="M20 14 h40 v6 M22 30 h24 M22 38 h28 M22 46 h18" />
      <circle cx="58" cy="52" r="16" />
      <path d="M70 64 L84 80" strokeWidth="3" />
      <path d="M51 52 l5 5 l9 -10" />
    </svg>
  );
}

/** Step 3: scales of justice. */
export function ScalesIcon({ className }: P) {
  return (
    <svg viewBox="0 0 96 96" className={className} {...base}>
      <path d="M48 14 V80 M34 82 h28 M40 76 h16" />
      <circle cx="48" cy="12" r="3" />
      <path d="M20 26 C34 22 62 22 76 26" />
      <path d="M22 26 L12 50 M22 26 L32 50 M10 50 C14 58 30 58 34 50 Z" />
      <path d="M74 26 L64 50 M74 26 L84 50 M62 50 C66 58 82 58 86 50 Z" />
    </svg>
  );
}

/** Ornamental corner curl for bento cards. */
export function CornerCurl({ className }: P) {
  return (
    <svg viewBox="0 0 40 40" className={className} {...base} strokeWidth={1.2}>
      <path d="M2 38 V14 C2 7 7 2 14 2 H38" />
      <path d="M8 38 V18 C8 12 12 8 18 8 H38" opacity="0.5" />
      <circle cx="14" cy="14" r="2.5" />
    </svg>
  );
}
