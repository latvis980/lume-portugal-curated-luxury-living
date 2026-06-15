// frontend/src/pages/admin/AdminContactPage.tsx
//
// CMS for the Contact section on the homepage.
// Mirrors the AdminAbout pattern: section tabs, four locale tabs per field,
// auto-save on blur, Save button per field. No DeepL translate button —
// copy in this section is short and the phone/address aren't translatable.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getTranslations,
  updateTranslation,
  upsertTranslation,
  type Translation,
  type Locale,
} from "@/lib/admin-api";
import { useUnsavedChanges } from "./UnsavedChangesContext";

// ─── Locale config ────────────────────────────────────────────────────────────

const LOCALE_TABS: { code: Locale; short: string; name: string }[] = [
  { code: "en",    short: "EN", name: "English" },
  { code: "pt_pt", short: "PT", name: "Português (PT)" },
  { code: "ru",    short: "RU", name: "Русский" },
  { code: "es",    short: "ES", name: "Español" },
];

// ─── Section config ────────────────────────────────────────────────────────────

interface FieldDef {
  key: string;
  label: string;
  rows: number;
  hint?: string;
  singleLocale?: boolean; // when true: only EN tab shown (phone, address, URL)
}
interface SectionDef { id: string; label: string; fields: FieldDef[] }

const SECTIONS: SectionDef[] = [
  {
    id: "copy",
    label: "Section copy",
    fields: [
      { key: "eyebrow", label: "Eyebrow", rows: 1, hint: 'Small all-caps label above the headline (e.g. "Contact")' },
      { key: "title",   label: "Headline", rows: 1, hint: "Large heading displayed above the form" },
      { key: "intro",   label: "Intro paragraph", rows: 2, hint: "Short paragraph below the headline" },
    ],
  },
  {
    id: "form",
    label: "Form labels",
    fields: [
      { key: "name_placeholder",    label: "Name field placeholder",    rows: 1 },
      { key: "email_placeholder",   label: "Email field placeholder",   rows: 1 },
      { key: "phone_placeholder",   label: "Phone field placeholder",   rows: 1 },
      { key: "message_placeholder", label: "Message field placeholder", rows: 1 },
      { key: "submit",              label: "Submit button label",       rows: 1 },
      { key: "submitting",          label: "Submit button (loading)",   rows: 1, hint: "Shown while the form is being sent" },
      { key: "error_fallback",      label: "Generic error message",     rows: 1, hint: "Shown if the server returns an error" },
      { key: "thank_you_title",     label: "Thank-you heading",        rows: 1, hint: "Shown after successful submission" },
      { key: "thank_you_body",      label: "Thank-you body",           rows: 2, hint: "Shown below the thank-you heading" },
    ],
  },
  {
    id: "contact_info",
    label: "Contact info",
    fields: [
      { key: "phone_label",     label: "Phone section label",  rows: 1, hint: "Small uppercase label displayed above the phone number on the live site" },
      { key: "whatsapp_label",  label: "WhatsApp tooltip",     rows: 1, hint: "Accessible label / tooltip for the WhatsApp icon next to the phone number" },
      { key: "email_label",     label: "Email section label",  rows: 1, hint: "Small uppercase label displayed above the email address on the live site" },
      { key: "address_label",   label: "Address section label", rows: 1, hint: "Small uppercase label displayed above the street address on the live site" },
      { key: "map_link",        label: '"View on map" link text', rows: 1, hint: 'Clickable text below the address that opens Google Maps' },
      { key: "phone",           label: "Phone number",         rows: 1, singleLocale: true, hint: "Displayed on the homepage and used for the tel: and WhatsApp links. Include country code, e.g. +351 912 345 678" },
      { key: "email",           label: "Email address",        rows: 1, singleLocale: true, hint: "Displayed on the homepage and used for the mailto: link, e.g. hello@lume.pt" },
      { key: "address",         label: "Street address",       rows: 2, singleLocale: true, hint: "Displayed on the homepage. Line breaks are preserved." },
      { key: "maps_url",        label: "Google Maps URL",      rows: 1, singleLocale: true, hint: 'Full URL for the "View on map" link, e.g. https://maps.google.com/?q=...' },
    ],
  },
];

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdminContactPage() {
  const qc = useQueryClient();
  const [activeSection, setActiveSection] = useState("copy");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-contact-translations"],
    queryFn: () => getTranslations({ namespace: "contact" }),
  });

  const rowMap = useMemo(() => {
    const map: Record<string, Translation> = {};
    for (const row of data?.translations ?? []) map[row.key] = row;
    return map;
  }, [data]);

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["admin-contact-translations"] });
    qc.invalidateQueries({ queryKey: ["translations"] });
  }, [qc]);

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-light text-admin-text">Contact Block</h1>
        <p className="text-sm text-admin-text-muted mt-1">
          Edit the content shown in the Contact section at the bottom of the homepage.
          The Save button activates when you make changes to a field.
        </p>
      </div>

      {/* Section tabs */}
      <div className="mb-8 flex gap-1 overflow-x-auto border-b border-admin-border pb-px">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`whitespace-nowrap rounded-t px-3 py-2 text-xs font-medium transition ${
              activeSection === s.id
                ? "border border-admin-border border-b-admin-bg -mb-px bg-admin-surface text-admin-text"
                : "text-admin-text-muted hover:text-admin-text-secondary"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-sm text-admin-text-muted">Loading…</div>
      ) : (
        <>
          {SECTIONS.map((section) => (
            <div
              key={section.id}
              className={activeSection === section.id ? "space-y-6" : "hidden"}
            >
              {section.fields.map((field) => (
                <TranslationField
                  key={field.key}
                  label={field.label}
                  hint={field.hint}
                  row={rowMap[field.key]}
                  rows={field.rows}
                  singleLocale={field.singleLocale}
                  onSaved={invalidate}
                />
              ))}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ─── TranslationField ─────────────────────────────────────────────────────────
// Locale-tab field with explicit Save button. No DeepL translate button.
// For singleLocale fields (phone, address, maps_url) only the EN tab is shown
// since those values don't vary by language.

interface TranslationFieldProps {
  label: string;
  hint?: string;
  row: Translation | undefined;
  rows: number;
  singleLocale?: boolean;
  onSaved: () => void;
}

function TranslationField({ label, hint, row, rows, singleLocale, onSaved }: TranslationFieldProps) {
  const [locale, setLocale] = useState<Locale>("en");
  const [localValue, setLocalValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState("");

  const { setDirty, registerSaveHandler, unregisterSaveHandler } = useUnsavedChanges();

  const contextKey = row?.id ?? `pending:${label}`;
  const storedValue = row?.[singleLocale ? "en" : locale] ?? "";
  const activeLocale = singleLocale ? "en" : locale;

  useEffect(() => { setLocalValue(storedValue); }, [storedValue, activeLocale]);

  const isDirty = localValue !== storedValue;

  const handleSave = async () => {
    if (!row) return;
    setSaving(true);
    setError("");
    try {
      await updateTranslation(row.id, { [activeLocale]: localValue });
      onSaved();
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
      setDirty(contextKey, false);
    } catch (e: any) {
      setError(e.message || "Save failed");
      throw e;
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!row) return;
    registerSaveHandler(contextKey, handleSave);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextKey, localValue, activeLocale, row?.id]);

  useEffect(() => {
    if (!row) return;
    setDirty(contextKey, isDirty);
  }, [contextKey, isDirty, row?.id]); // eslint-disable-line

  useEffect(() => {
    return () => { if (row) unregisterSaveHandler(row.id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row?.id]);

  const hasContent = (loc: Locale) => !!(row?.[loc] ?? "").trim();
  const visibleTabs = singleLocale ? LOCALE_TABS.slice(0, 1) : LOCALE_TABS;

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 min-h-[24px]">
        <div>
          <label className="text-xs font-medium text-admin-text-secondary">{label}</label>
          {hint && <p className="text-[10px] text-admin-text-muted mt-0.5">{hint}</p>}
        </div>

        <div className="flex items-center gap-1">
          {/* Locale tabs */}
          {visibleTabs.map(({ code, short, name }) => (
            <button
              key={code}
              type="button"
              title={name}
              onClick={() => !singleLocale && setLocale(code)}
              className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium transition ${
                (singleLocale ? code === "en" : locale === code)
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

          {/* Status flash */}
          <span className="ml-1 min-w-[44px] text-[10px] text-admin-text-muted text-right">
            {saving ? "Saving…" : savedFlash ? "✓ Saved" : ""}
          </span>

          {/* Save button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !row || !isDirty}
            title={isDirty ? "Save this field" : "No unsaved changes"}
            className={`ml-1 rounded border px-2 py-0.5 text-[11px] font-medium transition ${
              isDirty
                ? "border-admin-btn bg-admin-btn text-white hover:bg-admin-btn-hover"
                : "border-admin-border bg-transparent text-admin-text-muted opacity-50 cursor-default"
            }`}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <textarea
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        rows={rows}
        placeholder={
          !row
            ? "Field not found — check database migration was run"
            : singleLocale
              ? "Value…"
              : locale !== "en"
                ? `${LOCALE_TABS.find((t) => t.code === locale)?.name} translation…`
                : "English text…"
        }
        disabled={!row}
        className={`w-full resize-y rounded-md border px-3 py-2 text-sm text-admin-text placeholder-admin-text-muted outline-none transition focus:border-admin-text-muted disabled:opacity-50 bg-admin-surface ${
          isDirty ? "border-admin-accent/60" : "border-admin-border"
        }`}
      />

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
