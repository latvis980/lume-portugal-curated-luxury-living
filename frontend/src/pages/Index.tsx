// frontend/src/pages/Index.tsx
//
// Landing page composition. The questionnaire is a soft gate: until the
// visitor submits their email, the Listings/Services/Concierge sections
// are hidden. Once they submit, those sections animate in. The "unlocked"
// state lives only in React — there's no cookie, so a fresh page load
// shows the questionnaire again. This is intentional: returning visitors
// can do the questionnaire again if they want to.

import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import QuestionnaireSection from "@/components/QuestionnaireSection";
import ListingsSection from "@/components/ListingsSection";
import ServicesSection from "@/components/ServicesSection";
import InvestmentSection from "@/components/InvestmentSection";
import PrivateAccessSection from "@/components/PrivateAccessSection";
import Footer from "@/components/Footer";
import CookieConsent from "@/components/CookieConsent";

const Index = () => {
  // Session-only: starts false on every fresh load.
  const [unlocked, setUnlocked] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) return;
    const timer = setTimeout(() => {
      document.querySelector(location.hash)?.scrollIntoView({ behavior: "smooth" });
    }, 100);
    return () => clearTimeout(timer);
  }, [location.hash]);

  const handleComplete = () => {
    setUnlocked(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection unlocked={unlocked} />

      <QuestionnaireSection
        onComplete={handleComplete}
        isCompleted={unlocked}
      />

      <AnimatePresence>
        {unlocked && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <ListingsSection />
            <ServicesSection />
          </motion.div>
        )}
      </AnimatePresence>

      <InvestmentSection />
      <PrivateAccessSection />
      <Footer />
      <CookieConsent />
    </div>
  );
};

export default Index;