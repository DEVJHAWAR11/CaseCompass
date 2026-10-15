// Typed client for the CaseCompass API. The browser only talks to OUR backend;
// no Indian Kanoon / Jina / Groq keys ever reach the frontend.
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type Mode = "naive" | "hybrid" | "full";

export interface CaseHit {
  tid: number;
  title: string;
  court: string | null;
  decided_on: string | null;
  result: "allowed" | "partly_allowed" | "dismissed" | "unclear";
  refund_inr: number | null;
  compensation_inr: number | null;
  laws_cited: string[];
  summary_ai: string | null;
  source_url: string;
  cited_by_count: number | null;
  matched_section: string;
  match_start: number | null;
  match_end: number | null;
}

export interface Stats {
  total: number;
  favoured_complainant: number;
  allowed: number;
  partly_allowed: number;
  dismissed: number;
  unclear: number;
  median_compensation_inr: number | null;
  with_compensation: number;
}

export interface SearchResponse {
  mode_used: string;
  rewritten_queries: string[];
  cases: CaseHit[];
  related_cases: CaseHit[];
  stats: Stats;
  summary: string;
  notices: string[];
  disclaimer: string;
  attribution: string;
}

/** Fetch the matched passage on demand (one live Indian Kanoon call, only when the user asks). */
export async function fetchPassage(c: CaseHit): Promise<string> {
  try {
    const res = await fetch(`${API_URL}/passage/${c.tid}?start=${c.match_start}&end=${c.match_end}`);
    if (!res.ok) throw new Error("unavailable");
    return ((await res.json()) as { passage: string }).passage;
  } catch {
    throw new ApiError("server_error", "The passage is unavailable right now. Use the source link to read the judgment.");
  }
}

/** Friendly error with a kind the UI can map to a specific message. */
export class ApiError extends Error {
  constructor(public kind: "rate_limited" | "server_error" | "unreachable", message: string) {
    super(message);
  }
}

export async function searchCases(
  story: string,
  mode: Mode,
  onSlow?: () => void,
): Promise<SearchResponse> {
  // Free hosting sleeps when idle: if no answer after 4s, tell the UI it is waking up.
  const slow = setTimeout(() => onSlow?.(), 4000);
  try {
    const res = await fetch(`${API_URL}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ story, mode, top: 10 }),
    });
    if (res.status === 429)
      throw new ApiError("rate_limited", "You are searching too fast. Please wait a minute.");
    if (!res.ok) throw new ApiError("server_error", "Something went wrong on our side. Please retry.");
    return (await res.json()) as SearchResponse;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError("unreachable", "We could not reach the server. It may be waking up; retry in a moment.");
  } finally {
    clearTimeout(slow);
  }
}
