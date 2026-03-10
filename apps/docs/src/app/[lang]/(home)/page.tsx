import Header from "@/components/landing-header";
import Footer from "@/components/landing-footer";
import Hero from "@/components/sections/hero";
import Problem from "@/components/sections/problem";
import TechStack from "@/components/sections/tech-stack";
import Features from "@/components/sections/features";
import SocialProof from "@/components/sections/social-proof";
import GettingStarted from "@/components/sections/getting-started";
import CTA from "@/components/sections/cta";

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Problem />
        <TechStack />
        <Features />
        <SocialProof />
        <GettingStarted />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
