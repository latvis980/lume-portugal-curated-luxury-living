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

      {/* Left block — logo · gold line · handwritten tagline, vertically centred
          and aligned to the same left gutter as the navbar logo. */}
      <div
        className="absolute z-[5] flex flex-col items-start text-left text-warm-white"
        style={{
          left: "clamp(24px, 7vw, 96px)",
          top: "50%",
          transform: "translateY(-50%)",
        }}
      >
        {/* Sizes mirror the reference's fixed 1280×720 canvas scaled to fit:
            scale = min(100vw/1280, 100vh/720), so each px value `n` becomes
            min(n/12.8 vw, n/7.2 vh). Logo is 69px, tagline 38px on that canvas. */}
        <img
          src="/logo-hero.png"
          alt="LUME by Mark"
          className="block w-auto"
          style={{
            height: "clamp(52px, min(5.39vw, 9.58vh), 128px)",
            filter: "brightness(0) invert(1)",
            marginTop: "min(5vw, 8.89vh)",
          }}
        />
        {/* gold hairline */}
        <div
          style={{
            width: "min(3.13vw, 5.56vh)",
            minWidth: "40px",
            maxWidth: "72px",
            height: "1px",
            background: "#e9a92e",
            margin: "min(1.17vw, 2.08vh) 0 min(0.78vw, 1.39vh)",
          }}
        />
        <motion.p
          initial={{ clipPath: "inset(0 100% 0 0)" }}
          animate={{ clipPath: "inset(0 0 0 0)" }}
          transition={{ duration: 2, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="m-0"
          style={{
            fontFamily: '"Caveat", cursive',
            color: "#fbf4e6",
            fontSize: "clamp(24px, min(2.97vw, 5.28vh), 52px)",
            fontWeight: 400,
            lineHeight: 1.32,
            maxWidth: "min(46vw, 82vh)",
            // Caveat's glyphs overshoot the text box; without right padding the
            // clip-path reveal shaves the last letter (e.g. the "l" in Portugal).
            paddingRight: "0.5em",
            paddingBottom: "min(1.88vw, 3.33vh)",
            textShadow: "0 2px 24px rgba(0,0,0,0.35)",
          }}
        >
          {t("hero", "tagline", "Your light to living in Portugal")}
        </motion.p>
      </div>

      {/* CTA cluster — lower-right, stacked, with a vertical gold hairline */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.4 }}
        className="absolute z-[5] flex items-stretch"
        style={{
          right: "clamp(24px, 7vw, 96px)",
          bottom: "clamp(80px, 15vh, 128px)",
          gap: "22px",
        }}
      >
        <div className="flex flex-col items-end justify-end" style={{ gap: "14px" }}>
          <a
            href="/#questionnaire"
            onClick={handleGuideClick}
            className="inline-flex items-center text-[11px] tracking-[0.3em] uppercase font-medium transition-all duration-300"
            style={{
              background: "linear-gradient(120deg, #f1c454 0%, #e89446 100%)",
              color: "#2a1d10",
              borderRadius: "4px",
              padding: "16px 32px",
              lineHeight: 1,
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
          <Link
            to="/properties"
            className="inline-flex items-center gap-2.5 text-[11px] tracking-[0.3em] uppercase font-medium transition-all duration-300"
            style={{
              color: "#fbf4e6",
              padding: "14px 2px",
              lineHeight: 1,
              borderBottom: "1px solid rgba(255,243,220,0.7)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderBottomColor = "rgba(255,243,220,1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderBottomColor = "rgba(255,243,220,0.7)";
            }}
          >
            <span>{t("hero", "cta_explore_homes", "Explore Homes")}</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
        {/* vertical gold hairline to the right of the buttons */}
        <div style={{ width: "1px", background: "#e9a92e" }} />
      </motion.div>

      {/* Scroll indicator — centered just above the (now shorter) wave */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5 }}
        className="absolute left-1/2 -translate-x-1/2 z-[6] flex flex-col items-center gap-2"
        style={{ bottom: "110px" }}
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
