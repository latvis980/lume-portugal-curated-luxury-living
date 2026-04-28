// frontend/src/lib/admin-api.ts

const TOKEN_KEY = "lume_admin_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}
export function isAuthenticated(): boolean {
  return !!getToken();
}

async function adminFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`/api/admin${path}`, { ...options, headers });
  if (res.status === 401) {
    clearToken();
    window.location.href = "/admin/login";
    throw new Error("Session expired");
  }
  return res;
}

export async function login(password: string) {
  const res = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Login failed");
  }
  const data = await res.json();
  setToken(data.access_token);
  return data;
}

export async function verifyAuth() {
  const res = await adminFetch("/me");
  if (!res.ok) throw new Error("Not authenticated");
  return res.json();
}

export async function getStats() {
  const res = await adminFetch("/stats");
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

export interface ListingsQuery {
  status?: string;
  internal_status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export async function getListings(params: ListingsQuery = {}) {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.internal_status) query.set("internal_status", params.internal_status);
  if (params.search) query.set("search", params.search);
  if (params.limit) query.set("limit", String(params.limit));
  if (params.offset) query.set("offset", String(params.offset));
  const qs = query.toString();
  const res = await adminFetch(`/listings${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error("Failed to fetch listings");
  return res.json();
}

export async function getListing(id: string) {
  const res = await adminFetch(`/listings/${id}`);
  if (!res.ok) throw new Error("Failed to fetch listing");
  return res.json();
}

export async function createListing(data: Record<string, unknown>) {
  const res = await adminFetch("/listings", { method: "POST", body: JSON.stringify(data) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to create listing");
  }
  return res.json();
}

export async function updateListing(id: string, data: Record<string, unknown>) {
  const res = await adminFetch(`/listings/${id}`, { method: "PUT", body: JSON.stringify(data) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to update listing");
  }
  return res.json();
}

export async function deleteListing(id: string) {
  const res = await adminFetch(`/listings/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete listing");
  return res.json();
}

export interface ContactsQuery {
  source?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export async function getContacts(params: ContactsQuery = {}) {
  const query = new URLSearchParams();
  if (params.source) query.set("source", params.source);
  if (params.search) query.set("search", params.search);
  if (params.limit) query.set("limit", String(params.limit));
  if (params.offset) query.set("offset", String(params.offset));
  const qs = query.toString();
  const res = await adminFetch(`/contacts${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error("Failed to fetch contacts");
  return res.json();
}

export async function deleteContact(id: string) {
  const res = await adminFetch(`/contacts/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete contact");
  return res.json();
}

// ─── Services ───────────────────────────────────────────────────────────────

export interface Service {
  id: string;
  title: string;
  slug: string;
  category: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function getServices(): Promise<{ services: Service[] }> {
  const res = await adminFetch("/services");
  if (!res.ok) throw new Error("Failed to fetch services");
  return res.json();
}

export async function createService(data: {
  title: string;
  category: string;
  sort_order?: number;
  is_active?: boolean;
}) {
  const res = await adminFetch("/services", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).detail || "Failed to create service");
  }
  return res.json();
}

export async function updateService(id: string, data: Partial<Service>) {
  const res = await adminFetch(`/services/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).detail || "Failed to update service");
  }
  return res.json();
}

export async function deleteService(id: string) {
  const res = await adminFetch(`/services/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete service");
  return res.json();
}

// ─── Translations ──────────────────────────────────────────────────────────

export type Locale = "en" | "pt_br" | "ru" | "es";
export const TRANSLATION_LOCALES: Locale[] = ["en", "pt_br", "ru", "es"];

export interface Translation {
  id: string;
  namespace: string;
  key: string;
  en: string | null;
  pt_br: string | null;
  ru: string | null;
  es: string | null;
  created_at: string;
  updated_at: string;
}

export async function getTranslations(params: {
  namespace?: string;
  search?: string;
} = {}): Promise<{ translations: Translation[] }> {
  const q = new URLSearchParams();
  if (params.namespace) q.set("namespace", params.namespace);
  if (params.search) q.set("search", params.search);
  const qs = q.toString();
  const res = await adminFetch(`/translations${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error("Failed to fetch translations");
  return res.json();
}

export async function upsertTranslation(data: {
  namespace: string;
  key: string;
  en?: string | null;
  pt_br?: string | null;
  ru?: string | null;
  es?: string | null;
}): Promise<Translation> {
  const res = await adminFetch("/translations", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).detail || "Failed to save translation");
  }
  return res.json();
}

export async function updateTranslation(
  id: string,
  data: Partial<Translation>,
): Promise<Translation> {
  const res = await adminFetch(`/translations/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).detail || "Failed to update translation");
  }
  return res.json();
}

export async function deleteTranslation(id: string) {
  const res = await adminFetch(`/translations/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete translation");
  return res.json();
}

export async function translateRow(
  id: string,
  options: { source?: Locale; overwrite?: boolean } = {},
): Promise<Translation> {
  const res = await adminFetch(`/translations/${id}/translate`, {
    method: "POST",
    body: JSON.stringify(options),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).detail || "Translate failed");
  }
  return res.json();
}