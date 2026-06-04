import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createJournalArticle,
  deleteJournalArticle,
  getJournalArticle,
  translateJournalBody,
  translateJournalField,
  updateJournalArticle,
  type ArticleStatus,
  type ArticleType,
  type I18nValues,
  type JournalArticle,
  type JournalTranslatableField,
  type Locale,
  type TiptapDoc,
} from "@/lib/admin-api";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { useUnsavedChanges } from "./UnsavedChangesContext";

const EMPTY_DOC: TiptapDoc = { type: "doc", content: [{ type: "paragraph" }] };

const LOCALES: { code: Locale; short: string; name: string }[] = [
  { code: "en",    short: "EN", name: "English" },
  { code: "pt_pt", short: "PT", name: "Portuguese" },
  { code: "ru",    short: "RU", name: "Русский" },
  { code: "es",    short: "ES", name: "Español" },
];

type PlainField = JournalTranslatableField;

type FormState = {
  type: ArticleType;
  status: ArticleStatus;
  slug: string;
  cover_image: string | null;
  author: string;
  sort_order: number;

  kicker: string;
  kicker_i18n: I18nValues;
  title: string;
  title_i18n: I18nValues;
  subtitle: string;
  subtitle_i18n: I18nValues;
  main_sources: string;
  main_sources_i18n: I18nValues;

  body: TiptapDoc;
  body_i18n: Record<string, TiptapDoc>;
};

const EMPTY_I18N: I18nValues = { pt_pt: "", ru: "", es: "" };

const EMPTY_FORM: FormState = {
  type: "memorandum",
  status: "draft",
  slug: "",
  cover_image: null,
  author: "LUME by Mark",
  sort_order: 0,
  kicker: "",
  kicker_i18n: { ...EMPTY_I18N },
  title: "",
  title_i18n: { ...EMPTY_I18N },
  subtitle: "",
  subtitle_i18n: { ...EMPTY_I18N },
  main_sources: "",
  main_sources_i18n: { ...EMPTY_I18N },
  body: EMPTY_DOC,
  body_i18n: {},
};

function fromArticle(a: JournalArticle): FormState {
  return {
    type: a.type,
    status: a.status,
    slug: a.slug,
    cover_image: a.cover_image,
    author: a.author ?? "",
    sort_order: a.sort_order,
    kicker: a.kicker ?? "",
    kicker_i18n: { ...EMPTY_I18N, ...(a.kicker_i18n ?? {}) },
    title: a.title ?? "",
    title_i18n: { ...EMPTY_I18N, ...(a.title_i18n ?? {}) },
    subtitle: a.subtitle ?? "",
    subtitle_i18n: { ...EMPTY_I18N, ...(a.subtitle_i18n ?? {}) },
    main_sources: a.main_sources ?? "",
    main_sources_i18n: { ...EMPTY_I18N, ...(a.main_sources_i18n ?? {}) },
    body: isUsableDoc(a.body) ? (a.body as TiptapDoc) : EMPTY_DOC,
    body_i18n: a.body_i18n ?? {},
  };
}

function toPayload(s: FormState): Partial<JournalArticle> {
  return {
    type: s.type,
    status: s.status,
    slug: s.slug || undefined,
    cover_image: s.cover_image,
    author: s.author || null,
    sort_order: s.sort_order,
    kicker: s.kicker || null,
    kicker_i18n: s.kicker_i18n,
    title: s.title,
    title_i18n: s.title_i18n,
    subtitle: s.subtitle || null,
    subtitle_i18n: s.subtitle_i18n,
    main_sources: s.main_sources || null,
    main_sources_i18n: s.main_sources_i18n,
    body: s.body,
    body_i18n: s.body_i18n,
  };
}

function isUsableDoc(value: unknown): boolean {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as { type?: string }).type === "doc" &&
      Array.isArray((value as { content?: unknown[] }).content),
  );
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function AdminJournalForm() {
  const { id } = useParams<{ id?: string }>();
  const isNew = !id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setDirty, registerSaveHandler, unregisterSaveHandler } = useUnsavedChanges();
  const dirtyKey = useMemo(() => `journal:${id ?? "new"}`, [id]);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [locale, setLocale] = useState<Locale>("en");
  const [error, setError] = useState("");
  const [savedTick, setSavedTick] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Keep a ref of the latest form so the registered save handler always sees fresh data
  const formRef = useRef(form);
  formRef.current = form;

  const { data: article, isLoading } = useQuery({
    queryKey: ["admin-journal", id],
    queryFn: () => getJournalArticle(id!),
    enabled: !isNew,
  });

  useEffect(() => {
    if (article) setForm(fromArticle(article));
  }, [article]);

  const createM = useMutation({
    mutationFn: createJournalArticle,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["admin-journal"] });
      setDirty(dirtyKey, false);
      // Move to the canonical edit URL
      navigate(`/admin/journal/${created.id}`, { replace: true });
    },
    onError: (e: Error) => setError(e.message),
  });

  const updateM = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<JournalArticle> }) =>
      updateJournalArticle(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["admin-journal"] });
      queryClient.setQueryData(["admin-journal", updated.id], updated);
      setDirty(dirtyKey, false);
      setSavedTick((t) => t + 1);
    },
    onError: (e: Error) => setError(e.message),
  });

  const deleteM = useMutation({
    mutationFn: () => deleteJournalArticle(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-journal"] });
      setDirty(dirtyKey, false);
      navigate("/admin/journal", { replace: true });
    },
  });

  // ─ Save handler exposed to UnsavedChangesContext ────────────────────────
  useEffect(() => {
    const save = async () => {
      setError("");
      const payload = toPayload(formRef.current);
      if (!payload.title?.trim()) {
        throw new Error("Title is required");
      }
      if (isNew) {
        await createJournalArticle(payload);
      } else {
        await updateJournalArticle(id!, payload);
      }
      queryClient.invalidateQueries({ queryKey: ["admin-journal"] });
      setDirty(dirtyKey, false);
    };
    registerSaveHandler(dirtyKey, save);
    return () => unregisterSaveHandler(dirtyKey);
  }, [dirtyKey, id, isNew, queryClient, registerSaveHandler, setDirty, unregisterSaveHandler]);

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(dirtyKey, true);
  }

  function setPlain(field: PlainField, loc: Locale, value: string) {
    if (loc === "en") {
      patch(field, value);
    } else {
      const i18nKey = `${field}_i18n` as keyof FormState;
      const current = (form[i18nKey] as I18nValues) ?? {};
      setForm((prev) => ({
        ...prev,
        [i18nKey]: { ...current, [loc]: value },
      }));
      setDirty(dirtyKey, true);
    }
  }

  function setBody(loc: Locale, doc: TiptapDoc) {
    if (loc === "en") {
      patch("body", doc);
    } else {
      setForm((prev) => ({
        ...prev,
        body_i18n: { ...prev.body_i18n, [loc]: doc },
      }));
      setDirty(dirtyKey, true);
    }
  }

  function getPlain(field: PlainField, loc: Locale): string {
    if (loc === "en") return form[field] as string;
    return ((form[`${field}_i18n` as keyof FormState] as I18nValues)?.[loc as keyof I18nValues] ?? "") as string;
  }

  function getBody(loc: Locale): TiptapDoc {
    if (loc === "en") return form.body;
    const doc = form.body_i18n?.[loc];
    return isUsableDoc(doc) ? (doc as TiptapDoc) : EMPTY_DOC;
  }

  const handleSave = () => {
    setError("");
    const payload = toPayload(form);
    if (!payload.title?.trim()) {
      setError("Title is required");
      return;
    }
    if (isNew) {
      createM.mutate(payload);
    } else {
      updateM.mutate({ id: id!, data: payload });
    }
  };

  const handleTranslateField = async (field: PlainField) => {
    if (isNew || !id) return;
    try {
      const updated = await translateJournalField(id, {
        field,
        source_locale: locale,
        overwrite: false,
      });
      setForm(fromArticle(updated));
      queryClient.setQueryData(["admin-journal", id], updated);
    } catch (e: any) {
      setError(e?.message || "Translation failed");
    }
  };

  const handleTranslateBody = async () => {
    if (isNew || !id) return;
    try {
      const updated = await translateJournalBody(id, { source_locale: "en", overwrite: false });
      setForm(fromArticle(updated));
      queryClient.setQueryData(["admin-journal", id], updated);
    } catch (e: any) {
      setError(e?.message || "Body translation failed");
    }
  };

  if (!isNew && isLoading) {
    return (
      <div className="p-8">
        <p className="text-sm text-admin-text-muted">Loading article…</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <button
            onClick={() => navigate("/admin/journal")}
            className="mb-2 text-xs text-admin-text-muted transition hover:text-admin-text"
          >
            ← All articles
          </button>
          <h1 className="text-2xl font-light text-admin-text">
            {isNew ? "New article" : form.title || "Untitled"}
          </h1>
          <p className="mt-1 text-xs text-admin-text-muted">
            {isNew
              ? "Save first to enable translations and image upload inside the editor."
              : `/${form.slug}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {savedTick > 0 && (
            <span className="text-xs text-admin-text-muted">Saved</span>
          )}
          <select
            value={form.status}
            onChange={(e) => patch("status", e.target.value as ArticleStatus)}
            className="rounded-md border border-admin-border bg-admin-bg px-3 py-1.5 text-sm text-admin-text"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
          <button
            onClick={handleSave}
            disabled={createM.isPending || updateM.isPending}
            className="rounded-md bg-admin-btn px-5 py-2 text-sm font-medium text-white transition hover:bg-admin-btn-hover disabled:opacity-50"
          >
            {createM.isPending || updateM.isPending ? "Saving…" : "Save"}
          </button>
          {!isNew && (
            <button
              onClick={() => setConfirmDelete(true)}
              className="rounded-md border border-red-200 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* ── Top metadata: type, slug, cover, author ───────────────────── */}
      <div className="mb-6 rounded-lg border border-admin-border bg-admin-surface p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-widest text-admin-text-muted">
            Tag
          </span>
          {(["news", "memorandum"] as ArticleType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => patch("type", t)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                form.type === t
                  ? "bg-admin-accent text-white"
                  : "border border-admin-border text-admin-text-secondary hover:bg-admin-bg"
              }`}
            >
              {t === "news" ? "News" : "Memorandum"}
            </button>
          ))}
        </div>

        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-medium text-admin-text-secondary">
            URL slug
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={form.slug}
              onChange={(e) => patch("slug", e.target.value)}
              placeholder="auto-generated from title if empty"
              className="flex-1 rounded-md border border-admin-border bg-admin-bg px-3 py-2 text-sm text-admin-text outline-none focus:border-admin-text-muted"
            />
            <button
              type="button"
              onClick={() => patch("slug", slugify(form.title))}
              disabled={!form.title}
              className="rounded-md border border-admin-border px-3 py-2 text-xs text-admin-text-muted hover:text-admin-text disabled:opacity-50"
            >
              From title
            </button>
          </div>
        </div>

        {isNew ? (
          <p className="text-xs italic text-admin-text-muted">
            Cover image upload is enabled after the first save.
          </p>
        ) : (
          <ImageUploader
            value={form.cover_image}
            onChange={(url) => patch("cover_image", url)}
          />
        )}
      </div>

      {/* ── Translation guide ───────────────────────────────────────────── */}
      <details className="mb-4 rounded-lg border border-admin-border bg-admin-surface">
        <summary className="cursor-pointer select-none px-4 py-2.5 text-xs font-medium text-admin-text-muted hover:text-admin-text">
          ↺ How translations work
        </summary>
        <div className="border-t border-admin-border px-4 py-3 text-xs text-admin-text-muted space-y-1.5">
          <p><span className="font-semibold text-admin-text">1. Save first.</span> Translation buttons are locked on a new article. Save once, then come back to translate.</p>
          <p><span className="font-semibold text-admin-text">2. Plain-text fields</span> (Kicker, Title, Subtitle, Sources) — switch to the locale tab you want to translate <em>from</em>, make sure the field has text, then click <span className="font-mono">↺ Translate</span>. It fills all other locales that are still empty.</p>
          <p><span className="font-semibold text-admin-text">3. Body</span> — always translates from English. Switch to any non-EN tab and click <span className="font-mono">↺ Translate body from EN</span>. The English body must be saved to the database first (save the article after writing the body).</p>
          <p><span className="font-semibold text-admin-text">4. Won't overwrite.</span> Existing translations are never replaced automatically — only empty fields get filled. To redo a translation, clear the field manually first.</p>
          <p><span className="font-semibold text-admin-text">5. Dot indicators</span> on the tabs turn green once the Title for that locale is filled — use them to track progress.</p>
        </div>
      </details>

      {/* ── Locale tabs ─────────────────────────────────────────────────── */}
      <div className="mb-3 flex items-center gap-1 border-b border-admin-border">
        {LOCALES.map((l) => (
          <button
            key={l.code}
            type="button"
            onClick={() => setLocale(l.code)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm transition ${
              locale === l.code
                ? "border-b-2 border-admin-accent text-admin-text"
                : "text-admin-text-muted hover:text-admin-text"
            }`}
          >
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${
                getPlain("title", l.code).trim() ? "bg-green-400" : "bg-admin-border"
              }`}
            />
            {l.name}
          </button>
        ))}
      </div>

      {/* ── Per-locale content ──────────────────────────────────────────── */}
      <div className="rounded-lg border border-admin-border bg-admin-surface p-5">
        <PlainFieldRow
          label="Kicker / eyebrow"
          field="kicker"
          locale={locale}
          value={getPlain("kicker", locale)}
          onChange={(v) => setPlain("kicker", locale, v)}
          onTranslate={() => handleTranslateField("kicker")}
          disabledTranslate={isNew}
          placeholder="e.g. Memorandum #3"
        />
        <PlainFieldRow
          label="Title"
          field="title"
          locale={locale}
          value={getPlain("title", locale)}
          onChange={(v) => setPlain("title", locale, v)}
          onTranslate={() => handleTranslateField("title")}
          disabledTranslate={isNew}
          required
        />
        <PlainFieldRow
          label="Subtitle"
          field="subtitle"
          locale={locale}
          value={getPlain("subtitle", locale)}
          onChange={(v) => setPlain("subtitle", locale, v)}
          onTranslate={() => handleTranslateField("subtitle")}
          disabledTranslate={isNew}
          placeholder="Italic tagline under the title"
        />
        {/* Body editor */}
        <div className="mt-6">
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-xs font-medium text-admin-text-secondary">
              Body
            </label>
            {locale !== "en" && !isNew && (
              <button
                type="button"
                onClick={handleTranslateBody}
                className="rounded border border-admin-accent/50 px-2 py-0.5 text-[11px] text-admin-accent transition hover:bg-admin-accent-soft"
              >
                ↺ Translate body from EN
              </button>
            )}
            {isNew && (
              <span className="text-[11px] italic text-admin-text-muted">
                Save first to enable image upload &amp; translation
              </span>
            )}
          </div>
          <RichTextEditor
            key={`${dirtyKey}:${locale}`}
            storageKey={`${dirtyKey}:${locale}`}
            value={getBody(locale)}
            onChange={(doc) => setBody(locale, doc)}
            placeholder={
              locale === "en"
                ? "Write the article body here. Use the toolbar for formatting, images, and callouts."
                : `Body in ${LOCALES.find((l) => l.code === locale)?.name}.`
            }
          />
        </div>

        <div className="mt-6">
          <PlainFieldRow
            label="Main sources (optional)"
            field="main_sources"
            locale={locale}
            value={getPlain("main_sources", locale)}
            onChange={(v) => setPlain("main_sources", locale, v)}
            onTranslate={() => handleTranslateField("main_sources")}
            disabledTranslate={isNew}
            rows={3}
            placeholder="e.g. Statistics Portugal (INE), Banco de Portugal, Eurostat. Reference period: 2024–2026."
          />
        </div>

        {locale === "en" && (
          <div className="mt-6 border-t border-admin-border pt-5">
            <label className="mb-1.5 block text-xs font-medium text-admin-text-secondary">
              Byline
            </label>
            <input
              type="text"
              value={form.author}
              onChange={(e) => patch("author", e.target.value)}
              className="w-full rounded-md border border-admin-border bg-admin-bg px-3 py-2 text-sm text-admin-text outline-none focus:border-admin-text-muted"
              placeholder="LUME by Mark"
            />
            <p className="mt-1.5 text-[11px] italic text-admin-text-muted">
              Shown as the italic endnote on the article page. Defaults to “LUME by Mark” — edit only if the article is sourced from elsewhere.
            </p>
          </div>
        )}
      </div>

      {/* ── Delete confirm ──────────────────────────────────────────────── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-admin-border bg-admin-surface p-6 shadow-2xl">
            <h3 className="mb-2 text-base font-medium text-admin-text">Delete article?</h3>
            <p className="mb-6 text-sm text-admin-text-muted">
              This permanently removes "{form.title || "Untitled"}".
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                className="rounded-md px-4 py-2 text-sm text-admin-text-muted hover:text-admin-text"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteM.mutate()}
                disabled={deleteM.isPending}
                className="rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
              >
                {deleteM.isPending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Plain text field with locale-aware translate ───────────────────────────

interface PlainFieldRowProps {
  label: string;
  field: PlainField;
  locale: Locale;
  value: string;
  onChange: (v: string) => void;
  onTranslate: () => void;
  disabledTranslate?: boolean;
  rows?: number;
  placeholder?: string;
  required?: boolean;
}

function PlainFieldRow({
  label, field, locale, value, onChange, onTranslate, disabledTranslate, rows, placeholder, required,
}: PlainFieldRowProps) {
  const canTranslate = !disabledTranslate && value.trim().length > 0;
  const inputClass =
    "w-full rounded-md border border-admin-border bg-admin-bg px-3 py-2 text-sm text-admin-text placeholder-admin-text-muted outline-none transition focus:border-admin-text-muted";
  return (
    <div className="mb-4">
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-xs font-medium text-admin-text-secondary">
          {label}
          {required && <span className="ml-0.5 text-red-400">*</span>}
        </label>
        {disabledTranslate ? (
          locale !== "en" && (
            <span className="text-[11px] italic text-admin-text-muted">
              save first to translate
            </span>
          )
        ) : (
          <button
            type="button"
            onClick={onTranslate}
            disabled={!canTranslate}
            title={
              canTranslate
                ? `Translate ${field} from the current locale to the others`
                : "Type some text first"
            }
            className="rounded border border-admin-accent/50 px-2 py-0.5 text-[11px] text-admin-accent transition hover:bg-admin-accent-soft disabled:cursor-not-allowed disabled:opacity-40"
          >
            ↺ Translate
          </button>
        )}
      </div>
      {rows ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          className={`${inputClass} resize-y`}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={inputClass}
        />
      )}
    </div>
  );
}
