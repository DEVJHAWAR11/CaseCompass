import Link from "next/link";
import { CompassMark } from "@/components/ui/Icons";

export function Nav() {
  return (
    <header className="absolute inset-x-0 top-0 z-30">
      <nav aria-label="Main" className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-10">
        <Link href="/" className="flex items-center gap-2 text-ink">
          <CompassMark className="h-7 w-7 text-brass" />
          <span className="font-display text-2xl font-semibold tracking-tight">CaseCompass</span>
        </Link>
        <ul className="flex items-center gap-5 font-ui text-sm text-ink md:gap-8">
          <li className="hidden sm:block">
            <a href="#how" className="underline-offset-4 hover:underline">How it works</a>
          </li>
          <li className="hidden sm:block">
            <a href="#demo" className="underline-offset-4 hover:underline">Demo</a>
          </li>
          <li>
            <Link href="/search" className="btn-ghost rounded-full px-4 py-1.5 transition-colors">
              Search a case
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}
