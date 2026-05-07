import { useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { HeroSection } from "@/components/agencies/HeroSection";
import { ValuePropsSection } from "@/components/agencies/ValuePropsSection";
import { HowItWorksSection } from "@/components/agencies/HowItWorksSection";
import { StatsSection } from "@/components/agencies/StatsSection";
import { FAQSection } from "@/components/agencies/FAQSection";
import { FinalCTASection } from "@/components/agencies/FinalCTASection";

const Agencies = () => {
  useEffect(() => {
    document.title = "List your motorbikes on Motonita — Free for agencies";
    const meta =
      document.querySelector('meta[name="description"]') ||
      (() => {
        const m = document.createElement("meta");
        m.setAttribute("name", "description");
        document.head.appendChild(m);
        return m;
      })();
    meta.setAttribute(
      "content",
      "Morocco's first motorbike rental marketplace. List your fleet free during launch. No commission. Setup in 10 minutes."
    );
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        <HeroSection />
        <ValuePropsSection />
        <HowItWorksSection />
        <StatsSection />
        <FAQSection />
        <FinalCTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Agencies;
