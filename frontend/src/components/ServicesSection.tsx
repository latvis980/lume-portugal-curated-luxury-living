// frontend/src/components/ServicesSection.tsx
//
// Homepage "A LUME Ecosystem" section.
// Vertical numbered rail (left) + content panel (right), with a single
// gold hairline underline that slides between active tab labels using
// Framer Motion's shared layoutId animation.
//
// Categories are sourced from the Postgres `service_category` enum:
//   settling_in | health | education | lifestyle | environment | leisure | signature
//
// On screens narrower than `lg`, the rail collapses into a horizontally
// scrollable strip above the panel.

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import { fetchPublicServices, type PublicService } from "@/lib/public-api";

interface CategoryDef {
  key: string;
  numeral: string;
  defaultLabel: string;
}

const CATEGORIES: readonly CategoryDef[] = [
  { key: "settling_in",  numeral: "01", defaultLabel: "Settling In"  },
  { key: "health",       numeral: "02", defaultLabel: "Health"       },
  { key: "education",    numeral: "03", defaultLabel: "Education"    },
  { key: "lifestyle",    numeral: "04", defaultLabel: "Lifestyle"    },
  { key: "environment",  numeral: "05", defaultLabel: "Environment" },
  { key: "leisure",      numeral: "06", defaultLabel: "Leisure"      },
  { key: "signature",    numeral: "07", defaultLabel: "Signature"    },
] as const;

const ServicesSection = () => {
  const { locale, t } = useI18n();
  const prefersReduced = useReducedMotion();
  const [active, setActive] = useState(0);

  const { data: services = [] } = useQuery<PublicService[]>({
    queryKey: ["public-services", locale],
    queryFn: () => fetchPublicServices(locale),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const tabs = useMemo(
    () =>
      CATEGORIES.map((cat) => ({
        ...cat,
        label: t("services", `category.${cat.key}`, cat.defaultLabel),
        items: services
          .filter((s) => s.category === cat.key)
          .sort((a, b) => a.sort_order - b.sort_order),
      })),
    [services, t]
  );

  const activeCat = tabs[active];
  const showLead = activeCat.key === "signature";

  // Easing curve used everywhere in the section for a consistent feel.
  const ease = [0.22, 0.61, 0.36, 1] as const;

  return (
    <section id="services" className="section-padding bg-sand">
      <div className="max-w-7xl mx-auto">
        {/* ─── Header ──────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7, ease }}
          className="text-center mb-16 md:mb-20"
        >
          <p className="text-sm tracking-[0.3em] uppercase text-primary mb-4">
            {t("services", "eyebrow", "A LUME Ecosystem")}
          </p>
          <h2 className="font-display text-[2.15rem] md:text-[3.45rem] font-light text-foreground">
            {t("services", "heading", "Everything you need, curated")}
          </h2>
          <div className="w-10 h-px bg-primary mx-auto mt-6" />
        </motion.div>

        {/* ─── Layout: rail + panel ────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-y-10 lg:gap-x-16 items-start">
          {/* TAB RAIL
             Desktop: vertical column on the left
             Mobile:  horizontal scroll-snap strip above the panel */}
          <nav
            role="tablist"
            aria-label={t("services", "heading", "Services")}
            className="
              flex lg:flex-col gap-x-7 gap-y-0
              overflow-x-auto lg:overflow-visible
              -mx-6 lg:mx-0 px-6 lg:px-0 pb-2 lg:pb-0
              snap-x snap-mandatory lg:snap-none
              [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
            "
          >
            {tabs.map((tab, i) => {
              const isActive = i === active;
              return (
                <button
                  key={tab.key}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`services-panel-${tab.key}`}
                  onClick={() => setActive(i)}
                  className="
                    group flex items-baseline gap-3 lg:gap-4
                    py-2.5 whitespace-nowrap snap-start
                    bg-transparent border-0 cursor-pointer
                    focus:outline-none
                    focus-visible:outline-none
                    focus-visible:ring-1 focus-visible:ring-primary/50
                    focus-visible:ring-offset-4 focus-visible:ring-offset-card
                    rounded-sm
                  "
                >
                  <span
                    className="font-display italic text-base lg:text-[17px] text-primary leading-none"
                    style={{ minWidth: 18 }}
                  >
                    {tab.numeral}
                  </span>
                  <span
                    className={[
                      "relative text-[13px] tracking-[0.22em] uppercase font-medium",
                      "transition-colors duration-300 leading-none",
                      isActive
                        ? "text-foreground"
                        : "text-foreground/60 group-hover:text-foreground",
                    ].join(" ")}
                  >
                    {tab.label}
                    {isActive && (
                      <motion.span
                        layoutId="lume-services-tab-underline"
                        className="absolute left-0 right-0 -bottom-1.5 h-[1.5px] bg-primary"
                        transition={
                          prefersReduced
                            ? { duration: 0 }
                            : { type: "spring", stiffness: 380, damping: 38 }
                        }
                      />
                    )}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* PANEL — crossfades on tab switch */}
          <div className="min-h-[360px] lg:min-h-[420px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeCat.key}
                id={`services-panel-${activeCat.key}`}
                role="tabpanel"
                initial={{ opacity: 0, x: prefersReduced ? 0 : 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: prefersReduced ? 0 : -8 }}
                transition={{ duration: 0.4, ease }}
              >
                {showLead && (
                  <p className="font-display italic text-[1.3rem] md:text-[1.44rem] font-light text-foreground/65 max-w-md mb-10 leading-snug">
                    <span className="not-italic font-normal text-foreground">
                      {t(
                        "services",
                        "signature.lead.bold",
                        "Collecting, with LUME."
                      )}
                    </span>{" "}
                    {t(
                      "services",
                      "signature.lead.tail",
                      "Objects that shape space and quietly define how you live."
                    )}
                  </p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-10">
                  {activeCat.items.map((item, idx) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: prefersReduced ? 0 : 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        duration: 0.45,
                        delay: prefersReduced ? 0 : idx * 0.045,
                        ease,
                      }}
                      className="group"
                    >
                      <h3 className="font-display text-[1.3rem] md:text-[1.44rem] font-normal text-foreground mb-2.5">
                        {item.title}
                      </h3>
                      <div className="w-[18px] h-px bg-primary/55 mb-3 transition-[width] duration-500 group-hover:w-9" />
                      {item.description && (
                        <p className="text-[15px] md:text-base leading-relaxed text-foreground/65">
                          {item.description}
                        </p>
                      )}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
