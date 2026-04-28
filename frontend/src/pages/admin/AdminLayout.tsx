// frontend/src/pages/admin/AdminLayout.tsx
import { useEffect, useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { isAuthenticated, clearToken, verifyAuth } from "@/lib/admin-api";

const NAV_ITEMS = [
  { to: "/admin",              label: "Dashboard",    icon: "◻" },
  { to: "/admin/listings",     label: "Listings",     icon: "⌂" },
  { to: "/admin/contacts",     label: "Contacts",     icon: "✉" },
  { to: "/admin/services",     label: "Services",     icon: "✦" },
  { to: "/admin/translations", label: "Translations", icon: "✎" },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) { navigate("/admin/login"); return; }
    verifyAuth()
      .then(() => setVerified(true))
      .catch(() => { clearToken(); navigate("/admin/login"); });
  }, [navigate]);

  if (!verified) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-admin-bg">
        <p className="text-sm text-admin-text-muted">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-admin-bg text-admin-text">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-30 flex h-screen w-56 flex-col border-r border-admin-border bg-admin-surface">
        <div className="flex h-14 items-center px-5 border-b border-admin-border">
          <span className="text-sm font-light tracking-[0.2em] text-admin-text">LUME</span>
          <span className="ml-2 rounded bg-admin-bg px-1.5 py-0.5 text-[10px] text-admin-text-muted">CMS</span>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/admin"}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
                  isActive
                    ? "bg-admin-bg text-admin-text font-medium"
                    : "text-admin-text-secondary hover:bg-admin-surface-hover hover:text-admin-text"
                }`
              }
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-admin-border p-3 space-y-1">
          <a
            href="/"
            target="_blank"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-admin-text-muted transition hover:bg-admin-surface-hover hover:text-admin-text-secondary"
          >
            <span className="text-base">↗</span>View Site
          </a>
          <button
            onClick={() => { clearToken(); navigate("/admin/login"); }}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-admin-text-muted transition hover:bg-admin-surface-hover hover:text-red-500"
          >
            <span className="text-base">⏻</span>Sign Out
          </button>
        </div>
      </aside>

      <main className="ml-56 flex-1 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
