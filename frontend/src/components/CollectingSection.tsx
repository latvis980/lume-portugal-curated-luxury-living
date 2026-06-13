// frontend/src/components/CollectingSection.tsx
//
// "Lume Signature Services" block — the editorial collecting pitch that
// sits between Services and Investment. Two-column on desktop: a media
// gallery (photos + looped clips, managed in Admin → Collecting) on the
// left with a decorative honey frame, copy on the right. While media
// loads (or if no gallery items exist) it shows a neutral placeholder
// rather than a static photo, so nothing flashes before the gallery mounts.

import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useI18n, useT } from "@/lib/i18n";
import { fetchCollectingMedia } from "@/lib/public-api";
import CollectingGallery from "./CollectingGallery";

const CollectingSection = () => {
  const t = useT();
  const { locale } = useI18n();

  const { data: items = [] } = useQuery({
    queryKey: ["collecting-media", locale],
    queryFn: () => fetchCollectingMedia(locale),
    staleTime: 5 * 60 * 1000,
  });

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
      style={{ background: "hsl(var(--sand))" }}
    >
      <div className="max-w-[1180px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-center">
        {/* Media gallery (or the original single photo until items exist) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          {items.length > 0 ? (
            <CollectingGallery items={items} />
          ) : (
            // Neutral placeholder that reserves the gallery's footprint while
            // media loads — no static image, so nothing flashes before the
            // gallery mounts.
            <div
              className="relative aspect-[4/5] overflow-hidden"
              style={{ background: "#241608" }}
            />
          )}
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
