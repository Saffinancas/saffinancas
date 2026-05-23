import { LandingNav } from "@/components/landing/nav";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { ModulesSection } from "@/components/landing/modules";
import { Differentiators } from "@/components/landing/differentiators";
import { Comparison } from "@/components/landing/comparison";
import { UseCases } from "@/components/landing/use-cases";
import { Pricing } from "@/components/landing/pricing";
import { FAQ } from "@/components/landing/faq";
import { Footer } from "@/components/landing/footer";

export default function LandingPage() {
  return (
    <>
      <LandingNav />
      <main>
        <Hero />
        <HowItWorks />
        <ModulesSection />
        <Differentiators />
        <Comparison />
        <UseCases />
        <Pricing />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
