"use client";

import { useEffect } from "react";
import { API_URL } from "@/lib/api";

/**
 * Free hosting sleeps after ~15 min idle. Pinging /health once when any page opens lets the
 * server wake while the visitor reads, so their first search is usually not a 30 s wait.
 * Fire-and-forget: errors are ignored and nothing is shown.
 */
export function WarmBackend() {
  useEffect(() => {
    const t = setTimeout(() => {
      fetch(`${API_URL}/health`, { cache: "no-store" }).catch(() => {});
    }, 500);
    return () => clearTimeout(t);
  }, []);
  return null;
}
