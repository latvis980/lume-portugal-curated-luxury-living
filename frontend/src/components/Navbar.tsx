// frontend/src/components/Navbar.tsx
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ChevronDown } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useI18n, type Locale } from "@/lib/i18n";
import { useWave } from "@/components/WaveTransition";

// A nav item is either a plain link (label + href) or a dropdown parent
// (label + children). Dropdown parents are not navigable themselves — they
// only reveal their children on hover (desktop) / expand inline (mobile).
type NavLeaf = { label: string; href: string };
type NavItem = { label: string; href?: string; children?: NavLeaf[] };

const NAV_LABELS: Record<Locale, NavItem[]> = {
  en: [
    { label: "Homes", href: "/properties" },
    { label: "Services", children: [
      { label: "Relocation Services", href: "/#services" },
      { label: "Collecting", href: "/#collecting" },
    ] },
    { label: "Investment", href: "/#investment" },
    { label: "Company", children: [
      { label: "Our Vision", href: "/about" },
      { label: "Team", href: "/about/team" },
      { label: "Company News", href: "/about/news" },
    ] },
    { label: "About Portugal", href: "/journal" },
    { label: "Contact", href: "/#private-access" },
  ],
  pt_pt: [
    { label: "Casas", href: "/properties" },
    { label: "Serviços", children: [
      { label: "Serviços de Relocação", href: "/#services" },
      { label: "Colecionar", href: "/#collecting" },
    ] },
    { label: "Investimento", href: "/#investment" },
    { label: "Empresa", children: [
      { label: "A Nossa Visão", href: "/about" },
      { label: "Equipa", href: "/about/team" },
      { label: "Media", href: "/about/news" },
    ] },
    { label: "Sobre Portugal", href: "/journal" },
    { label: "Contacto", href: "/#private-access" },
  ],
  ru: [
    { label: "Дома", href: "/properties" },
    { label: "Услуги", children: [
      { label: "Услуги по переезду", href: "/#services" },
      { label: "Коллекционирование", href: "/#collecting" },
    ] },
    { label: "Инвестиции", href: "/#investment" },
    { label: "Компания", children: [
      { label: "Наше видение", href: "/about" },
      { label: "Команда", href: "/about/team" },
      { label: "Новости компании", href: "/about/news" },
    ] },
    { label: "О Португалии", href: "/journal" },
    { label: "Контакт", href: "/#private-access" },
  ],
  es: [
    { label: "Casas", href: "/properties" },
    { label: "Servicios", children: [
      { label: "Servicios de Reubicación", href: "/#services" },
      { label: "Coleccionismo", href: "/#collecting" },
    ] },
    { label: "Inversión", href: "/#investment" },
    { label: "Empresa", children: [
      { label: "Nuestra Visión", href: "/about" },
      { label: "Equipo", href: "/about/team" },
      { label: "Noticias", href: "/about/news" },
    ] },
    { label: "Sobre Portugal", href: "/journal" },
    { label: "Contacto", href: "/#private-access" },
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
  // Separate, slightly later threshold for revealing the navbar logo on hero
  // pages: the logo stays hidden over the first screen and only fades in once
  // we've scrolled a bit past the point where the bar turns opaque (80px).
  const [pastHero, setPastHero] = useState(false);
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 80);
      setPastHero(window.scrollY > 150);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  // Pages where the navbar is transparent at the top of the page so the dark
  // hero behind it (the homepage video and individual journal articles) shows
  // through; the navbar uses light (cream) text/logo to read over it.
  // Everywhere else (/properties, /about, /journal …) the navbar is always a
  // solid surface over content and never transparent.
  const isHome = location.pathname === "/";
  const isArticle = location.pathname.startsWith("/journal/");
  const isJournalIndex = location.pathname === "/journal";
  const overHero = (isHome || isArticle) && !scrolled;
  // "About Portugal" (journal listing) has a cream page background; at the top
  // the navbar matches that background colour exactly (lume-cream #F7F1E5) so
  // there is no visible seam between the bar and the page.
  const journalTop = isJournalIndex && !scrolled;
  // Once scrolled, journal pages (listing + articles) turn the opaque
  // espresso-brown used in the footer rather than the homepage's cream tint.
  const darkScrolled = (isArticle || isJournalIndex) && scrolled;
  // Light navbar text/logo whenever the surface behind it is dark.
  const lightText = overHero || darkScrolled;
  // The logo is hidden on load only on the homepage, whose hero video carries
  // the big centred logo; it fades in once we've scrolled past that hero.
  // Everywhere else (including the article and About Portugal pages) the logo
  // is shown immediately.
  const logoShown = !isHome || pastHero;
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

  const isHash = (href: string) => href.startsWith("/#");

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

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 border-b"
      style={{
        // Visual states:
        //   overHero     → fully transparent (hero shows through)
        //   submerged    → opaque gold, matching the wave body / top of the
        //                  contact gradient so text in the navbar stays readable
        //                  as the section scrolls beneath it
        //   darkScrolled → opaque espresso-brown (the footer colour) on scrolled
        //                  journal pages (listing + articles)
        //   journalTop   → opaque lume-cream matching the About Portugal page bg
        //   default      → cream tint with backdrop blur
        backgroundColor:
          overHero
            ? "transparent"
            : submerged
            ? "#e9a92e"
            : darkScrolled
            ? "#1a1108"
            : journalTop
            ? "#F7F1E5"
            : "rgba(251, 244, 230, 0.86)",
        borderColor:
          overHero || submerged || journalTop
            ? "transparent"
            : darkScrolled
            ? "rgba(237, 217, 168, 0.12)"
            : "rgba(176, 78, 26, 0.12)",
        backdropFilter:
          overHero || submerged || journalTop ? "none" : "blur(14px)",
        WebkitBackdropFilter:
          overHero || submerged || journalTop ? "none" : "blur(14px)",
        transition:
          "background-color 0.5s ease, border-color 0.5s ease, " +
          "backdrop-filter 0.5s ease, -webkit-backdrop-filter 0.5s ease, " +
          "color 0.5s ease",
      }}
    >
      {/* Text colour adapts to the surface behind the navbar:
            lightText (over a dark hero / darkScrolled) → cream over a dark surface
            submerged                                    → espresso on the honey wave crest
            default                                      → each item's own colour (espresso / muted) */}
      <div
        className={`px-[clamp(20px,4vw,64px)] flex items-center justify-between h-14 md:h-[5.5rem] gap-4 transition-colors duration-300 ${
          lightText ? "[&_*]:!text-warm-white" : submerged ? "[&_*]:!text-charcoal" : ""
        }`}
      >

        {/* Logo */}
        <Link to="/" className="flex items-center leading-none flex-shrink-0">
          <img
            src="/navbar-logo.png"
            alt="LUME by Mark"
            className={`h-[3.6rem] md:h-[4.8rem] w-auto transition-all duration-500 ${
              lightText ? "brightness-0 invert" : submerged ? "brightness-0" : ""
            }`}
            style={{
              opacity: logoShown ? 1 : 0,
              transition: "opacity 0.5s ease, filter 0.5s ease",
            }}
          />
        </Link>

        {/* Nav items — a fixed-spacing cluster (no longer flex-1) so they stay
            grouped on wide screens instead of spreading to the edges; the
            logo and language switcher sit at the borders via justify-between.
            Dropdown parents (Services, About Us) reveal their children on
            hover; plain items link/scroll directly. */}
        <div className="hidden md:flex items-center justify-center gap-x-3 lg:gap-x-5">
          {navItems.map((item) =>
            item.children ? (
              <div key={item.label} className="relative group flex items-center h-12">
                {/* Parent label — toggle only, not a link */}
                <span className="flex items-center gap-1 cursor-default text-[11px] lg:text-[13.92px] font-medium tracking-[0.18em] lg:tracking-[0.22em] uppercase text-muted-foreground group-hover:text-foreground transition-colors duration-300 whitespace-nowrap">
                  {item.label}
                  <ChevronDown
                    size={13}
                    className="transition-transform duration-300 group-hover:rotate-180"
                  />
                </span>
                {/* Hover-revealed dropdown panel */}
                <div className="absolute left-1/2 top-full -translate-x-1/2 pt-3 opacity-0 invisible translate-y-1 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 transition-all duration-300">
                  <div
                    className="nav-child-menu min-w-[200px] py-2 rounded-sm border shadow-lg"
                    style={{
                      // Matches the CTA buttons' orange-honey gradient (see
                      // HeroSection / InvestmentSection) so the dropdown reads as
                      // a continuation of the brand's primary action colour.
                      background: "linear-gradient(120deg, #f1c454 0%, #e89446 100%)",
                      borderColor: "rgba(176, 78, 26, 0.22)",
                    }}
                  >
                    {item.children.map((child) => {
                      const cls =
                        "nav-child-link block px-5 py-2.5 text-[12px] tracking-[0.14em] uppercase transition-opacity duration-200 whitespace-nowrap";
                      return isHash(child.href) ? (
                        <a key={child.href} href={child.href} onClick={(e) => handleNavClick(e, child.href)} className={cls}>
                          {child.label}
                        </a>
                      ) : (
                        <Link key={child.href} to={child.href} className={cls}>
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : isHash(item.href!) ? (
              <a
                key={item.href}
                href={item.href}
                onClick={(e) => handleNavClick(e, item.href!)}
                className="flex items-center h-12 px-1 text-[11px] lg:text-[13.92px] font-medium tracking-[0.18em] lg:tracking-[0.22em] uppercase text-muted-foreground hover:text-foreground transition-colors duration-300 whitespace-nowrap"
              >
                {item.label}
              </a>
            ) : (
              <Link
                key={item.href}
                to={item.href!}
                className="flex items-center h-12 px-1 text-[11px] lg:text-[13.92px] font-medium tracking-[0.18em] lg:tracking-[0.22em] uppercase text-muted-foreground hover:text-foreground transition-colors duration-300 whitespace-nowrap"
              >
                {item.label}
              </Link>
            ),
          )}
        </div>

        {/* Language switcher — its own slot on the right, separate from nav items */}
        <div className="hidden md:block flex-shrink-0">
          <LanguageSwitcher />
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden text-foreground"
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
              {navItems.map((item) =>
                item.children ? (
                  <div key={item.label} className="flex flex-col gap-3">
                    {/* Group heading — not a link */}
                    <span className="text-[16.1px] tracking-[0.2em] uppercase text-foreground">
                      {item.label}
                    </span>
                    <div className="flex flex-col gap-3 pl-4 border-l border-border/50">
                      {item.children.map((child) => {
                        const cls = "text-[13.8px] tracking-[0.16em] uppercase text-primary";
                        return isHash(child.href) ? (
                          <a key={child.href} href={child.href} onClick={(e) => handleMobileNavClick(e, child.href)} className={cls}>
                            {child.label}
                          </a>
                        ) : (
                          <Link key={child.href} to={child.href} onClick={() => setOpen(false)} className={cls}>
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ) : isHash(item.href!) ? (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={(e) => handleMobileNavClick(e, item.href!)}
                    className="text-[16.1px] tracking-[0.2em] uppercase text-foreground"
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    key={item.href}
                    to={item.href!}
                    onClick={() => setOpen(false)}
                    className="text-[16.1px] tracking-[0.2em] uppercase text-foreground"
                  >
                    {item.label}
                  </Link>
                ),
              )}
              <div className="pt-4 border-t border-border/50">
                <LanguageSwitcher variant="mobile" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Child-menu link colour. The nav wrapper forces `!text-warm-white` over
          dark surfaces; these higher-specificity rules keep the dropdown copy
          black on its honey gradient regardless of the surface behind the bar. */}
      <style>{`
        .nav-child-menu .nav-child-link { color: #1a1108 !important; }
        .nav-child-menu .nav-child-link:hover { color: #1a1108 !important; opacity: 0.62; }
      `}</style>
    </nav>
  );
};

export default Navbar;