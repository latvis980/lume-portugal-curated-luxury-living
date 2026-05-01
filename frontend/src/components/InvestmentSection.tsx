import type { ReactNode } from "react";
import { useT } from "@/lib/i18n";

const ACCENT = "#fabe1e";
const QUOTE_RULE = "rgba(250, 190, 30, 0.15)";
const MARK_UNDERLINE = "rgba(250, 190, 30, 0.4)";

const NumberedBlock = ({
  number,
  heading,
  children,
}: {
  number: string;
  heading: string;
  children: ReactNode;
}) => (
  <div className="grid grid-cols-1 md:grid-cols-[56px_1fr] md:gap-x-7">
    <div
      className="font-display leading-none mb-3 md:mb-0"
      style={{
        color: ACCENT,
        fontWeight: 300,
        fontSize: "clamp(34px, 4.8vw, 43px)",
      }}
    >
      {number}
    </div>
    <div>
      <h3
        className="font-display text-white"
        style={{
          fontSize: "clamp(20px, 2.4vw, 22px)",
          fontWeight: 400,
          lineHeight: 1.3,
          marginBottom: "18px",
        }}
      >
        {heading}
      </h3>
      <div className="font-body" style={{ fontSize: "18px", lineHeight: 1.75, color: "#c8c2b6" }}>
        {children}
      </div>
    </div>
  </div>
);

const Paragraph = ({ children }: { children: ReactNode }) => (
  <p style={{ marginBottom: "10px" }}>{children}</p>
);

const InvestmentSection = () => {
  const t = useT();

  const bullets = [
    t("investment", "block3.bullet1", "Long-term value"),
    t("investment", "block3.bullet2", "Strong locations"),
    t("investment", "block3.bullet3", "Architectural integrity"),
    t("investment", "block3.bullet4", "Projects that shape their surroundings"),
  ];

  return (
    <section
      id="investment"
      aria-labelledby="investment-heading"
      style={{ backgroundColor: "#0f0f0f" }}
    >
      <div
        className="mx-auto investment-container"
        style={{
          maxWidth: "620px",
          paddingTop: "clamp(48px, 8vw, 72px)",
          paddingBottom: "clamp(48px, 8vw, 72px)",
          paddingLeft: "clamp(24px, 5vw, 56px)",
          paddingRight: "clamp(24px, 5vw, 56px)",
        }}
      >
        {/* A. Eyebrow + Heading */}
        <div className="flex flex-col items-center text-center" style={{ marginBottom: "64px" }}>
          <div
            className="font-body"
            style={{
              fontSize: "12px",
              letterSpacing: "3px",
              textTransform: "uppercase",
              color: ACCENT,
              marginBottom: "16px",
            }}
          >
            {t("investment", "eyebrow", "Quiet Opportunities")}
          </div>
          <h2
            id="investment-heading"
            className="font-display text-white"
            style={{
              fontSize: "clamp(1.9rem, 4vw, 3rem)",
              fontWeight: 300,
              lineHeight: 1.25,
              margin: 0,
            }}
          >
            {t("investment", "heading", "Investing in real estate in Portugal")}
          </h2>
          <div style={{ width: "40px", height: "1px", backgroundColor: ACCENT, marginTop: "24px" }} />
        </div>

        {/* B. Numbered sections */}
        <div className="flex flex-col" style={{ rowGap: "56px" }}>
          <NumberedBlock number="01" heading={t("investment", "block1.heading", "Not all decisions are immediate")}>
            <Paragraph>{t("investment", "block1.p1", "Some people come to Portugal not only to live, but to build something over time.")}</Paragraph>
            <Paragraph>{t("investment", "block1.p2", "Some choices are made slowly — not from urgency, but from clarity.")}</Paragraph>
            <Paragraph>{t("investment", "block1.p3", "In Portugal, this often means looking beyond the present, toward what will unfold over time.")}</Paragraph>
          </NumberedBlock>

          <NumberedBlock number="02" heading={t("investment", "block2.heading", "Working with Mark")}>
            <Paragraph>
              {t("investment", "block2.p1.before_link", "Through our partnership with ")}
              <a
                href="https://onemark.pt"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: ACCENT,
                  textDecoration: "none",
                  borderBottom: `1px solid ${MARK_UNDERLINE}`,
                  paddingBottom: "1px",
                }}
              >
                {t("investment", "block2.link_label", "Mark")}
              </a>
              {t("investment", "block2.p1.after_link", ", we offer access to a limited number of carefully selected opportunities — some are visible, others are not.")}
            </Paragraph>
            <Paragraph>{t("investment", "block2.p2", "We don't present everything, but only what is worth considering.")}</Paragraph>
          </NumberedBlock>

          <NumberedBlock number="03" heading={t("investment", "block3.heading", "What we look for")}>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {bullets.map((value, idx, arr) => (
                <li
                  key={value}
                  className="flex items-center"
                  style={{ marginBottom: idx === arr.length - 1 ? 0 : "12px" }}
                >
                  <span
                    style={{
                      width: "18px",
                      height: "1px",
                      backgroundColor: ACCENT,
                      marginRight: "14px",
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: "18px", lineHeight: 1.7, color: "#e8e4dc" }}>
                    {value}
                  </span>
                </li>
              ))}
            </ul>
          </NumberedBlock>
        </div>

        {/* C. Italic quote */}
        <div
          style={{
            marginTop: "56px",
            marginBottom: "56px",
            borderTop: `1px solid ${QUOTE_RULE}`,
            borderBottom: `1px solid ${QUOTE_RULE}`,
            paddingTop: "40px",
            paddingBottom: "40px",
          }}
        >
          <p
            className="font-display text-center"
            style={{
              fontStyle: "italic",
              fontSize: "20px",
              color: "#d8d2c4",
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            {t("investment", "quote.line1", "Some opportunities never appear publicly.")}
            <br />
            {t("investment", "quote.line2", "They move quietly, between people who know where to look.")}
          </p>
        </div>

        {/* D. Closing CTA */}
        <div className="flex flex-col items-center text-center">
          <h3
            className="font-display text-white"
            style={{
              fontSize: "clamp(23px, 3vw, 26px)",
              fontWeight: 400,
              lineHeight: 1.4,
              margin: 0,
            }}
          >
            {t("investment", "cta.heading", "For those who think beyond the immediate")}
          </h3>

          <div
            className="font-body"
            style={{
              marginTop: "18px",
              maxWidth: "460px",
              fontSize: "17px",
              lineHeight: 1.75,
              color: "#a8a29a",
            }}
          >
            <p style={{ margin: 0 }}>{t("investment", "cta.body.line1", "This is not for everyone — and it is not meant to be.")}</p>
            <p style={{ margin: 0 }}>{t("investment", "cta.body.line2", "If this resonates, we will take the conversation further.")}</p>
          </div>

          <a
            href="https://onemark.pt"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("investment", "cta.button_aria", "Continue with Mark on the OneMark website")}
            className="font-body investment-cta-button"
            style={{
              marginTop: "36px",
              display: "inline-block",
              backgroundColor: ACCENT,
              color: "#0f0f0f",
              padding: "14px 36px",
              fontSize: "16px",
              fontWeight: 500,
              letterSpacing: "2px",
              textTransform: "uppercase",
              borderRadius: "2px",
              textDecoration: "none",
              transition: "background 0.2s ease",
            }}
          >
            {t("investment", "cta.button", "Continue with Mark →")}
          </a>

          <div
            className="font-body"
            style={{
              marginTop: "18px",
              fontSize: "11px",
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              color: "#6b6660",
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
          background: #ffd147 !important;
        }
        @media (min-width: 768px) {
          .investment-container {
            max-width: 1085px !important;
          }
        }
      `}</style>
    </section>
  );
};

export default InvestmentSection;
