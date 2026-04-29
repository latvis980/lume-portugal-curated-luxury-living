// frontend/src/components/ListingsSection.tsx
//
// Public listings grid for the landing page. Always shows the latest
// available listings unfiltered — questionnaire results no longer drive
// filtering (we follow up by email with a curated selection instead).
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchListings, type Listing } from "@/lib/public-api";

// ── Helpers ──────────────────────────────────────────────────────────────

function formatPrice(price: number, currency = "EUR", listingType = "sale"): string {
  const formatted =
    currency === "EUR"
      ? `€${price.toLocaleString("en-IE")}`
      : `${price.toLocaleString()} ${currency}`;
  return listingType === "rent" ? `${formatted}/mo` : formatted;
}

function formatSpecs(l: Listing): string {
  const parts: string[] = [];
  if (l.bedrooms != null) parts.push(`${l.bedrooms} Bed`);
  if (l.bathrooms != null) parts.push(`${l.bathrooms} Bath`);
  if (l.interior_living_area) parts.push(`${l.interior_living_area}m²`);
  return parts.join(" · ");
}

function getTag(l: Listing): string {
  if (l.views && l.views.length > 0) {
    const label = l.views[0].replace(/_/g, " ");
    return label.charAt(0).toUpperCase() + label.slice(1) + " View";
  }
  if (l.featured) return "Featured";
  return l.property_type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function locationString(l: Listing): string {
  const parts = [l.city, l.area].filter((v, i, a) => v && a.indexOf(v) === i);
  return parts.join(", ");
}

// ── Skeleton card ────────────────────────────────────────────────────────

function SkeletonCard({ delay }: { delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
    >
      <div className="mb-5 aspect-[4/5] animate-pulse rounded-sm bg-muted" />
      <div className="mb-2 h-5 w-3/4 animate-pulse rounded bg-muted" />
      <div className="mb-3 h-3 w-1/2 animate-pulse rounded bg-muted" />
      <div className="flex justify-between">
        <div className="h-5 w-1/3 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/4 animate-pulse rounded bg-muted" />
      </div>
    </motion.div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────

const ListingsSection = () => {
  // Always fetch the latest 6 available listings — no questionnaire filtering.
  const { data, isLoading } = useQuery({
    queryKey: ["public-listings", { limit: 6 }],
    queryFn: () => fetchListings({ limit: 6 }),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const listings = data?.properties ?? [];

  return (
    <section id="listings" className="bg-background section-padding">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-14 text-center"
        >
          <p className="mb-4 text-xs uppercase tracking-[0.3em] text-primary">
            Selected Properties
          </p>
          <h2 className="font-display mb-3 text-3xl font-light text-foreground md:text-5xl">
            Our Current Homes
          </h2>
          <p className="max-w-2xl mx-auto text-sm font-light text-muted-foreground/70">
            A snapshot of what's available right now. Browse our full portfolio or reach out for a personally tailored presentation.
          </p>
        </motion.div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <SkeletonCard key={i} delay={i * 0.1} />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-20 text-center"
          >
            <p className="font-display mb-3 text-xl font-light text-foreground">
              New listings coming soon
            </p>
            <p className="mb-8 text-sm text-muted-foreground">
              Reach out for a personally curated selection.
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing, i) => (
              <motion.div
                key={listing.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="group"
              >
                <Link to={`/properties/${listing.slug}`} className="block">
                  <div className="relative mb-5 aspect-[4/5] overflow-hidden rounded-sm bg-muted">
                    <img
                      src={listing.cover_image}
                      alt={listing.title}
                      loading={i < 3 ? "eager" : "lazy"}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute left-4 top-4">
                      <span className="bg-background/90 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-foreground">
                        {getTag(listing)}
                      </span>
                    </div>
                    {listing.listing_type === "rent" && (
                      <div className="absolute right-4 top-4">
                        <span className="bg-secondary/90 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-secondary-foreground">
                          Rent
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="font-display mb-1 text-xl font-light text-foreground transition-colors duration-300 group-hover:text-primary">
                      {listing.title}
                    </h3>
                    <p className="mb-3 text-xs tracking-wider text-muted-foreground">
                      {locationString(listing)}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="font-display text-lg text-primary">
                        {formatPrice(listing.price, listing.currency, listing.listing_type)}
                      </span>
                      <span className="text-[11px] tracking-wider text-muted-foreground">
                        {formatSpecs(listing)}
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* View all link */}
        {!isLoading && listings.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-14 text-center"
          >
            <Link
              to="/properties"
              className="inline-block border border-border px-10 py-3.5 text-xs uppercase tracking-[0.2em] text-foreground transition-colors duration-300 font-body hover:bg-muted"
            >
              View All Properties
            </Link>
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default ListingsSection;