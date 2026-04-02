// frontend/src/pages/Index.tsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import QuestionnaireSection from "@/components/QuestionnaireSection";
import ListingsSection from "@/components/ListingsSection";
import ServicesSection from "@/components/ServicesSection";
import CuratorSection from "@/components/CuratorSection";
import ConciergeSection from "@/components/ConciergeSection";
import InvestmentSection from "@/components/InvestmentSection";
import PrivateAccessSection from "@/components/PrivateAccessSection";
import Footer from "@/components/Footer";
import CookieConsent from "@/components/CookieConsent";
import { getCookie, EMAIL_SUBMITTED_KEY } from "@/lib/cookies";
import type { QuestionnaireAnswers } from "@/lib/questionnaire-filter";

const Index = () => {
  // Has the visitor already submitted their email? (cookie-based)
  const [unlocked, setUnlocked] = useState(() => !!getCookie(EMAIL_SUBMITTED_KEY));

  // Questionnaire answers — used to filter the listings shown below
  // Null means: returning visitor who skipped the questionnaire (show unfiltered)
  const [answers, setAnswers] = useState<QuestionnaireAnswers | null>(null);

  const handleComplete = (submittedAnswers: QuestionnaireAnswers) => {
    setAnswers(submittedAnswers);
    setUnlocked(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />

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
            {/* Pass answers — null for returning visitors means no filter applied */}
            <ListingsSection answers={answers} />
            <ServicesSection />
            <CuratorSection />
            <ConciergeSection />
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