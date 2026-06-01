// frontend/src/components/CollectingSection.tsx
//
// "Lume Signature Services" block — the editorial collecting pitch that
// sits between Services and Investment. Two-column on desktop: image on
// the left with a decorative honey frame, copy on the right.

import { motion } from "framer-motion";
import { useT } from "@/lib/i18n";

const CollectingSection = () => {
  const t = useT();

  const bullets = [
    t(
      "collecting",
      "bullet1",
      "Antiques, glassware and ceramics from trusted ateliers",
    ),
    t("collecting", "bullet2", "Interior commissions with Portuguese craftsmen"),
    t("collecting", "bullet3", "Vintage finds and editorial sourcing on request"),
    t("collecting", "bullet4", "Discreet acquisition for art and design pieces"),
  ];

  return (
    <section
      id="collecting"
      className="section-padding relative overflow-hidden"
      style={{ background: "hsl(var(--card))" }}
    >
      <div className="max-w-[1180px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-center">
        {/* Image with decorative honey frame in the lower-right */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative aspect-[4/5] overflow-hidden"
        >
          <div
            className="absolute inset-0 transition-transform duration-[1400ms] ease-out"
            style={{
              backgroundImage: "url(/collecting-glass.jpg)",
              backgroundSize: "cover",
              backgroundPosition: "center",
              transform: "scale(1.04)",
            }}
          />
          {/* Warm wash overlay */}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(140deg, rgba(241,196,84,0) 40%, rgba(231,148,70,0.18) 100%)",
              mixBlendMode: "multiply",
            }}
          />
          {/* Honey outline that peeks out the lower-right corner */}
          <div
            aria-hidden
            className="absolute pointer-events-none"
            style={{
              right: "-28px",
              bottom: "-28px",
              width: "180px",
              height: "180px",
              border: "1px solid #e9a92e",
              zIndex: 1,
            }}
          />
        </motion.div>

        {/* Editorial copy */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="py-6"
        >
          <p
            className="text-[11px] tracking-[0.32em] uppercase font-medium"
            style={{ color: "#b04e1a" }}
          >
            {t("collecting", "eyebrow", "Collecting with Lume")}
          </p>
          <h2
            className="font-display font-light mt-4 leading-[1.05]"
            style={{ fontSize: "clamp(36px, 4.6vw, 56px)", color: "hsl(var(--foreground))" }}
          >
            {t("collecting", "title_lead", "Lume")}{" "}
            <em className="italic font-light" style={{ color: "#b04e1a" }}>
              {t("collecting", "title_em", "Signature")}
            </em>
            <br />
            {t("collecting", "title_tail", "Services")}
          </h2>
          <div
            className="my-7"
            style={{ width: "56px", height: "1px", background: "#e9a92e" }}
          />
          <p
            className="font-body max-w-[460px]"
            style={{
              fontSize: "15px",
              lineHeight: 1.7,
              color: "hsl(var(--muted-foreground))",
            }}
          >
            {t(
              "collecting",
              "lead",
              "For those who treat a home as a long-term work in progress. Beyond the keys, we curate the people, objects and rituals that give a place its quiet character — sourced slowly, never publicly.",
            )}
          </p>

          <div className="mt-7 flex flex-col gap-3.5">
            {bullets.map((line) => (
              <div
                key={line}
                className="flex items-center gap-3.5 font-body"
                style={{ fontSize: "14px", color: "hsl(var(--muted-foreground))" }}
              >
                <span
                  aria-hidden
                  className="flex-shrink-0"
                  style={{
                    width: "6px",
                    height: "6px",
                    transform: "rotate(45deg)",
                    background: "#e9a92e",
                  }}
                />
                <span>{line}</span>
              </div>
            ))}
          </div>

          <a
            href="/#private-access"
            onClick={(e) => {
              e.preventDefault();
              document
                .querySelector("#private-access")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
            className="inline-flex items-center gap-2.5 mt-9 text-[11px] tracking-[0.3em] uppercase pb-1.5 transition-all duration-300 hover:gap-4"
            style={{
              color: "#b04e1a",
              borderBottom: "1px solid #e9a92e",
            }}
          >
            {t("collecting", "cta", "Enquire privately")}
            <span aria-hidden>→</span>
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default CollectingSection;
