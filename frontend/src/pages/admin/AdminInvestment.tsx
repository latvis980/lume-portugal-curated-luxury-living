// frontend/src/pages/admin/AdminInvestment.tsx
//
// CMS for the Investment section on the homepage. Mirrors the AdminAbout
// pattern: section tabs, four locale tabs per field with a DeepL translate
// button, explicit Save button per field, and unsaved-changes guard.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getTranslations,
  updateTranslation,
  translateRow,
  type Translation,
  type Locale,
} from "@/lib/admin-api";
import { useUnsavedChanges } from "./UnsavedChangesContext";

const LOCALE_TABS: { code: Locale; short: string; name: string }[] = [
  { code: "en",    short: "EN", name: "English" },
  { code: "pt_pt", short: "PT", name: "Português (PT)" },
  { code: "ru",    short: "RU", name: "Русский" },
  { code: "es",    short: "ES", name: "Español" },
];

interface FieldDef { key: string; label: string; rows: number; hint?: string }
interface SectionDef { id: string; label: string; fields: FieldDef[] }

const SECTIONS: SectionDef[] = [
  {
    id: "header",
    label: "Header",
    fields: [
      { key: "eyebrow", label: "Eyebrow",      rows: 1, hint: 'Small all-caps label above the heading (e.g. "Quiet Opportunities")' },
      { key: "heading", label: "Main heading", rows: 2, hint: "Large headline at the top of the section" },
    ],
  },
  {
    id: "block1",
    label: "Block 01",
    fields: [
      { key: "block1.heading", label: "Heading",     rows: 1 },
      { key: "block1.p1",      label: "Paragraph 1", rows: 2 },
      { key: "block1.p2",      label: "Paragraph 2", rows: 2 },
      { key: "block1.p3",      label: "Paragraph 3", rows: 2 },
    ],
  },
  {
    id: "block2",
    label: "Block 02",
    fields: [
      { key: "block2.heading",        label: "Heading",          rows: 1 },
      { key: "block2.p1.before_link", label: "Text before link", rows: 2, hint: "Sentence opening — the inline link follows this text. Mind trailing spaces." },
      { key: "block2.link_label",     label: "Inline link label", rows: 1, hint: 'The clickable word inside the paragraph (e.g. "Mark")' },
      { key: "block2.p1.after_link",  label: "Text after link",  rows: 2, hint: "Continuation of the sentence after the inline link. Mind leading spaces / punctuation." },
      { key: "block2.p2",             label: "Paragraph 2",      rows: 2 },
    ],
  },
  {
    id: "block3",
    label: "Block 03",
    fields: [
      { key: "block3.heading", label: "Heading",  rows: 1 },
      { key: "block3.bullet1", label: "Bullet 1", rows: 1 },
      { key: "block3.bullet2", label: "Bullet 2", rows: 1 },
      { key: "block3.bullet3", label: "Bullet 3", rows: 1 },
      { key: "block3.bullet4", label: "Bullet 4", rows: 1 },
    ],
  },
  {
    id: "quote",
    label: "Quote",
    fields: [
      { key: "quote.line1", label: "Line 1", rows: 2 },
      { key: "quote.line2", label: "Line 2", rows: 2 },
    ],
  },
  {
    id: "cta",
    label: "Call to action",
    fields: [
      { key: "cta.heading",     label: "CTA heading",      rows: 2 },
      { key: "cta.body.line1",  label: "Body line 1",      rows: 2 },
      { key: "cta.body.line2",  label: "Body line 2",      rows: 2 },
      { key: "cta.button",      label: "Button label",     rows: 1 },
      { key: "cta.button_aria", label: "Button aria-label", rows: 1, hint: "Accessible label read by screen readers when the button is focused" },
      { key: "cta.url_label",   label: "Link label",       rows: 1, hint: 'Small caption below the button (e.g. "onemark.pt")' },
    ],
  },
];

export default function AdminInvestment() {
  const qc = useQueryClient();
  const [activeSection, setActiveSection] = useState("header");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-investment-translations"],
    queryFn: () => getTranslations({ namespace: "investment" }),
  });

  const rowMap = useMemo(() => {
    const map: Record<string, Translation> = {};
    for (const row of data?.translations ?? []) map[row.key] = row;
    return map;
  }, [data]);

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["admin-investment-translations"] });
    qc.invalidateQueries({ queryKey: ["translations"] });
  }, [qc]);

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-light text-admin-text">Investment section</h1>
        <p className="text-sm text-admin-text-muted mt-1">
          Edit the Investment section shown on the homepage. Click{" "}
          <span className="inline-flex items-center rounded bg-admin-accent-soft px-1.5 py-0.5 text-[10px] font-medium text-admin-accent">
            ↺ Translate
          </span>{" "}
          on any field to auto-fill the other languages via DeepL.
          The Save button activates when you make changes to a field.
        </p>
      </div>

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

interface TranslationFieldProps {
  label: string;
  hint?: string;
  row: Translation | undefined;
  rows: number;
  onSaved: () => void;
}

function TranslationField({ label, hint, row, rows, onSaved }: TranslationFieldProps) {
  const [locale, setLocale] = useState<Locale>("en");
  const [localValue, setLocalValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState("");

  const { setDirty, registerSaveHandler, unregisterSaveHandler } = useUnsavedChanges();

  const contextKey = row?.id ?? `pending:${label}`;
  const storedValue = row?.[locale] ?? "";

  useEffect(() => { setLocalValue(storedValue); }, [storedValue, locale]);

  const isDirty = localValue !== storedValue;

  const handleSave = async () => {
    if (!row) return;
    setSaving(true);
    setError("");
    try {
      await updateTranslation(row.id, { [locale]: localValue });
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
  }, [contextKey, localValue, locale, row?.id]);

  useEffect(() => {
    if (!row) return;
    setDirty(contextKey, isDirty);
  }, [contextKey, isDirty, row?.id]); // eslint-disable-line

  useEffect(() => {
    return () => { if (row) unregisterSaveHandler(row.id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row?.id]);

  const handleTranslate = async () => {
    if (!row) return;
    if (isDirty) {
      try { await updateTranslation(row.id, { [locale]: localValue }); }
      catch { /* ignore */ }
    }
    setTranslating(true);
    setError("");
    try {
      await translateRow(row.id, { source: locale, overwrite: false });
      onSaved();
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
      setDirty(contextKey, false);
    } catch (e: any) {
      setError(e.message || "Translation failed");
    } finally {
      setTranslating(false);
    }
  };

  const hasContent = (loc: Locale) => !!(row?.[loc] ?? "").trim();
  const canTranslate = !!(localValue.trim() || storedValue.trim());

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 min-h-[24px]">
        <div>
          <label className="text-xs font-medium text-admin-text-secondary">{label}</label>
          {hint && <p className="text-[10px] text-admin-text-muted mt-0.5">{hint}</p>}
        </div>

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

          <span className="ml-1 min-w-[44px] text-[10px] text-admin-text-muted text-right">
            {translating ? "Translating…" : saving ? "Saving…" : savedFlash ? "✓ Saved" : ""}
          </span>

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

          <button
            type="button"
            onClick={handleTranslate}
            disabled={!canTranslate || translating || !row}
            title={
              !row ? "Field not found in database"
              : canTranslate
                ? `Translate from ${LOCALE_TABS.find((t) => t.code === locale)?.name} to all others via DeepL`
                : "Enter text first"
            }
            className="ml-1 rounded border border-admin-accent/50 px-2 py-0.5 text-[11px] text-admin-accent transition hover:bg-admin-accent-soft disabled:cursor-not-allowed disabled:opacity-40"
          >
            {translating ? "…" : "↺ Translate"}
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
