// frontend/src/pages/admin/AdminTranslations.tsx
//
// CMS for site copy.  Each row is keyed on (namespace, key) and stores the
// same string in 4 locales.  The "Translate" button takes whichever locale
// is populated (English by default), runs DeepL, and fills in the rest.

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  TRANSLATION_LOCALES,
  type Locale,
  type Translation,
  deleteTranslation,
  getTranslations,
  translateRow,
  updateTranslation,
  upsertTranslation,
} from "@/lib/admin-api";

const LOCALE_LABEL: Record<Locale, string> = {
  en: "English",
  pt_br: "Português (BR)",
  ru: "Русский",
  es: "Español",
};

const EMPTY_FORM = {
  namespace: "",
  key: "",
  en: "",
  pt_br: "",
  ru: "",
  es: "",
};

export default function AdminTranslations() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [namespace, setNamespace] = useState<string>("");
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<Translation | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-translations"],
    queryFn: () => getTranslations(),
  });
  const rows = data?.translations ?? [];

  const namespaces = useMemo(
    () => Array.from(new Set(rows.map((r) => r.namespace))).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (namespace && r.namespace !== namespace) return false;
      if (!s) return true;
      return (
        r.key.toLowerCase().includes(s) ||
        r.namespace.toLowerCase().includes(s) ||
        (r.en ?? "").toLowerCase().includes(s)
      );
    });
  }, [rows, search, namespace]);

  const grouped = useMemo(() => {
    const map = new Map<string, Translation[]>();
    for (const r of filtered) {
      const arr = map.get(r.namespace) ?? [];
      arr.push(r);
      map.set(r.namespace, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.key.localeCompare(b.key));
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-translations"] });
    queryClient.invalidateQueries({ queryKey: ["translations"] });
  };

  const upsertM = useMutation({
    mutationFn: upsertTranslation,
    onSuccess: () => {
      invalidate();
      closeModal();
    },
    onError: (e: Error) => setError(e.message),
  });

  const updateM = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Translation> }) =>
      updateTranslation(id, data),
    onSuccess: () => {
      invalidate();
      closeModal();
    },
    onError: (e: Error) => setError(e.message),
  });

  const deleteM = useMutation({
    mutationFn: deleteTranslation,
    onSuccess: () => {
      invalidate();
      setDeleteId(null);
    },
  });

  const translateM = useMutation({
    mutationFn: (id: string) => translateRow(id),
    onMutate: (id) => setTranslatingId(id),
    onSettled: () => setTranslatingId(null),
    onSuccess: invalidate,
    onError: (e: Error) => setError(e.message),
  });

  function openAdd() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, namespace: namespace || "" });
    setError("");
    setModal("add");
  }

  function openEdit(row: Translation) {
    setEditing(row);
    setForm({
      namespace: row.namespace,
      key: row.key,
      en: row.en ?? "",
      pt_br: row.pt_br ?? "",
      ru: row.ru ?? "",
      es: row.es ?? "",
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
    if (!form.namespace.trim() || !form.key.trim()) {
      setError("Namespace and key are required.");
      return;
    }
    if (modal === "edit" && editing) {
      updateM.mutate({
        id: editing.id,
        data: {
          en: form.en,
          pt_br: form.pt_br,
          ru: form.ru,
          es: form.es,
        },
      });
    } else {
      upsertM.mutate({
        namespace: form.namespace.trim(),
        key: form.key.trim(),
        en: form.en,
        pt_br: form.pt_br,
        ru: form.ru,
        es: form.es,
      });
    }
  }

  const isPending = upsertM.isPending || updateM.isPending;

  return (
    <div className="p-8 max-w-7xl">
      <div className="flex items-start justify-between gap-6 mb-6">
        <div>
          <h1 className="text-2xl font-light text-admin-text">Translations</h1>
          <p className="text-sm text-admin-text-muted mt-1">
            All site copy in {TRANSLATION_LOCALES.length} languages. Press
            <span className="mx-1 inline-flex items-center rounded bg-admin-accent-soft px-1.5 py-0.5 text-[10px] font-medium text-admin-accent">
              Translate
            </span>
            on a row to fill the missing locales via DeepL.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="rounded-md bg-admin-btn px-4 py-2 text-sm font-medium text-white transition hover:bg-admin-btn-hover whitespace-nowrap"
        >
          + Add String
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-3 items-center">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search keys or English text..."
          className="flex-1 min-w-[240px] rounded-md border border-admin-border bg-admin-surface px-3 py-2 text-sm text-admin-text placeholder-admin-text-muted outline-none transition focus:border-admin-text-muted"
        />
        <select
          value={namespace}
          onChange={(e) => setNamespace(e.target.value)}
          className="rounded-md border border-admin-border bg-admin-surface px-3 py-2 text-sm text-admin-text outline-none focus:border-admin-text-muted"
        >
          <option value="">All sections</option>
          {namespaces.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-sm text-admin-text-muted">
          Loading…
        </div>
      ) : grouped.length === 0 ? (
        <div className="rounded-lg border border-admin-border bg-admin-surface p-10 text-center text-sm text-admin-text-muted">
          No translations yet. Click "Add String" to create one.
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(([ns, items]) => (
            <div key={ns}>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-admin-text-muted mb-3">
                {ns}
              </h2>
              <div className="rounded-lg border border-admin-border bg-admin-surface overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-admin-border-light bg-admin-surface-hover">
                      <th className="px-4 py-2 text-left text-[11px] font-medium text-admin-text-muted uppercase tracking-wider w-40">
                        Key
                      </th>
                      {TRANSLATION_LOCALES.map((l) => (
                        <th
                          key={l}
                          className="px-4 py-2 text-left text-[11px] font-medium text-admin-text-muted uppercase tracking-wider"
                        >
                          {l.toUpperCase().replace("_", "-")}
                        </th>
                      ))}
                      <th className="px-4 py-2 w-56" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-admin-border-light last:border-0 hover:bg-admin-surface-hover"
                      >
                        <td className="px-4 py-3 align-top text-admin-text font-medium">
                          {row.key}
                        </td>
                        {TRANSLATION_LOCALES.map((l) => {
                          const value = (row[l] ?? "").trim();
                          return (
                            <td
                              key={l}
                              className={`px-4 py-3 align-top text-xs ${
                                value
                                  ? "text-admin-text-secondary"
                                  : "text-admin-text-muted italic"
                              }`}
                            >
                              {value
                                ? value.length > 90
                                  ? value.slice(0, 90) + "…"
                                  : value
                                : "—"}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 align-top text-right whitespace-nowrap">
                          <button
                            onClick={() => translateM.mutate(row.id)}
                            disabled={translatingId === row.id}
                            className="text-xs text-admin-accent hover:underline px-2 py-1 disabled:opacity-50"
                            title="Auto-fill missing locales via DeepL"
                          >
                            {translatingId === row.id ? "Translating…" : "Translate"}
                          </button>
                          <button
                            onClick={() => openEdit(row)}
                            className="text-xs text-admin-text-muted hover:text-admin-text-secondary transition px-2 py-1"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteId(row.id)}
                            className="text-xs text-red-400 hover:text-red-600 transition px-2 py-1"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-admin-border bg-admin-surface shadow-2xl p-6">
            <h2 className="text-lg font-light text-admin-text mb-5">
              {modal === "edit" ? "Edit String" : "Add String"}
            </h2>

            {error && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-admin-text-secondary mb-1.5">
                  Section / namespace <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.namespace}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, namespace: e.target.value }))
                  }
                  placeholder="e.g. about, nav, team.mark"
                  disabled={modal === "edit"}
                  className="w-full rounded-md border border-admin-border bg-admin-bg px-3 py-2 text-sm text-admin-text outline-none transition focus:border-admin-text-muted disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-admin-text-secondary mb-1.5">
                  Key <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.key}
                  onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
                  placeholder="e.g. title, intro_p1"
                  disabled={modal === "edit"}
                  className="w-full rounded-md border border-admin-border bg-admin-bg px-3 py-2 text-sm text-admin-text outline-none transition focus:border-admin-text-muted disabled:opacity-60"
                />
              </div>
            </div>

            {TRANSLATION_LOCALES.map((l) => (
              <div className="mb-4" key={l}>
                <label className="block text-xs font-medium text-admin-text-secondary mb-1.5">
                  {LOCALE_LABEL[l]}
                </label>
                <textarea
                  rows={3}
                  value={form[l]}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, [l]: e.target.value }))
                  }
                  className="w-full rounded-md border border-admin-border bg-admin-bg px-3 py-2 text-sm text-admin-text placeholder-admin-text-muted outline-none transition focus:border-admin-text-muted"
                />
              </div>
            ))}

            <p className="text-xs text-admin-text-muted mb-5">
              Tip: leave the other locales empty and use the
              <span className="mx-1 font-medium text-admin-accent">Translate</span>
              button on the row to fill them with DeepL.
            </p>

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
                {isPending
                  ? "Saving…"
                  : modal === "edit"
                  ? "Save changes"
                  : "Add string"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-admin-border bg-admin-surface shadow-2xl p-6">
            <h3 className="text-base font-medium text-admin-text mb-2">
              Delete this string?
            </h3>
            <p className="text-sm text-admin-text-muted mb-6">
              The site will fall back to the key itself if no replacement exists.
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
