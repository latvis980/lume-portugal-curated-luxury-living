// frontend/src/pages/LegalPage.tsx
//
// Generic renderer for the hardcoded legal documents in src/content/legal.
// The body is picked by the active locale (English fallback) so translated
// versions can be added simply by dropping in a new content file.

import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LegalContent from "@/components/LegalContent";
import { loadLegalDoc, type LegalSlug } from "@/content/legal";
import { useI18n } from "@/lib/i18n";

const LegalPage = ({ slug }: { slug: LegalSlug }) => {
  const { locale } = useI18n();
  const location = useLocation();
  const doc = loadLegalDoc(slug, locale);

  // Scroll to top on navigation, or to the anchored section when a hash is set
  // (e.g. /legal/terms#applicable-law from the footer "Resolução de litígios").
  useEffect(() => {
    if (location.hash) {
      const timer = setTimeout(() => {
        document
          .querySelector(location.hash)
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
      return () => clearTimeout(timer);
    }
    window.scrollTo(0, 0);
  }, [location.hash, slug]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 md:pt-28">
        {doc ? (
          <LegalContent doc={doc} />
        ) : (
          <div className="px-6 py-32 text-center text-muted-foreground font-body">
            This document is not available.
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default LegalPage;
