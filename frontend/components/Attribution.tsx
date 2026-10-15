"use client";
// IKanoon attribution. Terms: show the "powered by IKanoon" logo UNALTERED (no resizing, editing
// or covering) above any results that display their content. The official logo file must be
// placed at /public/ikanoon-logo.png by the site owner; until then a plain text credit shows.
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";

const LOGO = "/ikanoon-logo.png";

export function IKanoonLogo() {
  // Probe the file once; render the logo only if it exists, else the plain text credit.
  // (An <img onError> can fire before hydration, so it cannot be relied on here.)
  const [hasLogo, setHasLogo] = useState(false);
  useEffect(() => {
    const probe = new Image();
    probe.onload = () => setHasLogo(true);
    probe.src = LOGO;
  }, []);
  return (
    <a
      href="https://indiankanoon.org"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block"
      aria-label="Powered by Indian Kanoon"
    >
      {hasLogo ? (
        // natural size: no width/height/className scaling on the logo itself
        <img src={LOGO} alt="Powered by IKanoon" />
      ) : (
        <span className="font-ui text-xs text-ink-soft underline">Powered by IKanoon</span>
      )}
    </a>
  );
}

export function Disclaimer() {
  return (
    <p className="rounded-md border border-brass/50 bg-parchment-deep/60 p-3 font-ui text-xs text-ink">
      This is information, not legal advice. Outcomes are AI-generated from public records and may
      contain errors. Case data comes from Indian Kanoon, is provided as-is, and carries no
      accuracy warranty.
    </p>
  );
}
