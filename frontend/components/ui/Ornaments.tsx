// Decorative SVG ornaments, hand-drawn style. All are aria-hidden.

/** Ashoka Chakra: 24-spoke wheel, used purely as decorative artwork (never as a logo). */
export function AshokaChakra({ className = "", stroke = "currentColor" }: { className?: string; stroke?: string }) {
  const spokes = Array.from({ length: 24 }, (_, i) => i * 15);
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true" fill="none" stroke={stroke}>
      <circle cx="50" cy="50" r="46" strokeWidth="3.5" />
      <circle cx="50" cy="50" r="7" strokeWidth="3" />
      {spokes.map((a) => (
        <g key={a} transform={`rotate(${a} 50 50)`}>
          <path d="M50 43 L48.6 12 L50 6 L51.4 12 Z" fill={stroke} stroke="none" />
          <circle cx="50" cy="5.5" r="1.4" fill={stroke} stroke="none" transform="rotate(7.5 50 50)" />
        </g>
      ))}
    </svg>
  );
}

/** Lotus bud ornament for dividers. */
export function Lotus({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 32" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <path d="M32 28 C26 20 26 10 32 3 C38 10 38 20 32 28 Z" />
      <path d="M32 28 C22 26 15 19 13 10 C21 12 28 18 32 28" />
      <path d="M32 28 C42 26 49 19 51 10 C43 12 36 18 32 28" />
      <path d="M32 28 C20 29 9 26 3 20 C12 18 24 22 32 28" />
      <path d="M32 28 C44 29 55 26 61 20 C52 18 40 22 32 28" />
    </svg>
  );
}

/** Thin brass hairline with a centred chakra or lotus. */
export function BrassDivider({ variant = "lotus", className = "" }: { variant?: "lotus" | "chakra"; className?: string }) {
  return (
    <div className={`flex items-center gap-4 text-brass ${className}`} aria-hidden="true">
      <div className="brass-line flex-1" />
      {variant === "lotus" ? <Lotus className="h-5 w-10" /> : <AshokaChakra className="h-6 w-6" />}
      <div className="brass-line flex-1" />
    </div>
  );
}

/** Jali (lattice) band used as a section separator. */
export function JaliBand({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`h-6 w-full opacity-60 ${className}`}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='none' stroke='%23B8893B' stroke-width='1'><path d='M12 0 L24 12 L12 24 L0 12 Z'/><circle cx='12' cy='12' r='3'/></svg>\")",
        backgroundSize: "24px 24px",
      }}
    />
  );
}
