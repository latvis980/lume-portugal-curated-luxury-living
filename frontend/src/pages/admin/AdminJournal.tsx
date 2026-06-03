import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listJournal,
  deleteJournalArticle,
  type ArticleStatus,
  type ArticleType,
  type JournalArticle,
} from "@/lib/admin-api";

const TYPE_LABEL: Record<ArticleType, string> = {
  news: "News",
  memorandum: "Memorandum",
};

const STATUS_LABEL: Record<ArticleStatus, string> = {
  draft: "Draft",
  published: "Published",
};

export default function AdminJournal() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState<ArticleType | "">("");
  const [statusFilter, setStatusFilter] = useState<ArticleStatus | "">("");
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-journal", typeFilter, statusFilter, search],
    queryFn: () =>
      listJournal({
        type: typeFilter || undefined,
        status: statusFilter || undefined,
        search: search.trim() || undefined,
      }),
  });

  const articles = data?.articles ?? [];

  const deleteM = useMutation({
    mutationFn: deleteJournalArticle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-journal"] });
      setDeleteId(null);
    },
  });

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light text-admin-text">Journal</h1>
          <p className="mt-1 text-sm text-admin-text-muted">
            News and Memoranda about Portugal
          </p>
        </div>
        <button
          onClick={() => navigate("/admin/journal/new")}
          className="rounded-md bg-admin-btn px-4 py-2 text-sm font-medium text-white transition hover:bg-admin-btn-hover"
        >
          + New article
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title or slug…"
          className="w-64 rounded-md border border-admin-border bg-admin-bg px-3 py-1.5 text-sm text-admin-text placeholder-admin-text-muted outline-none focus:border-admin-text-muted"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as ArticleType | "")}
          className="rounded-md border border-admin-border bg-admin-bg px-3 py-1.5 text-sm text-admin-text"
        >
          <option value="">All types</option>
          <option value="news">News</option>
          <option value="memorandum">Memorandum</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ArticleStatus | "")}
          className="rounded-md border border-admin-border bg-admin-bg px-3 py-1.5 text-sm text-admin-text"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-lg border border-admin-border bg-admin-surface">
        {isLoading ? (
          <p className="px-5 py-10 text-center text-sm text-admin-text-muted">Loading…</p>
        ) : articles.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-admin-text-muted italic">
            No articles yet. Click "New article" to create your first one.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-admin-bg/40 text-left text-xs uppercase tracking-wider text-admin-text-muted">
              <tr>
                <th className="px-5 py-2.5 font-medium">Title</th>
                <th className="px-5 py-2.5 font-medium">Type</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
                <th className="px-5 py-2.5 font-medium">Translations</th>
                <th className="px-5 py-2.5 font-medium">Updated</th>
                <th className="px-5 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {articles.map((a, i) => (
                <ArticleRow
                  key={a.id}
                  article={a}
                  last={i === articles.length - 1}
                  onDelete={() => setDeleteId(a.id)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-admin-border bg-admin-surface p-6 shadow-2xl">
            <h3 className="mb-2 text-base font-medium text-admin-text">Delete article?</h3>
            <p className="mb-6 text-sm text-admin-text-muted">
              This removes it permanently. Drafts and published articles alike.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="rounded-md px-4 py-2 text-sm text-admin-text-muted transition hover:text-admin-text"
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

function ArticleRow({
  article,
  last,
  onDelete,
}: {
  article: JournalArticle;
  last: boolean;
  onDelete: () => void;
}) {
  const updated = article.updated_at
    ? new Date(article.updated_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

  return (
    <tr className={last ? "" : "border-b border-admin-border-light"}>
      <td className="px-5 py-3">
        <Link
          to={`/admin/journal/${article.id}`}
          className="font-medium text-admin-text hover:underline"
        >
          {article.title || <span className="italic text-admin-text-muted">Untitled</span>}
        </Link>
        <div className="text-[11px] text-admin-text-muted">/{article.slug}</div>
      </td>
      <td className="px-5 py-3 text-admin-text-secondary">
        {TYPE_LABEL[article.type]}
      </td>
      <td className="px-5 py-3">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            article.status === "published"
              ? "bg-admin-accent-soft text-admin-accent"
              : "bg-admin-bg text-admin-text-muted border border-admin-border"
          }`}
        >
          {STATUS_LABEL[article.status]}
        </span>
      </td>
      <td className="px-5 py-3">
        <div className="flex items-center gap-0.5">
          {(["pt_pt", "ru", "es"] as const).map((loc) => (
            <span
              key={loc}
              title={loc}
              className={`inline-block h-1.5 w-1.5 rounded-full ${
                (article.title_i18n as Record<string, string | undefined>)?.[loc]
                  ? "bg-green-400"
                  : "bg-admin-border"
              }`}
            />
          ))}
        </div>
      </td>
      <td className="px-5 py-3 text-xs text-admin-text-muted">{updated}</td>
      <td className="px-5 py-3 text-right">
        <Link
          to={`/admin/journal/${article.id}`}
          className="mr-2 rounded px-2 py-1 text-xs text-admin-text-muted hover:bg-admin-bg hover:text-admin-text-secondary"
        >
          Edit
        </Link>
        <button
          onClick={onDelete}
          className="rounded px-2 py-1 text-xs text-red-400 hover:bg-red-50 hover:text-red-600"
        >
          Delete
        </button>
      </td>
    </tr>
  );
}
