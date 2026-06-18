import { Link } from "react-router-dom";
import { Phone, Facebook, Instagram, ChevronUp } from "lucide-react";
import { useT } from "@/lib/i18n";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const LIVRO_RECLAMACOES_URL = "https://www.livroreclamacoes.pt/Inicio/";

const Footer = () => {
  const t = useT();
  const year = new Date().getFullYear();

  // Curated location links. Each points at a dedicated, indexable region
  // landing page (/properties/<region-slug>) — see SectionPage.tsx. These
  // crawlable, descriptively-named links on every page are the primary driver
  // of Google sitelinks for the site.
  const locationLinks = [
    { key: "lisbon_cascais", fallback: "Lisbon & Cascais", to: "/properties/lisbon" },
    { key: "porto_douro", fallback: "Porto & Douro Valley", to: "/properties/porto" },
    { key: "alentejo", fallback: "Alentejo", to: "/properties/alentejo" },
    { key: "algarve", fallback: "Algarve", to: "/properties/algarve" },
    { key: "silver_coast", fallback: "Silver Coast", to: "/properties/silver-coast" },
  ];

  // Curated region × type landing pages.
  const typeLinks = [
    { key: "lisbon_apartments", fallback: "Apartments in Lisbon", to: "/properties/lisbon/apartments" },
    { key: "algarve_villas", fallback: "Villas in Algarve", to: "/properties/algarve/villas" },
    { key: "silver_coast_new", fallback: "New developments in Silver Coast", to: "/properties/silver-coast/new-developments" },
    { key: "lisbon_penthouses", fallback: "Penthouses in Lisbon", to: "/properties/lisbon/penthouses" },
    { key: "porto_apartments", fallback: "Apartments in Porto", to: "/properties/porto/apartments" },
  ];

  const legalLinks = [
    { key: "terms", fallback: "Legal Terms", to: "/legal/terms" },
    { key: "privacy", fallback: "Privacy Policy", to: "/privacy" },
    { key: "cookies", fallback: "Cookies Policy", to: "/legal/cookies" },
    { key: "disputes", fallback: "Resolução de litígios", to: "/legal/terms#applicable-law" },
  ];

  const linkClass =
    "text-[13px] leading-relaxed text-[rgba(237,226,200,0.7)] hover:text-[#edd9a8] transition-colors";
  const headingClass =
    "text-[15px] font-semibold tracking-wide text-[#edd9a8] mb-5";

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <footer
      className="relative px-6 md:px-12 lg:px-24 py-14 md:py-16"
      style={{ background: "#1a1108", color: "rgba(237,226,200,0.7)", zIndex: 35 }}
    >
      <div className="max-w-7xl mx-auto">
        {/* ── Top: brand/contact + link columns ──────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8">
          {/* Brand + registration + contact */}
          <div className="lg:col-span-2 flex flex-col items-center md:items-start text-center md:text-left gap-5">
            <img
              src="/logo-footer-symbol.png"
              alt={t("footer", "logo_alt", "LUME by Mark")}
              className="h-14 w-auto opacity-95"
            />

            <div className="flex flex-col gap-1">
              <p className="text-[13px] leading-relaxed font-semibold text-[#edd9a8]/90">
                {t("footer", "legal_name", "LUMEBYMARK SERVIÇOS E MEDIAÇÃO IMOBILIÁRIA, LDA")}
              </p>
              <p className="text-[13px] leading-relaxed">
                {t("footer", "legal_address_street", "Avenida da Liberdade, número 129, 7.º C")}
              </p>
              <p className="text-[13px] leading-relaxed">
                {t("footer", "legal_address_city", "1250-140 Lisboa")}
              </p>
              <p className="text-[13px] leading-relaxed">
                {t("footer", "legal_nif_label", "NIF")}: {t("footer", "legal_nif", "519352980")}
              </p>
            </div>

            {/* Phones */}
            <div className="flex flex-col gap-2">
              <a
                href="tel:+351213212800"
                className="flex items-center gap-2.5 justify-center md:justify-start text-[13px] hover:text-[#edd9a8] transition-colors"
              >
                <Phone size={14} strokeWidth={1.5} className="shrink-0 text-[#edd9a8]/70" />
                <span>+351 21 3212 800</span>
              </a>
            </div>

            {/* Social */}
            <div className="flex items-center gap-3">
              <a
                href="#"
                aria-label="Facebook"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#edd9a8]/25 text-[#edd9a8]/80 hover:text-[#edd9a8] hover:border-[#edd9a8]/60 transition-colors"
              >
                <Facebook size={15} strokeWidth={1.5} />
              </a>
              <a
                href="#"
                aria-label="Instagram"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#edd9a8]/25 text-[#edd9a8]/80 hover:text-[#edd9a8] hover:border-[#edd9a8]/60 transition-colors"
              >
                <Instagram size={15} strokeWidth={1.5} />
              </a>
            </div>
          </div>

          {/* Curated locations */}
          <nav className="flex flex-col items-center md:items-start text-center md:text-left">
            <h3 className={headingClass}>{t("footer", "locations_heading", "Curated locations")}</h3>
            <ul className="flex flex-col gap-3">
              {locationLinks.map((l) => (
                <li key={l.key}>
                  <Link to={l.to} className={linkClass}>
                    {t("footer", `location_${l.key}`, l.fallback)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Property types */}
          <nav className="flex flex-col items-center md:items-start text-center md:text-left">
            <h3 className={headingClass}>{t("footer", "types_heading", "Property types")}</h3>
            <ul className="flex flex-col gap-3">
              {typeLinks.map((l) => (
                <li key={l.key}>
                  <Link to={l.to} className={linkClass}>
                    {t("footer", `type_${l.key}`, l.fallback)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Legal */}
          <nav className="flex flex-col items-center md:items-start text-center md:text-left">
            <h3 className={headingClass}>{t("footer", "legal_heading", "Legal")}</h3>
            <ul className="flex flex-col gap-3">
              {legalLinks.map((l) => (
                <li key={l.key}>
                  <Link to={l.to} className={linkClass}>
                    {t("footer", `legal_${l.key}`, l.fallback)}
                  </Link>
                </li>
              ))}
              <li>
                <a
                  href={LIVRO_RECLAMACOES_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  {t("footer", "legal_complaints_book", "Livro de Reclamações")}
                </a>
              </li>
            </ul>
          </nav>
        </div>

        {/* ── Divider ────────────────────────────────────────────────────── */}
        <div className="my-10 h-px w-full bg-[#edd9a8]/12" />

        {/* ── Bottom bar: language · copyright · back to top ─────────────── */}
        <div className="flex flex-col-reverse md:flex-row md:items-center md:justify-between gap-6">
          <LanguageSwitcher variant="footer" />

          <div className="flex flex-col items-center gap-1 text-center md:text-right md:order-3 md:items-end">
            <p className="text-[12px] tracking-wider">
              ©{year} {t("footer", "rights_reserved", "All Rights Reserved")}
            </p>
            <p className="text-[12px] tracking-wider">
              {t("footer", "site_dev_label", "Site development")}:{" "}
              <a
                href="https://diamondoctopus.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#edd9a8] transition-colors"
              >
                Diamond Octopus
              </a>
            </p>
          </div>

          <button
            onClick={scrollToTop}
            aria-label={t("footer", "back_to_top", "Back to top")}
            className="hidden md:flex md:order-2 h-10 w-10 items-center justify-center rounded-full border border-[#edd9a8]/25 text-[#edd9a8]/80 hover:text-[#edd9a8] hover:border-[#edd9a8]/60 transition-colors mx-auto"
          >
            <ChevronUp size={18} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
