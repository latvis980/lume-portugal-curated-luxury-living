import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import SunWave from "@/components/SunWave";

// Two encodes of the hero footage: the full desktop video and a lighter
// portrait-friendly crop for phones. The mobile file is added later — until it
// exists (or if it ever fails to load) we fall back to the desktop video so the
// hero is never blank.
//
// The browser walks the <source> list and uses the FIRST it can play — it does
// NOT pick the smallest — so order is our codec preference. We choose a
// different preference per variant because the bottleneck differs:
//
//   • Desktop → H.264 MP4 first. Many desktop GPUs (older Intel iGPUs, most
//     pre-2019 NVIDIA/AMD, Safari on macOS) have NO hardware VP9 decoder, so a
//     1080p VP9/WebM is decoded in software on the CPU and stutters — most
//     visibly as a hitch on every keyframe (~1/sec). H.264 is hardware-decoded
//     on virtually every desktop, so it plays smoothly. The extra few MB is a
//     non-issue on wifi (the file is fully buffered within a couple of seconds
//     and then just loops). WebM stays as a second source only as a fallback.
//
//   • Mobile → VP9 WebM first. Phone SoCs almost universally ship a hardware
//     VP9 decoder, so WebM plays smoothly AND is ~40% smaller, which matters on
//     cellular. H.264 MP4 second covers iOS, which prefers it.
//
// Codec order is expressed by listing the preferred type first in `order`.
// The poster paints instantly while the video streams in behind it.
// The hero footage streams from a public Supabase Storage bucket, which is
// CDN-backed and supports HTTP Range requests — so it loads from an edge node
// near the visitor and streams/seeks smoothly, instead of being pulled from the
// single-region app origin (which stuttered on mobile networks). Posters stay
// local: they're tiny and should paint instantly with the rest of the page.
// Override the base at build time with VITE_HERO_MEDIA_BASE if the project or
// bucket ever changes.
const HERO_MEDIA_BASE =
  import.meta.env.VITE_HERO_MEDIA_BASE ||
  "https://ryizbwtscuczqusoeuvc.supabase.co/storage/v1/object/public/hero-videos";

const HERO_SOURCES = {
  desktop: {
    mp4: `${HERO_MEDIA_BASE}/hero-desktop.mp4`,
    webm: `${HERO_MEDIA_BASE}/hero-desktop.webm`,
    poster: "/hero-desktop-poster.jpg",
    order: ["mp4", "webm"],
  },
  mobile: {
    mp4: `${HERO_MEDIA_BASE}/hero-mobile.mp4`,
    webm: `${HERO_MEDIA_BASE}/hero-mobile.webm`,
    poster: "/hero-mobile-poster.jpg",
    order: ["webm", "mp4"],
  },
} as const;

const SOURCE_TYPE = { mp4: "video/mp4", webm: "video/webm" } as const;

type HeroVariant = keyof typeof HERO_SOURCES;

const HeroSection = () => {
  const { t, locale } = useI18n();
  const location = useLocation();

  // The handwritten tagline switches script-appropriate display faces: Latin
  // locales (en, pt_pt, es) use "Oooh Baby", which has no Cyrillic glyphs, so
  // Russian falls back to "Caveat" — a script that covers Cyrillic — at its
  // regular weight (400).
  const taglineFont =
    locale === "ru" ? '"Caveat", cursive' : '"Oooh Baby", cursive';
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);

  // Choose the variant up front (lazy initial state) so phones load the mobile
  // video directly instead of fetching the desktop one first and swapping.
  const [variant, setVariant] = useState<HeroVariant>(() =>
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 768px)").matches
      ? "mobile"
      : "desktop",
  );
  const sources = HERO_SOURCES[variant];

  // The video only errors once *every* <source> has failed. So if the mobile
  // encodes can't be loaded at all (not uploaded yet, network error), drop back
  // to the desktop variant so the hero is never blank.
  const handleVideoError = () => {
    if (variant !== "desktop") setVariant("desktop");
  };

  // iOS only autoplays a video that is genuinely muted + inline. React doesn't
  // always reflect the `muted` prop to the DOM property, so set it imperatively
  // and kick off playback once mounted (the promise rejects silently if the
  // browser still blocks it, e.g. Low Power Mode). Re-run when the source
  // changes so the fallback video also autoplays.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.load();
    v.play().catch(() => {});
  }, [variant]);

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
          ref={videoRef}
          key={variant}
          onError={handleVideoError}
          poster={sources.poster}
          autoPlay
          muted
          loop
          playsInline
          // For an autoplay background loop the footage is small (~1-4 MB) and
          // *always* plays, so "auto" is the right call: it lets the browser
          // buffer ahead of the playhead, which is what prevents stutter when a
          // mobile connection briefly drops packets. "metadata" keeps the buffer
          // razor-thin, so any network hiccup starves the decoder. The poster
          // still paints instantly while the first frames stream in.
          preload="auto"
          className="w-full h-full object-cover"
        >
          {/* Codec preference is per-variant (see HERO_SOURCES): desktop favours
              hardware-decoded H.264 to avoid VP9 software-decode stutter; mobile
              favours the smaller VP9 WebM. */}
          {sources.order.map((codec) => (
            <source key={codec} src={sources[codec]} type={SOURCE_TYPE[codec]} />
          ))}
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

      {/* Left block — logo · gold line · handwritten tagline. On mobile it sits
          in the upper half of the screen; from md up it is vertically centred.
          Aligned to the same left gutter as the navbar logo. */}
      <div
        className="absolute z-[5] flex flex-col items-start text-left text-warm-white top-[17%] translate-y-0 md:top-1/2 md:-translate-y-1/2"
        style={{
          left: "clamp(24px, 7vw, 96px)",
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
            fontFamily: taglineFont,
            color: "#fbf4e6",
            fontSize: "clamp(24px, min(2.97vw, 5.28vh), 52px)",
            fontWeight: 400,
            lineHeight: 1.32,
            maxWidth: "min(46vw, 82vh)",
            // The script faces' glyphs overshoot the text box; without right
            // padding the clip-path reveal shaves the last letter (e.g. the
            // "l" in Portugal).
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

      {/* Sunlit wave horizon at the bottom of the hero */}
      <SunWave />
    </section>
  );
};

export default HeroSection;
