import Link from "next/link";
import { CompassMark } from "@/components/ui/Icons";
import { Lotus } from "@/components/ui/Ornaments";

export function Footer() {
  return (
    <footer className="relative bg-ashoka-navy text-parchment">
      <div className="mx-auto max-w-7xl px-5 py-16 md:px-10">
        <div className="flex flex-col items-center gap-3 text-center text-saffron">
          <Lotus className="h-6 w-12" />
          {/* decorative flourish: "justice for all" */}
          <p className="font-deva text-2xl">न्याय सबके लिए</p>
          <div className="brass-line w-48" />
        </div>
        <div className="mt-12 grid gap-10 md:grid-cols-3">
          <div>
            <Link href="/" className="flex items-center gap-2">
              <CompassMark className="h-7 w-7 text-saffron" />
              <span className="font-display text-2xl">CaseCompass</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm text-parchment/80">
              See how Indian consumer commissions decided disputes like yours. A learning project covering travel, insurance, property, banking, medical, online shopping and more.
            </p>
          </div>
          <nav aria-label="Footer" className="font-ui text-sm">
            <ul className="space-y-2">
              <li><Link href="/search" className="text-saffron underline-offset-4 hover:underline">Search a case</Link></li>
              <li><a href="#how" className="text-saffron underline-offset-4 hover:underline">How it works</a></li>
              <li><Link href="/about" className="text-saffron underline-offset-4 hover:underline">About &amp; data source</Link></li>
              <li><a href="https://indiankanoon.org" target="_blank" rel="noopener noreferrer" className="text-saffron underline-offset-4 hover:underline">Indian Kanoon (case data)</a></li>
            </ul>
          </nav>
          <p className="text-xs leading-relaxed text-parchment/75">
            This is information, not legal advice. Outcomes are AI-generated from public records and may contain errors.
            Case data comes from Indian Kanoon, is provided as-is with no accuracy warranty, and CaseCompass is not
            endorsed by or affiliated with Indian Kanoon.
          </p>
        </div>
      </div>
    </footer>
  );
}
