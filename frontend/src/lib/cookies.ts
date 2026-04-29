// frontend/src/lib/cookies.ts
//
// Simple cookie utilities for LUME by Mark.
//
// What we store in cookies:
//   - lume_cookie_consent  → "accepted" | "declined" (the GDPR-style banner)
//
// What we DON'T store in cookies:
//   - The visitor's questionnaire status. Every visit shows the
//     questionnaire fresh, so returning visitors can do it again if they want.
//   - The visitor's language preference. That's in localStorage
//     (key: lume_locale) — see frontend/src/lib/i18n.tsx.

/**
 * Set a cookie with optional expiry in days.
 */
export function setCookie(name: string, value: string, days = 365): void {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

/**
 * Get a cookie value by name. Returns null if not found.
 */
export function getCookie(name: string): string | null {
  const match = document.cookie.match(
    new RegExp("(?:^|; )" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "=([^;]*)")
  );
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Delete a cookie by name.
 */
export function deleteCookie(name: string): void {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

// ── Cookie keys ──────────────────────────────────────────────────────
export const COOKIE_CONSENT_KEY = "lume_cookie_consent";