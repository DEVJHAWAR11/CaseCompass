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
    <div className="fixed inset-0 z-20 flex justify-end bg-black/40" onClick={onClose} role="dialog" aria-modal="true">
      <aside
        className="h-full w-full max-w-md overflow-y-auto bg-white p-5 shadow-xl dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="float-right text-sm text-neutral-500 underline">
          Close
        </button>
        <h2 className="font-semibold">Why this result</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          This passage from {SECTION[c.matched_section] ?? "the judgment"} in <em>{c.title}</em> was the
          closest match to what you described.
        </p>
        <blockquote className="mt-4 border-l-4 border-neutral-300 pl-3 text-sm dark:border-neutral-600">
          {c.passage?.replace(/s*
s*/g, " ")}
        </blockquote>
      </aside>
    </div>
  );
}
