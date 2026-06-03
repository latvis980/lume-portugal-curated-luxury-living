import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

// Bare public stub for the Journal index. Design lands in a follow-up.

interface PublicArticle {
  id: string;
  slug: string;
  type: "news" | "memorandum";
  kicker: string | null;
  title: string;
  subtitle: string | null;
  excerpt: string | null;
  cover_image: string | null;
  published_at: string | null;
}

export default function JournalIndex() {
  const [articles, setArticles] = useState<PublicArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/journal")
      .then((r) => r.json())
      .then((data) => setArticles(data.articles ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="mb-2 text-3xl font-light">Journal</h1>
      <p className="mb-10 text-sm text-stone-500">
        News and memoranda from LUME by Mark.
      </p>

      {loading ? (
        <p className="text-stone-500">Loading…</p>
      ) : articles.length === 0 ? (
        <p className="italic text-stone-500">No articles yet.</p>
      ) : (
        <ul className="space-y-8">
          {articles.map((a) => (
            <li key={a.id}>
              {a.kicker && (
                <p className="text-xs uppercase tracking-widest text-amber-700">
                  {a.kicker}
                </p>
              )}
              <Link
                to={`/journal/${a.slug}`}
                className="text-xl font-medium text-stone-900 hover:underline"
              >
                {a.title}
              </Link>
              {a.subtitle && (
                <p className="text-sm italic text-stone-600">{a.subtitle}</p>
              )}
              {a.excerpt && (
                <p className="mt-1 text-sm text-stone-700">{a.excerpt}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
