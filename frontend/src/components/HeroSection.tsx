import { motion } from "framer-motion";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useT } from "@/lib/i18n";
import SunWave from "@/components/SunWave";

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
    <section id="hero" className="relative h-screen min-h-[720px] w-full overflow-hidden isolate">
      {/* Background video */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover"
        >
          <source src="/hero-video.mp4" type="video/mp4" />
        </video>
        {/* Warm sunset wash on top of the footage so the cream/honey palette
            reads consistently with the rest of the page. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(20,12,4,0.55) 0%, rgba(20,12,4,0.28) 30%, rgba(20,12,4,0.12) 55%, rgba(231,148,70,0.18) 85%, rgba(241,196,84,0) 100%), radial-gradient(ellipse at 70% 25%, rgba(255,210,120,0.22), transparent 60%)",
          }}
        />
      </div>

      {/* Content — left-aligned, raised above the wave crest at the bottom */}
      <div
        className="relative z-[5] flex h-full flex-col items-start justify-center text-left text-warm-white"
        style={{
          padding:
            "84px clamp(24px, 7vw, 96px) clamp(260px, 34vh, 360px)",
        }}
      >
        <motion.p
          initial={{ clipPath: "inset(0 100% 0 0)" }}
          animate={{ clipPath: "inset(0 0 0 0)" }}
          transition={{ duration: 1.2, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="font-display italic font-light self-start"
          style={{
            fontSize: "clamp(28px, 4vw, 44px)",
            lineHeight: 1.1,
            textShadow: "0 2px 20px rgba(0,0,0,0.3)",
          }}
        >
          {t("hero", "tagline", "Your light to living in Portugal")}
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.4 }}
          className="mt-9 flex flex-wrap items-center gap-3.5 self-start"
        >
          <Link
            to="/properties"
            className="px-8 py-4 border text-[11px] tracking-[0.3em] uppercase font-medium transition-all duration-300"
            style={{
              color: "#fbf4e6",
              borderColor: "rgba(255,243,220,0.7)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,243,220,0.12)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            {t("hero", "cta_explore_homes", "Explore Homes")}
          </Link>
          <a
            href="/#questionnaire"
            onClick={handleGuideClick}
            className="px-8 py-4 text-[11px] tracking-[0.3em] uppercase font-medium transition-all duration-300"
            style={{
              background: "linear-gradient(120deg, #f1c454 0%, #e89446 100%)",
              color: "#2a1d10",
              boxShadow: "0 8px 28px -8px rgba(233,169,46,0.6)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow =
                "0 12px 36px -8px rgba(233,169,46,0.75)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow =
                "0 8px 28px -8px rgba(233,169,46,0.6)";
            }}
          >
            {t("hero", "cta_let_us_guide_you", "Let Us Guide You")}
          </a>
        </motion.div>
      </div>

      {/* Scroll indicator — centered above the wave */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5 }}
        className="absolute left-1/2 -translate-x-1/2 z-[6] flex flex-col items-center gap-2"
        style={{ bottom: "calc(clamp(260px, 34vh, 360px) - 140px)" }}
      >
        <span className="text-[9px] tracking-[0.4em] uppercase text-[#fff3dc]/70">
          {t("hero", "scroll", "Scroll")}
        </span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-px h-8"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,243,220,0.7), transparent)",
          }}
        />
      </motion.div>

      {/* Sunlit wave horizon at the bottom of the hero */}
      <SunWave />
    </section>
  );
};

export default HeroSection;
