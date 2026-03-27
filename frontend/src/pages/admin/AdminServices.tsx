// frontend/src/pages/admin/AdminServices.tsx
// ⚠️  Category values MUST match the Postgres enum exactly:
//     administrative | healthcare_family | home | investment_advisory

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getServices,
  createService,
  updateService,
  deleteService,
  type Service,
} from "@/lib/admin-api";

const CATEGORIES = [
  { value: "administrative",      label: "Administrative" },
  { value: "healthcare_family",   label: "Healthcare & Family" },
  { value: "home",                label: "Home & Lifestyle" },
  { value: "investment_advisory", label: "Investment Advisory" },
] as const;

type CategoryValue = (typeof CATEGORIES)[number]["value"];

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c.label])
);

const EMPTY_FORM = {
  title: "",
  category: "administrative" as CategoryValue,
  sort_order: 0,
  is_active: true,
};

export default function AdminServices() {
  const queryClient = useQueryClient();

  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
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
    setForm(EMPTY_FORM);
    setError("");
    setModal("add");
  }

  function openEdit(s: Service) {
    setEditing(s);
    setForm({
      title: s.title,
      category: s.category as CategoryValue,
      sort_order: s.sort_order,
      is_active: s.is_active,
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
    if (modal === "edit" && editing) {
      updateM.mutate({ id: editing.id, data: form });
    } else {
      createM.mutate(form);
    }
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

      {/* Add / Edit Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-admin-border bg-admin-surface shadow-2xl p-6">
            <h2 className="text-lg font-light text-admin-text mb-5">
              {modal === "edit" ? "Edit Service" : "Add Service"}
            </h2>

            {error && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-xs font-medium text-admin-text-secondary mb-1.5">
                Service name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Yacht Charters"
                className="w-full rounded-md border border-admin-border bg-admin-bg px-3 py-2 text-sm text-admin-text placeholder-admin-text-muted outline-none transition focus:border-admin-text-muted"
                autoFocus
              />
            </div>

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

      {/* Delete Confirm */}
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