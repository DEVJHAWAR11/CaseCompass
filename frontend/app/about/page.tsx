import Link from "next/link";
import { Disclaimer } from "@/components/Attribution";

export const metadata = { title: "About CaseCompass" };

export default function About() {
  return (
    <main className="mx-auto max-w-2xl space-y-5 px-4 py-10">
      <Link href="/" className="font-ui text-sm underline">
        ← Back
      </Link>
      <h1 className="font-display text-4xl tracking-tight">About CaseCompass</h1>
      <p>
        CaseCompass helps people see how Indian consumer commissions (NCDRC and state commissions)
        decided disputes similar to theirs. It never predicts whether you will win; it only shows what
        similar cases decided, with links to the source judgments.
      </p>
      <h2 className="font-display text-2xl">Data source</h2>
      <p>
        Case text and citations come from the Indian Kanoon API (indiankanoon.org). The data is
        published as-is from government sources with no accuracy warranty. CaseCompass is an
        independent project and is not endorsed by, or affiliated with, Indian Kanoon. To power search and show matched passages, a copy of the judgment text is kept in our database; the version on Indian Kanoon and the issuing commission remains the authoritative record.
      </p>
      <h2 className="font-display text-2xl">How the outcomes are produced</h2>
      <p>
        Outcome labels, amounts and one-line summaries are AI-generated from the opening facts and the
        final order of each judgment, then checked by simple code rules. They can be wrong or
        incomplete; always read the judgment. Counts such as &ldquo;7 of 10 cases&rdquo; are computed
        by code from those labels.
      </p>
      <p>
        This is a learning project. It started with airline and travel refund disputes and now also covers insurance, builders, banks, hospitals, online shopping and more, with a small
        collection of cases.
      </p>
      <Disclaimer />
    </main>
  );
}

