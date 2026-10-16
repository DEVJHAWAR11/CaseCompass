import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Hind, Tiro_Devanagari_Hindi } from "next/font/google";
import "./globals.css";
import { SmoothScroll } from "@/hooks/useLenis";
import { BrassCursor } from "@/components/ui/BrassCursor";
import { WarmBackend } from "@/components/ui/WarmBackend";

// Display serif: high contrast, used large with tight tracking.
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});
// Devanagari accents (eyebrows, flourishes).
const tiro = Tiro_Devanagari_Hindi({
  subsets: ["devanagari", "latin"],
  weight: "400",
  variable: "--font-tiro",
  display: "swap",
  preload: false, // decorative accents only: don't compete with the hero image
});
// Body copy and UI labels (one family keeps the font payload small).
const hind = Hind({ subsets: ["latin"], weight: ["400", "600"], variable: "--font-hind", display: "swap" });

export const metadata: Metadata = {
  title: "CaseCompass — see how similar consumer cases turned out",
  description:
    "Describe your consumer dispute (travel, insurance, builders, banks, online shopping and more) in plain words and see how Indian consumer commissions decided similar cases, with links to the judgments.",
};

export const viewport: Viewport = { themeColor: "#F6EAD0" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${cormorant.variable} ${tiro.variable} ${hind.variable}`}>
      <body className="min-h-screen">
        <SmoothScroll>{children}</SmoothScroll>
        <div className="vignette" aria-hidden="true" />
        <div className="paper-grain" aria-hidden="true" />
        <BrassCursor />
        <WarmBackend />
      </body>
    </html>
  );
}
