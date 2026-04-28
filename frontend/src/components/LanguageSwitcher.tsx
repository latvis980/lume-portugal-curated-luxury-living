import { useEffect, useRef, useState } from "react";
import { Globe, Check } from "lucide-react";
import { LOCALES, LOCALE_LABELS, LOCALE_SHORT, useI18n, type Locale } from "@/lib/i18n";

interface LanguageSwitcherProps {
  variant?: "navbar" | "mobile";
}

export default function LanguageSwitcher({ variant = "navbar" }: LanguageSwitcherProps) {
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (variant === "mobile") {
    return (
      <div className="flex flex-wrap gap-2">
        {LOCALES.map((loc) => (
          <button
            key={loc}
            onClick={() => setLocale(loc as Locale)}
            className={`px-3 py-1.5 text-[10px] tracking-[0.2em] uppercase border transition-colors ${
              locale === loc
                ? "border-primary text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {LOCALE_SHORT[loc]}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Change language"
      >
        <Globe size={14} strokeWidth={1.5} />
        <span>{LOCALE_SHORT[locale]}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 min-w-[160px] rounded-sm border border-border bg-background/95 backdrop-blur-md shadow-md py-1 z-50">
          {LOCALES.map((loc) => (
            <button
              key={loc}
              onClick={() => {
                setLocale(loc as Locale);
                setOpen(false);
              }}
              className="w-full flex items-center justify-between px-4 py-2 text-xs tracking-wider text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            >
              <span>{LOCALE_LABELS[loc]}</span>
              {locale === loc && <Check size={12} strokeWidth={2} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
