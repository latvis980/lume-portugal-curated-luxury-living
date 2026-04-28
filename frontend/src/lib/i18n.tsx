// frontend/src/lib/i18n.tsx
//
// Lightweight i18n: one fetch of /api/translations at boot, all strings live
// in a (namespace, key) -> { en, pt_br, ru, es } map.  Components call
// `t("about", "title")` and get back the active locale's value (with English
// as fallback so the UI never shows raw keys while translations are pending).

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";

export const LOCALES = ["en", "pt_br", "ru", "es"] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  pt_br: "Português (BR)",
  ru: "Русский",
  es: "Español",
};

export const LOCALE_SHORT: Record<Locale, string> = {
  en: "EN",
  pt_br: "PT",
  ru: "RU",
  es: "ES",
};

const STORAGE_KEY = "lume_locale";

interface TranslationRow {
  namespace: string;
  key: string;
  en?: string | null;
  pt_br?: string | null;
  ru?: string | null;
  es?: string | null;
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (namespace: string, key: string, fallback?: string) => string;
  isLoading: boolean;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function detectInitialLocale(): Locale {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
  if (stored && LOCALES.includes(stored)) return stored;
  const nav = window.navigator.language?.toLowerCase() ?? "";
  if (nav.startsWith("pt")) return "pt_br";
  if (nav.startsWith("ru")) return "ru";
  if (nav.startsWith("es")) return "es";
  return "en";
}

async function fetchTranslations(): Promise<TranslationRow[]> {
  try {
    const res = await fetch("/api/translations");
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.translations) ? data.translations : [];
  } catch {
    return [];
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectInitialLocale);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, l);
      document.documentElement.lang = l === "pt_br" ? "pt-BR" : l;
    }
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale === "pt_br" ? "pt-BR" : locale;
    }
  }, [locale]);

  const { data, isLoading } = useQuery({
    queryKey: ["translations"],
    queryFn: fetchTranslations,
    staleTime: 1000 * 60 * 10,
  });

  const dictionary = useMemo(() => {
    const map = new Map<string, TranslationRow>();
    for (const row of data ?? []) {
      map.set(`${row.namespace}::${row.key}`, row);
    }
    return map;
  }, [data]);

  const t = useCallback(
    (namespace: string, key: string, fallback?: string) => {
      const row = dictionary.get(`${namespace}::${key}`);
      if (!row) return fallback ?? "";
      const value = row[locale];
      if (value && value.trim()) return value;
      // Fall back to English, then any other populated locale.
      if (row.en && row.en.trim()) return row.en;
      for (const loc of LOCALES) {
        const v = row[loc];
        if (v && v.trim()) return v;
      }
      return fallback ?? "";
    },
    [dictionary, locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, t, isLoading }),
    [locale, setLocale, t, isLoading],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}

/** Shorthand `const t = useT(); t("about", "title")`. */
export function useT() {
  return useI18n().t;
}
