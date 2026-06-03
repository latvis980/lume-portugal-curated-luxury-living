// frontend/src/pages/admin/AdminLayout.tsx
//
// useBlocker (React Router) only works with createBrowserRouter (data router).
// This project uses <BrowserRouter>, so we instead:
//   1. Intercept sidebar NavLink / Sign Out clicks manually
//   2. Add window.beforeunload for browser refresh / tab close

import { useEffect, useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { isAuthenticated, clearToken, verifyAuth } from "@/lib/admin-api";
import { UnsavedChangesProvider, useUnsavedChanges } from "./UnsavedChangesContext";

const NAV_ITEMS = [
  { to: "/admin",                label: "Dashboard",    icon: "◻" },
  { to: "/admin/listings",       label: "Listings",     icon: "⌂" },
  { to: "/admin/journal",        label: "Journal",      icon: "❍" },
  { to: "/admin/contacts",       label: "Contacts",     icon: "✉" },
  { to: "/admin/services",       label: "Services",     icon: "✦" },
  { to: "/admin/about",          label: "About",        icon: "✎" },
  { to: "/admin/investment",     label: "Investment",   icon: "◉" },
  { to: "/admin/contact-page",   label: "Contact page", icon: "☎" },
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
    <UnsavedChangesProvider>
      <AdminLayoutInner />
    </UnsavedChangesProvider>
  );
}

function AdminLayoutInner() {
  const navigate = useNavigate();
  const { hasDirty, saveAll, discardAll } = useUnsavedChanges();
  const [pendingTo, setPendingTo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!hasDirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasDirty]);

  const handleNavClick =
    (to: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (!hasDirty) return;
      e.preventDefault();
      setPendingTo(to);
    };

  const handleSignOut = () => {
    if (hasDirty) {
      setPendingTo("__signout__");
    } else {
      clearToken();
      navigate("/admin/login");
    }
  };

  const doNavigate = (to: string) => {
    setPendingTo(null);
    setSaveError("");
    if (to === "__signout__") {
      clearToken();
      navigate("/admin/login");
    } else {
      navigate(to);
    }
  };

  const handleSaveAndLeave = async () => {
    if (!pendingTo) return;
    setSaving(true);
    setSaveError("");
    try {
      await saveAll();
      doNavigate(pendingTo);
    } catch (e: any) {
      setSaveError(e?.message || "Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (!pendingTo) return;
    discardAll();
    doNavigate(pendingTo);
  };

  const handleKeepEditing = () => {
    setPendingTo(null);
    setSaveError("");
  };

  return (
    <div className="flex min-h-screen bg-admin-bg text-admin-text">
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
              onClick={handleNavClick(item.to)}
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
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-admin-text-muted transition hover:bg-admin-surface-hover hover:text-admin-text-secondary"
          >
            <span className="text-base">↗</span>View Site
          </a>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-admin-text-muted transition hover:bg-admin-surface-hover hover:text-red-500"
          >
            <span className="text-base">⏻</span>Sign Out
          </button>
        </div>
      </aside>

      <main className="ml-56 flex-1 min-h-screen">
        <Outlet />
      </main>

      {pendingTo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-admin-border bg-admin-surface shadow-2xl p-6">
            <div className="mb-4 flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 text-base">
                ⚠
              </span>
              <div>
                <h3 className="text-base font-medium text-admin-text">
                  You have unsaved changes
                </h3>
                <p className="mt-1 text-sm text-admin-text-muted">
                  If you leave now your edits will be lost. What would you like to do?
                </p>
              </div>
            </div>

            {saveError && (
              <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {saveError}
              </p>
            )}

            <div className="flex flex-col gap-2">
              <button
                onClick={handleSaveAndLeave}
                disabled={saving}
                className="w-full rounded-md bg-admin-btn px-4 py-2.5 text-sm font-medium text-white transition hover:bg-admin-btn-hover disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save & leave"}
              </button>
              <button
                onClick={handleDiscard}
                disabled={saving}
                className="w-full rounded-md border border-red-200 px-4 py-2.5 text-sm text-red-500 transition hover:bg-red-50 disabled:opacity-50"
              >
                Discard changes &amp; leave
              </button>
              <button
                onClick={handleKeepEditing}
                disabled={saving}
                className="w-full rounded-md px-4 py-2.5 text-sm text-admin-text-muted transition hover:text-admin-text disabled:opacity-50"
              >
                Keep editing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}