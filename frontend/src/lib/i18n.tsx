// frontend/src/lib/i18n.tsx
//
// Lightweight i18n: one fetch of /api/translations at boot, all strings live
// in a (namespace, key) -> { en, pt_pt, ru, es } map.  Components call
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
import { localeFromPath, localePrefix, stripLocale } from "@/lib/locale-path";

export const LOCALES = ["en", "pt_pt", "ru", "es"] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  pt_pt: "Portuguese",
  ru: "Русский",
  es: "Español",
};

export const LOCALE_SHORT: Record<Locale, string> = {
  en: "EN",
  pt_pt: "PT",
  ru: "RU",
  es: "ES",
};

const STORAGE_KEY = "lume_locale";

interface TranslationRow {
  namespace: string;
  key: string;
  en?: string | null;
  pt_pt?: string | null;
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

// The URL prefix is the source of truth (so a localised URL always renders
// that locale, and English URLs render English — keeping content in sync with
// the server-rendered canonical/hreflang). localStorage only remembers the
// last explicit choice; it never overrides the URL.
function detectInitialLocale(): Locale {
  if (typeof window === "undefined") return "en";
  return localeFromPath(window.location.pathname);
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

  // Switching locale navigates to the locale-prefixed equivalent of the
  // current path (full reload). Because I18nProvider sits above <BrowserRouter>
  // and the router basename is derived from the URL at load, a full navigation
  // is the simplest way to keep prefix, basename, and rendered locale in sync.
  const setLocale = useCallback((l: Locale) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, l);
    const { pathname, search, hash } = window.location;
    const target = `${localePrefix(l)}${stripLocale(pathname)}`.replace(/\/$/, "") || "/";
    const current = pathname.replace(/\/$/, "") || "/";
    if (target === current) {
      setLocaleState(l);
      document.documentElement.lang = l === "pt_pt" ? "pt-PT" : l;
      return;
    }
    window.location.assign(`${target}${search}${hash}`);
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale === "pt_pt" ? "pt-PT" : locale;
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
