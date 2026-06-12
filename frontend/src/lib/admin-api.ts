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

// ─── Listing field translation (DeepL) ──────────────────────────────────────

export type ListingTranslatableField =
  | "title"
  | "short_description"
  | "full_description"
  | "ai_summary";

export interface FieldTranslateOptions {
  field: ListingTranslatableField | ServiceTranslatableField;
  source_locale?: Locale; // default: "en"
  overwrite?: boolean;    // default: false
}

/**
 * Translate a single field of a listing to all other locales via DeepL.
 * Returns the full updated listing row (with refreshed _i18n columns).
 */
export async function translateListingField(
  listingId: string,
  options: { field: ListingTranslatableField; source_locale?: Locale; overwrite?: boolean },
): Promise<Record<string, unknown>> {
  const res = await adminFetch(`/listings/${listingId}/translate`, {
    method: "POST",
    body: JSON.stringify({
      field: options.field,
      source_locale: options.source_locale ?? "en",
      overwrite: options.overwrite ?? false,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).detail || "Translation failed");
  }
  return res.json();
}

/**
 * Translate raw text to every other supported locale via DeepL without
 * touching the database. Used by the new-listing form before the row exists.
 */
export async function translateText(
  text: string,
  source_locale: "en" | "pt_pt" | "ru" | "es" = "en",
): Promise<Record<string, string>> {
  const res = await adminFetch("/translate-text", {
    method: "POST",
    body: JSON.stringify({ text, source_locale }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).detail || "Translation failed");
  }
  const data = await res.json();
  return data.translations as Record<string, string>;
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

export type I18nValues = {
  pt_pt?: string;
  ru?: string;
  es?: string;
};

export interface Service {
  id: string;
  title: string;
  title_i18n: I18nValues;
  description: string | null;
  description_i18n: I18nValues;
  slug: string;
  category: string;
  icon: string | null;
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
  title_i18n?: I18nValues;
  description?: string;
  description_i18n?: I18nValues;
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

// ─── Service field translation (DeepL) ──────────────────────────────────────

export type ServiceTranslatableField = "title" | "description";

/**
 * Translate a single field of a service to all other locales via DeepL.
 * Returns the full updated service row.
 */
export async function translateServiceField(
  serviceId: string,
  options: { field: ServiceTranslatableField; source_locale?: Locale; overwrite?: boolean },
): Promise<Service> {
  const res = await adminFetch(`/services/${serviceId}/translate`, {
    method: "POST",
    body: JSON.stringify({
      field: options.field,
      source_locale: options.source_locale ?? "en",
      overwrite: options.overwrite ?? false,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).detail || "Translation failed");
  }
  return res.json();
}

// ─── Translations (static site copy) ────────────────────────────────────────

export type Locale = "en" | "pt_pt" | "ru" | "es";
export const TRANSLATION_LOCALES: Locale[] = ["en", "pt_pt", "ru", "es"];

export interface Translation {
  id: string;
  namespace: string;
  key: string;
  en: string | null;
  pt_pt: string | null;
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
  pt_pt?: string | null;
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

// ─── Team members ─────────────────────────────────────────────────────────────
// Paste this block at the END of admin-api.ts

export interface TeamMember {
  id: string;
  slug: string;
  name: string;
  role: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function getTeamMembers(): Promise<{ team: TeamMember[] }> {
  const res = await adminFetch("/team");
  if (!res.ok) throw new Error("Failed to fetch team members");
  return res.json();
}

export async function createTeamMember(
  data: Omit<Partial<TeamMember>, "id" | "slug" | "created_at" | "updated_at">,
): Promise<TeamMember> {
  const res = await adminFetch("/team", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).detail || "Failed to create team member");
  }
  return res.json();
}

export async function updateTeamMember(
  id: string,
  data: Partial<TeamMember>,
): Promise<TeamMember> {
  const res = await adminFetch(`/team/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).detail || "Failed to update team member");
  }
  return res.json();
}

export async function deleteTeamMember(id: string): Promise<void> {
  const res = await adminFetch(`/team/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete team member");
}

// ─── Journal (News + Memorandum articles) ───────────────────────────────────

export type ArticleType = "news" | "memorandum";
export type ArticleStatus = "draft" | "published";

export type TiptapDoc = {
  type: "doc";
  content?: unknown[];
} & Record<string, unknown>;

export interface JournalArticle {
  id: string;
  slug: string;
  type: ArticleType;
  status: ArticleStatus;
  kicker: string | null;
  kicker_i18n: I18nValues;
  title: string;
  title_i18n: I18nValues;
  subtitle: string | null;
  subtitle_i18n: I18nValues;
  main_sources: string | null;
  main_sources_i18n: I18nValues;
  body: TiptapDoc | Record<string, never>;
  body_i18n: Record<string, TiptapDoc>;
  cover_image: string | null;
  author: string | null;
  sort_order: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export type JournalTranslatableField = "kicker" | "title" | "subtitle" | "main_sources";

export interface JournalQuery {
  status?: ArticleStatus;
  type?: ArticleType;
  search?: string;
  limit?: number;
  offset?: number;
}

export async function listJournal(
  params: JournalQuery = {},
): Promise<{ articles: JournalArticle[]; total: number }> {
  const q = new URLSearchParams();
  if (params.status) q.set("status", params.status);
  if (params.type) q.set("type", params.type);
  if (params.search) q.set("search", params.search);
  if (params.limit) q.set("limit", String(params.limit));
  if (params.offset) q.set("offset", String(params.offset));
  const qs = q.toString();
  const res = await adminFetch(`/journal${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error("Failed to fetch articles");
  return res.json();
}

export async function getJournalArticle(id: string): Promise<JournalArticle> {
  const res = await adminFetch(`/journal/${id}`);
  if (!res.ok) throw new Error("Failed to fetch article");
  return res.json();
}

export async function createJournalArticle(
  data: Partial<JournalArticle>,
): Promise<JournalArticle> {
  const res = await adminFetch("/journal", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).detail || "Failed to create article");
  }
  return res.json();
}

export async function updateJournalArticle(
  id: string,
  data: Partial<JournalArticle>,
): Promise<JournalArticle> {
  const res = await adminFetch(`/journal/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).detail || "Failed to update article");
  }
  return res.json();
}

export async function deleteJournalArticle(id: string): Promise<void> {
  const res = await adminFetch(`/journal/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete article");
}

export async function translateJournalField(
  id: string,
  options: { field: JournalTranslatableField; source_locale?: Locale; overwrite?: boolean },
): Promise<JournalArticle> {
  const res = await adminFetch(`/journal/${id}/translate`, {
    method: "POST",
    body: JSON.stringify({
      field: options.field,
      source_locale: options.source_locale ?? "en",
      overwrite: options.overwrite ?? false,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).detail || "Translation failed");
  }
  return res.json();
}

export async function translateJournalBody(
  id: string,
  options: { source_locale?: Locale; target_locale: Locale; overwrite?: boolean },
): Promise<JournalArticle> {
  const res = await adminFetch(`/journal/${id}/translate-body`, {
    method: "POST",
    body: JSON.stringify({
      source_locale: options.source_locale ?? "en",
      target_locale: options.target_locale,
      overwrite: options.overwrite ?? false,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).detail || "Body translation failed");
  }
  return res.json();
}

export async function uploadJournalImage(file: File): Promise<{ url: string; path: string }> {
  const token = getToken();
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/admin/journal/upload-image", {
    method: "POST",
    body: form,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (res.status === 401) {
    clearToken();
    window.location.href = "/admin/login";
    throw new Error("Session expired");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).detail || "Upload failed");
  }
  return res.json();
}

// ─── Collecting gallery media (homepage Signature Services block) ────────────

export interface CollectingMediaItem {
  id: string;
  media_type: "image" | "video";
  src: string;
  poster: string | null;
  tag: string | null;
  tag_i18n: I18nValues;
  label: string | null;
  label_i18n: I18nValues;
  sort_order: number;
  is_active: boolean;
  duration_seconds: number | null;
  file_size_bytes: number | null;
  created_at: string;
  updated_at: string;
}

export async function getCollectingMedia(): Promise<{ items: CollectingMediaItem[] }> {
  const res = await adminFetch("/collecting-media");
  if (!res.ok) throw new Error("Failed to fetch gallery items");
  return res.json();
}

export async function createCollectingMedia(
  data: Partial<CollectingMediaItem> & { media_type: "image" | "video"; src: string },
): Promise<CollectingMediaItem> {
  const res = await adminFetch("/collecting-media", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).detail || "Failed to add gallery item");
  }
  return res.json();
}

export async function updateCollectingMedia(
  id: string,
  data: Partial<CollectingMediaItem>,
): Promise<CollectingMediaItem> {
  const res = await adminFetch(`/collecting-media/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).detail || "Failed to update gallery item");
  }
  return res.json();
}

export async function deleteCollectingMedia(id: string) {
  const res = await adminFetch(`/collecting-media/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).detail || "Failed to delete gallery item");
  }
  return res.json();
}

export async function reorderCollectingMedia(
  ids: string[],
): Promise<{ items: CollectingMediaItem[] }> {
  const res = await adminFetch("/collecting-media/reorder", {
    method: "PUT",
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).detail || "Failed to reorder gallery");
  }
  return res.json();
}

export type CollectingTranslatableField = "tag" | "label";

export async function translateCollectingField(
  id: string,
  options: { field: CollectingTranslatableField; source_locale?: Locale; overwrite?: boolean },
): Promise<CollectingMediaItem> {
  const res = await adminFetch(`/collecting-media/${id}/translate`, {
    method: "POST",
    body: JSON.stringify({
      field: options.field,
      source_locale: options.source_locale ?? "en",
      overwrite: options.overwrite ?? false,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).detail || "Translation failed");
  }
  return res.json();
}

export interface CollectingImageUploadResult {
  url: string;
  path: string;
  file_size_bytes: number;
}

export interface CollectingVideoUploadResult {
  url: string;
  path: string;
  poster_url?: string;
  duration_seconds: number | null;
  file_size_bytes: number;
  original_size_bytes: number;
}

/**
 * Multipart upload via XHR so big video files can report progress.
 * `onProgress` receives 0–100 (upload phase only — server-side processing
 * time after 100% is the optimisation pass).
 */
function uploadCollectingFile<T>(
  endpoint: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<T> {
  const token = getToken();
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/admin/collecting-media/${endpoint}`);
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status === 401) {
        clearToken();
        window.location.href = "/admin/login";
        reject(new Error("Session expired"));
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as T);
        } catch {
          reject(new Error("Invalid server response"));
        }
      } else {
        let detail = "Upload failed";
        try {
          detail = JSON.parse(xhr.responseText)?.detail || detail;
        } catch {
          /* keep default */
        }
        reject(new Error(detail));
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed — network error"));
    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  });
}

export function uploadCollectingImage(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<CollectingImageUploadResult> {
  return uploadCollectingFile<CollectingImageUploadResult>("upload-image", file, onProgress);
}

export function uploadCollectingVideo(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<CollectingVideoUploadResult> {
  return uploadCollectingFile<CollectingVideoUploadResult>("upload-video", file, onProgress);
}