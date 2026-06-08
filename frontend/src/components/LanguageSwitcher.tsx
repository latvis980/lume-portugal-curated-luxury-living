import { useEffect, useRef, useState } from "react";
import { Globe, Check } from "lucide-react";
import { LOCALES, LOCALE_LABELS, LOCALE_SHORT, useI18n, type Locale } from "@/lib/i18n";
import { useWave, OCEAN_COLOR } from "@/components/WaveTransition";

interface LanguageSwitcherProps {
  variant?: "navbar" | "mobile" | "footer";
}

export default function LanguageSwitcher({ variant = "navbar" }: LanguageSwitcherProps) {
  const { locale, setLocale } = useI18n();
  const { submerged } = useWave();
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

  if (variant === "footer") {
    return (
      <div className="flex items-center gap-1.5">
        <Globe size={13} strokeWidth={1.5} className="text-[#edd9a8]/50" />
        {LOCALES.map((loc, i) => (
          <span key={loc} className="flex items-center">
            {i > 0 && <span className="mx-1.5 text-[#edd9a8]/25">|</span>}
            <button
              onClick={() => setLocale(loc as Locale)}
              className={`text-[13px] tracking-wide transition-colors ${
                locale === loc
                  ? "text-[#edd9a8] font-medium"
                  : "text-[#edd9a8]/55 hover:text-[#edd9a8]/90"
              }`}
            >
              {LOCALE_LABELS[loc]}
            </button>
          </span>
        ))}
      </div>
    );
  }

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
        className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Change language"
      >
        <Globe size={14} strokeWidth={1.5} />
        <span className="text-[11px] lg:text-[13.92px] font-medium tracking-[0.18em] lg:tracking-[0.22em] uppercase">
          {LOCALE_SHORT[locale]}
        </span>
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-2 min-w-[160px] rounded-sm border border-border bg-background/98 backdrop-blur-md shadow-md py-1 z-50"
        >
          {LOCALES.map((loc) => (
            <button
              key={loc}
              onClick={() => {
                setLocale(loc as Locale);
                setOpen(false);
              }}
              className="w-full flex items-center justify-between px-4 py-2 text-xs tracking-wider transition-colors !text-foreground/80 hover:!text-foreground hover:bg-muted/40"
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
