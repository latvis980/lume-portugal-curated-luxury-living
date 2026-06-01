// frontend/src/components/InvestmentSection.tsx
//
// "Investing in real estate in Portugal" — the editorial pitch for working
// with Mark. Sunny-redesign layout (matches the mockup):
//   1. Eyebrow + heading + honey hairline
//   2. Three project image cards in a row, each with a Roman-numeral label
//   3. Three numbered pillars (01 / 02 / 03) with bullet list on the third
//   4. Honey hairline divider
//   5. Word-by-word animated quote with shimmer on the first words
//   6. Closing CTA → onemark.pt

import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";

const BG = "#2a1d10";
const HONEY = "#f1c454";
const TEXT = "#f7ecd2";
const TEXT_SOFT = "rgba(237, 226, 200, 0.78)";
const TEXT_MUTED = "rgba(237, 226, 200, 0.5)";
const HAIRLINE = "rgba(241, 196, 84, 0.25)";
const MARK_UNDERLINE = "rgba(241, 196, 84, 0.45)";

const PROJECTS = [
  {
    src: "/project-1.jpg",
    numeral: "I",
    captionKey: "project1.caption",
    captionDefault: "Silver Coast · Residential",
  },
  {
    src: "/project-2.jpg",
    numeral: "II",
    captionKey: "project2.caption",
    captionDefault: "Comporta · Villas",
  },
  {
    src: "/project-3.jpg",
    numeral: "III",
    captionKey: "project3.caption",
    captionDefault: "Alentejo · Estate",
  },
];

const InvestmentSection = () => {
  const t = useT();

  const bullets = [
    t("investment", "block3.bullet1", "Long-term value"),
    t("investment", "block3.bullet2", "Strong locations"),
    t("investment", "block3.bullet3", "Architectural integrity"),
    t("investment", "block3.bullet4", "Projects that shape their surroundings"),
  ];

  // Word-by-word reveal for the quote (mirrors the mockup's "in-view" hook).
  const quoteRef = useRef<HTMLDivElement>(null);
  const [quoteIn, setQuoteIn] = useState(false);
  useEffect(() => {
    const el = quoteRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setQuoteIn(true);
      },
      { threshold: 0.4 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const quoteLine1 = t(
    "investment",
    "quote.line1",
    "Some opportunities never appear publicly.",
  );
  const quoteLine2 = t(
    "investment",
    "quote.line2",
    "They move quietly, between people who know where to look.",
  );
  const quoteWords = `${quoteLine1} ${quoteLine2}`.split(" ");

  return (
    <section
      id="investment"
      aria-labelledby="investment-heading"
      className="relative overflow-hidden section-padding"
      style={{ backgroundColor: BG, color: TEXT }}
    >
      {/* Soft sun glow centered at the top of the section */}
      <div
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "1100px",
          height: "1100px",
          background:
            "radial-gradient(circle, rgba(241,196,84,0.10) 0%, rgba(241,196,84,0) 60%)",
        }}
      />

      <div className="relative max-w-[1200px] mx-auto">
        {/* Head */}
        <div className="text-center mb-16 md:mb-20">
          <p
            className="font-body"
            style={{
              fontSize: "11px",
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              color: HONEY,
              fontWeight: 500,
            }}
          >
            {t("investment", "eyebrow", "Quiet opportunities")}
          </p>
          <h2
            id="investment-heading"
            className="font-display font-light"
            style={{
              fontSize: "clamp(40px, 5.5vw, 64px)",
              lineHeight: 1.15,
              marginTop: "14px",
              color: TEXT,
            }}
          >
            {t("investment", "heading", "Investing in real estate in Portugal")}
          </h2>
          <div
            className="mx-auto"
            style={{ width: "56px", height: "1px", background: HONEY, marginTop: "22px" }}
          />
        </div>

        {/* Three project images */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 mb-16 md:mb-20">
          {PROJECTS.map((p) => (
            <a
              key={p.src}
              href="/properties"
              className="group relative overflow-hidden block"
              style={{ aspectRatio: "4 / 3", background: "#1a120c", borderRadius: "2px" }}
            >
              <img
                src={p.src}
                alt=""
                className="absolute inset-0 w-full h-full object-cover transition-[transform,filter] duration-[1400ms] ease-out group-hover:scale-105"
                style={{ filter: "saturate(0.85) brightness(0.78)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.filter = "saturate(1) brightness(0.92)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.filter = "saturate(0.85) brightness(0.78)";
                }}
              />
              <div
                className="absolute left-6 right-6 bottom-5 flex items-baseline gap-4 pointer-events-none"
                style={{ color: TEXT }}
              >
                <span
                  className="font-display italic"
                  style={{
                    fontSize: "13px",
                    letterSpacing: "0.3em",
                    color: HONEY,
                    opacity: 0.85,
                  }}
                >
                  {p.numeral}
                </span>
                <span
                  style={{
                    fontSize: "11px",
                    letterSpacing: "0.28em",
                    textTransform: "uppercase",
                    opacity: 0.9,
                  }}
                >
                  {t("investment", p.captionKey, p.captionDefault)}
                </span>
              </div>
            </a>
          ))}
        </div>

        {/* Three numbered pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-14">
          <div>
            <p
              className="font-display italic"
              style={{ fontSize: "14px", letterSpacing: "0.3em", color: HONEY, opacity: 0.85 }}
            >
              01
            </p>
            <h3
              className="font-display"
              style={{ fontSize: "28px", lineHeight: 1.2, color: TEXT, margin: "18px 0" }}
            >
              {t("investment", "block1.heading", "Not all decisions are immediate")}
            </h3>
            <p style={{ fontSize: "15px", lineHeight: 1.7, color: TEXT_SOFT, marginBottom: "12px" }}>
              {t(
                "investment",
                "block1.p1",
                "Some people come to Portugal not only to live, but to build something over time.",
              )}
            </p>
            <p style={{ fontSize: "15px", lineHeight: 1.7, color: TEXT_SOFT, marginBottom: "12px" }}>
              {t(
                "investment",
                "block1.p2",
                "Some choices are made slowly — not from urgency, but from clarity.",
              )}
            </p>
            <p style={{ fontSize: "15px", lineHeight: 1.7, color: TEXT_SOFT }}>
              {t(
                "investment",
                "block1.p3",
                "In Portugal, this often means looking beyond the present, toward what will unfold over time.",
              )}
            </p>
          </div>

          <div>
            <p
              className="font-display italic"
              style={{ fontSize: "14px", letterSpacing: "0.3em", color: HONEY, opacity: 0.85 }}
            >
              02
            </p>
            <h3
              className="font-display"
              style={{ fontSize: "28px", lineHeight: 1.2, color: TEXT, margin: "18px 0" }}
            >
              {t("investment", "block2.heading", "Working with Mark")}
            </h3>
            <p style={{ fontSize: "15px", lineHeight: 1.7, color: TEXT_SOFT, marginBottom: "12px" }}>
              {t(
                "investment",
                "block2.p1.before_link",
                "Through our partnership with ",
              )}
              <a
                href="https://onemark.pt"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: HONEY,
                  textDecoration: "none",
                  borderBottom: `1px solid ${MARK_UNDERLINE}`,
                  paddingBottom: "1px",
                }}
              >
                <strong style={{ fontWeight: 600 }}>
                  {t("investment", "block2.link_label", "Mark")}
                </strong>
              </a>
              {t(
                "investment",
                "block2.p1.after_link",
                ", we offer access to a limited number of carefully selected opportunities — some visible, others not.",
              )}
            </p>
            <p style={{ fontSize: "15px", lineHeight: 1.7, color: TEXT_SOFT }}>
              {t(
                "investment",
                "block2.p2",
                "We don't present everything — only what is worth considering.",
              )}
            </p>
          </div>

          <div>
            <p
              className="font-display italic"
              style={{ fontSize: "14px", letterSpacing: "0.3em", color: HONEY, opacity: 0.85 }}
            >
              03
            </p>
            <h3
              className="font-display"
              style={{ fontSize: "28px", lineHeight: 1.2, color: TEXT, margin: "18px 0" }}
            >
              {t("investment", "block3.heading", "What we look for")}
            </h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {bullets.map((value) => (
                <li
                  key={value}
                  className="flex items-baseline gap-3"
                  style={{ fontSize: "15px", lineHeight: 1.9, color: TEXT_SOFT }}
                >
                  <span aria-hidden style={{ color: HONEY }}>—</span>
                  <span>{value}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Hairline divider */}
        <div
          aria-hidden
          className="my-16 md:my-20 mx-auto"
          style={{
            height: "1px",
            maxWidth: "880px",
            background: `linear-gradient(90deg, transparent, ${HAIRLINE}, transparent)`,
          }}
        />

        {/* Word-by-word animated quote */}
        <div ref={quoteRef} className="max-w-[720px] mx-auto text-center">
          <p
            className="font-display"
            style={{
              fontStyle: "italic",
              fontSize: "clamp(20px, 2.4vw, 28px)",
              lineHeight: 1.5,
              color: TEXT,
            }}
          >
            {quoteWords.map((w, i) => {
              const shimmer = i < 3;
              return (
                <span
                  key={i}
                  className="inline-block"
                  style={{
                    opacity: quoteIn ? 1 : 0,
                    transform: quoteIn ? "translateY(0)" : "translateY(14px)",
                    transition: "opacity 0.8s ease, transform 0.8s ease",
                    transitionDelay: `${i * 70}ms`,
                  }}
                >
                  {shimmer ? <span className="inv-shimmer">{w}&nbsp;</span> : <>{w}&nbsp;</>}
                </span>
              );
            })}
          </p>
        </div>

        {/* Closing CTA */}
        <div className="mt-16 md:mt-20 text-center max-w-[600px] mx-auto">
          <h3
            className="font-display"
            style={{ fontSize: "clamp(24px, 3vw, 32px)", color: TEXT, marginBottom: "14px" }}
          >
            {t("investment", "cta.heading", "For those who think beyond the immediate")}
          </h3>
          <p style={{ color: TEXT_MUTED, fontSize: "14px", lineHeight: 1.7 }}>
            {t(
              "investment",
              "cta.body.line1",
              "This is not for everyone — and it is not meant to be.",
            )}
            <br />
            {t(
              "investment",
              "cta.body.line2",
              "If this resonates, we will take the conversation further.",
            )}
          </p>
          <a
            href="https://onemark.pt"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t(
              "investment",
              "cta.button_aria",
              "Continue with Mark on the OneMark website",
            )}
            className="inline-block mt-8 font-body investment-cta-button"
            style={{
              background: `linear-gradient(120deg, ${HONEY}, #e89446)`,
              color: BG,
              padding: "16px 36px",
              fontSize: "11px",
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              fontWeight: 600,
              borderRadius: "2px",
              textDecoration: "none",
              boxShadow: "0 12px 40px -12px rgba(241,196,84,0.5)",
              transition: "transform 0.3s ease, box-shadow 0.3s ease",
            }}
          >
            {t("investment", "cta.button", "Continue with Mark →")}
          </a>
          <div
            className="font-body"
            style={{
              marginTop: "18px",
              fontSize: "10px",
              letterSpacing: "0.4em",
              textTransform: "uppercase",
              color: TEXT_MUTED,
            }}
          >
            <a
              href="https://onemark.pt"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "inherit", textDecoration: "none" }}
            >
              {t("investment", "cta.url_label", "onemark.pt")}
            </a>
          </div>
        </div>
      </div>

      <style>{`
        .investment-cta-button:hover,
        .investment-cta-button:focus-visible {
          transform: translateY(-1px);
          box-shadow: 0 18px 48px -12px rgba(241,196,84,0.7);
        }
        .inv-shimmer {
          background: linear-gradient(90deg, #d9c899 0%, #f1c454 25%, #fff5d9 35%, #f1c454 45%, #d9c899 70%, #d9c899 100%);
          background-size: 250% 100%;
          -webkit-background-clip: text;
                  background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: inv-shimmer 8s ease-in-out infinite;
        }
        @keyframes inv-shimmer {
          0%   { background-position: 200% center; }
          100% { background-position: -100% center; }
        }
      `}</style>
    </section>
  );
};

export default InvestmentSection;
