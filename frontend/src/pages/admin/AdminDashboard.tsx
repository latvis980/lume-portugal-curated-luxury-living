// frontend/src/pages/admin/AdminDashboard.tsx
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getStats, getListings } from "@/lib/admin-api";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading } = useQuery({ queryKey: ["admin-stats"], queryFn: getStats });
  const { data: recentData } = useQuery({ queryKey: ["admin-listings-recent"], queryFn: () => getListings({ limit: 5 }) });
  const recentListings = recentData?.listings || [];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-light text-admin-text">Dashboard</h1>
        <p className="text-sm text-admin-text-muted mt-1">Overview of your content</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <StatCard label="Total Listings" value={stats?.total_listings ?? "—"} loading={statsLoading} />
        <StatCard label="Available" value={stats?.available_listings ?? "—"} loading={statsLoading} accent />
        <StatCard label="Leads and clients" value={stats?.total_contacts ?? "—"} loading={statsLoading} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-admin-text-secondary">Recent Listings</h2>
          <button onClick={() => navigate("/admin/listings")} className="text-xs text-admin-text-muted hover:text-admin-text-secondary transition">
            View all →
          </button>
        </div>

        {recentListings.length === 0 ? (
          <div className="rounded-lg border border-admin-border bg-admin-surface p-8 text-center">
            <p className="text-sm text-admin-text-muted mb-3">No listings yet</p>
            <button onClick={() => navigate("/admin/listings/new")} className="rounded-md bg-admin-btn px-4 py-2 text-sm font-medium text-white transition hover:bg-admin-btn-hover">
              Create your first listing
            </button>
          </div>
        ) : (
          <div className="rounded-lg border border-admin-border bg-admin-surface overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-admin-border-light bg-admin-surface-hover">
                  <TH>Property</TH><TH>Location</TH><TH>Price</TH><TH>Status</TH>
                </tr>
              </thead>
              <tbody>
                {recentListings.map((l: any) => (
                  <tr key={l.id} onClick={() => navigate(`/admin/listings/${l.id}`)} className="border-b border-admin-border-light last:border-0 cursor-pointer transition hover:bg-admin-surface-hover">
                    <td className="px-4 py-3">
                      <div className="font-medium text-admin-text">{l.title}</div>
                      <div className="text-xs text-admin-text-muted">{l.reference}</div>
                    </td>
                    <td className="px-4 py-3 text-admin-text-secondary">{l.city}{l.area ? `, ${l.area}` : ""}</td>
                    <td className="px-4 py-3 text-admin-text">{l.price ? `€${Number(l.price).toLocaleString()}` : "—"}</td>
                    <td className="px-4 py-3"><StatusBadge status={l.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function TH({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-left text-xs font-medium text-admin-text-muted uppercase tracking-wider">{children}</th>;
}

function StatCard({ label, value, loading, accent }: { label: string; value: string | number; loading?: boolean; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-admin-border bg-admin-surface p-5">
      <p className="text-xs text-admin-text-muted uppercase tracking-wider mb-2">{label}</p>
      <p className={`text-3xl font-light ${accent ? "text-admin-accent" : "text-admin-text"}`}>
        {loading ? "..." : value}
      </p>
    </div>
  );
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
