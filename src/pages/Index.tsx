import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { TopCitiesSection } from "@/components/TopCitiesSection";
import { HowItWorksSection } from "@/components/HowItWorksSection";
import { FAQSection } from "@/components/FAQSection";
import { CitiesAvailableSection } from "@/components/CitiesAvailableSection";
import { TestimonialsSection } from "@/components/TestimonialsSection";
import { Footer } from "@/components/Footer";
import { PrivacyPolicyPopup } from "@/components/PrivacyPolicyPopup";
import { VerificationBanner } from "@/components/VerificationBanner";

const Index = () => {
  const location = useLocation();

  // Scroll to FAQ section if hash is #faq
  useEffect(() => {
    if (location.hash === '#faq') {
      const faqSection = document.getElementById('faq');
      if (faqSection) {
        // Defer scroll to avoid forced reflow during render
        requestAnimationFrame(() => {
          faqSection.scrollIntoView({ behavior: 'smooth' });
        });
      }
    }
  }, [location]);

  return (
    <div className="min-h-screen">
      <Header />
      <VerificationBanner />
      <main>
        <HeroSection />
        {/* Below-fold content with content-visibility optimization */}
        <div className="content-visibility-auto">
          <TopCitiesSection />
        </div>
        <div className="content-visibility-auto">
          <HowItWorksSection />
        </div>
        <div id="faq" className="content-visibility-auto">
          <FAQSection />
        </div>
        <div className="content-visibility-auto">
          <CitiesAvailableSection />
        </div>
        <div className="content-visibility-auto">
          <TestimonialsSection />
        </div>
      </main>
      <Footer />
      <PrivacyPolicyPopup />
    </div>
  );
};

export default Index;
