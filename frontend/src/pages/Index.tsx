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

const Index = () => {
  const [unlocked, setUnlocked] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <QuestionnaireSection onComplete={() => setUnlocked(true)} isCompleted={unlocked} />

      <AnimatePresence>
        {unlocked && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <ListingsSection />
            <ServicesSection />
            <CuratorSection />
            <ConciergeSection />
            <InvestmentSection />
          </motion.div>
        )}
      </AnimatePresence>

      <PrivateAccessSection />
      <Footer />
    </div>
  );
};

export default Index;
