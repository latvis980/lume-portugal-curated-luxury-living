// frontend/src/lib/locale-path.ts
//
// URL <-> locale mapping for localised path prefixes. English lives at the
// root (no prefix); pt_pt/ru/es live under /pt, /ru, /es. This mirrors the
// Python implementation in backend/seo.py.
//
// React Router uses these via a per-load `basename` (see App.tsx), so all
// existing <Link to="/x"> automatically resolve to the active locale prefix
// and useLocation() is reported WITHOUT the prefix.

import type { Locale } from "@/lib/i18n";

export const URL_TO_LOCALE: Record<string, Locale> = {
  pt: "pt_pt",
  ru: "ru",
  es: "es",
};

export const LOCALE_TO_URL: Record<Locale, string> = {
  en: "",
  pt_pt: "pt",
  ru: "ru",
  es: "es",
};

/** "/pt" | "/ru" | "/es" | "" */
export function localePrefix(locale: Locale): string {
  const seg = LOCALE_TO_URL[locale];
  return seg ? `/${seg}` : "";
}

/** Read the active locale from a raw pathname (e.g. "/pt/about" -> "pt_pt"). */
export function localeFromPath(pathname: string): Locale {
  const first = pathname.replace(/^\/+/, "").split("/")[0];
  return URL_TO_LOCALE[first] ?? "en";
}

/** Strip a leading locale prefix, returning the path the SPA routes on. */
export function stripLocale(pathname: string): string {
  const first = pathname.replace(/^\/+/, "").split("/")[0];
  if (URL_TO_LOCALE[first]) {
    const rest = pathname.replace(/^\/+/, "").split("/").slice(1).join("/");
    return "/" + rest;
  }
  return pathname.startsWith("/") ? pathname : `/${pathname}`;
}
