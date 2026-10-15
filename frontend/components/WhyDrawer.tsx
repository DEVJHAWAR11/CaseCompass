import type { CaseHit } from "@/lib/api";

const SECTION: Record<string, string> = {
  facts: "the facts of the case",
  issues: "the issues the commission framed",
  order: "the final order",
};

/** Side drawer showing the exact passage that matched the user's story. */
export function WhyDrawer({ c, onClose }: { c: CaseHit | null; onClose: () => void }) {
  if (!c) return null;
  return (
    <div className="fixed inset-0 z-20 flex justify-end bg-ink/40" onClick={onClose} role="dialog" aria-modal="true">
      <aside data-lenis-prevent
        className="h-full w-full max-w-md overflow-y-auto bg-parchment p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="float-right text-sm text-ink-soft underline">
          Close
        </button>
        <h2 className="font-display text-2xl">Why this result</h2>
        <p className="mt-1 text-sm text-ink-soft">
          This passage from {SECTION[c.matched_section] ?? "the judgment"} in <em>{c.title}</em> was the
          closest match to what you described.
        </p>
        <blockquote className="mt-4 border-l-4 border-brass pl-3 text-sm">
          {c.passage?.replace(/\s*\n\s*/g, " ")}
        </blockquote>
      </aside>
    </div>
  );
}
