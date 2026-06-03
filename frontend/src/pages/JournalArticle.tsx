import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { TiptapRenderer } from "@/components/TiptapRenderer";

// Bare public stub. Visual design comes in a follow-up.

interface PublicArticle {
  id: string;
  slug: string;
  type: "news" | "memorandum";
  kicker: string | null;
  title: string;
  subtitle: string | null;
  excerpt: string | null;
  body: unknown;
  cover_image: string | null;
  author: string | null;
  published_at: string | null;
}

export default function JournalArticle() {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<PublicArticle | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/journal/${slug}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("Article not found");
        return r.json();
      })
      .then(setArticle)
      .catch((e) => setError(e.message));
  }, [slug]);

  if (error) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <p className="text-stone-500">{error}</p>
      </main>
    );
  }
  if (!article) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <p className="text-stone-500">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      {article.kicker && (
        <p className="mb-2 text-xs uppercase tracking-widest text-amber-700">
          {article.kicker}
        </p>
      )}
      <h1 className="text-3xl font-light text-stone-900">{article.title}</h1>
      {article.subtitle && (
        <p className="mt-2 italic text-stone-600">{article.subtitle}</p>
      )}
      {article.cover_image && (
        <img
          src={article.cover_image}
          alt=""
          className="mt-6 w-full rounded object-cover"
        />
      )}
      <div className="mt-8">
        <TiptapRenderer doc={article.body} />
      </div>
    </main>
  );
}
