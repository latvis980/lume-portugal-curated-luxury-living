// frontend/src/components/Navbar.tsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useT } from "@/lib/i18n";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const t = useT();

  const navItems = [
    {
      label:    t("nav", "browse_homes",                "Homes"),
      subtitle: t("nav", "browse_homes_sub",            "View available places"),
      href:     "/properties",
    },
    {
      label:    t("nav", "discover_services",           "Services"),
      subtitle: t("nav", "discover_services_sub",       "What we take care of"),
      href:     "/#services",
    },
    {
      label:    t("nav", "collect_with_lume",           "Investment"),
      subtitle: t("nav", "collect_with_lume_sub",       "Thinking beyond the present"),
      href:     "/#investment",
    },
    {
      label:    t("nav", "about",                       "About us"),
      subtitle: t("nav", "about_sub",                   "The idea behind Lume"),
      href:     "/about",
    },
    {
      label:    t("nav", "request_private_access",      "Contact"),
      subtitle: t("nav", "request_private_access_sub",  "Get in touch"),
      href:     "/#private-access",
    },
  ];

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

  // Variants drive the slide animation. The parent <motion.a> declares hover state,
  // and the child <motion.div> consumes it via the named variants. This is the
  // canonical Framer Motion pattern (variants flow down to children automatically).
  const slideVariants = {
    rest:  { y: "0%" },
    hover: { y: "-50%" }, // -50% of the inner element (which is 2x h-9), so it shifts up by exactly one h-9
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-sand/85 backdrop-blur-md border-b border-border/50">
      <div className="max-w-7xl mx-auto px-6 md:px-12 flex items-center h-14 md:h-[5.5rem] gap-6">

        {/* Logo */}
        <a href="/" className="flex items-center leading-none flex-shrink-0">
          <img
            src="/logo.png"
            alt="LUME by Mark"
            className="h-12 md:h-16 w-auto"
          />
        </a>

        {/* Desktop nav — flex-1 absorbs remaining space; each item is flex-1 text-center
            so all five share the row equally regardless of label length */}
        <div className="hidden md:flex flex-1 items-center">
          {navItems.map((item) => (
            <motion.a
              key={item.href}
              href={item.href}
              onClick={(e) => handleNavClick(e, item.href)}
              initial="rest"
              whileHover="hover"
              animate="rest"
              className="relative block overflow-hidden h-9 group flex-1 text-center"
            >
              <motion.div
                variants={slideVariants}
                transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col"
              >
                <span className="flex items-center justify-center h-9 text-[11px] tracking-[0.22em] uppercase text-muted-foreground group-hover:text-foreground transition-colors duration-300 whitespace-nowrap">
                  {item.label}
                </span>
                <span className="flex items-center justify-center h-9 text-[11px] italic font-serif tracking-wide text-foreground whitespace-nowrap">
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
                  <span className="text-sm tracking-[0.2em] uppercase text-foreground">
                    {item.label}
                  </span>
                  <span className="text-xs italic font-serif text-muted-foreground">
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