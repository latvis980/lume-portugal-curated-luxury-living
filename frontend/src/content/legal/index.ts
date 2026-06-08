// frontend/src/content/legal/index.ts
//
// Hardcoded, GitHub-editable legal documents. Each document lives in its own
// file per locale, e.g. `legal-terms.en.tsx`. To add a translation, drop in a
// file with the same name but a different locale suffix (e.g.
// `legal-terms.pt_pt.tsx`) — `loadLegalDoc` picks it up automatically and falls
// back to English until the translated file exists.

import type { Locale } from "@/lib/i18n";

export type LegalBlock =
  | { type: "p"; text: string }
  | { type: "list"; items: string[] }
  | { type: "table"; columns: string[]; rows: string[][] }
  | { type: "kv"; pairs: [string, string][] };

export interface LegalSection {
  /** Anchor slug — used for in-page links (e.g. footer "Resolução de litígios"). */
  id: string;
  heading: string;
  /** Optional small label above the heading (e.g. "Part II"). */
  eyebrow?: string;
  blocks: LegalBlock[];
}

export interface LegalDoc {
  title: string;
  subtitle?: string;
  updated: string;
  intro?: string[];
  sections: LegalSection[];
}

// Eagerly import every locale module so the active document is available
// synchronously at render time.
const modules = import.meta.glob<{ default: LegalDoc }>("./*.tsx", { eager: true });

export type LegalSlug = "legal-terms" | "privacy-policy" | "cookies-policy";

/**
 * Load a legal document for the given slug + locale, falling back to English
 * when a localised version has not yet been authored.
 */
export function loadLegalDoc(slug: LegalSlug, locale: Locale): LegalDoc | null {
  const get = (loc: string) => modules[`./${slug}.${loc}.tsx`]?.default;
  return get(locale) ?? get("en") ?? null;
}
