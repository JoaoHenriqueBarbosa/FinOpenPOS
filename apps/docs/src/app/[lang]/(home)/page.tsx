import Header from "@/components/landing-header";
import Footer from "@/components/landing-footer";
import Hero from "@/components/sections/hero";
import Problem from "@/components/sections/problem";
import TechStack from "@/components/sections/tech-stack";
import Features from "@/components/sections/features";
import SocialProof from "@/components/sections/social-proof";
import GettingStarted from "@/components/sections/getting-started";
import CTA from "@/components/sections/cta";
import { loadMessages } from "@/lib/translations-server";

interface PageProps {
  params: Promise<{ lang: string }>;
}

export default async function HomePage({ params }: PageProps) {
  const { lang } = await params;
  const messages = await loadMessages(lang);

  return (
    <>
      <Header />
      <main>
        <Hero locale={lang} messages={messages} />
        <Problem locale={lang} messages={messages} />
        <TechStack locale={lang} messages={messages} />
        <Features />
        <SocialProof locale={lang} messages={messages} />
        <GettingStarted />
        <CTA locale={lang} messages={messages} />
      </main>
      <Footer locale={lang} messages={messages} />
    </>
  );
}
