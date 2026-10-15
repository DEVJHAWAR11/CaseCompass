import type { CaseHit } from "@/lib/api";

const BADGE: Record<CaseHit["result"], { label: string; cls: string }> = {
  allowed: { label: "Complainant won", cls: "bg-sage/20 text-[#3f4a26]" },
  partly_allowed: { label: "Partly allowed", cls: "bg-dusk-indigo/25 text-ashoka-navy" },
  dismissed: { label: "Dismissed", cls: "bg-terracotta/15 text-[#7a2f1f]" },
  unclear: { label: "Outcome unclear", cls: "bg-parchment-deep text-ink" },
};

const inr = (n: number | null) => (n == null ? null : `Rs ${Math.round(n).toLocaleString("en-IN")}`);

export function ResultCard({ c, onWhy }: { c: CaseHit; onWhy?: (c: CaseHit) => void }) {
  const b = BADGE[c.result];
  return (
    <article className="deckled p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-display text-xl leading-snug">{c.title}</h3>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${b.cls}`}>{b.label}</span>
      </div>
      <p className="mt-1 font-ui text-xs text-ink-soft">
        {c.court}
        {c.decided_on ? ` · ${c.decided_on}` : ""}
      </p>
      {c.summary_ai && (
        <p className="mt-2 text-sm">
          {c.summary_ai} <span className="text-xs text-ink-soft">(AI-generated summary)</span>
        </p>
      )}
      <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 font-ui text-xs text-ink-soft">
        {inr(c.refund_inr) && <div>Refund: {inr(c.refund_inr)}</div>}
        {inr(c.compensation_inr) && <div>Compensation: {inr(c.compensation_inr)}</div>}
        {c.laws_cited.length > 0 && <div>Law cited: {c.laws_cited.slice(0, 3).join("; ")}</div>}
      </dl>
      <div className="mt-3 flex gap-4 font-ui text-sm">
        {c.passage && onWhy && (
          <button onClick={() => onWhy(c)} className="text-ashoka-navy underline">
            Why this result
          </button>
        )}
        <a href={c.source_url} target="_blank" rel="noopener noreferrer" className="text-ashoka-navy underline">
          Read the judgment
        </a>
      </div>
    </article>
  );
}
