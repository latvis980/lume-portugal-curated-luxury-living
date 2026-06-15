// frontend/src/pages/SectionPage.tsx
//
// SEO-friendly region × type landing pages — e.g. "Luxury apartments in Lisbon",
// "Villas in Algarve", "New developments in Silver Coast". These are real,
// indexable routes (server-rendered by backend/seo.py) that reuse the same
// listings data layer as the Properties page, so the server snapshot and the
// React render always show the same content (no cloaking).

import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PropertyCard from "@/components/PropertyCard";
import { HomesComingSoon, HOMES_COMING_SOON } from "@/components/ComingSoonBanner";
import NotFound from "./NotFound";
import { fetchListings } from "@/lib/public-api";
import { useI18n } from "@/lib/i18n";
import { resolveSection } from "@/config/sectionPages";

export default function SectionPage() {
  const { slug, typeSlug } = useParams();
  const { locale } = useI18n();
  const section = resolveSection(slug ?? "", typeSlug);

  const { data, isLoading } = useQuery({
    queryKey: ["section", slug, typeSlug, locale],
    enabled: !!section && !HOMES_COMING_SOON,
    placeholderData: keepPreviousData,
    queryFn: () =>
      fetchListings({
        locale,
        region: section!.region,
        types: section!.propertyTypes ?? undefined,
        sort_by: "featured",
        limit: 24,
      }),
  });

  useEffect(() => {
    if (section) document.title = section.title;
  }, [section]);

  // Homes section closed for now — the curated region/type landing pages
  // (linked from the footer) show the "Coming Soon" banner too.
  if (HOMES_COMING_SOON) return <HomesComingSoon />;

  // Unknown region slug → this isn't a section page (the App dispatcher only
  // routes known region slugs here, but guard defensively).
  if (!section) return <NotFound />;

  const listings = data?.properties ?? [];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      {/* Hero header */}
      <section className="relative overflow-hidden border-b border-border pb-10 pt-32">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <nav className="mb-4 text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-body">
            <Link to="/properties" className="hover:text-foreground">Properties</Link>
            <span className="mx-2">/</span>
            <Link to={`/properties/${section.regionSlug}`} className="hover:text-foreground">
              {section.region}
            </Link>
          </nav>
          <h1 className="font-display text-3xl md:text-5xl font-light text-foreground">
            {section.h1}
          </h1>
          <p className="mt-4 max-w-2xl text-sm md:text-base leading-relaxed text-muted-foreground font-body">
            {section.intro}
          </p>
        </div>
      </section>

      {/* Listings */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 md:px-12 py-10">
        {isLoading && listings.length === 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[4/5] animate-pulse bg-muted" />
            ))}
          </div>
        ) : listings.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <PropertyCard key={listing.id} listing={listing} view="grid" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center py-20 text-center">
            <h2 className="mb-2 font-display text-xl font-light text-foreground">
              No current listings in {section.region}
            </h2>
            <p className="mb-8 max-w-sm text-sm leading-relaxed text-muted-foreground font-body">
              New properties are added regularly. Explore our full collection in the meantime.
            </p>
            <Link
              to="/properties"
              className="rounded border border-foreground bg-foreground px-6 py-2.5 text-sm font-body text-background transition hover:opacity-90"
            >
              View all properties
            </Link>
          </div>
        )}

        {listings.length > 0 && (
          <div className="mt-12 text-center">
            <Link
              to={`/properties?region=${encodeURIComponent(section.region)}`}
              className="text-sm font-body tracking-wide text-primary hover:underline"
            >
              See all properties in {section.region} →
            </Link>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
