import type { CaseHit } from "@/lib/api";

const BADGE: Record<CaseHit["result"], { label: string; cls: string }> = {
  allowed: { label: "Complainant won", cls: "bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-100" },
  partly_allowed: { label: "Partly allowed", cls: "bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100" },
  dismissed: { label: "Dismissed", cls: "bg-red-100 text-red-900 dark:bg-red-900 dark:text-red-100" },
  unclear: { label: "Outcome unclear", cls: "bg-neutral-200 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-100" },
};

const inr = (n: number | null) => (n == null ? null : `Rs ${Math.round(n).toLocaleString("en-IN")}`);

export function ResultCard({ c, onWhy }: { c: CaseHit; onWhy?: (c: CaseHit) => void }) {
  const b = BADGE[c.result];
  return (
    <article className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-medium leading-snug">{c.title}</h3>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${b.cls}`}>{b.label}</span>
      </div>
      <p className="mt-1 text-xs text-neutral-500">
        {c.court}
        {c.decided_on ? ` · ${c.decided_on}` : ""}
      </p>
      {c.summary_ai && (
        <p className="mt-2 text-sm">
          {c.summary_ai} <span className="text-xs text-neutral-500">(AI-generated summary)</span>
        </p>
      )}
      <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-neutral-600 dark:text-neutral-400">
        {inr(c.refund_inr) && <div>Refund: {inr(c.refund_inr)}</div>}
        {inr(c.compensation_inr) && <div>Compensation: {inr(c.compensation_inr)}</div>}
        {c.laws_cited.length > 0 && <div>Law cited: {c.laws_cited.slice(0, 3).join("; ")}</div>}
      </dl>
      <div className="mt-3 flex gap-4 text-sm">
        {c.passage && onWhy && (
          <button onClick={() => onWhy(c)} className="text-blue-700 underline dark:text-blue-400">
            Why this result
          </button>
        )}
        <a href={c.source_url} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline dark:text-blue-400">
          Read the judgment
        </a>
      </div>
    </article>
  );
}
