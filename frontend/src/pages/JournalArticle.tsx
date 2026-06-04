import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useI18n } from "@/lib/i18n";
import {
  TiptapRenderer,
  estimateReadTime,
  walkH1Sections,
} from "@/components/TiptapRenderer";

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
  main_sources: string | null;
  published_at: string | null;
  updated_at: string;
}

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

export default function JournalArticle() {
  const { slug } = useParams<{ slug: string }>();
  const { locale } = useI18n();
  const [article, setArticle] = useState<PublicArticle | null>(null);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState<string>("");
  const readRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!slug) return;
    setError("");
    setArticle(null);
    fetch(`/api/journal/${slug}?locale=${encodeURIComponent(locale)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("Article not found");
        return r.json();
      })
      .then(setArticle)
      .catch((e: Error) => setError(e.message));
  }, [slug, locale]);

  const toc = useMemo(() => walkH1Sections(article?.body), [article?.body]);
  const readMinutes = useMemo(() => estimateReadTime(article?.body), [article?.body]);

  // Scroll-spy: highlight the TOC entry currently in view.
  useEffect(() => {
    if (!article || toc.length === 0) return;
    const root = readRef.current;
    if (!root) return;
    const sections = toc
      .map((t) => root.querySelector(`#${t.id}`))
      .filter((el): el is Element => el !== null);
    if (sections.length === 0) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActiveSection((e.target as HTMLElement).id);
        });
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 },
    );
    sections.forEach((s) => obs.observe(s));
    return () => obs.disconnect();
  }, [article, toc]);

  const handleTocClick = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 90;
    window.scrollTo({ top: y, behavior: "smooth" });
  };

  if (error) {
    return (
      <div className="min-h-screen bg-lume-cream">
        <Navbar />
        <main className="mx-auto max-w-2xl px-6 py-20">
          <p className="text-lume-muted">{error}</p>
          <Link
            to="/journal"
            className="mt-6 inline-flex items-center gap-2 font-hanken text-xs font-semibold uppercase tracking-[0.2em] text-lume-ink hover:text-lume-gold"
          >
            ← Back to Journal
          </Link>
        </main>
        <Footer />
      </div>
    );
  }
  if (!article) {
    return (
      <div className="min-h-screen bg-lume-cream">
        <Navbar />
        <main className="mx-auto max-w-2xl px-6 py-20">
          <p className="text-lume-muted">Loading…</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-lume-cream font-hanken text-lume-ink">
      <Navbar />

      {/* HERO — full-bleed to the very top so the fixed navbar sits over it
          transparently. The content below is padded (pt-28 / md:pt-36) to
          clear the navbar. */}
      <header
        className="relative flex items-end"
        style={{ minHeight: "max(580px, 75vh)" }}
      >
        {article.cover_image ? (
          <img
            src={article.cover_image}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "repeating-linear-gradient(135deg, rgba(0,0,0,.12) 0 2px, transparent 2px 11px), linear-gradient(160deg, #6E6450, #3E3424)",
            }}
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(20,15,8,.30) 0%, rgba(20,15,8,.05) 38%, rgba(20,15,8,.62) 100%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, rgba(58,38,20,.72) 0%, rgba(58,38,20,.35) 40%, transparent 70%)",
          }}
        />
        <div className="relative mx-auto w-full max-w-[1280px] px-6 pt-28 pb-16 md:px-12 md:pt-36">
          {article.kicker && (
            <div className="mb-5 font-hanken text-[11px] font-semibold uppercase tracking-[0.28em] text-lume-gold-bright">
              {article.kicker}
            </div>
          )}
          <h1
            className="m-0 max-w-[18ch] font-display font-medium leading-[1.02] text-[#FBF6EC]"
            style={{
              fontSize: "clamp(40px, 5.4vw, 76px)",
              textShadow: "0 1px 30px rgba(0,0,0,.25)",
            }}
          >
            {article.title}
          </h1>
          {article.subtitle && (
            <p
              className="my-5 max-w-[54ch] font-spectral italic"
              style={{
                fontSize: "clamp(17px, 1.6vw, 21px)",
                lineHeight: 1.5,
                color: "rgba(251,246,236,.9)",
              }}
            >
              {article.subtitle}
            </p>
          )}
          <div
            className="flex flex-wrap items-center gap-2.5 font-hanken text-xs tracking-[0.05em]"
            style={{ color: "rgba(251,246,236,.78)" }}
          >
            <span>{displayDate(article)}</span>
            <span
              className="h-[3px] w-[3px] rounded-full"
              style={{ background: "rgba(251,246,236,.5)" }}
            />
            <span>{readMinutes} min read</span>
            {article.author && (
              <>
                <span
                  className="h-[3px] w-[3px] rounded-full"
                  style={{ background: "rgba(251,246,236,.5)" }}
                />
                <span>{article.author}</span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ARTICLE BODY */}
      <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-12 px-6 md:px-12 lg:grid-cols-[248px_1fr] lg:gap-[72px]">
        {/* TOC */}
        {toc.length > 0 && (
          <nav className="sticky top-[104px] hidden h-max self-start py-15 lg:block" style={{ padding: "60px 0" }}>
            <div className="mb-5 font-hanken text-[11px] font-semibold uppercase tracking-[0.22em] text-lume-muted">
              Contents
            </div>
            <ol className="m-0 list-none p-0">
              {toc.map((t) => {
                const on = activeSection === t.id;
                return (
                  <li key={t.id}>
                    <a
                      href={`#${t.id}`}
                      onClick={(e) => handleTocClick(t.id, e)}
                      className={`-ml-4 grid grid-cols-[26px_1fr] items-baseline gap-1.5 border-l-2 py-2 pl-3.5 font-hanken text-[13.5px] leading-[1.35] transition ${
                        on
                          ? "border-lume-gold text-lume-ink"
                          : "border-transparent text-lume-muted hover:text-lume-ink"
                      }`}
                    >
                      <span
                        className={`pt-[2px] text-[11px] font-semibold tabular-nums ${
                          on ? "text-lume-gold" : "text-lume-line"
                        }`}
                      >
                        {String(t.index).padStart(2, "0")}
                      </span>
                      <span>{t.title}</span>
                    </a>
                  </li>
                );
              })}
            </ol>
          </nav>
        )}

        {/* READING COLUMN */}
        <article
          ref={readRef}
          className="max-w-[680px] py-15"
          style={{ padding: "60px 0 40px" }}
        >
          <TiptapRenderer doc={article.body} />

          {article.author && (
            <p
              className="mt-12 border-t border-lume-line pt-9 font-spectral italic text-lume-ink-soft"
              style={{ fontSize: "17px" }}
            >
              {article.author}
            </p>
          )}

          {article.main_sources && article.main_sources.trim() && (
            <div className="mt-10 border-t border-lume-line pt-10">
              <h4 className="mb-3 font-hanken text-[11px] font-semibold uppercase tracking-[0.2em] text-lume-muted">
                Main sources
              </h4>
              {article.main_sources
                .split(/\n+/)
                .map((line) => line.trim())
                .filter(Boolean)
                .map((line, i) => (
                  <p
                    key={i}
                    className="m-0 mb-1.5 font-hanken text-[13px] leading-[1.7] text-lume-muted"
                  >
                    {line}
                  </p>
                ))}
            </div>
          )}

          <Link
            to="/journal"
            className="my-8 mb-16 inline-flex items-center gap-2.5 font-hanken text-xs font-semibold uppercase tracking-[0.2em] text-lume-ink hover:text-lume-gold"
          >
            <svg width="22" height="10" viewBox="0 0 22 10" fill="none" stroke="currentColor" strokeWidth="1.4">
              <path d="M22 5H2M6 1L2 5l4 4" />
            </svg>
            Back to Journal
          </Link>
        </article>
      </div>

      <Footer />

      {/* Reading-column body styles (scoped via .read wrapper) */}
      <style>{`
        .read .sec { scroll-margin-top: 100px; padding-top: 18px; }
        .read .sec + .sec { margin-top: 54px; }
        .read .sec--intro { padding-top: 0; }
        .read .sec__head { display: flex; align-items: baseline; gap: 18px; margin-bottom: 24px; }
        .read .sec__no { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 20px; color: #B98E2C; font-weight: 500; }
        .read .sec__title { font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 500; font-size: 34px; line-height: 1.1; margin: 0; color: #2C281F; }
        .read p { font-family: 'Spectral', Georgia, serif; font-size: 18.5px; line-height: 1.72; color: #4A4334; margin: 0 0 20px; }
        .read p b, .read p strong { color: #2C281F; font-weight: 600; }
        .read h3.subhead { font-family: 'Hanken Grotesk', system-ui, sans-serif; font-weight: 600; font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase; color: #B98E2C; margin: 34px 0 14px; }
        .read h4.subhead--sm { font-family: 'Hanken Grotesk', system-ui, sans-serif; font-weight: 600; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: #8B7F69; margin: 24px 0 10px; }
        .read ul, .read ol { font-family: 'Spectral', Georgia, serif; font-size: 18px; line-height: 1.72; color: #4A4334; margin: 0 0 20px; padding-left: 1.4em; }
        .read li { margin-bottom: 0.4em; }
        .read img { display: block; max-width: 100%; height: auto; margin: 28px 0; border-radius: 2px; }
        .read .pull { margin: 46px -40px; padding: 0 40px; border-left: 2px solid #B98E2C; }
        .read .pull p { font-family: 'Cormorant Garamond', Georgia, serif; font-style: italic; font-size: 30px; line-height: 1.28; color: #2C281F; margin: 0; }
        .read .figrow { display: grid; grid-template-columns: repeat(var(--fig-cols, 4), 1fr); gap: 1px; background: #DCCFB4; border: 1px solid #DCCFB4; margin: 36px 0; }
        .read .fig { background: #FBF6EC; padding: 22px 18px; }
        .read .fig__n { font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 500; font-size: 36px; line-height: 1; color: #2C281F; }
        .read .fig__l { font-family: 'Hanken Grotesk', system-ui, sans-serif; font-size: 11.5px; letter-spacing: 0.05em; color: #8B7F69; margin-top: 10px; line-height: 1.4; }
        .read .data-table-wrap { margin: 28px 0; overflow-x: auto; }
        .read .data-table { width: 100%; border-collapse: collapse; font-family: 'Spectral', Georgia, serif; font-size: 15px; color: #4A4334; }
        .read .data-table th, .read .data-table td { border: 1px solid #DCCFB4; padding: 10px 14px; vertical-align: top; }
        .read .data-table th { background: #FBF6EC; font-family: 'Hanken Grotesk', system-ui, sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #2C281F; text-align: left; }
        .read .data-table td { font-variant-numeric: tabular-nums; }
        .read blockquote { border-left: 2px solid #8A8273; padding: 4px 18px; margin: 24px 0; font-family: 'Cormorant Garamond', Georgia, serif; font-style: italic; font-size: 22px; color: #2C281F; }
        .read blockquote p { font-family: inherit; font-size: inherit; line-height: 1.4; margin: 0; }
        .read [data-callout] { border-left: 3px solid #B98E2C; background: rgba(185, 142, 44, 0.07); padding: 14px 18px; margin: 24px 0; }
        .read [data-callout][data-variant="data"] { border-left-color: #2F5D50; background: rgba(47, 93, 80, 0.06); font-variant-numeric: tabular-nums; }
        .read [data-callout] p { font-size: 16px; margin: 0 0 10px; }
        .read [data-callout] p:last-child { margin-bottom: 0; }
        @media (max-width: 980px) {
          .read .pull { margin: 40px 0; padding-left: 24px; }
          .read .figrow { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>
    </div>
  );
}
