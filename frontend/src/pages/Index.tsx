// frontend/src/pages/Index.tsx
//
// Landing page composition. The questionnaire is a lightweight email-capture
// flow: it shows questions, captures an email, then renders a thank-you
// block in place of itself. Nothing on the page is gated behind it — the
// rest of the homepage is always visible.

import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import QuestionnaireSection from "@/components/QuestionnaireSection";
import ServicesSection from "@/components/ServicesSection";
import InvestmentSection from "@/components/InvestmentSection";
import PrivateAccessSection from "@/components/PrivateAccessSection";
import Footer from "@/components/Footer";
import CookieConsent from "@/components/CookieConsent";

const Index = () => {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) return;
    const timer = setTimeout(() => {
      document.querySelector(location.hash)?.scrollIntoView({ behavior: "smooth" });
    }, 100);
    return () => clearTimeout(timer);
  }, [location.hash]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <QuestionnaireSection />
      <ServicesSection />
      <InvestmentSection />
      <PrivateAccessSection />
      <Footer />
      <CookieConsent />
    </div>
  );
};

export default Index;
