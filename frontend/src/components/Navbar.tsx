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
    { label: t("nav", "browse_homes",           "Browse Homes"),           href: "/properties" },
    { label: t("nav", "discover_services",      "Discover Services"),      href: "/#services" },
    { label: t("nav", "collect_with_lume",      "Collect with LUME"),      href: "/#art-advisory" },
    { label: t("nav", "about",                  "About"),                  href: "/about" },
    { label: t("nav", "request_private_access", "Request Private Access"), href: "/#private-access" },
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
    scrollToHash(href.slice(1)); // e.g. "#services"
  };

  const handleMobileNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!href.startsWith("/#")) return;
    e.preventDefault();
    const hash = href.slice(1);
    setOpen(false);
    // Wait for the menu collapse animation before scrolling
    setTimeout(() => scrollToHash(hash), 300);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between h-16 md:h-20">
        <a href="/" className="flex flex-col items-start leading-none">
          <span className="font-display text-2xl md:text-3xl font-light tracking-widest text-foreground">LUME</span>
          <span className="font-body text-[8px] md:text-[9px] tracking-[0.2em] uppercase text-muted-foreground font-medium">by Mark</span>
        </a>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={(e) => handleNavClick(e, item.href)}
              className="text-xs tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground transition-colors duration-300"
            >
              {item.label}
            </a>
          ))}
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
            <div className="px-6 py-6 flex flex-col gap-4">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={(e) => handleMobileNavClick(e, item.href)}
                  className="text-xs tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground transition-colors"
                >
                  {item.label}
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
