// frontend/src/lib/cookies.ts
// Simple cookie utilities for LUME by Mark

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
export const EMAIL_SUBMITTED_KEY = "lume_email_submitted";
