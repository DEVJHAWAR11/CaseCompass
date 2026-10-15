"use client";
// IKanoon attribution. Terms: show the "powered by IKanoon" logo UNALTERED (no resizing, editing
// or covering) above any results that display their content. The official logo file must be
// placed at /public/ikanoon-logo.png by the site owner; until then a plain text credit shows.
/* eslint-disable @next/next/no-img-element */
export function IKanoonLogo() {
  return (
    <a
      href="https://indiankanoon.org"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block"
      aria-label="Powered by Indian Kanoon"
    >
      {/* natural size, no width/height/className scaling on the image itself */}
      <img
        src="/ikanoon-logo.png"
        alt="Powered by IKanoon"
        onError={(e) => {
          e.currentTarget.style.display = "none";
          e.currentTarget.nextElementSibling?.removeAttribute("hidden");
        }}
      />
      <span hidden className="text-xs text-neutral-500 underline">
        Powered by IKanoon
      </span>
    </a>
  );
}

export function Disclaimer() {
  return (
    <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
      This is information, not legal advice. Outcomes are AI-generated from public records and may
      contain errors. Case data comes from Indian Kanoon, is provided as-is, and carries no
      accuracy warranty.
    </p>
  );
}
