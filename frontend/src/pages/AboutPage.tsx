// frontend/src/pages/AboutPage.tsx — "Our Vision"
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useT } from "@/lib/i18n";
import heroImage from "@/assets/hero-villa.jpg";

const AboutPage = () => {
  const t = useT();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ── Cover ────────────────────────────────────────────────────────── */}
      <section className="relative h-[60vh] md:h-[70vh] w-full overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt=""
            className="w-full h-full object-cover grayscale opacity-70"
          />
          <div className="absolute inset-0 bg-charcoal/50" />
        </div>

        <div className="relative z-10 flex flex-col items-center justify-end h-full text-center px-6 pb-16 md:pb-24">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-xs md:text-sm tracking-[0.35em] uppercase text-sand-light/80 mb-5"
          >
            {t("about", "eyebrow", "About LUME")}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="font-display text-3xl md:text-5xl lg:text-6xl font-light text-sand-light max-w-3xl"
          >
            {t("about", "title", "A calm, precise way to enter life in Portugal")}
          </motion.h1>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "4rem" }}
            transition={{ duration: 1, delay: 0.7 }}
            className="h-px bg-primary my-6"
          />
        </div>
      </section>

      {/* ── Intro ────────────────────────────────────────────────────────── */}
      <section className="px-6 md:px-10 lg:px-16 py-14 md:py-20 bg-background">
        <div className="max-w-3xl mx-auto">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="font-display text-lg md:text-2xl font-light text-foreground italic leading-relaxed"
          >
            {t("about", "tagline")}
          </motion.p>

          <div className="mt-8 space-y-5 text-sm text-muted-foreground leading-relaxed">
            <p>{t("about", "intro_p1")}</p>
            <p>{t("about", "intro_p2")}</p>
            <p>{t("about", "intro_p3")}</p>
          </div>
        </div>
      </section>

      {/* ── What we do ───────────────────────────────────────────────────── */}
      <section className="px-6 md:px-10 lg:px-16 py-14 md:py-20 bg-card">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-light text-foreground mb-4">
            {t("about", "what_we_do_title", "What we do")}
          </h2>
          <div className="w-12 h-px bg-primary mb-6" />

          <p className="text-sm text-foreground mb-5">
            {t("about", "what_we_do_lead", "LUME connects three layers:")}
          </p>

          <ul className="space-y-4 mb-6">
            {["homes", "living", "collecting"].map((k) => (
              <li
                key={k}
                className="pl-5 border-l border-primary/40 text-sm text-muted-foreground leading-relaxed"
              >
                {t("about", `what_we_do_${k}`)}
              </li>
            ))}
          </ul>

          <p className="text-sm text-muted-foreground italic">
            {t("about", "what_we_do_outro")}
          </p>
        </div>
      </section>

      {/* ── How we work ──────────────────────────────────────────────────── */}
      <section className="px-6 md:px-10 lg:px-16 py-14 md:py-20 bg-background">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-light text-foreground mb-4">
            {t("about", "how_we_work_title", "How we work")}
          </h2>
          <div className="w-12 h-px bg-primary mb-6" />
          <div className="space-y-5 text-sm text-muted-foreground leading-relaxed">
            <p>{t("about", "how_we_work_p1")}</p>
            <p>{t("about", "how_we_work_p2")}</p>
            <p>{t("about", "how_we_work_p3")}</p>
          </div>
        </div>
      </section>

      {/* ── Why LUME ─────────────────────────────────────────────────────── */}
      <section className="px-6 md:px-10 lg:px-16 py-14 md:py-20 bg-card">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-light text-foreground mb-4">
            {t("about", "why_lume_title", "Why LUME")}
          </h2>
          <div className="w-12 h-px bg-primary mb-6" />
          <div className="space-y-5 text-sm text-muted-foreground leading-relaxed">
            <p>{t("about", "why_lume_p1")}</p>
            <p>{t("about", "why_lume_p2")}</p>
          </div>
        </div>
      </section>

      {/* ── Our goal ─────────────────────────────────────────────────────── */}
      <section className="px-6 md:px-10 lg:px-16 py-14 md:py-20 bg-background">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-3xl md:text-4xl font-light text-foreground mb-4">
            {t("about", "goal_title", "Our goal")}
          </h2>
          <div className="w-12 h-px bg-primary mb-6 mx-auto" />
          <p className="font-display text-lg md:text-2xl font-light text-foreground italic leading-relaxed mb-4">
            {t("about", "goal_p1")}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("about", "goal_p2")}
          </p>
        </div>
      </section>

      {/* ── Company News link ────────────────────────────────────────────── */}
      <section className="px-6 md:px-10 lg:px-16 py-14 md:py-20 bg-card">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs tracking-[0.3em] uppercase text-primary mb-4">
            {t("about", "news_eyebrow", "Latest")}
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            {t("about", "news_lead", "Follow what's happening at LUME.")}
          </p>
          <Link
            to="/about/news"
            className="inline-flex items-center gap-2.5 text-[11px] tracking-[0.3em] uppercase text-primary border-b border-primary/40 pb-1.5 transition-all duration-300 hover:gap-4"
          >
            {t("about", "news_link", "Company News")}
            <span aria-hidden>→</span>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AboutPage;