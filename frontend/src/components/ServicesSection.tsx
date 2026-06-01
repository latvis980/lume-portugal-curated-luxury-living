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
  { key: "signature",    numeral: "07", defaultLabel: "Signature services"    },
] as const;

// Editorial fallback — used only when the backend hasn't returned any rows
// (e.g. preview environments without the services table seeded). Mirrors the
// seed copy from supabase/migrations.
interface FallbackItem { title: string; description: string }
const FALLBACK_ITEMS: Record<string, FallbackItem[]> = {
  settling_in: [
    { title: "Legal & Documentation", description: "Guidance and coordination of legal support for property purchases, residency and contract review — handled seamlessly." },
    { title: "Tax & Financial Setup", description: "Support in navigating the Portuguese tax system, including NHR, with precise guidance to organise your financial position." },
    { title: "Banking & Payments",    description: "Seamless coordination of bank account setup for non-residents, including international transfers and everyday banking." },
    { title: "Residency & Visas",     description: "End-to-end guidance and coordination of visa and residency applications — Golden Visa, D7 and Digital Nomad pathways." },
    { title: "NIF & Documentation",   description: "Fast and seamless support with NIF registration and all essential documentation required for settling in Portugal." },
    { title: "Pet Relocation & Care", description: "Careful coordination of pet relocation, including transport, documentation and veterinary requirements — ensuring a smooth transition." },
  ],
  health: [
    { title: "Doctors & Specialists",  description: "Curated introductions to trusted English-speaking GPs, dentists and specialists across Lisbon, the Algarve and beyond." },
    { title: "Private Insurance",      description: "Help comparing and arranging private health insurance plans tailored to your residency status and family needs." },
    { title: "Wellness & Recovery",    description: "Access to integrative wellness centres, physiotherapy, longevity clinics and holistic recovery programmes." },
    { title: "Pharmacies & Pediatrics", description: "Practical introductions to neighbourhood pharmacies and pediatric care so daily life is taken care of." },
  ],
  education: [
    { title: "International Schools", description: "Personal guidance through Lisbon and Cascais' international and bilingual schools — visits, applications, waitlist strategy." },
    { title: "Tutors & Language",     description: "Private Portuguese, English and exam-prep tutors matched to your child's age, level and learning style." },
    { title: "Early Years & Nursery", description: "Recommendations for trusted nurseries and Montessori settings, including bilingual options." },
    { title: "Higher Education",      description: "Orientation toward Portugal's leading universities and pathways for international students and families." },
  ],
  lifestyle: [
    { title: "Interior Design",   description: "Trusted architects and interior designers for renovations, furnishing and signature commissions." },
    { title: "Household Staff",   description: "Curated introductions to housekeepers, chefs, nannies and estate managers — discreet and reference-checked." },
    { title: "Personal Concierge", description: "Day-to-day help with bookings, deliveries, courier coordination and the small logistics of a new life." },
    { title: "Membership & Clubs", description: "Introductions to private clubs, beach concessions and members-only spaces across Portugal." },
  ],
  environment: [
    { title: "Sustainable Living",  description: "Eco-architects, solar specialists and water-management partners for low-impact homes." },
    { title: "Gardens & Land",      description: "Garden designers, agronomists and arborists to shape land — from olive groves to coastal courtyards." },
    { title: "Energy & Utilities",  description: "Practical setup of energy contracts, fibre internet and home automation — without the runaround." },
  ],
  leisure: [
    { title: "Yachting & Charters",   description: "Private charters along the Algarve, Comporta and Cascais coastlines — day trips and longer voyages." },
    { title: "Golf & Tennis",         description: "Tee-time access at Portugal's best clubs and introductions to coaches for family and competitive play." },
    { title: "Restaurants & Wine",    description: "Reservations at the most considered tables, plus wine country itineraries in the Douro and Alentejo." },
    { title: "Cultural Calendar",     description: "Tickets, openings and curated weekends shaped around art, music and the Portuguese cultural year." },
  ],
  signature: [
    { title: "Sourcing & Acquisition", description: "Antiques, glassware and ceramics from trusted ateliers — sourced privately on request." },
    { title: "Bespoke Commissions",    description: "Interior commissions with Portuguese craftsmen, from cabinetry to ceramics and lighting." },
    { title: "Editorial Curation",     description: "Long-form sourcing for collectors who treat a home as a slow, ongoing project." },
    { title: "Discreet Acquisition",   description: "Quiet representation for art and design pieces moving between private hands." },
  ],
};

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
                  {(activeCat.items.length > 0
                    ? activeCat.items.map((item) => ({
                        id: item.id,
                        title: item.title,
                        description: item.description ?? "",
                      }))
                    : (FALLBACK_ITEMS[activeCat.key] ?? []).map((item, i) => ({
                        id: `${activeCat.key}-fallback-${i}`,
                        title: item.title,
                        description: item.description,
                      }))
                  ).map((item, idx) => (
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
                      <div className="w-[18px] h-px bg-primary/70 mb-3 transition-[width] duration-500 group-hover:w-9" />
                      {item.description && (
                        <p className="text-[15px] md:text-base leading-relaxed text-foreground/70">
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
