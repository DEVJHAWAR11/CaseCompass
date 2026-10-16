"use client";

import Link from "next/link";
import { useState } from "react";
import { ApiError, searchCases, type CaseHit, type Mode, type SearchResponse } from "@/lib/api";
import { Disclaimer, IKanoonLogo } from "@/components/Attribution";
import { ResultCard } from "@/components/ResultCard";
import { WhyDrawer } from "@/components/WhyDrawer";
import { CompassMark } from "@/components/ui/Icons";
import { BrassDivider } from "@/components/ui/Ornaments";

type View = Mode | "compare";
const VIEWS: { id: View; label: string; hint: string }[] = [
  { id: "full", label: "Full pipeline", hint: "rewrite + hybrid search" },
  { id: "hybrid", label: "Hybrid", hint: "meaning + keywords" },
  { id: "naive", label: "Naive", hint: "meaning only" },
  { id: "compare", label: "Compare all", hint: "side by side" },
];
const EXAMPLE = "The airline cancelled my flight and has refused to refund my ticket for 3 months";

export default function SearchPage() {
  const [story, setStory] = useState("");
  const [view, setView] = useState<View>("full");
  const [loading, setLoading] = useState(false);
  const [waking, setWaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Partial<Record<Mode, SearchResponse>> | null>(null);
  const [why, setWhy] = useState<CaseHit | null>(null);

  async function run() {
    if (story.trim().length < 5) return;
    setLoading(true);
    setWaking(false);
    setError(null);
    try {
      const modes: Mode[] = view === "compare" ? ["naive", "hybrid", "full"] : [view];
      const out = await Promise.all(modes.map((m) => searchCases(story.trim(), m, () => setWaking(true))));
      setResults(Object.fromEntries(modes.map((m, i) => [m, out[i]])));
    } catch (e) {
      setResults(null);
      setError(e instanceof ApiError ? e.message : "Unexpected error. Please retry.");
    } finally {
      setLoading(false);
      setWaking(false);
    }
  }

  const shown = results ? (Object.keys(results) as Mode[]) : [];

  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      <nav aria-label="Main" className="mb-10 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <CompassMark className="h-7 w-7 text-brass" />
          <span className="font-display text-2xl font-semibold tracking-tight">CaseCompass</span>
        </Link>
        <Link href="/about" className="font-ui text-sm underline underline-offset-4">About &amp; data source</Link>
      </nav>

      <header className="mb-8 text-center">
        <p className="font-deva text-terracotta">अपनी बात लिखिए</p>
        <h1 className="mt-1 font-display text-[clamp(2.2rem,5vw,3.6rem)] leading-none tracking-tight">Describe what happened</h1>
        <p className="mx-auto mt-3 max-w-xl text-ink-soft">
          Plain words are fine. We will show how consumer commissions decided similar consumer disputes: travel, insurance, builders, banks, hospitals, online shopping and more.
        </p>
      </header>

      <section className="deckled mx-auto max-w-2xl p-6">
        <textarea
          value={story}
          onChange={(e) => setStory(e.target.value)}
          rows={5}
          maxLength={1500}
          placeholder={EXAMPLE}
          aria-label="Describe your problem"
          className="w-full rounded-xl border border-brass/60 bg-[#fffaf0]/70 p-4 text-lg shadow-inner placeholder:text-ink-soft/70"
        />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 font-ui">
          <details className="text-sm">
            <summary className="cursor-pointer text-ink-soft underline underline-offset-2">Advanced: compare search methods</summary>
          <div role="radiogroup" aria-label="Search mode" className="mt-2 flex flex-wrap gap-1.5 text-sm">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                role="radio"
                aria-checked={view === v.id}
                title={v.hint}
                onClick={() => setView(v.id)}
                className={`rounded-full border px-3 py-1 transition-colors ${
                  view === v.id ? "border-ashoka-navy bg-ashoka-navy text-parchment" : "border-brass/60 hover:bg-parchment-deep"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
          </details>
          <div className="flex items-center gap-3">
            {!story && (
              <button onClick={() => setStory(EXAMPLE)} className="text-sm text-ink-soft underline">
                Try an example
              </button>
            )}
            <button onClick={run} disabled={loading || story.trim().length < 5} className="btn-brass rounded-full px-6 py-2.5 font-semibold disabled:opacity-50">
              {loading ? "Searching…" : "Find similar cases"}
            </button>
          </div>
        </div>
        {waking && (
          <p className="mt-3 font-ui text-sm text-ink-soft">
            Still working… the server is starting up, this can take up to a minute.
          </p>
        )}
        {error && (
          <p role="alert" className="mt-3 rounded-md bg-terracotta/15 p-3 font-ui text-sm text-[#7a2f1f]">
            {error}
          </p>
        )}
      </section>

      {results && (
        <section className="mt-12" aria-label="Results">
          <div className={`grid gap-8 ${shown.length > 1 ? "lg:grid-cols-3" : "mx-auto max-w-3xl"}`}>
            {shown.map((m) => {
              const r = results[m]!;
              return (
                <div key={m}>
                  {shown.length > 1 && (
                    <h2 className="mb-2 font-ui text-sm font-semibold uppercase tracking-[0.16em] text-ink-soft">
                      {VIEWS.find((v) => v.id === m)?.label}
                    </h2>
                  )}
                  <p className="mb-3 rounded-lg border border-brass/40 bg-parchment-deep/50 p-4 font-body text-lg font-semibold leading-relaxed">{r.summary}</p>
                  {r.notices.map((n) => (
                    <p key={n} className="mb-2 font-ui text-xs text-terracotta">Note: {n}</p>
                  ))}
                  {r.rewritten_queries.length > 0 && (
                    <p className="mb-4 font-ui text-sm text-ink-soft">We also searched for: {r.rewritten_queries.join(" · ")}</p>
                  )}
                  <div className="space-y-4">
                    {r.cases.map((c) => (
                      <ResultCard key={c.tid} c={c} onWhy={setWhy} />
                    ))}
                  </div>
                  {r.related_cases.length > 0 && (
                    <details className="mt-5">
                      <summary className="cursor-pointer font-ui text-sm text-ink-soft">Related cases (linked through shared citations)</summary>
                      <div className="mt-3 space-y-4">
                        {r.related_cases.map((c) => (
                          <ResultCard key={c.tid} c={c} />
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <footer className="mt-16 space-y-4">
        <BrassDivider />
        {/* Logo sits at the very end, below the results (owner decision), unaltered. */}
        {results && (
          <div className="flex flex-wrap items-center gap-4 rounded-md border border-brass/50 bg-parchment-deep/60 p-3">
            <IKanoonLogo />
            <p className="font-ui text-xs text-ink-soft">
              Judgments and citations come from Indian Kanoon. Not endorsed by Indian Kanoon.
            </p>
          </div>
        )}
        <Disclaimer />
      </footer>
      <WhyDrawer c={why} onClose={() => setWhy(null)} />
    </main>
  );
}
