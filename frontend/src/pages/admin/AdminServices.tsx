// frontend/src/pages/admin/AdminServices.tsx
// ⚠️  Category values MUST match the Postgres enum exactly:
//     settling_in | health | education | lifestyle | environment | leisure | signature

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getServices,
  createService,
  updateService,
  deleteService,
  translateServiceField,
  type Service,
  type ServiceTranslatableField,
} from "@/lib/admin-api";

// ─── Locale config ────────────────────────────────────────────────────────────

type I18nLocale = "en" | "pt_pt" | "ru" | "es";

const LOCALE_TABS: { code: I18nLocale; short: string; name: string }[] = [
  { code: "en",    short: "EN", name: "English" },
  { code: "pt_pt", short: "PT", name: "Portuguese" },
  { code: "ru",    short: "RU", name: "Русский" },
  { code: "es",    short: "ES", name: "Español" },
];

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: "settling_in",  label: "Settling In"  },
  { value: "health",       label: "Health"       },
  { value: "education",    label: "Education"    },
  { value: "lifestyle",    label: "Lifestyle"    },
  { value: "environment",  label: "Environment" },
  { value: "leisure",      label: "Leisure"      },
  { value: "signature",    label: "Signature services"    },
] as const;

type CategoryValue = (typeof CATEGORIES)[number]["value"];

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c.label])
);

// ─── Form state ───────────────────────────────────────────────────────────────

type I18nValues = { pt_pt?: string; ru?: string; es?: string };

const EMPTY_I18N: I18nValues = { pt_pt: "", ru: "", es: "" };

const EMPTY_FORM = {
  title:            "",
  title_i18n:       { ...EMPTY_I18N } as I18nValues,
  subtitle:         "",
  subtitle_i18n:    { ...EMPTY_I18N } as I18nValues,
  description:      "",
  description_i18n: { ...EMPTY_I18N } as I18nValues,
  category:         "settling_in" as CategoryValue,
  sort_order:       0,
  is_active:        true,
};

type ServiceForm = typeof EMPTY_FORM;

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminServices() {
  const queryClient = useQueryClient();

  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState<ServiceForm>(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-services"],
    queryFn: getServices,
  });
  const services = data?.services || [];

  const grouped = CATEGORIES.map((cat) => ({
    ...cat,
    items: services
      .filter((s) => s.category === cat.value)
      .sort((a, b) => a.sort_order - b.sort_order),
  }));

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-services"] });

  const createM = useMutation({
    mutationFn: createService,
    onSuccess: () => { invalidate(); closeModal(); },
    onError: (e: Error) => setError(e.message),
  });

  const updateM = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Service> }) =>
      updateService(id, data),
    onSuccess: () => { invalidate(); closeModal(); },
    onError: (e: Error) => setError(e.message),
  });

  const deleteM = useMutation({
    mutationFn: deleteService,
    onSuccess: () => { invalidate(); setDeleteId(null); },
  });

  const toggleActive = (s: Service) =>
    updateService(s.id, { is_active: !s.is_active }).then(invalidate);

  function openAdd() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, title_i18n: { ...EMPTY_I18N }, subtitle_i18n: { ...EMPTY_I18N }, description_i18n: { ...EMPTY_I18N } });
    setError("");
    setModal("add");
  }

  function openEdit(s: Service) {
    setEditing(s);
    setForm({
      title:            s.title ?? "",
      title_i18n:       (s.title_i18n as I18nValues) ?? { ...EMPTY_I18N },
      subtitle:         s.subtitle ?? "",
      subtitle_i18n:    (s.subtitle_i18n as I18nValues) ?? { ...EMPTY_I18N },
      description:      s.description ?? "",
      description_i18n: (s.description_i18n as I18nValues) ?? { ...EMPTY_I18N },
      category:         s.category as CategoryValue,
      sort_order:       s.sort_order,
      is_active:        s.is_active,
    });
    setError("");
    setModal("edit");
  }

  function closeModal() {
    setModal(null);
    setEditing(null);
    setError("");
  }

  function handleSave() {
    setError("");
    if (!form.title.trim()) { setError("Service name is required"); return; }
    const payload = {
      title:            form.title,
      title_i18n:       form.title_i18n,
      subtitle:         form.subtitle || null,
      subtitle_i18n:    form.subtitle_i18n,
      description:      form.description || null,
      description_i18n: form.description_i18n,
      category:         form.category,
      sort_order:       form.sort_order,
      is_active:        form.is_active,
    };
    if (modal === "edit" && editing) {
      updateM.mutate({ id: editing.id, data: payload as Partial<Service> });
    } else {
      createM.mutate(payload);
    }
  }

  // After a translate call, patch form state with fresh i18n values
  function onTranslated(updatedService: Service) {
    setForm((prev) => ({
      ...prev,
      title:            updatedService.title ?? prev.title,
      title_i18n:       (updatedService.title_i18n as I18nValues) ?? prev.title_i18n,
      subtitle:         updatedService.subtitle ?? prev.subtitle,
      subtitle_i18n:    (updatedService.subtitle_i18n as I18nValues) ?? prev.subtitle_i18n,
      description:      updatedService.description ?? prev.description,
      description_i18n: (updatedService.description_i18n as I18nValues) ?? prev.description_i18n,
    }));
  }

  const isPending = createM.isPending || updateM.isPending;

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-light text-admin-text">Services</h1>
          <p className="text-sm text-admin-text-muted mt-1">
            Manage which services appear in each section on the site
          </p>
        </div>
        <button
          onClick={openAdd}
          className="rounded-md bg-admin-btn px-4 py-2 text-sm font-medium text-white transition hover:bg-admin-btn-hover"
        >
          + Add Service
        </button>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-sm text-admin-text-muted">Loading…</div>
      ) : (
        <div className="space-y-8">
          {grouped.map((cat) => (
            <div key={cat.value}>
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-admin-text-muted">
                  {cat.label}
                </h2>
                <span className="text-xs text-admin-text-muted bg-admin-bg px-2 py-0.5 rounded-full border border-admin-border">
                  {cat.items.length}
                </span>
              </div>

              <div className="rounded-lg border border-admin-border bg-admin-surface overflow-hidden">
                {cat.items.length === 0 ? (
                  <p className="px-5 py-4 text-sm text-admin-text-muted italic">
                    No services yet — add one above.
                  </p>
                ) : (
                  <table className="w-full text-sm">
                    <tbody>
                      {cat.items.map((s, i) => (
                        <tr
                          key={s.id}
                          className={`flex items-center gap-4 px-5 py-3 ${
                            i !== cat.items.length - 1
                              ? "border-b border-admin-border-light"
                              : ""
                          }`}
                        >
                          <span className="w-5 text-center text-xs text-admin-text-muted select-none">
                            {s.sort_order || i + 1}
                          </span>
                          <span
                            className={`flex-1 ${
                              s.is_active
                                ? "text-admin-text"
                                : "text-admin-text-muted line-through"
                            }`}
                          >
                            {s.title}
                          </span>
                          {/* Show translation coverage indicator */}
                          <span className="flex gap-0.5" title="Translation coverage">
                            {(["pt_pt","ru","es"] as const).map(loc => (
                              <span
                                key={loc}
                                className={`inline-block h-1.5 w-1.5 rounded-full ${
                                  (s.title_i18n as any)?.[loc]
                                    ? "bg-green-400"
                                    : "bg-admin-border"
                                }`}
                                title={loc}
                              />
                            ))}
                          </span>
                          <button
                            onClick={() => toggleActive(s)}
                            title={s.is_active ? "Active — click to hide" : "Hidden — click to show"}
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition ${
                              s.is_active
                                ? "bg-admin-accent-soft text-admin-accent"
                                : "bg-admin-bg text-admin-text-muted border border-admin-border"
                            }`}
                          >
                            {s.is_active ? "Active" : "Hidden"}
                          </button>
                          <button
                            onClick={() => openEdit(s)}
                            className="text-xs text-admin-text-muted hover:text-admin-text-secondary transition px-2 py-1 rounded hover:bg-admin-bg"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteId(s.id)}
                            className="text-xs text-red-400 hover:text-red-600 transition px-2 py-1 rounded hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add / Edit Modal ────────────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-admin-border bg-admin-surface shadow-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-light text-admin-text">
                {modal === "edit" ? "Edit Service" : "Add Service"}
              </h2>
              {modal === "edit" && editing && (
                <p className="text-xs text-admin-text-muted">ID: {editing.id}</p>
              )}
            </div>

            {error && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </div>
            )}

            {modal === "edit" && editing && (
              <p className="mb-4 text-xs text-admin-text-muted">
                Enter text in any language tab, then click ↺ Translate to fill the others via DeepL.
              </p>
            )}

            {/* Service name — multilingual */}
            <LocalizedServiceField
              label="Service name"
              fieldName="title"
              form={form}
              setForm={setForm}
              serviceId={editing?.id}
              onTranslated={onTranslated}
              required
              placeholder="e.g. Yacht Charters"
            />

            {/* Subtitle — multilingual */}
            <LocalizedServiceField
              label="Subtitle / tagline"
              fieldName="subtitle"
              form={form}
              setForm={setForm}
              serviceId={editing?.id}
              onTranslated={onTranslated}
              placeholder="Short tagline shown on service detail pages"
            />

            {/* Description — multilingual */}
            <LocalizedServiceField
              label="Description"
              fieldName="description"
              form={form}
              setForm={setForm}
              serviceId={editing?.id}
              onTranslated={onTranslated}
              rows={4}
              placeholder="2–3 sentence description for the service detail page"
            />

            {/* Section */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-admin-text-secondary mb-1.5">
                Section <span className="text-red-400">*</span>
              </label>
              <select
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value as CategoryValue }))
                }
                className="w-full rounded-md border border-admin-border bg-admin-bg px-3 py-2 text-sm text-admin-text outline-none transition focus:border-admin-text-muted"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-admin-text-muted">
                Controls which column this service appears in on the website.
              </p>
            </div>

            {/* Sort order */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-admin-text-secondary mb-1.5">
                Display order
              </label>
              <input
                type="number"
                min={0}
                value={form.sort_order}
                onChange={(e) =>
                  setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))
                }
                className="w-32 rounded-md border border-admin-border bg-admin-bg px-3 py-2 text-sm text-admin-text outline-none transition focus:border-admin-text-muted"
              />
              <p className="mt-1.5 text-xs text-admin-text-muted">
                Lower numbers appear first.
              </p>
            </div>

            {/* Visible toggle */}
            <div className="mb-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
                className={`relative h-5 w-9 rounded-full transition-colors ${
                  form.is_active ? "bg-admin-accent" : "bg-admin-border"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    form.is_active ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
              <span className="text-sm text-admin-text-secondary">
                {form.is_active ? "Visible on site" : "Hidden from site"}
              </span>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="rounded-md px-4 py-2 text-sm text-admin-text-muted hover:text-admin-text transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isPending}
                className="rounded-md bg-admin-btn px-5 py-2 text-sm font-medium text-white transition hover:bg-admin-btn-hover disabled:opacity-50"
              >
                {isPending ? "Saving…" : modal === "edit" ? "Save changes" : "Add service"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ──────────────────────────────────────────────── */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-admin-border bg-admin-surface shadow-2xl p-6">
            <h3 className="text-base font-medium text-admin-text mb-2">Delete service?</h3>
            <p className="text-sm text-admin-text-muted mb-6">
              This will remove it from the site immediately. You can always add it back later.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="rounded-md px-4 py-2 text-sm text-admin-text-muted hover:text-admin-text transition"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteM.mutate(deleteId)}
                disabled={deleteM.isPending}
                className="rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600 disabled:opacity-50"
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

/* ─────────────────────────────────────────────────────────────────────────
   LocalizedServiceField — language-tab input with DeepL translate button
   (parallel to LocalizedField in AdminListingForm)
───────────────────────────────────────────────────────────────────────── */

interface LocalizedServiceFieldProps {
  label: string;
  fieldName: ServiceTranslatableField;
  form: ServiceForm;
  setForm: React.Dispatch<React.SetStateAction<ServiceForm>>;
  serviceId?: string;       // undefined → new service (translate disabled)
  onTranslated: (updated: Service) => void;
  rows?: number;            // provided → textarea; omitted → text input
  placeholder?: string;
  required?: boolean;
}

function LocalizedServiceField({
  label, fieldName, form, setForm, serviceId, onTranslated, rows, placeholder, required,
}: LocalizedServiceFieldProps) {
  const [locale, setLocale] = useState<I18nLocale>("en");
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState("");

  const i18nKey = `${fieldName}_i18n` as keyof ServiceForm;

  const value =
    locale === "en"
      ? String(form[fieldName] ?? "")
      : String((form[i18nKey] as I18nValues | undefined)?.[locale as keyof I18nValues] ?? "");

  const hasContent = (loc: I18nLocale) => {
    if (loc === "en") return Boolean(String(form[fieldName] ?? "").trim());
    return Boolean(
      String((form[i18nKey] as I18nValues | undefined)?.[loc as keyof I18nValues] ?? "").trim()
    );
  };

  const onChange = (v: string) => {
    if (locale === "en") {
      setForm((prev) => ({ ...prev, [fieldName]: v }));
    } else {
      setForm((prev) => ({
        ...prev,
        [i18nKey]: { ...(prev[i18nKey] as I18nValues), [locale]: v },
      }));
    }
  };

  const handleTranslate = async () => {
    if (!serviceId) return;
    setTranslating(true);
    setTranslateError("");
    try {
      const updated = await translateServiceField(serviceId, {
        field: fieldName,
        source_locale: locale,
        overwrite: false,
      });
      onTranslated(updated);
    } catch (e: any) {
      setTranslateError(e.message || "Translation failed");
    } finally {
      setTranslating(false);
    }
  };

  const canTranslate = Boolean(serviceId) && value.trim().length > 0;

  const inputClass =
    "w-full rounded-md border border-admin-border bg-admin-bg px-3 py-2 text-sm text-admin-text placeholder-admin-text-muted outline-none transition focus:border-admin-text-muted";

  return (
    <div className="mb-4">
      {/* Header: label left, locale tabs + translate button right */}
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 min-h-[24px]">
        <label className="text-xs font-medium text-admin-text-secondary">
          {label}
          {required && <span className="ml-0.5 text-red-400">*</span>}
        </label>

        <div className="flex items-center gap-1">
          {LOCALE_TABS.map(({ code, short, name }) => (
            <button
              key={code}
              type="button"
              title={name}
              onClick={() => setLocale(code)}
              className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium transition ${
                locale === code
                  ? "bg-admin-accent text-white"
                  : "text-admin-text-muted hover:text-admin-text"
              }`}
            >
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${
                  hasContent(code) ? "bg-green-400" : "bg-admin-border"
                }`}
              />
              {short}
            </button>
          ))}

          {serviceId ? (
            <button
              type="button"
              onClick={handleTranslate}
              disabled={!canTranslate || translating}
              title={
                canTranslate
                  ? `Translate from ${LOCALE_TABS.find(t => t.code === locale)?.name} to all other languages via DeepL`
                  : "Enter text in this locale first"
              }
              className="ml-1.5 rounded border border-admin-accent/50 px-2 py-0.5 text-[11px] text-admin-accent transition hover:bg-admin-accent-soft disabled:cursor-not-allowed disabled:opacity-40"
            >
              {translating ? "Translating…" : "↺ Translate"}
            </button>
          ) : (
            locale !== "en" && (
              <span className="ml-1.5 text-[10px] italic text-admin-text-muted">
                save first to translate
              </span>
            )
          )}
        </div>
      </div>

      {rows ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={rows}
          placeholder={
            locale !== "en" && placeholder
              ? `${placeholder} (${LOCALE_TABS.find(t => t.code === locale)?.name})`
              : placeholder
          }
          className={`${inputClass} resize-y`}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={
            locale !== "en" && placeholder
              ? `${placeholder} (${LOCALE_TABS.find(t => t.code === locale)?.name})`
              : placeholder
          }
          className={inputClass}
        />
      )}

      {translateError && (
        <p className="mt-1 text-xs text-red-500">{translateError}</p>
      )}
    </div>
  );
}