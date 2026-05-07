import { motion } from "framer-motion";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useT } from "@/lib/i18n";

const HeroSection = () => {
  const t = useT();
  const location = useLocation();
  const navigate = useNavigate();

  const handleGuideClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (location.pathname === "/") {
      document.querySelector("#questionnaire")?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate("/#questionnaire");
    }
  };

  return (
    <section id="hero" className="relative h-screen w-full overflow-hidden">
      {/* Background video */}
      <div className="absolute inset-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover"
        >
          <source src="/hero-video.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-charcoal/40" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-6">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="text-sm md:text-base tracking-[0.35em] uppercase text-sand-light mb-24"
        >
          {t("hero", "eyebrow", "Homes · Living · Collecting")}
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="flex flex-col items-center"
        >
          <img
            src="/hero-logo.png"
            alt={t("hero", "logo_alt", "LUME by Mark")}
            className="w-[18rem] md:w-[28rem] lg:w-[34rem] h-auto"
          />
        </motion.h1>

        <motion.div
          initial={{ width: 0 }}
          animate={{ width: "4rem" }}
          transition={{ duration: 1, delay: 1 }}
          className="h-px bg-primary my-3"
        />

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          className="font-display text-xl md:text-2xl font-light text-sand-light/90 italic max-w-xl"
        >
          {t("hero", "tagline", "Your light to living in Portugal")}
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.8 }}
          className="mt-6 flex flex-col sm:flex-row gap-4"
        >
          <Link
            to="/properties"
            className="px-8 py-3 border border-sand-light/60 text-sand-light text-sm tracking-[0.2em] uppercase hover:bg-sand-light/10 transition-all duration-300"
          >
            {t("hero", "cta_explore_homes", "Explore Homes")}
          </Link>
          <a
            href="/#questionnaire"
            onClick={handleGuideClick}
            className="px-8 py-3 bg-[#fabe1e] text-[#0f0f0f] text-sm tracking-[0.2em] uppercase hover:bg-[#ffd147] transition-all duration-300"
          >
            {t("hero", "cta_let_us_guide_you", "Let Us Guide You")}
          </a>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span className="text-xs tracking-[0.3em] uppercase text-sand-light/75">{t("hero", "scroll", "Scroll")}</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-px h-8 bg-sand-light/30"
        />
      </motion.div>
    </section>
  );
};

export default HeroSection;