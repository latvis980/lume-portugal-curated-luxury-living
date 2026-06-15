// frontend/src/pages/admin/AdminListings.tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getListings, deleteListing } from "@/lib/admin-api";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "available", label: "Available" },
  { value: "reserved", label: "Reserved" },
  { value: "sold", label: "Sold" },
  { value: "rented", label: "Rented" },
  { value: "off_market", label: "Off market" },
];

export default function AdminListings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-listings", status, search],
    queryFn: () => getListings({ status: status || undefined, search: search || undefined, limit: 100 }),
  });

  const deleteM = useMutation({
    mutationFn: deleteListing,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-listings"] }); setDeleteId(null); },
  });

  const listings = data?.listings || [];
  const total = data?.total ?? 0;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-light text-admin-text">Homes / Properties</h1>
          <p className="text-sm text-admin-text-muted mt-1">{total} total</p>
        </div>
        <button onClick={() => navigate("/admin/listings/new")} className="rounded-md bg-admin-btn px-4 py-2 text-sm font-medium text-white transition hover:bg-admin-btn-hover">
          + New Listing
        </button>
      </div>

      <div className="flex gap-3 mb-6">
        <input type="text" placeholder="Search title, reference, city..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="flex-1 max-w-sm rounded-md border border-admin-border bg-admin-surface px-3 py-2 text-sm text-admin-text placeholder-admin-text-muted outline-none transition focus:border-admin-text-muted" />
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-admin-border bg-admin-surface px-3 py-2 text-sm text-admin-text-secondary outline-none transition focus:border-admin-text-muted">
          {STATUS_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-sm text-admin-text-muted">Loading...</div>
      ) : listings.length === 0 ? (
        <div className="rounded-lg border border-admin-border bg-admin-surface p-12 text-center">
          <p className="text-sm text-admin-text-muted mb-3">{search || status ? "No listings match your filters" : "No listings yet"}</p>
          {!search && !status && (
            <button onClick={() => navigate("/admin/listings/new")} className="rounded-md bg-admin-btn px-4 py-2 text-sm font-medium text-white transition hover:bg-admin-btn-hover">
              Create your first listing
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-admin-border bg-admin-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-admin-border-light bg-admin-surface-hover">
                <TH>Ref</TH><TH>Property</TH><TH>Type</TH><TH>Location</TH>
                <TH className="text-right">Price</TH><TH className="text-center">Beds</TH><TH>Status</TH><TH className="text-right">Actions</TH>
              </tr>
            </thead>
            <tbody>
              {listings.map((l: any) => (
                <tr key={l.id} className="border-b border-admin-border-light last:border-0 transition hover:bg-admin-surface-hover">
                  <td className="px-4 py-3 text-xs text-admin-text-muted font-mono">{l.reference}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => navigate(`/admin/listings/${l.id}`)} className="font-medium text-admin-text hover:text-admin-btn text-left transition">
                      {l.title}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-admin-text-secondary capitalize text-xs">{l.property_type?.replace("_", " ")}</td>
                  <td className="px-4 py-3 text-admin-text-secondary">{l.city}{l.area ? `, ${l.area}` : ""}</td>
                  <td className="px-4 py-3 text-right text-admin-text tabular-nums">{l.price ? `€${Number(l.price).toLocaleString()}` : "—"}</td>
                  <td className="px-4 py-3 text-center text-admin-text-secondary">{l.bedrooms ?? "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={l.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => navigate(`/admin/listings/${l.id}`)} className="rounded px-2 py-1 text-xs text-admin-text-secondary transition hover:bg-admin-surface-hover hover:text-admin-text">Edit</button>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteId(l.id); }} className="rounded px-2 py-1 text-xs text-admin-text-muted transition hover:bg-red-50 hover:text-red-500">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-sm rounded-lg border border-admin-border bg-admin-surface p-6 shadow-lg">
            <h3 className="text-sm font-medium text-admin-text mb-2">Delete listing?</h3>
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

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    available: "bg-emerald-50 text-emerald-700 border-emerald-200",
    draft: "bg-stone-100 text-stone-500 border-stone-200",
    reserved: "bg-amber-50 text-amber-700 border-amber-200",
    sold: "bg-blue-50 text-blue-700 border-blue-200",
    rented: "bg-blue-50 text-blue-700 border-blue-200",
    off_market: "bg-red-50 text-red-600 border-red-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${colors[status] || colors.draft}`}>
      {status?.replace("_", " ")}
    </span>
  );
}
