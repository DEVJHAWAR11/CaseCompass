"use client";

import { useState } from "react";
import { ApiError, searchCases, type CaseHit, type Mode, type SearchResponse } from "@/lib/api";
import { Disclaimer, IKanoonLogo } from "@/components/Attribution";
import { ResultCard } from "@/components/ResultCard";
import { WhyDrawer } from "@/components/WhyDrawer";

type View = Mode | "compare";
const VIEWS: { id: View; label: string; hint: string }[] = [
  { id: "full", label: "Full pipeline", hint: "rewrite + hybrid + rerank" },
  { id: "hybrid", label: "Hybrid", hint: "meaning + keywords" },
  { id: "naive", label: "Naive", hint: "meaning only" },
  { id: "compare", label: "Compare all", hint: "side by side" },
];
const EXAMPLE = "The airline cancelled my flight and has refused to refund my ticket for 3 months";

export default function Home() {
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
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">CaseCompass</h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">
          Describe your travel or airline dispute in your own words. See how similar consumer court
          cases turned out, with links to the judgments.
        </p>
      </header>

      <section className="mx-auto max-w-2xl">
        <textarea
          value={story}
          onChange={(e) => setStory(e.target.value)}
          rows={5}
          maxLength={1500}
          placeholder={EXAMPLE}
          aria-label="Describe your problem"
          className="w-full rounded-lg border border-neutral-300 bg-transparent p-3 text-base focus:outline-2 focus:outline-blue-600 dark:border-neutral-700"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div role="radiogroup" aria-label="Search mode" className="flex flex-wrap gap-1 text-sm">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                role="radio"
                aria-checked={view === v.id}
                title={v.hint}
                onClick={() => setView(v.id)}
                className={`rounded-full border px-3 py-1 ${
                  view === v.id
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-neutral-300 dark:border-neutral-700"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {!story && (
              <button onClick={() => setStory(EXAMPLE)} className="text-sm text-neutral-500 underline">
                Try an example
              </button>
            )}
            <button
              onClick={run}
              disabled={loading || story.trim().length < 5}
              className="rounded-lg bg-blue-600 px-5 py-2 text-white disabled:opacity-50"
            >
              {loading ? "Searching…" : "Find similar cases"}
            </button>
          </div>
        </div>
        {waking && (
          <p className="mt-3 text-sm text-amber-700 dark:text-amber-400">
            The server is waking up after being idle. This can take up to a minute on the first search.
          </p>
        )}
        {error && (
          <p role="alert" className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
            {error}
          </p>
        )}
      </section>

      {results && (
        <section className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <IKanoonLogo />
          </div>
          <div className={`grid gap-6 ${shown.length > 1 ? "lg:grid-cols-3" : ""}`}>
            {shown.map((m) => {
              const r = results[m]!;
              return (
                <div key={m}>
                  {shown.length > 1 && (
                    <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
                      {VIEWS.find((v) => v.id === m)?.label}
                    </h2>
                  )}
                  <p className="mb-3 rounded-md bg-neutral-100 p-3 text-sm dark:bg-neutral-800">{r.summary}</p>
                  {r.notices.map((n) => (
                    <p key={n} className="mb-2 text-xs text-amber-700 dark:text-amber-400">
                      Note: {n}
                    </p>
                  ))}
                  {r.rewritten_queries.length > 0 && (
                    <p className="mb-3 text-xs text-neutral-500">
                      We also searched for: {r.rewritten_queries.join(" · ")}
                    </p>
                  )}
                  <div className="space-y-3">
                    {r.cases.map((c) => (
                      <ResultCard key={c.tid} c={c} onWhy={setWhy} />
                    ))}
                  </div>
                  {r.related_cases.length > 0 && (
                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm text-neutral-600 dark:text-neutral-400">
                        Related cases (linked through shared citations)
                      </summary>
                      <div className="mt-2 space-y-3">
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

      <footer className="mt-12 space-y-3">
        <Disclaimer />
        <p className="text-center text-xs text-neutral-500">
          <a href="/about" className="underline">
            About &amp; data source
          </a>
        </p>
      </footer>
      <WhyDrawer c={why} onClose={() => setWhy(null)} />
    </main>
  );
}
