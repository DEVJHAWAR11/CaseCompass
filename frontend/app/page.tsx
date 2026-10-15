import { Curtain } from "@/components/hero/Curtain";
import { Hero } from "@/components/hero/Hero";
import { Nav } from "@/components/hero/Nav";
import { Problem } from "@/components/sections/Problem";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { LiveDemo } from "@/components/sections/LiveDemo";
import { Features } from "@/components/sections/Features";
import { Heritage } from "@/components/sections/Heritage";
import { Trust } from "@/components/sections/Trust";
import { FinalCta } from "@/components/sections/FinalCta";
import { Footer } from "@/components/sections/Footer";
import { BrassDivider, JaliBand } from "@/components/ui/Ornaments";

export default function Landing() {
  return (
    <>
      <Curtain />
      <Nav />
      <main>
        <Hero />
        <Problem />
        <BrassDivider variant="chakra" className="mx-auto max-w-4xl px-5" />
        <HowItWorks />
        <JaliBand />
        <LiveDemo />
        <BrassDivider className="mx-auto max-w-4xl px-5" />
        <Features />
        <Heritage />
        <Trust />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
