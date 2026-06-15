// frontend/src/pages/admin/AdminAbout.tsx
//
// Human-friendly CMS for the About page.
// Each field shows 4 locale tabs (EN / PT / RU / ES) with a Translate
// button that calls DeepL via the existing /api/admin/translations/:id/translate
// endpoint. Edits are auto-saved on blur — no separate Save button needed.
// Team members can be added, edited and deleted, with their bios managed
// here too (bios live in the translations table under namespace team.<slug>).

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getTranslations,
  updateTranslation,
  translateRow,
  getTeamMembers,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
  upsertTranslation,
  type Translation,
  type Locale,
  type TeamMember,
} from "@/lib/admin-api";
import { useUnsavedChanges } from "./UnsavedChangesContext";

// ─── Locale config ────────────────────────────────────────────────────────────

const LOCALE_TABS: { code: Locale; short: string; name: string }[] = [
  { code: "en",    short: "EN", name: "English" },
  { code: "pt_pt", short: "PT", name: "Português (PT)" },
  { code: "ru",    short: "RU", name: "Русский" },
  { code: "es",    short: "ES", name: "Español" },
];

// ─── About page section config ────────────────────────────────────────────────
// Mirrors the structure of AboutPage.tsx so editors can see how keys map to
// what they see on the live site.

interface FieldDef { key: string; label: string; rows: number; hint?: string }
interface SectionDef { id: string; label: string; fields: FieldDef[] }

const SECTIONS: SectionDef[] = [
  {
    id: "hero",
    label: "Hero",
    fields: [
      { key: "eyebrow",  label: "Eyebrow text",  rows: 1, hint: "Small all-caps label above the title (e.g. About LUME)" },
      { key: "title",    label: "Page title",     rows: 2, hint: "Large headline displayed over the cover image" },
    ],
  },
  {
    id: "intro",
    label: "Intro",
    fields: [
      { key: "tagline",  label: "Tagline",   rows: 3, hint: "Large italic quote below the cover — the brand statement" },
      { key: "intro_p1", label: "Paragraph 1", rows: 3 },
      { key: "intro_p2", label: "Paragraph 2", rows: 3 },
      { key: "intro_p3", label: "Paragraph 3", rows: 3 },
    ],
  },
  {
    id: "what_we_do",
    label: "What We Do",
    fields: [
      { key: "what_we_do_title",       label: "Section title",    rows: 1 },
      { key: "what_we_do_lead",        label: "Lead line",        rows: 1 },
      { key: "what_we_do_homes",       label: "Homes layer",      rows: 2 },
      { key: "what_we_do_living",      label: "Living layer",     rows: 2 },
      { key: "what_we_do_collecting",  label: "Collecting layer", rows: 2 },
      { key: "what_we_do_outro",       label: "Closing line",     rows: 2 },
    ],
  },
  {
    id: "how_we_work",
    label: "How We Work",
    fields: [
      { key: "how_we_work_title", label: "Section title", rows: 1 },
      { key: "how_we_work_p1",    label: "Paragraph 1",   rows: 2 },
      { key: "how_we_work_p2",    label: "Paragraph 2",   rows: 3 },
      { key: "how_we_work_p3",    label: "Paragraph 3",   rows: 2 },
    ],
  },
  {
    id: "why_lume",
    label: "Why LUME",
    fields: [
      { key: "why_lume_title", label: "Section title", rows: 1 },
      { key: "why_lume_p1",    label: "Paragraph 1",   rows: 3 },
      { key: "why_lume_p2",    label: "Paragraph 2",   rows: 3 },
    ],
  },
  {
    id: "goal",
    label: "Our Goal",
    fields: [
      { key: "goal_title", label: "Section title",  rows: 1 },
      { key: "goal_p1",    label: "Quote paragraph", rows: 2 },
      { key: "goal_p2",    label: "Closing line",    rows: 2 },
    ],
  },
  {
    id: "team",
    label: "Team",
    fields: [
      { key: "team_eyebrow", label: "Eyebrow",       rows: 1 },
      { key: "team_title",   label: "Section title", rows: 1 },
    ],
  },
];

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdminAbout() {
  const qc = useQueryClient();
  const [activeSection, setActiveSection] = useState("hero");
  const [memberModal, setMemberModal] = useState<"add" | "edit" | null>(null);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // ── Fetch about translations ────────────────────────────────────────────────
  const { data: aboutData, isLoading: loadingAbout } = useQuery({
    queryKey: ["admin-about-translations"],
    queryFn: () => getTranslations({ namespace: "about" }),
  });

  // ── Fetch all translations (for team bios — namespace team.<slug>) ──────────
  const { data: allData } = useQuery({
    queryKey: ["admin-all-translations"],
    queryFn: () => getTranslations(),
    staleTime: 0,
  });

  // ── Fetch team members ──────────────────────────────────────────────────────
  const { data: teamData, isLoading: loadingTeam } = useQuery({
    queryKey: ["admin-team"],
    queryFn: getTeamMembers,
  });

  // ── Build lookup maps ───────────────────────────────────────────────────────

  // key → translation row for namespace "about"
  const aboutMap = useMemo(() => {
    const map: Record<string, Translation> = {};
    for (const row of aboutData?.translations ?? []) map[row.key] = row;
    return map;
  }, [aboutData]);

  // "team.<slug>" → bio translation row
  const bioMap = useMemo(() => {
    const map: Record<string, Translation> = {};
    for (const row of allData?.translations ?? []) {
      if (row.namespace.startsWith("team.") && row.key === "bio") {
        map[row.namespace] = row;
      }
    }
    return map;
  }, [allData]);

  const team = useMemo(
    () => [...(teamData?.team ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    [teamData],
  );

  const invalidateAll = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["admin-about-translations"] });
    qc.invalidateQueries({ queryKey: ["admin-all-translations"] });
    qc.invalidateQueries({ queryKey: ["translations"] }); // public cache
  }, [qc]);

  const currentSection = SECTIONS.find((s) => s.id === activeSection)!;

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-light text-admin-text">Company</h1>
        <p className="text-sm text-admin-text-muted mt-1">
          Edit content in any language. Click{" "}
          <span className="inline-flex items-center rounded bg-admin-accent-soft px-1.5 py-0.5 text-[10px] font-medium text-admin-accent">
            ↺ Translate
          </span>{" "}
          on any field to auto-fill the other languages via DeepL.
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

      {loadingAbout ? (
        <div className="py-20 text-center text-sm text-admin-text-muted">Loading…</div>
      ) : (
        <>
          {/* ── Content fields — all sections always mounted, inactive ones hidden ── */}
          {/* Keeping them mounted preserves dirty state when switching tabs.          */}
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
                  row={aboutMap[field.key]}
                  rows={field.rows}
                  onSaved={invalidateAll}
                />
              ))}
            </div>
          ))}

          {/* ── Team members (only shown in "team" section) ── */}
          {activeSection === "team" && (
            <div className="mt-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium text-admin-text">
                  Team members
                </h2>
                <button
                  onClick={() => { setEditingMember(null); setMemberModal("add"); }}
                  className="rounded-md bg-admin-btn px-3 py-1.5 text-xs font-medium text-white transition hover:bg-admin-btn-hover"
                >
                  + Add member
                </button>
              </div>

              {loadingTeam ? (
                <p className="text-sm text-admin-text-muted">Loading…</p>
              ) : team.length === 0 ? (
                <p className="text-sm text-admin-text-muted italic">
                  No team members yet.
                </p>
              ) : (
                <div className="space-y-6">
                  {team.map((member) => (
                    <TeamMemberRow
                      key={member.id}
                      member={member}
                      bioRow={bioMap[`team.${member.slug}`]}
                      onEdit={() => { setEditingMember(member); setMemberModal("edit"); }}
                      onDelete={() => setDeleteConfirm(member.id)}
                      onBioSaved={invalidateAll}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Add / Edit member modal ── */}
      {memberModal && (
        <MemberModal
          mode={memberModal}
          member={editingMember}
          onClose={() => { setMemberModal(null); setEditingMember(null); }}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["admin-team"] });
            qc.invalidateQueries({ queryKey: ["admin-all-translations"] });
          }}
        />
      )}

      {/* ── Delete confirm ── */}
      {deleteConfirm && (
        <DeleteMemberModal
          memberId={deleteConfirm}
          memberName={team.find((m) => m.id === deleteConfirm)?.name ?? ""}
          onClose={() => setDeleteConfirm(null)}
          onDeleted={() => {
            setDeleteConfirm(null);
            qc.invalidateQueries({ queryKey: ["admin-team"] });
          }}
        />
      )}
    </div>
  );
}

// ─── TranslationField ─────────────────────────────────────────────────────────
// Locale-tab field with explicit Save button (always visible, muted when clean)
// and DeepL translate button. Registers dirty state + save handler with the
// global UnsavedChangesContext so AdminLayout can intercept navigation.

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

  // Unique key for this field in the context (row.id once loaded, else label)
  const contextKey = row?.id ?? `pending:${label}`;

  // Sync localValue when row or locale changes
  const storedValue = row?.[locale] ?? "";
  useEffect(() => { setLocalValue(storedValue); }, [storedValue, locale]);

  const isDirty = localValue !== storedValue;

  // ── Save handler ──────────────────────────────────────────────────────────
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
      throw e; // re-throw so saveAll() in context can catch
    } finally {
      setSaving(false);
    }
  };

  // ── Register / unregister with global context ─────────────────────────────
  // Re-register whenever localValue or locale changes so the handler always
  // captures the latest unsaved text.
  useEffect(() => {
    if (!row) return;
    registerSaveHandler(contextKey, handleSave);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextKey, localValue, locale, row?.id]);

  useEffect(() => {
    if (!row) return;
    setDirty(contextKey, isDirty);
  }, [contextKey, isDirty, row?.id]); // eslint-disable-line

  // Cleanup on unmount — unregister handler but PRESERVE dirty state in context
  // so switching sections doesn't lose the "you have unsaved changes" flag.
  useEffect(() => {
    return () => { if (row) unregisterSaveHandler(row.id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row?.id]);

  // ── Translate ─────────────────────────────────────────────────────────────
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
      {/* Header: label + locale tabs + status + buttons */}
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 min-h-[24px]">
        <div>
          <label className="text-xs font-medium text-admin-text-secondary">{label}</label>
          {hint && <p className="text-[10px] text-admin-text-muted mt-0.5">{hint}</p>}
        </div>

        <div className="flex items-center gap-1">
          {/* Locale tabs */}
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

          {/* Status flash */}
          <span className="ml-1 min-w-[44px] text-[10px] text-admin-text-muted text-right">
            {translating ? "Translating…" : saving ? "Saving…" : savedFlash ? "✓ Saved" : ""}
          </span>

          {/* Save button — always visible; muted/disabled when nothing to save */}
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

          {/* Translate button */}
          <button
            type="button"
            onClick={handleTranslate}
            disabled={!canTranslate || translating || !row}
            title={
              !row ? "Field not found in database"
              : canTranslate
                ? `Translate from ${LOCALE_TABS.find(t => t.code === locale)?.name} to all others via DeepL`
                : "Enter text first"
            }
            className="ml-1 rounded border border-admin-accent/50 px-2 py-0.5 text-[11px] text-admin-accent transition hover:bg-admin-accent-soft disabled:cursor-not-allowed disabled:opacity-40"
          >
            {translating ? "…" : "↺ Translate"}
          </button>
        </div>
      </div>

      {/* Textarea — accent border when dirty */}
      <textarea
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        rows={rows}
        placeholder={
          !row
            ? "Field not found — check database migration was run"
            : locale !== "en"
              ? `${LOCALE_TABS.find(t => t.code === locale)?.name} translation…`
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

// ─── TeamMemberRow ────────────────────────────────────────────────────────────

interface TeamMemberRowProps {
  member: TeamMember;
  bioRow: Translation | undefined;
  onEdit: () => void;
  onDelete: () => void;
  onBioSaved: () => void;
}

function TeamMemberRow({ member, bioRow, onEdit, onDelete, onBioSaved }: TeamMemberRowProps) {
  const initials = member.name
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="rounded-lg border border-admin-border bg-admin-surface p-5">
      {/* Member header */}
      <div className="flex items-start gap-4 mb-5">
        {/* Avatar */}
        <div className="h-12 w-12 flex-shrink-0 rounded-full bg-admin-bg border border-admin-border overflow-hidden flex items-center justify-center">
          {member.image_url ? (
            <img src={member.image_url} alt={member.name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-sm font-light text-admin-text-muted">{initials}</span>
          )}
        </div>

        {/* Name + role */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-admin-text">{member.name}</p>
          {member.role && (
            <p className="text-xs text-admin-text-muted mt-0.5">{member.role}</p>
          )}
          <p className="text-[10px] text-admin-text-muted mt-1">
            Order: {member.sort_order} · {member.is_active ? "Visible" : "Hidden"}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="rounded px-2.5 py-1 text-xs text-admin-text-muted border border-admin-border hover:text-admin-text hover:bg-admin-bg transition"
          >
            Edit profile
          </button>
          <button
            onClick={onDelete}
            className="rounded px-2.5 py-1 text-xs text-red-400 hover:text-red-600 transition"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Bio — multilingual */}
      <TranslationField
        label="Bio"
        hint={`Bio for ${member.name}. Press Enter twice to start a new paragraph — blank lines become paragraph breaks on the live page.`}
        row={bioRow}
        rows={10}
        onSaved={onBioSaved}
      />
    </div>
  );
}

// ─── MemberModal ─────────────────────────────────────────────────────────────

interface MemberModalProps {
  mode: "add" | "edit";
  member: TeamMember | null;
  onClose: () => void;
  onSaved: () => void;
}

const EMPTY_MEMBER_FORM = {
  name: "", role: "", image_url: "", sort_order: 0, is_active: true,
};

function MemberModal({ mode, member, onClose, onSaved }: MemberModalProps) {
  const [form, setForm] = useState(
    member
      ? { name: member.name, role: member.role ?? "", image_url: member.image_url ?? "", sort_order: member.sort_order, is_active: member.is_active }
      : { ...EMPTY_MEMBER_FORM },
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!form.name.trim()) { setError("Name is required"); return; }
    setSaving(true);
    setError("");
    try {
      const payload = {
        name:      form.name.trim(),
        role:      form.role.trim() || null,
        image_url: form.image_url.trim() || null,
        sort_order: Number(form.sort_order),
        is_active: form.is_active,
      };
      if (mode === "edit" && member) {
        await updateTeamMember(member.id, payload);
      } else {
        const created = await createTeamMember(payload);
        // Auto-create the bio translation row (empty English placeholder)
        if (created?.slug) {
          await upsertTranslation({
            namespace: `team.${created.slug}`,
            key: "bio",
            en: "",
          });
        }
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const set = (k: string, v: any) => setForm((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl border border-admin-border bg-admin-surface shadow-2xl p-6">
        <h2 className="text-lg font-light text-admin-text mb-5">
          {mode === "edit" ? "Edit team member" : "Add team member"}
        </h2>

        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <FormField label="Name *">
            <input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Mark"
              className={inputClass}
              autoFocus
            />
          </FormField>

          <FormField label="Role / title">
            <input
              type="text"
              value={form.role}
              onChange={(e) => set("role", e.target.value)}
              placeholder="e.g. Founder"
              className={inputClass}
            />
          </FormField>

          <FormField label="Photo URL">
            <input
              type="text"
              value={form.image_url}
              onChange={(e) => set("image_url", e.target.value)}
              placeholder="https://..."
              className={inputClass}
            />
          </FormField>

          {form.image_url && (
            <div className="flex justify-center">
              <img
                src={form.image_url}
                alt="Preview"
                className="h-20 w-20 rounded-full object-cover border border-admin-border"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
          )}

          <FormField label="Display order">
            <input
              type="number"
              min={0}
              value={form.sort_order}
              onChange={(e) => set("sort_order", e.target.value)}
              className="w-24 rounded-md border border-admin-border bg-admin-bg px-3 py-2 text-sm text-admin-text outline-none focus:border-admin-text-muted"
            />
            <p className="mt-1 text-[10px] text-admin-text-muted">Lower = appears first</p>
          </FormField>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => set("is_active", !form.is_active)}
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
        </div>

        {mode === "add" && (
          <p className="mt-4 text-[11px] text-admin-text-muted">
            After saving, edit the team member's bio in the team section below.
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm text-admin-text-muted hover:text-admin-text transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-admin-btn px-5 py-2 text-sm font-medium text-white transition hover:bg-admin-btn-hover disabled:opacity-50"
          >
            {saving ? "Saving…" : mode === "edit" ? "Save changes" : "Add member"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DeleteMemberModal ────────────────────────────────────────────────────────

function DeleteMemberModal({ memberId, memberName, onClose, onDeleted }: {
  memberId: string; memberName: string; onClose: () => void; onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteTeamMember(memberId);
      onDeleted();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-admin-border bg-admin-surface shadow-2xl p-6">
        <h3 className="text-base font-medium text-admin-text mb-2">Remove {memberName}?</h3>
        <p className="text-sm text-admin-text-muted mb-6">
          This removes them from the About page. Their bio translation will remain in the database.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm text-admin-text-muted hover:text-admin-text transition"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600 disabled:opacity-50"
          >
            {deleting ? "Removing…" : "Remove"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Local primitives ─────────────────────────────────────────────────────────

const inputClass =
  "w-full rounded-md border border-admin-border bg-admin-bg px-3 py-2 text-sm text-admin-text placeholder-admin-text-muted outline-none transition focus:border-admin-text-muted";

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-admin-text-secondary">{label}</label>
      {children}
    </div>
  );
}