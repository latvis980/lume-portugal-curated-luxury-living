// frontend/src/components/Navbar.tsx
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useI18n, type Locale } from "@/lib/i18n";
import { useWave } from "@/components/WaveTransition";

type NavItem = { label: string; subtitle: string; href: string };

const NAV_LABELS: Record<Locale, NavItem[]> = {
  en: [
    { label: "Homes",           subtitle: "View available places",        href: "/properties" },
    { label: "Services",        subtitle: "What we take care of",         href: "/#services" },
    { label: "Investment",      subtitle: "Thinking beyond the present",  href: "/#investment" },
    { label: "About us",        subtitle: "The idea behind Lume",         href: "/about" },
    { label: "Journal",         subtitle: "Articles about Portugal",      href: "/journal" },
    { label: "Contact",         subtitle: "Get in touch",                 href: "/#private-access" },
  ],
  pt_pt: [
    { label: "Casas",           subtitle: "Ver propriedades disponíveis", href: "/properties" },
    { label: "Serviços",        subtitle: "O que tratamos por si",         href: "/#services" },
    { label: "Investimento",    subtitle: "Pensar além do presente",       href: "/#investment" },
    { label: "Sobre nós",       subtitle: "A ideia por detrás da Lume",   href: "/about" },
    { label: "Revista",         subtitle: "Artigos sobre Portugal",        href: "/journal" },
    { label: "Contacto",        subtitle: "Entre em contacto",             href: "/#private-access" },
  ],
  ru: [
    { label: "Дома",            subtitle: "Доступные объекты",            href: "/properties" },
    { label: "Услуги",          subtitle: "О чём мы заботимся",           href: "/#services" },
    { label: "Инвестиции",      subtitle: "Думать о будущем",              href: "/#investment" },
    { label: "О нас",           subtitle: "Идея Lume",                    href: "/about" },
    { label: "Журнал",          subtitle: "Статьи о Португалии",          href: "/journal" },
    { label: "Контакт",         subtitle: "Свяжитесь с нами",             href: "/#private-access" },
  ],
  es: [
    { label: "Casas",           subtitle: "Ver propiedades disponibles",  href: "/properties" },
    { label: "Servicios",       subtitle: "Lo que cuidamos",              href: "/#services" },
    { label: "Inversión",       subtitle: "Pensar más allá del presente", href: "/#investment" },
    { label: "Sobre nosotros",  subtitle: "La idea detrás de Lume",       href: "/about" },
    { label: "Revista",         subtitle: "Artículos sobre Portugal",     href: "/journal" },
    { label: "Contacto",        subtitle: "Ponerse en contacto",          href: "/#private-access" },
  ],
};

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { locale } = useI18n();
  // True once the viewport has scrolled past the hero region. While at the
  // top of the page the navbar is fully transparent so the hero video shows
  // through; after scrolling it picks up a soft cream-tinted blur.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  // Pages that render a full-bleed hero behind the navbar. While at the top
  // of these the navbar is transparent; on other routes (e.g. /properties,
  // /about, the /journal index) it is always over content and never
  // transparent.
  const isHome = location.pathname === "/";
  // Individual journal articles render a dark photographic hero. Like the
  // homepage the navbar starts transparent over it, but once scrolled it
  // becomes the opaque espresso-brown used in the footer (rather than the
  // cream tint), keeping its light text readable.
  const isArticle = location.pathname.startsWith("/journal/");
  const overHero = (isHome || isArticle) && !scrolled;
  const darkScrolled = isArticle && scrolled;
  // Light navbar text/logo whenever the surface behind it is dark.
  const lightText = overHero || darkScrolled;
  // ── Wave-takeover state ──────────────────────────────────────────────
  // `submerged` becomes true once the contact section reaches the navbar.
  // We use it to fade the sand bg to transparent and flip text to white.
  // On pages that don't render <WaveProvider> (e.g. /about, /properties),
  // this returns the default { submerged: false } — safe fallback.
  const { submerged } = useWave();

  const navItems = NAV_LABELS[locale];

  const scrollToHash = (hash: string) => {
    if (location.pathname === "/") {
      document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate(`/${hash}`);
    }
  };

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!href.startsWith("/#")) return;
    e.preventDefault();
    scrollToHash(href.slice(1));
  };

  const handleMobileNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!href.startsWith("/#")) return;
    e.preventDefault();
    const hash = href.slice(1);
    setOpen(false);
    setTimeout(() => scrollToHash(hash), 300);
  };

  const slideVariants = {
    rest:  { y: "0%" },
    hover: { y: "-50%" },
  };

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 border-b"
      style={{
        // Visual states:
        //   overHero     → fully transparent (hero shows through)
        //   submerged    → opaque honey, matching the top of the contact gradient
        //                  so text in the navbar stays readable as the section
        //                  scrolls beneath it
        //   darkScrolled → opaque espresso-brown (the footer colour) on scrolled
        //                  journal articles
        //   default      → cream tint with backdrop blur
        backgroundColor:
          overHero
            ? "transparent"
            : submerged
            ? "#ecbe5b"
            : darkScrolled
            ? "#1a1108"
            : "rgba(251, 244, 230, 0.86)",
        borderColor:
          overHero || submerged
            ? "transparent"
            : darkScrolled
            ? "rgba(237, 217, 168, 0.12)"
            : "rgba(176, 78, 26, 0.12)",
        backdropFilter:
          overHero || submerged ? "none" : "blur(14px)",
        WebkitBackdropFilter:
          overHero || submerged ? "none" : "blur(14px)",
        transition:
          "background-color 0.5s ease, border-color 0.5s ease, " +
          "backdrop-filter 0.5s ease, -webkit-backdrop-filter 0.5s ease, " +
          "color 0.5s ease",
      }}
    >
      {/* Text colour adapts to the surface behind the navbar:
            lightText (overHero / darkScrolled) → cream over a dark surface
            submerged                            → espresso on the honey wave crest
            default                              → each item's own colour (espresso / muted) */}
      <div
        className={`px-[clamp(24px,7vw,96px)] flex items-center h-14 md:h-[5.5rem] gap-6 transition-colors duration-300 ${
          lightText ? "[&_*]:!text-warm-white" : submerged ? "[&_*]:!text-charcoal" : ""
        }`}
      >

        {/* Logo */}
        <a href="/" className="flex items-center leading-none flex-shrink-0">
          <img
            src="/navbar-logo.png"
            alt="LUME by Mark"
            className={`h-[3.6rem] md:h-[4.8rem] w-auto transition-all duration-500 ${
              lightText ? "brightness-0 invert" : submerged ? "brightness-0" : ""
            }`}
          />
        </a>

        <div className="hidden md:flex flex-1 items-center justify-evenly">
          {navItems.map((item) => (
            <motion.a
              key={item.href}
              href={item.href}
              onClick={(e) => handleNavClick(e, item.href)}
              initial="rest"
              whileHover="hover"
              animate="rest"
              className="relative block h-12 group text-center px-2"
              style={{ clipPath: "inset(0 -9999px)" }}
            >
              {/* Invisible sizer — keeps the item width equal to the label only */}
              <span aria-hidden className="invisible flex items-center justify-center h-12 text-[11px] lg:text-[13.92px] font-medium tracking-[0.18em] lg:tracking-[0.22em] uppercase whitespace-nowrap">
                {item.label}
              </span>
              {/* Absolutely positioned so it doesn't affect item width */}
              <motion.div
                variants={slideVariants}
                transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-x-0 top-0 flex flex-col items-center"
              >
                <span className="flex items-center justify-center h-12 text-[11px] lg:text-[13.92px] font-medium tracking-[0.18em] lg:tracking-[0.22em] uppercase text-muted-foreground group-hover:text-foreground transition-colors duration-300 whitespace-nowrap">
                  {item.label}
                </span>
                <span className="flex items-center justify-center h-12 text-[11px] lg:text-[13.92px] italic font-serif font-medium tracking-wide text-primary leading-tight whitespace-nowrap">
                  {item.subtitle}
                </span>
              </motion.div>
            </motion.a>
          ))}
        </div>

        {/* Language switcher — its own slot on the right, separate from nav items */}
        <div className="hidden md:block flex-shrink-0">
          <LanguageSwitcher />
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden text-foreground ml-auto"
          aria-label="Toggle menu"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-background border-b border-border overflow-hidden"
          >
            <div className="px-6 py-6 flex flex-col gap-6">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={(e) => handleMobileNavClick(e, item.href)}
                  className="flex flex-col gap-0.5"
                >
                  <span className="text-[16.1px] tracking-[0.2em] uppercase text-foreground">
                    {item.label}
                  </span>
                  <span className="text-[13.8px] italic font-serif text-primary">
                    {item.subtitle}
                  </span>
                </a>
              ))}
              <div className="pt-4 border-t border-border/50">
                <LanguageSwitcher variant="mobile" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;