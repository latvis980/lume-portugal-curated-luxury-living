// frontend/src/pages/admin/AdminContacts.tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getContacts, deleteContact } from "@/lib/admin-api";

export default function AdminContacts() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-contacts", source, search],
    queryFn: () => getContacts({ source: source || undefined, search: search || undefined, limit: 100 }),
  });

  const deleteM = useMutation({
    mutationFn: deleteContact,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-contacts"] }); setDeleteId(null); },
  });

  const contacts = data?.contacts || [];
  const total = data?.total ?? 0;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-light text-admin-text">Contacts</h1>
        <p className="text-sm text-admin-text-muted mt-1">{total} total</p>
      </div>

      <div className="flex gap-3 mb-6">
        <input type="text" placeholder="Search email or name..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="flex-1 max-w-sm rounded-md border border-admin-border bg-admin-surface px-3 py-2 text-sm text-admin-text placeholder-admin-text-muted outline-none transition focus:border-admin-text-muted" />
        <select value={source} onChange={(e) => setSource(e.target.value)}
          className="rounded-md border border-admin-border bg-admin-surface px-3 py-2 text-sm text-admin-text-secondary outline-none transition focus:border-admin-text-muted">
          <option value="">All sources</option>
          <option value="questionnaire">Questionnaire</option>
          <option value="private_access">Contact form</option>
          <option value="newsletter">Newsletter</option>
        </select>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-sm text-admin-text-muted">Loading...</div>
      ) : contacts.length === 0 ? (
        <div className="rounded-lg border border-admin-border bg-admin-surface p-12 text-center">
          <p className="text-sm text-admin-text-muted">No contacts yet</p>
        </div>
      ) : (
        <div className="rounded-lg border border-admin-border bg-admin-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-admin-border-light bg-admin-surface-hover">
                <TH>Email</TH><TH>Name</TH><TH>Source</TH><TH>Date</TH><TH className="text-right">Actions</TH>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c: any) => (
                <tbody key={c.id}>
                  <tr onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                    className="border-b border-admin-border-light last:border-0 transition hover:bg-admin-surface-hover cursor-pointer">
                    <td className="px-4 py-3 text-admin-text">{c.email}</td>
                    <td className="px-4 py-3 text-admin-text-secondary">{c.name || "—"}</td>
                    <td className="px-4 py-3"><SourceBadge source={c.source} /></td>
                    <td className="px-4 py-3 text-admin-text-muted text-xs">{c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={(e) => { e.stopPropagation(); setDeleteId(c.id); }}
                        className="rounded px-2 py-1 text-xs text-admin-text-muted transition hover:bg-red-50 hover:text-red-500">Delete</button>
                    </td>
                  </tr>
                  {expanded === c.id && (
                    <tr className="border-b border-admin-border-light">
                      <td colSpan={5} className="px-4 py-4 bg-admin-surface-hover">
                        <div className="space-y-2 text-xs">
                          {c.phone && <div><span className="text-admin-text-muted">Phone:</span> <span className="text-admin-text-secondary">{c.phone}</span></div>}
                          {c.message && <div><span className="text-admin-text-muted">Message:</span> <span className="text-admin-text-secondary">{c.message}</span></div>}
                          {c.questionnaire_answers && <div>
                            <span className="text-admin-text-muted">Questionnaire:</span>
                            <pre className="mt-1 text-admin-text-secondary bg-admin-bg rounded p-2 overflow-x-auto">{JSON.stringify(c.questionnaire_answers, null, 2)}</pre>
                          </div>}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-sm rounded-lg border border-admin-border bg-admin-surface p-6 shadow-lg">
            <h3 className="text-sm font-medium text-admin-text mb-2">Delete contact?</h3>
            <p className="text-sm text-admin-text-secondary mb-6">This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteId(null)} className="rounded-md border border-admin-border px-3 py-1.5 text-sm text-admin-text-secondary transition hover:bg-admin-surface-hover">Cancel</button>
              <button onClick={() => deleteM.mutate(deleteId)} disabled={deleteM.isPending} className="rounded-md bg-red-500 px-3 py-1.5 text-sm text-white transition hover:bg-red-600 disabled:opacity-50">
                {deleteM.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TH({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-3 text-left text-xs font-medium text-admin-text-muted uppercase tracking-wider ${className}`}>{children}</th>;
}

function SourceBadge({ source }: { source: string }) {
  const colors: Record<string, string> = {
    questionnaire: "bg-purple-50 text-purple-700 border-purple-200",
    private_access: "bg-sky-50 text-sky-700 border-sky-200",
    newsletter: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
  const labels: Record<string, string> = {
    questionnaire: "questionnaire",
    private_access: "contact form",
    newsletter: "newsletter",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${colors[source] || "bg-stone-100 text-stone-500 border-stone-200"}`}>
      {labels[source] ?? source?.replace(/_/g, " ") ?? "unknown"}
    </span>
  );
}
