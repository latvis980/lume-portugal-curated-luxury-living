// frontend/src/components/PropertyCard.tsx
import { Link } from "react-router-dom";
import { Bed, Bath, Maximize, MapPin, ArrowUpRight } from "lucide-react";
import type { Listing } from "@/lib/public-api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(price: number, currency = "EUR", listingType = "sale"): string {
  const formatted =
    currency === "EUR"
      ? `€${price.toLocaleString("en-IE")}`
      : `${price.toLocaleString()} ${currency}`;
  return listingType === "rent" ? `${formatted}/mo` : formatted;
}

function getTag(listing: Listing): string {
  if (listing.views && listing.views.length > 0) {
    const label = listing.views[0].replace(/_/g, " ");
    return label.charAt(0).toUpperCase() + label.slice(1) + " View";
  }
  if (listing.featured) return "Featured";
  return listing.property_type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const LISTING_TYPE_LABELS: Record<string, string> = {
  sale: "For Sale",
  rent: "For Rent",
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface PropertyCardProps {
  listing: Listing;
  /** "grid" = vertical stack (default, for grids & homepage)
   *  "list" = horizontal layout (for list view on properties page) */
  view?: "grid" | "list";
}

// ═════════════════════════════════════════════════════════════════════════════
// VERTICAL CARD  (view="grid")
// Image fills a tall aspect ratio, content sits below — same feel as homepage
// ═════════════════════════════════════════════════════════════════════════════

function VerticalCard({ listing }: { listing: Listing }) {
  const {
    slug, title, city, area, region,
    price, currency, listing_type,
    bedrooms, bathrooms, interior_living_area,
    cover_image, featured,
  } = listing;

  const href      = `/properties/${slug}`;
  const saleLabel = LISTING_TYPE_LABELS[listing_type] ?? listing_type;
  const location  = [area, city].filter(Boolean).join(", ") || region;
  const tag       = getTag(listing);

  return (
    <Link to={href} className="group block">
      {/* Image */}
      <div className="relative overflow-hidden mb-5 aspect-[4/5]">
        <img
          src={cover_image}
          alt={title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />

        {/* Top-left tag */}
        <div className="absolute top-4 left-4">
          <span className="px-3 py-1 bg-background/90 text-foreground text-[10px] tracking-[0.2em] uppercase font-body">
            {tag}
          </span>
        </div>

        {/* Featured badge (bottom-left) */}
        {featured && (
          <div className="absolute bottom-4 left-4">
            <span className="px-3 py-1 bg-primary text-background text-[10px] tracking-[0.2em] uppercase font-body">
              Featured
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div>
        <h3 className="font-display text-xl font-light text-foreground mb-1 group-hover:text-primary transition-colors duration-300 line-clamp-2">
          {title}
        </h3>
        <p className="text-xs tracking-wider text-muted-foreground mb-3 flex items-center gap-1">
          <MapPin className="h-3 w-3 shrink-0" />
          {location}
        </p>
        <div className="flex items-center justify-between">
          <span className="font-display text-lg text-primary">
            {formatPrice(price, currency, listing_type)}
          </span>
          <span className="text-[11px] tracking-wider text-muted-foreground font-body">
            {[
              bedrooms != null && `${bedrooms} Bed`,
              bathrooms != null && `${bathrooms} Bath`,
              interior_living_area && `${interior_living_area}m²`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </div>
      </div>
    </Link>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// HORIZONTAL CARD  (view="list")
// Fixed-width image on the left, editorial content on the right
// ═════════════════════════════════════════════════════════════════════════════

function HorizontalCard({ listing }: { listing: Listing }) {
  const {
    slug, title, city, area, region,
    price, currency, listing_type, property_type,
    bedrooms, bathrooms, interior_living_area,
    cover_image, short_description, featured,
  } = listing;

  const href       = `/properties/${slug}`;
  const saleLabel  = LISTING_TYPE_LABELS[listing_type] ?? listing_type;
  const typeLabel  = property_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const location   = [area, city].filter(Boolean).join(", ") || region;

  return (
    <Link
      to={href}
      className="group flex overflow-hidden border border-border bg-background transition-colors duration-300 hover:border-foreground/30"
    >
      {/* Image — fixed width, full height */}
      <div className="relative w-56 shrink-0 overflow-hidden sm:w-72">
        <img
          src={cover_image}
          alt={title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />

        {/* Featured */}
        {featured && (
          <div className="absolute bottom-4 left-4">
            <span className="px-3 py-1 bg-primary text-background text-[10px] tracking-[0.2em] uppercase font-body">
              Featured
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col justify-between p-6">
        <div>
          {/* Type label + arrow */}
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[10px] font-body font-medium uppercase tracking-[0.2em] text-muted-foreground">
              {typeLabel}
            </span>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-all duration-300 group-hover:text-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>

          {/* Title */}
          <h3 className="font-display text-xl font-light text-foreground mb-1.5 line-clamp-2 group-hover:text-primary transition-colors duration-300">
            {title}
          </h3>

          {/* Location */}
          <p className="flex items-center gap-1 text-xs text-muted-foreground tracking-wider mb-3">
            <MapPin className="h-3 w-3 shrink-0" />
            {location}
          </p>

          {/* Description */}
          {short_description && (
            <p className="text-sm leading-relaxed text-muted-foreground font-body line-clamp-2">
              {short_description}
            </p>
          )}
        </div>

        {/* Footer: specs + price */}
        <div className="flex items-end justify-between pt-4 border-t border-border mt-4">
          <div className="flex gap-4 text-xs text-muted-foreground font-body">
            {bedrooms != null && (
              <span className="flex items-center gap-1">
                <Bed className="h-3.5 w-3.5" /> {bedrooms} bed
              </span>
            )}
            {bathrooms != null && (
              <span className="flex items-center gap-1">
                <Bath className="h-3.5 w-3.5" /> {bathrooms} bath
              </span>
            )}
            {interior_living_area != null && (
              <span className="flex items-center gap-1">
                <Maximize className="h-3.5 w-3.5" /> {interior_living_area.toLocaleString()} m²
              </span>
            )}
          </div>

          <span className="font-display text-lg text-primary">
            {formatPrice(price, currency, listing_type)}
          </span>
        </div>
      </div>
    </Link>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// EXPORT — single component, two variants
// ═════════════════════════════════════════════════════════════════════════════

export default function PropertyCard({ listing, view = "grid" }: PropertyCardProps) {
  return view === "list"
    ? <HorizontalCard listing={listing} />
    : <VerticalCard listing={listing} />;
}
