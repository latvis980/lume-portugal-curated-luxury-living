// frontend/src/pages/ListingPage.tsx
import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Bed,
  Bath,
  Maximize,
  MapPin,
  Calendar,
  Zap,
  Eye,
  TreePine,
  Waves,
  Car,
  Home,
  Snowflake,
  Flame,
  Shield,
  Wifi,
  X,
  ExternalLink,
  Share2,
  ArrowLeft,
  Grid3X3,
  Play,
  FileText,
  Compass,
  Building2,
  Mountain,
  Plane,
  Anchor,
  GraduationCap,
  Bike,
  Coffee,
  Wine,
  Sparkles,
  Bus,
  Hospital,
  Landmark,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { fetchListingBySlug, type Listing } from "@/lib/public-api";

// ─── Helpers ─────────────────────────────────────────────────────────────

function formatPrice(price: number, currency = "EUR"): string {
  if (currency === "EUR") return `€${price.toLocaleString("en-IE")}`;
  return `${price.toLocaleString()} ${currency}`;
}

function formatArea(value: number | null | undefined): string {
  if (value == null || value === 0) return "";
  return `${value.toLocaleString()} m²`;
}

function capitalize(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const LISTING_TYPE_LABELS: Record<string, string> = {
  sale: "For Sale",
  rent: "For Rent",
};

const CONDITION_LABELS: Record<string, string> = {
  new: "New",
  excellent: "Excellent",
  renovated: "Renovated",
  good: "Good",
  to_refurbish: "To Refurbish",
};

const VIEW_ICONS: Record<string, typeof Waves> = {
  sea: Waves,
  ocean: Waves,
  river: Waves,
  golf: TreePine,
  city: Building2,
  countryside: Mountain,
  mountain: Mountain,
  garden: TreePine,
  marina: Compass,
  panoramic: Eye,
};

const NEARBY_LABELS: Record<string, string> = {
  beach: "Beach",
  airport: "Airport",
  golf_course: "Golf Course",
  marina: "Marina",
  yacht_club: "Yacht Club",
  tennis_court: "Tennis Court",
  equestrian: "Equestrian Centre",
  fine_dining: "Fine Dining",
  wine_region: "Wine Region",
  spa_wellness: "Spa & Wellness",
  international_school: "International School",
  private_hospital: "Private Hospital",
  historic_center: "Historic Centre",
  cultural_district: "Cultural District",
  river_waterfront: "River / Waterfront",
  park_nature: "Park & Nature Reserve",
  surf_spot: "Surf Spot",
  cycling_paths: "Cycling Paths",
  peace_quiet: "Peace & Quiet",
  public_transport: "Public Transport",
  coworking_space: "Coworking Space",
  ski_resort: "Ski Resort",
};

const NEARBY_ICONS: Record<string, typeof MapPin> = {
  beach: Waves,
  airport: Plane,
  golf_course: TreePine,
  marina: Anchor,
  yacht_club: Anchor,
  tennis_court: Compass,
  equestrian: Mountain,
  fine_dining: Coffee,
  wine_region: Wine,
  spa_wellness: Sparkles,
  international_school: GraduationCap,
  private_hospital: Hospital,
  historic_center: Landmark,
  cultural_district: Landmark,
  river_waterfront: Waves,
  park_nature: TreePine,
  surf_spot: Waves,
  cycling_paths: Bike,
  peace_quiet: Mountain,
  public_transport: Bus,
  coworking_space: Building2,
  ski_resort: Mountain,
};

// ─── Feature collector ───────────────────────────────────────────────────

interface Feature {
  label: string;
  icon: typeof Home;
}

function collectFeatures(listing: Listing): Feature[] {
  const features: Feature[] = [];
  const add = (condition: boolean | null | undefined, label: string, icon: typeof Home) => {
    if (condition) features.push({ label, icon });
  };

  // Outdoor
  add(listing.pool, "Pool", Waves);
  add(listing.heated_pool && !listing.pool, "Heated Pool", Waves);
  add(listing.terrace, "Terrace", Home);
  add(listing.roof_terrace, "Roof Terrace", Home);
  add(listing.balcony, "Balcony", Home);
  add(listing.garden, "Garden", TreePine);
  add(listing.private_garden && !listing.garden, "Private Garden", TreePine);
  add(listing.patio, "Patio", Home);
  add(listing.outdoor_kitchen, "Outdoor Kitchen", Flame);
  add(listing.bbq_area, "BBQ Area", Flame);

  // Indoor
  add(listing.air_conditioning, "Air Conditioning", Snowflake);
  add(listing.heating, "Heating", Flame);
  add(listing.underfloor_heating, "Underfloor Heating", Flame);
  add(listing.fireplace, "Fireplace", Flame);
  add(listing.equipped_kitchen, "Equipped Kitchen", Home);
  add(listing.laundry_room, "Laundry Room", Home);
  add(listing.walk_in_wardrobe, "Walk-in Wardrobe", Home);
  add(listing.smart_home, "Smart Home", Wifi);
  add(listing.alarm_system, "Alarm System", Shield);
  add(listing.security, "24h Security", Shield);
  add(listing.concierge, "Concierge", Home);
  add(listing.furnished, "Furnished", Home);

  // Parking & Access
  add(listing.elevator, "Elevator", Building2);
  add(listing.garage, "Garage", Car);
  add(listing.covered_parking, "Covered Parking", Car);
  add(listing.underground_parking, "Underground Parking", Car);
  add(listing.ev_charging, "EV Charging", Zap);

  return features;
}

// ─── Gallery Modal ───────────────────────────────────────────────────────

function GalleryModal({
  images,
  startIndex,
  onClose,
}: {
  images: string[];
  startIndex: number;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(startIndex);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setIdx((i) => (i + 1) % images.length);
      if (e.key === "ArrowLeft") setIdx((i) => (i - 1 + images.length) % images.length);
    };
    window.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [images.length, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-6 right-6 z-10 text-white/70 hover:text-white transition"
      >
        <X size={28} />
      </button>

      <div className="absolute top-6 left-1/2 -translate-x-1/2 text-white/50 text-sm tracking-widest font-body">
        {idx + 1} / {images.length}
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          setIdx((i) => (i - 1 + images.length) % images.length);
        }}
        className="absolute left-4 md:left-8 text-white/50 hover:text-white transition"
      >
        <ChevronLeft size={40} />
      </button>

      <img
        src={images[idx]}
        alt={`Photo ${idx + 1}`}
        className="max-h-[85vh] max-w-[90vw] object-contain"
        onClick={(e) => e.stopPropagation()}
      />

      <button
        onClick={(e) => {
          e.stopPropagation();
          setIdx((i) => (i + 1) % images.length);
        }}
        className="absolute right-4 md:right-8 text-white/50 hover:text-white transition"
      >
        <ChevronRight size={40} />
      </button>
    </motion.div>
  );
}

// ─── Image Gallery Hero ──────────────────────────────────────────────────

function GalleryHero({
  listing,
  onOpenGallery,
}: {
  listing: Listing;
  onOpenGallery: (idx: number) => void;
}) {
  const allImages = useMemo(
    () => [listing.cover_image, ...listing.gallery].filter(Boolean),
    [listing.cover_image, listing.gallery]
  );

  if (allImages.length === 0) return null;

  if (allImages.length === 1) {
    return (
      <div className="w-full aspect-[16/9] md:aspect-[21/9] overflow-hidden cursor-pointer" onClick={() => onOpenGallery(0)}>
        <img
          src={allImages[0]}
          alt={listing.title}
          className="w-full h-full object-cover hover:scale-[1.02] transition-transform duration-700"
        />
      </div>
    );
  }

  return (
    <div className="w-full grid grid-cols-4 grid-rows-2 gap-1.5 md:gap-2 aspect-[16/9] md:aspect-[21/9]">
      {/* Main image — spans 2 cols, 2 rows */}
      <div
        className="col-span-2 row-span-2 overflow-hidden cursor-pointer relative group"
        onClick={() => onOpenGallery(0)}
      >
        <img
          src={allImages[0]}
          alt={listing.title}
          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700"
        />
      </div>

      {/* Secondary images */}
      {allImages.slice(1, 5).map((img, i) => (
        <div
          key={i}
          className="overflow-hidden cursor-pointer relative group"
          onClick={() => onOpenGallery(i + 1)}
        >
          <img
            src={img}
            alt={`Photo ${i + 2}`}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700"
          />
          {/* Show "View all" overlay on last visible image if more exist */}
          {i === 3 && allImages.length > 5 && (
            <div className="absolute inset-0 bg-charcoal/60 flex items-center justify-center">
              <div className="text-center text-white">
                <Grid3X3 size={24} className="mx-auto mb-1" />
                <span className="text-xs tracking-[0.15em] uppercase font-body">
                  +{allImages.length - 5} photos
                </span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Spec Pill ───────────────────────────────────────────────────────────

function SpecPill({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Bed;
  value: string | number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 text-foreground/80">
      <Icon size={18} strokeWidth={1.5} className="text-muted-foreground" />
      <span className="text-sm font-body">
        <span className="font-medium">{value}</span>{" "}
        <span className="text-muted-foreground">{label}</span>
      </span>
    </div>
  );
}

// ─── Contact / Enquiry Sidebar ───────────────────────────────────────────

function EnquirySidebar({ listing }: { listing: Listing }) {
  return (
    <div className="sticky top-24">
      <div className="rounded-sm border border-border bg-card p-6 md:p-8 space-y-6">
        {/* Price */}
        <div>
          <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-1 font-body">
            {LISTING_TYPE_LABELS[listing.listing_type] || listing.listing_type}
          </p>
          <p className="font-display text-3xl md:text-4xl font-light text-foreground">
            {formatPrice(listing.price, listing.currency)}
          </p>
          {listing.listing_type === "rent" && (
            <p className="text-xs text-muted-foreground mt-1 font-body">/month</p>
          )}
        </div>

        <div className="w-12 h-px bg-primary/40" />

        {/* Agent */}
        <div className="space-y-3">
          <p className="text-xs tracking-[0.15em] uppercase text-muted-foreground font-body">
            Your Residential Curator
          </p>
          {listing.agent_name && (
            <p className="font-display text-lg text-foreground">{listing.agent_name}</p>
          )}
        </div>

        {/* CTA buttons */}
        <div className="space-y-3">
          {listing.agent_whatsapp && (
            <a
              href={`https://wa.me/${listing.agent_whatsapp.replace(/[^0-9]/g, "")}?text=Hi, I'm interested in ${listing.title} (${listing.reference})`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3.5 bg-[#25D366] text-white text-xs tracking-[0.15em] uppercase font-body font-medium rounded-sm hover:bg-[#20BD5A] transition"
            >
              WhatsApp
              <ExternalLink size={14} />
            </a>
          )}

          {listing.agent_email && (
            <a
              href={`mailto:${listing.agent_email}?subject=Enquiry: ${listing.title} (${listing.reference})`}
              className="flex items-center justify-center gap-2 w-full py-3.5 bg-foreground text-background text-xs tracking-[0.15em] uppercase font-body font-medium rounded-sm hover:bg-foreground/90 transition"
            >
              Send Enquiry
            </a>
          )}

          {listing.agent_phone && (
            <a
              href={`tel:${listing.agent_phone}`}
              className="flex items-center justify-center gap-2 w-full py-3.5 border border-border text-foreground text-xs tracking-[0.15em] uppercase font-body font-medium rounded-sm hover:bg-muted transition"
            >
              Call {listing.agent_phone}
            </a>
          )}

          {!listing.agent_whatsapp && !listing.agent_email && !listing.agent_phone && (
            <Link
              to="/contact"
              className="flex items-center justify-center gap-2 w-full py-3.5 bg-foreground text-background text-xs tracking-[0.15em] uppercase font-body font-medium rounded-sm hover:bg-foreground/90 transition"
            >
              Request Information
            </Link>
          )}
        </div>

        {/* Reference */}
        <p className="text-xs text-muted-foreground font-body text-center pt-2">
          Ref: {listing.reference}
        </p>
      </div>

      {/* Extra links */}
      <div className="mt-4 flex items-center justify-center gap-6 text-xs text-muted-foreground font-body">
        {listing.virtual_tour_url && (
          <a
            href={listing.virtual_tour_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-foreground transition"
          >
            <Compass size={14} /> Virtual Tour
          </a>
        )}
        {listing.video_url && (
          <a
            href={listing.video_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-foreground transition"
          >
            <Play size={14} /> Video
          </a>
        )}
        {listing.brochure_url && (
          <a
            href={listing.brochure_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-foreground transition"
          >
            <FileText size={14} /> Brochure
          </a>
        )}
        <button
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
          }}
          className="flex items-center gap-1.5 hover:text-foreground transition"
        >
          <Share2 size={14} /> Share
        </button>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═════════════════════════════════════════════════════════════════════════

export default function ListingPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [galleryOpen, setGalleryOpen] = useState<number | null>(null);

  const {
    data: listing,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["listing", slug],
    queryFn: () => fetchListingBySlug(slug!),
    enabled: !!slug,
  });

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  const allImages = useMemo(
    () =>
      listing
        ? [listing.cover_image, ...listing.gallery].filter(Boolean)
        : [],
    [listing]
  );

  const features = useMemo(
    () => (listing ? collectFeatures(listing) : []),
    [listing]
  );

  // ── Loading State ──────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-20 md:pt-24">
          {/* Gallery skeleton */}
          <div className="w-full aspect-[21/9] bg-muted animate-pulse" />
          <div className="max-w-7xl mx-auto px-6 md:px-12 py-12">
            <div className="h-8 w-64 bg-muted rounded animate-pulse mb-4" />
            <div className="h-4 w-48 bg-muted rounded animate-pulse mb-8" />
            <div className="grid grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Error / Not Found State ────────────────────────────────────────────

  if (error || !listing) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-32 flex flex-col items-center justify-center text-center px-6">
          <h1 className="font-display text-4xl font-light text-foreground mb-4">
            Property Not Found
          </h1>
          <p className="text-muted-foreground font-body mb-8 max-w-md">
            This property may no longer be available or the link may be incorrect.
          </p>
          <button
            onClick={() => navigate("/properties")}
            className="flex items-center gap-2 px-6 py-3 border border-border text-xs tracking-[0.2em] uppercase font-body hover:bg-muted transition"
          >
            <ArrowLeft size={14} /> View All Properties
          </button>
        </div>
      </div>
    );
  }

  // ── Build location string ──────────────────────────────────────────────

  const locationParts = [listing.area, listing.city, listing.region].filter(
    (v, i, a) => v && a.indexOf(v) === i // deduplicate
  );
  const locationString = locationParts.join(", ");

  // ── Measurement details ────────────────────────────────────────────────

  const measurements: { label: string; value: string }[] = [];
  if (listing.interior_living_area) measurements.push({ label: "Interior Area", value: formatArea(listing.interior_living_area) });
  if (listing.gross_built_area) measurements.push({ label: "Gross Built Area", value: formatArea(listing.gross_built_area) });
  if (listing.gross_private_area) measurements.push({ label: "Gross Private Area", value: formatArea(listing.gross_private_area) });
  if (listing.plot_size) measurements.push({ label: "Plot Size", value: formatArea(listing.plot_size) });
  if (listing.terrace_area) measurements.push({ label: "Terrace Area", value: formatArea(listing.terrace_area) });
  if (listing.balcony_area) measurements.push({ label: "Balcony Area", value: formatArea(listing.balcony_area) });
  if (listing.garden_area) measurements.push({ label: "Garden Area", value: formatArea(listing.garden_area) });
  if (listing.outdoor_area_total) measurements.push({ label: "Total Outdoor Area", value: formatArea(listing.outdoor_area_total) });

  // ── Room details ───────────────────────────────────────────────────────

  const roomDetails: { label: string; value: string | number }[] = [];
  if (listing.bedrooms != null) roomDetails.push({ label: "Bedrooms", value: listing.bedrooms });
  if (listing.suites) roomDetails.push({ label: "Suites", value: listing.suites });
  if (listing.bathrooms != null) roomDetails.push({ label: "Bathrooms", value: listing.bathrooms });
  if (listing.guest_wc) roomDetails.push({ label: "Guest WC", value: listing.guest_wc });
  if (listing.living_rooms) roomDetails.push({ label: "Living Rooms", value: listing.living_rooms });
  if (listing.floors) roomDetails.push({ label: "Floors", value: listing.floors });
  if (listing.floor_number != null) roomDetails.push({ label: "Floor", value: listing.floor_number });
  if (listing.parking_spaces) roomDetails.push({ label: "Parking Spaces", value: listing.parking_spaces });
  if (listing.office) roomDetails.push({ label: "Office", value: "Yes" });
  if (listing.storage_room) roomDetails.push({ label: "Storage Room", value: "Yes" });

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ── Gallery lightbox ──────────────────────────────────────────── */}
      <AnimatePresence>
        {galleryOpen !== null && (
          <GalleryModal
            images={allImages}
            startIndex={galleryOpen}
            onClose={() => setGalleryOpen(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Gallery Hero ──────────────────────────────────────────────── */}
      <div className="pt-16 md:pt-20">
        <GalleryHero listing={listing} onOpenGallery={(idx) => setGalleryOpen(idx)} />
      </div>

      {/* ── Content ───────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-10 md:py-16">
        {/* Breadcrumb */}
        <nav className="mb-8 flex items-center gap-2 text-xs text-muted-foreground font-body">
          <Link to="/" className="hover:text-foreground transition">Home</Link>
          <span>/</span>
          <Link to="/properties" className="hover:text-foreground transition">Properties</Link>
          <span>/</span>
          <span className="text-foreground truncate max-w-[200px]">{listing.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-16">
          {/* ── Left Column: Details ──────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-12">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Tags row */}
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] tracking-[0.2em] uppercase font-body font-medium">
                  {LISTING_TYPE_LABELS[listing.listing_type] || listing.listing_type}
                </span>
                <span className="px-3 py-1 bg-muted text-muted-foreground text-[10px] tracking-[0.2em] uppercase font-body">
                  {capitalize(listing.property_type)}
                </span>
                {listing.featured && (
                  <span className="px-3 py-1 bg-primary text-primary-foreground text-[10px] tracking-[0.2em] uppercase font-body font-medium">
                    Featured
                  </span>
                )}
                {listing.new_development && (
                  <span className="px-3 py-1 bg-secondary text-secondary-foreground text-[10px] tracking-[0.2em] uppercase font-body">
                    New Development
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-light text-foreground leading-tight mb-3">
                {listing.title}
              </h1>

              {/* Location */}
              <div className="flex items-center gap-2 text-muted-foreground mb-6">
                <MapPin size={16} strokeWidth={1.5} />
                <span className="text-sm font-body tracking-wide">{locationString}, {listing.country}</span>
              </div>

              {/* Key specs row */}
              <div className="flex flex-wrap items-center gap-6 pb-6 border-b border-border">
                <SpecPill icon={Bed} value={listing.bedrooms} label={listing.bedrooms === 1 ? "Bedroom" : "Bedrooms"} />
                <SpecPill icon={Bath} value={listing.bathrooms} label={listing.bathrooms === 1 ? "Bathroom" : "Bathrooms"} />
                <SpecPill icon={Maximize} value={formatArea(listing.interior_living_area)} label="" />
                {listing.plot_size && (
                  <SpecPill icon={TreePine} value={formatArea(listing.plot_size)} label="plot" />
                )}
              </div>

              {/* Mobile price (hidden on desktop where sidebar shows it) */}
              <div className="lg:hidden mt-6 p-5 rounded-sm border border-border bg-card">
                <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-1 font-body">
                  {LISTING_TYPE_LABELS[listing.listing_type] || listing.listing_type}
                </p>
                <p className="font-display text-3xl font-light text-foreground">
                  {formatPrice(listing.price, listing.currency)}
                </p>
              </div>
            </motion.div>

            {/* ── Description ──────────────────────────────────────────── */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <h2 className="font-display text-2xl font-light text-foreground mb-4">
                About this Property
              </h2>
              {listing.ai_summary && (
                <p className="text-base font-body leading-relaxed text-foreground/90 mb-4 italic border-l-2 border-primary/30 pl-4">
                  {listing.ai_summary}
                </p>
              )}
              {listing.full_description ? (
                <div className="text-sm font-body leading-relaxed text-foreground/80 whitespace-pre-line">
                  {listing.full_description}
                </div>
              ) : (
                <p className="text-sm font-body leading-relaxed text-foreground/80">
                  {listing.short_description}
                </p>
              )}

              {/* Key selling points */}
              {listing.key_selling_points.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2">
                  {listing.key_selling_points.map((point, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 bg-muted text-foreground/80 text-xs font-body rounded-sm"
                    >
                      {point}
                    </span>
                  ))}
                </div>
              )}
            </motion.section>

            {/* ── Property Details Grid ────────────────────────────────── */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
              <h2 className="font-display text-2xl font-light text-foreground mb-6">
                Property Details
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4 pb-6 border-b border-border">
                {roomDetails.map((item) => (
                  <div key={item.label} className="flex justify-between text-sm font-body">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="text-foreground font-medium">{item.value}</span>
                  </div>
                ))}
                {listing.condition && (
                  <div className="flex justify-between text-sm font-body">
                    <span className="text-muted-foreground">Condition</span>
                    <span className="text-foreground font-medium">
                      {CONDITION_LABELS[listing.condition] || capitalize(listing.condition)}
                    </span>
                  </div>
                )}
                {listing.energy_rating && (
                  <div className="flex justify-between text-sm font-body">
                    <span className="text-muted-foreground">Energy Rating</span>
                    <span className="text-foreground font-medium">{listing.energy_rating}</span>
                  </div>
                )}
                {listing.build_year && (
                  <div className="flex justify-between text-sm font-body">
                    <span className="text-muted-foreground">Built</span>
                    <span className="text-foreground font-medium">{listing.build_year}</span>
                  </div>
                )}
                {listing.renovation_year && (
                  <div className="flex justify-between text-sm font-body">
                    <span className="text-muted-foreground">Renovated</span>
                    <span className="text-foreground font-medium">{listing.renovation_year}</span>
                  </div>
                )}
              </div>
            </motion.section>

            {/* ── Measurements ─────────────────────────────────────────── */}
            {measurements.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <h2 className="font-display text-2xl font-light text-foreground mb-6">
                  Areas & Measurements
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {measurements.map((m) => (
                    <div
                      key={m.label}
                      className="p-4 border border-border rounded-sm text-center"
                    >
                      <p className="font-display text-xl text-foreground mb-1">{m.value}</p>
                      <p className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase font-body">
                        {m.label}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.section>
            )}

            {/* ── Views ───────────────────────────────────────────────── */}
            {listing.views.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.25 }}
              >
                <h2 className="font-display text-2xl font-light text-foreground mb-6">
                  Views
                </h2>
                <div className="flex flex-wrap gap-3">
                  {listing.views.map((view) => {
                    const Icon = VIEW_ICONS[view] || Eye;
                    return (
                      <div
                        key={view}
                        className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-sm"
                      >
                        <Icon size={16} strokeWidth={1.5} className="text-primary" />
                        <span className="text-sm font-body">{capitalize(view)}</span>
                      </div>
                    );
                  })}
                </div>
              </motion.section>
            )}

            {/* ── Nearby ───────────────────────────────────────────────── */}
            {listing.nearby.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.28 }}
              >
                <h2 className="font-display text-2xl font-light text-foreground mb-6">
                  Close To
                </h2>
                <div className="flex flex-wrap gap-3">
                  {listing.nearby.map((item) => {
                    const Icon = NEARBY_ICONS[item] || MapPin;
                    return (
                      <div
                        key={item}
                        className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-sm"
                      >
                        <Icon size={16} strokeWidth={1.5} className="text-primary" />
                        <span className="text-sm font-body">
                          {NEARBY_LABELS[item] ?? capitalize(item)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </motion.section>
            )}

            {/* ── Features & Amenities ────────────────────────────────── */}
            {features.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <h2 className="font-display text-2xl font-light text-foreground mb-6">
                  Features & Amenities
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {features.map((feat) => (
                    <div
                      key={feat.label}
                      className="flex items-center gap-3 py-2.5 px-3 rounded-sm bg-muted/50"
                    >
                      <feat.icon size={16} strokeWidth={1.5} className="text-primary shrink-0" />
                      <span className="text-sm font-body text-foreground/80">{feat.label}</span>
                    </div>
                  ))}
                </div>
              </motion.section>
            )}

            {/* ── Lifestyle Tags ───────────────────────────────────────── */}
            {listing.lifestyle_tags.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.35 }}
              >
                <h2 className="font-display text-2xl font-light text-foreground mb-4">
                  Lifestyle
                </h2>
                <div className="flex flex-wrap gap-2">
                  {listing.lifestyle_tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-4 py-2 bg-primary/8 text-primary text-xs tracking-[0.1em] uppercase font-body rounded-sm border border-primary/15"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </motion.section>
            )}

            {/* ── Floor Plans ──────────────────────────────────────────── */}
            {listing.floor_plans.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <h2 className="font-display text-2xl font-light text-foreground mb-6">
                  Floor Plans
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {listing.floor_plans.map((fp, i) => (
                    <a
                      key={i}
                      href={fp}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block border border-border rounded-sm overflow-hidden hover:border-primary/40 transition group"
                    >
                      <img
                        src={fp}
                        alt={`Floor plan ${i + 1}`}
                        className="w-full h-auto object-contain p-4 bg-white group-hover:scale-[1.01] transition-transform"
                      />
                    </a>
                  ))}
                </div>
              </motion.section>
            )}

            {/* ── Development Name ─────────────────────────────────────── */}
            {listing.development_name && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.45 }}
                className="p-6 border border-border rounded-sm bg-muted/30"
              >
                <p className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-1 font-body">
                  Development
                </p>
                <p className="font-display text-xl text-foreground">{listing.development_name}</p>
              </motion.section>
            )}
          </div>

          {/* ── Right Column: Enquiry Sidebar (desktop) ───────────────── */}
          <div className="hidden lg:block">
            <EnquirySidebar listing={listing} />
          </div>
        </div>

        {/* ── Mobile Enquiry (sticky bottom) ────────────────────────── */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <p className="font-display text-xl font-light text-foreground">
              {formatPrice(listing.price, listing.currency)}
            </p>
            <p className="text-[10px] text-muted-foreground tracking-wider uppercase font-body">
              {listing.reference}
            </p>
          </div>
          {listing.agent_whatsapp ? (
            <a
              href={`https://wa.me/${listing.agent_whatsapp.replace(/[^0-9]/g, "")}?text=Hi, I'm interested in ${listing.title} (${listing.reference})`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-[#25D366] text-white text-xs tracking-[0.15em] uppercase font-body font-medium rounded-sm"
            >
              WhatsApp
            </a>
          ) : (
            <Link
              to="/contact"
              className="px-6 py-3 bg-foreground text-background text-xs tracking-[0.15em] uppercase font-body font-medium rounded-sm"
            >
              Enquire
            </Link>
          )}
        </div>

        {/* Bottom spacer for mobile sticky bar */}
        <div className="lg:hidden h-20" />
      </div>

      <Footer />
    </div>
  );
}
