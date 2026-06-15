// frontend/src/components/ComingSoonBanner.tsx
//
// "Coming Soon" banner used to close the whole Homes (/properties) section —
// the listings index, the curated region/type landing pages, and individual
// property pages — while the collection is being assembled.
//
// A warm stained-glass backdrop (see .lume-stained-glass in index.css) covers
// the page; a frosted card carries the copy and a single-field email capture.
//
// The email is sent to the existing newsletter endpoint
// (POST /api/submit/newsletter) — the same lightweight contact-capture used
// elsewhere on the site, so no new backend wiring is needed.
//
// Copy is translatable via the `coming_soon` namespace (seeded for all locales
// in supabase/migrations/..._coming_soon_translations.sql); English fallbacks
// are inlined so the banner renders correctly before the rows exist.
import { useState } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useT } from "@/lib/i18n";

// Single source of truth for whether the Homes section is closed. Flip to
// `false` to restore the full listings experience across every page that
// imports it (PropertiesPage, SectionPage, ListingPage).
export const HOMES_COMING_SOON = true;

const ComingSoonBanner = () => {
  const t = useT();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || isSubmitting) return;

    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/submit/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.detail ||
            t("coming_soon", "error", "Something went wrong. Please try again."),
        );
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(
        err.message ||
          t("coming_soon", "error", "Something went wrong. Please try again."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="lume-stained-glass relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-32">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-xl rounded-sm border border-warm-white/40 bg-[#fbf4e6]/85 px-7 py-12 text-center shadow-2xl backdrop-blur-xl md:px-12 md:py-16"
      >
        <p className="mb-5 text-xs uppercase tracking-[0.32em] text-primary">
          {t("coming_soon", "eyebrow", "Homes")}
        </p>

        <h1 className="font-display text-4xl font-light leading-tight text-foreground md:text-6xl">
          {t("coming_soon", "title", "Coming Soon")}
        </h1>

        <div className="mx-auto my-7 h-px w-14 bg-primary" />

        <p className="mx-auto mb-9 max-w-md text-base font-light leading-relaxed text-muted-foreground md:text-lg">
          {t(
            "coming_soon",
            "body_before",
            "We are gathering the best homes in Portugal for you. Leave your contact to get notified when",
          )}
          <br />
          <span className="font-semibold text-foreground">
            {t("coming_soon", "brand", "LUME by Mark")}
          </span>{" "}
          {t("coming_soon", "body_after", "homes offers are live.")}
        </p>

        {!submitted ? (
          <form
            onSubmit={handleSubmit}
            className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row"
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("coming_soon", "email_placeholder", "Your email")}
              required
              disabled={isSubmitting}
              aria-label={t("coming_soon", "email_placeholder", "Your email")}
              className="flex-1 border border-border bg-background/90 px-4 py-3 text-base tracking-wider text-foreground placeholder:text-muted-foreground/50 transition-colors focus:border-primary focus:outline-none disabled:opacity-50 sm:text-sm"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#2a1d10] px-8 py-3 text-xs uppercase tracking-[0.2em] text-[#fbf4e6] transition-colors hover:bg-[#3d2c1a] disabled:opacity-50"
            >
              {isSubmitting
                ? t("coming_soon", "button_loading", "Sending…")
                : t("coming_soon", "button", "Notify Me")}
            </button>
          </form>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="mx-auto max-w-md"
          >
            <p className="font-display text-2xl font-light italic text-foreground">
              {t("coming_soon", "thanks_title", "Thank you")}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              {t(
                "coming_soon",
                "thanks_body",
                "You're on the list. We'll be in touch the moment our homes go live.",
              )}
            </p>
          </motion.div>
        )}

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </motion.div>
    </section>
  );
};

// Full-page version: navbar + stained-glass banner + footer. Pages in the
// Homes section render this in place of their normal content while
// HOMES_COMING_SOON is set, so every /properties/* route shows the banner.
export function HomesComingSoon() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <ComingSoonBanner />
      <Footer />
    </div>
  );
}

export default ComingSoonBanner;
