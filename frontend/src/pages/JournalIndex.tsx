import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useI18n } from "@/lib/i18n";
import { estimateReadTime } from "@/components/TiptapRenderer";

type ArticleType = "news" | "memorandum";

interface PublicArticle {
  id: string;
  slug: string;
  type: ArticleType;
  kicker: string | null;
  title: string;
  subtitle: string | null;
  body: unknown;
  cover_image: string | null;
  author: string | null;
  published_at: string | null;
  updated_at: string;
}

type Filter = "all" | "memorandum" | "news";
type View = "grid" | "list";

function formatDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function displayDate(a: PublicArticle): string {
  const updated = a.updated_at ? new Date(a.updated_at).getTime() : 0;
  const published = a.published_at ? new Date(a.published_at).getTime() : 0;
  const iso = updated > published ? a.updated_at : a.published_at;
  return formatDate(iso);
}

export default function JournalIndex() {
  const { locale, t } = useI18n();
  const [articles, setArticles] = useState<PublicArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [view, setView] = useState<View>("grid");

  // Land at the top on entry so the navbar reads transparent over the header.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/journal?locale=${encodeURIComponent(locale)}&limit=100`)
      .then((r) => r.json())
      .then((data) => setArticles(data.articles ?? []))
      .finally(() => setLoading(false));
  }, [locale]);

  const filtered = useMemo(() => {
    if (filter === "all") return articles;
    return articles.filter((a) => a.type === filter);
  }, [articles, filter]);

  return (
    <div className="min-h-screen bg-lume-cream font-hanken text-lume-ink">
      <Navbar />

      {/* PAGE HEAD */}
      <header className="mx-auto mt-14 max-w-[1280px] px-6 pt-16 pb-9 md:mt-[5.5rem] md:px-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="font-hanken text-[11px] font-semibold uppercase tracking-[0.28em] text-lume-gold">
              Notes &amp; Memoranda
            </span>
            <h1 className="mt-3 font-display text-5xl font-medium leading-none text-lume-ink md:text-[68px]">
              {t("journal", "title", "About Portugal")}
            </h1>
          </div>
          <span className="font-hanken text-[13px] tracking-[0.05em] text-lume-muted">
            {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
          </span>
        </div>
      </header>

      {/* FILTER BAR */}
      <div className="border-y border-lume-line">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-4 px-6 py-4 md:px-12">
          <div className="flex gap-1">
            {(
              [
                ["all", "All"],
                ["memorandum", "Memoranda"],
                ["news", "News"],
              ] as [Filter, string][]
            ).map(([key, label]) => {
              const on = filter === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={`px-4 py-2 font-hanken text-xs font-medium uppercase tracking-[0.16em] transition ${
                    on
                      ? "bg-lume-ink text-lume-cream"
                      : "text-lume-ink-soft hover:text-lume-gold"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-4">
            <span className="font-hanken text-xs tracking-[0.05em] text-lume-muted">
              Most recent
            </span>
            <div className="flex gap-[2px]">
              <button
                type="button"
                aria-label="Grid view"
                onClick={() => setView("grid")}
                className={`grid h-9 w-9 place-items-center border transition ${
                  view === "grid"
                    ? "border-lume-ink bg-lume-ink text-lume-cream"
                    : "border-lume-line text-lume-muted hover:text-lume-ink"
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                  <rect width="6" height="6" />
                  <rect x="8" width="6" height="6" />
                  <rect y="8" width="6" height="6" />
                  <rect x="8" y="8" width="6" height="6" />
                </svg>
              </button>
              <button
                type="button"
                aria-label="List view"
                onClick={() => setView("list")}
                className={`grid h-9 w-9 place-items-center border transition ${
                  view === "list"
                    ? "border-lume-ink bg-lume-ink text-lume-cream"
                    : "border-lume-line text-lume-muted hover:text-lume-ink"
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                  <rect width="14" height="2.4" />
                  <rect y="5.8" width="14" height="2.4" />
                  <rect y="11.6" width="14" height="2.4" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* GRID / LIST */}
      <main className="mx-auto max-w-[1280px] px-6 pb-20 pt-11 md:px-12">
        {loading ? (
          <p className="py-12 text-center text-sm text-lume-muted">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="py-12 text-center text-sm italic text-lume-muted">
            No entries yet.
          </p>
        ) : view === "grid" ? (
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-9">
            {filtered.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-lume-line-soft">
            {filtered.map((a) => (
              <ArticleListRow key={a.id} article={a} />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

// ─── Cards ──────────────────────────────────────────────────────────────────

function TypeChip({ type }: { type: ArticleType }) {
  const isMemo = type === "memorandum";
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 font-hanken text-[10px] font-semibold uppercase tracking-[0.2em] ${
        isMemo ? "text-lume-navy" : "text-lume-gold"
      }`}
    >
      <span
        className="h-[5px] w-[5px] rounded-full"
        style={{ background: "currentColor" }}
      />
      {isMemo ? "Memorandum" : "News"}
    </span>
  );
}

function Cover({ src, alt }: { src: string | null; alt: string }) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
      />
    );
  }
  return (
    <div
      className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-[1.04]"
      style={{
        backgroundImage:
          "repeating-linear-gradient(135deg, rgba(154,140,112,.10) 0 2px, transparent 2px 11px), linear-gradient(160deg, #E4D7BD, #D6C6A4)",
      }}
    />
  );
}

function ArticleCard({ article }: { article: PublicArticle }) {
  const read = estimateReadTime(article.body);
  return (
    <Link to={`/journal/${article.slug}`} className="group block">
      <div className="relative aspect-[3/4] overflow-hidden">
        <Cover src={article.cover_image} alt={article.title} />
        <div className="absolute left-3.5 top-3.5 bg-lume-cream/95 backdrop-blur-sm">
          <TypeChip type={article.type} />
        </div>
      </div>
      <div className="pt-4">
        <h3 className="mb-2 font-display text-[25px] font-medium leading-[1.16] text-lume-ink transition-colors group-hover:text-lume-gold">
          {article.title}
        </h3>
        {article.subtitle && (
          <p className="mb-3 font-spectral text-[15px] leading-[1.55] text-lume-ink-soft">
            {article.subtitle}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2.5 font-hanken text-xs tracking-[0.05em] text-lume-muted">
          <span>{displayDate(article)}</span>
          <span className="h-[3px] w-[3px] rounded-full bg-lume-muted-2" />
          <span>{read} min read</span>
        </div>
      </div>
    </Link>
  );
}

function ArticleListRow({ article }: { article: PublicArticle }) {
  const read = estimateReadTime(article.body);
  return (
    <Link
      to={`/journal/${article.slug}`}
      className="group grid grid-cols-1 items-center gap-6 py-7 sm:grid-cols-[200px_1fr_auto] sm:gap-7"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <Cover src={article.cover_image} alt={article.title} />
        <div className="absolute left-2.5 top-2.5 bg-lume-cream/95 backdrop-blur-sm">
          <TypeChip type={article.type} />
        </div>
      </div>
      <div>
        <h3 className="mb-2 font-display text-[28px] font-medium leading-[1.16] text-lume-ink transition-colors group-hover:text-lume-gold">
          {article.title}
        </h3>
        {article.subtitle && (
          <p className="max-w-[60ch] font-spectral text-[15px] leading-[1.55] text-lume-ink-soft">
            {article.subtitle}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2.5 self-start pt-1.5 font-hanken text-xs tracking-[0.05em] text-lume-muted sm:text-right">
        <span>{displayDate(article)}</span>
        <span className="h-[3px] w-[3px] rounded-full bg-lume-muted-2" />
        <span>{read} min read</span>
      </div>
    </Link>
  );
}
