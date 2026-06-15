// frontend/src/pages/PropertiesPage.tsx
import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { SlidersHorizontal, X, LayoutGrid, List, RotateCcw, MapPin } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { HomesComingSoon, HOMES_COMING_SOON } from "@/components/ComingSoonBanner";
import PropertyCard from "@/components/PropertyCard";
import { SelectDropdown } from "@/components/ui/SelectDropdown";
import { ToggleGroup } from "@/components/ui/ToggleGroup";
import {
  fetchListings, fetchPropertyFacets,
  type ListingsQuery, type ListingsResponse, type PropertyFacets, type Listing,
} from "@/lib/public-api";
import { useI18n, useT } from "@/lib/i18n";
import { getPropertyTypeLabel } from "@/lib/property-types";

const PAGE_SIZE = 24;

const CONDITION_LABELS: Record<string, string> = {
  new: "New", excellent: "Excellent", renovated: "Renovated",
  good: "Good", to_refurbish: "To Refurbish",
};

const VIEW_LABELS: Record<string, string> = {
  sea: "Sea", ocean: "Ocean", river: "River", golf: "Golf",
  city: "City", countryside: "Countryside", mountain: "Mountain",
  garden: "Garden", marina: "Marina", panoramic: "Panoramic",
};

const FEATURE_OPTIONS: { key: string; label: string }[] = [
  { key: "pool",             label: "Pool" },
  { key: "heated_pool",      label: "Heated Pool" },
  { key: "garage",           label: "Garage" },
  { key: "garden",           label: "Garden" },
  { key: "terrace",          label: "Terrace" },
  { key: "balcony",          label: "Balcony" },
  { key: "elevator",         label: "Elevator" },
  { key: "fireplace",        label: "Fireplace" },
  { key: "air_conditioning", label: "Air Conditioning" },
  { key: "solar_panels",     label: "Solar Panels" },
  { key: "alarm_system",     label: "Alarm System" },
  { key: "smart_home",       label: "Smart Home" },
  { key: "wine_cellar",      label: "Wine Cellar" },
  { key: "home_cinema",      label: "Home Cinema" },
  { key: "gym",              label: "Gym" },
  { key: "concierge",        label: "Concierge" },
  { key: "furnished",        label: "Furnished" },
];

const SORT_OPTIONS = [
  { value: "featured",   label: "Featured" },
  { value: "newest",     label: "Newest" },
  { value: "price_asc",  label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
];

interface Filters {
  region: string; city: string; area: string;
  type: string; listing_type: string;
  min_price: string; max_price: string;
  min_bedrooms: string; max_bedrooms: string;
  min_bathrooms: string; max_bathrooms: string;
  min_area: string; max_area: string;
  condition: string;
  views: string[]; features: string[];
  featured_only: boolean;
  sort_by: string;
}

const DEFAULT_FILTERS: Filters = {
  region: "", city: "", area: "",
  type: "", listing_type: "sale",
  min_price: "", max_price: "",
  min_bedrooms: "", max_bedrooms: "",
  min_bathrooms: "", max_bathrooms: "",
  min_area: "", max_area: "",
  condition: "",
  views: [], features: [],
  featured_only: false,
  sort_by: "featured",
};

function filtersToSearchParams(f: Filters): URLSearchParams {
  const p = new URLSearchParams();
  const set = (k: string, v: string) => { if (v && v !== DEFAULT_FILTERS[k as keyof Filters]) p.set(k, v); };
  set("region", f.region); set("city", f.city); set("area", f.area);
  set("type", f.type);
  if (f.listing_type && f.listing_type !== "sale") p.set("listing_type", f.listing_type);
  set("min_price", f.min_price); set("max_price", f.max_price);
  set("min_bedrooms", f.min_bedrooms); set("max_bedrooms", f.max_bedrooms);
  set("min_bathrooms", f.min_bathrooms); set("max_bathrooms", f.max_bathrooms);
  set("min_area", f.min_area); set("max_area", f.max_area);
  set("condition", f.condition);
  if (f.views.length)    p.set("views",    f.views.join(","));
  if (f.features.length) p.set("features", f.features.join(","));
  if (f.featured_only)   p.set("featured_only", "true");
  if (f.sort_by !== "featured") p.set("sort_by", f.sort_by);
  return p;
}

function searchParamsToFilters(p: URLSearchParams): Filters {
  return {
    region:        p.get("region")        ?? "",
    city:          p.get("city")          ?? "",
    area:          p.get("area")          ?? "",
    type:          p.get("type")          ?? "",
    listing_type:  p.get("listing_type")  ?? "sale",
    min_price:     p.get("min_price")     ?? "",
    max_price:     p.get("max_price")     ?? "",
    min_bedrooms:  p.get("min_bedrooms")  ?? "",
    max_bedrooms:  p.get("max_bedrooms")  ?? "",
    min_bathrooms: p.get("min_bathrooms") ?? "",
    max_bathrooms: p.get("max_bathrooms") ?? "",
    min_area:      p.get("min_area")      ?? "",
    max_area:      p.get("max_area")      ?? "",
    condition:     p.get("condition")     ?? "",
    views:    p.get("views")    ? p.get("views")!.split(",").filter(Boolean) : [],
    features: p.get("features") ? p.get("features")!.split(",").filter(Boolean) : [],
    featured_only: p.get("featured_only") === "true",
    sort_by:  p.get("sort_by") ?? "featured",
  };
}

function filtersToQuery(f: Filters, offset: number): ListingsQuery {
  return {
    region:        f.region     || undefined,
    city:          f.city       || undefined,
    area:          f.area       || undefined,
    type:          f.type       || undefined,
    listing_type:  f.listing_type || "sale",
    min_price:     f.min_price  ? Number(f.min_price)  : undefined,
    max_price:     f.max_price  ? Number(f.max_price)  : undefined,
    min_bedrooms:  f.min_bedrooms  ? Number(f.min_bedrooms)  : undefined,
    max_bedrooms:  f.max_bedrooms  ? Number(f.max_bedrooms)  : undefined,
    min_bathrooms: f.min_bathrooms ? Number(f.min_bathrooms) : undefined,
    max_bathrooms: f.max_bathrooms ? Number(f.max_bathrooms) : undefined,
    min_area:      f.min_area   ? Number(f.min_area)   : undefined,
    max_area:      f.max_area   ? Number(f.max_area)   : undefined,
    condition:     f.condition  || undefined,
    views:         f.views.length    ? f.views    : undefined,
    features:      f.features.length ? f.features : undefined,
    featured_only: f.featured_only   || undefined,
    sort_by:       (f.sort_by as ListingsQuery["sort_by"]) || "featured",
    limit:  PAGE_SIZE,
    offset,
  };
}

function countActiveFilters(f: Filters): number {
  let n = 0;
  if (f.region)        n++;
  if (f.city)          n++;
  if (f.area)          n++;
  if (f.type)          n++;
  if (f.listing_type && f.listing_type !== "sale") n++;
  if (f.min_price)     n++;
  if (f.max_price)     n++;
  if (f.min_bedrooms)  n++;
  if (f.max_bedrooms)  n++;
  if (f.min_bathrooms) n++;
  if (f.max_bathrooms) n++;
  if (f.min_area)      n++;
  if (f.max_area)      n++;
  if (f.condition)     n++;
  n += f.views.length + f.features.length;
  if (f.featured_only) n++;
  return n;
}

// ─── Page-local sub-components ────────────────────────────────────────────────

function RangeInputs({ label, minKey, maxKey, prefix, suffix, filters, onChange }: {
  label: string; minKey: keyof Filters; maxKey: keyof Filters;
  prefix?: string; suffix?: string;
  filters: Filters; onChange: (k: keyof Filters, v: string) => void;
}) {
  const inputClass = (withPrefix: boolean) =>
    `w-full rounded border border-border bg-background py-2 text-sm text-foreground font-body outline-none transition placeholder:text-muted-foreground/40 focus:border-foreground/30 ${withPrefix ? "pl-7 pr-3" : "px-3"}`;

  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground font-body">{label}</p>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{prefix}</span>}
          <input type="number" placeholder="Min" value={filters[minKey] as string}
            onChange={(e) => onChange(minKey, e.target.value)} className={inputClass(!!prefix)} />
        </div>
        <span className="text-muted-foreground/30">—</span>
        <div className="relative flex-1">
          {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{prefix}</span>}
          <input type="number" placeholder="Max" value={filters[maxKey] as string}
            onChange={(e) => onChange(maxKey, e.target.value)} className={inputClass(!!prefix)} />
          {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>}
        </div>
      </div>
    </div>
  );
}

function FilterChips({ filters, onRemove }: {
  filters: Filters; onRemove: (k: string, subKey?: string) => void;
}) {
  const t = useT();
  const chips: { key: string; label: string; subKey?: string }[] = [];
  if (filters.region)       chips.push({ key: "region",       label: filters.region });
  if (filters.city)         chips.push({ key: "city",         label: filters.city });
  if (filters.area)         chips.push({ key: "area",         label: filters.area });
  if (filters.type)         chips.push({ key: "type",         label: getPropertyTypeLabel(filters.type, t) });
  if (filters.listing_type && filters.listing_type !== "sale")
    chips.push({ key: "listing_type", label: "For Rent" });
  if (filters.min_price)    chips.push({ key: "min_price",    label: `From €${Number(filters.min_price).toLocaleString()}` });
  if (filters.max_price)    chips.push({ key: "max_price",    label: `To €${Number(filters.max_price).toLocaleString()}` });
  if (filters.min_bedrooms) chips.push({ key: "min_bedrooms", label: `${filters.min_bedrooms}+ bed` });
  if (filters.max_bedrooms) chips.push({ key: "max_bedrooms", label: `max ${filters.max_bedrooms} bed` });
  if (filters.min_bathrooms) chips.push({ key: "min_bathrooms", label: `${filters.min_bathrooms}+ bath` });
  if (filters.min_area)     chips.push({ key: "min_area",     label: `From ${filters.min_area} m²` });
  if (filters.max_area)     chips.push({ key: "max_area",     label: `To ${filters.max_area} m²` });
  if (filters.condition)    chips.push({ key: "condition",    label: CONDITION_LABELS[filters.condition] ?? filters.condition });
  filters.views.forEach((v)    => chips.push({ key: "views",    subKey: v, label: VIEW_LABELS[v]    ?? v }));
  filters.features.forEach((f) => chips.push({ key: "features", subKey: f, label: FEATURE_OPTIONS.find(o => o.key === f)?.label ?? f }));
  if (filters.featured_only) chips.push({ key: "featured_only", label: "Featured only" });
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip, i) => (
        <span key={i} className="flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground font-body">
          {chip.label}
          <button onClick={() => onRemove(chip.key, chip.subKey)} className="ml-0.5 rounded-full p-0.5 hover:bg-foreground/10 transition">
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PropertiesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { locale } = useI18n();
  const t = useT();
  const [filters, setFilters] = useState<Filters>(() => searchParamsToFilters(searchParams));
  const [draftFilters, setDraftFilters] = useState<Filters>(filters);
  const [page, setPage] = useState(0);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const f = searchParamsToFilters(searchParams);
    setFilters(f); setDraftFilters(f); setPage(0);
  }, [searchParams]);

  const { data: facets } = useQuery<PropertyFacets | null>({
    queryKey: ["property-facets"],
    queryFn: fetchPropertyFacets,
    staleTime: 5 * 60 * 1000,
    enabled: !HOMES_COMING_SOON,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["listings", filters, page, locale],
    queryFn: async (): Promise<ListingsResponse & { fallbackLocation?: string }> => {
      const query = filtersToQuery(filters, page * PAGE_SIZE);
      const res = await fetchListings({ ...query, locale });
      // Footer location links ("Buy houses in …") should never dead-end: if a
      // location filter returns no listings, fall back to the full collection.
      const hasLocation = !!(filters.region || filters.city || filters.area);
      if (res.total === 0 && hasLocation && page === 0) {
        const fb = await fetchListings({
          ...query, region: undefined, city: undefined, area: undefined, locale,
        });
        if (fb.total > 0) {
          return { ...fb, fallbackLocation: filters.city || filters.area || filters.region };
        }
      }
      return res;
    },
    placeholderData: keepPreviousData,
    enabled: !HOMES_COMING_SOON,
  });

  const properties = data?.properties ?? [];
  const total      = data?.total ?? 0;
  const fallbackLocation = data?.fallbackLocation;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const applyFilters = useCallback((f: Filters) => {
    setSearchParams(filtersToSearchParams(f));
    setPage(0); setDrawerOpen(false);
  }, [setSearchParams]);

  // Region and City are independent — picking a region does NOT clear city
  const updateBasic = useCallback((key: keyof Filters, value: string | string[] | boolean) => {
    const next = { ...filters, [key]: value };
    if (key === "region") { next.area = ""; }
    if (key === "city")   { next.area = ""; }
    applyFilters(next);
  }, [filters, applyFilters]);

  const updateDraft = useCallback((key: keyof Filters, value: string | string[] | boolean) => {
    setDraftFilters(prev => {
      const next = { ...prev, [key]: value };
      if (key === "region") { next.area = ""; }
      if (key === "city")   { next.area = ""; }
      return next;
    });
  }, []);

  const toggleArrayItem = (key: "views" | "features", item: string, inDraft: boolean) => {
    const current = inDraft ? draftFilters[key] : filters[key];
    const next = current.includes(item) ? current.filter(v => v !== item) : [...current, item];
    inDraft ? updateDraft(key, next) : updateBasic(key, next);
  };

  const removeChip = (key: string, subKey?: string) => {
    const f = { ...filters };
    if (key === "views" || key === "features") {
      (f as any)[key] = (f as any)[key].filter((v: string) => v !== subKey);
    } else {
      (f as any)[key] = key === "featured_only" ? false : "";
    }
    applyFilters(f);
  };

  const resetAll = () => { applyFilters({ ...DEFAULT_FILTERS }); setDraftFilters({ ...DEFAULT_FILTERS }); };

  // ── Dropdown option lists ──────────────────────────────────────────────────
  // Region: all regions alphabetically
  const regionOptions = (facets?.regions ?? []).map(r => ({ value: r, label: r }));

  // City: always show ALL cities (independent of region selection)
  const cityOptions = (facets?.all_cities ?? []).map(c => ({ value: c, label: c }));

  // Area: show when city OR region is selected, only if >1 area exists
  //   - city selected  → areas for that city
  //   - region only    → areas for the whole region
  //   - neither        → hidden
  //   - only 1 area    → hidden (adds no value)
  const areaOptionsList = facets
    ? (filters.city
        ? facets.areas_by_city[filters.city] ?? []
        : filters.region
          ? facets.areas_by_region[filters.region] ?? []
          : []
      )
    : [];
  const areaOptions = areaOptionsList.length > 1
    ? areaOptionsList.map(a => ({ value: a, label: a }))
    : [];

  const activeFilterCount = countActiveFilters(filters);

  const activeClass = "border-foreground bg-foreground text-background";
  const inactiveClass = "border-border bg-background text-muted-foreground hover:bg-muted";

  // Homes section closed for now — show the "Coming Soon" banner in place of
  // the listings UI. Everything above runs harmlessly (queries are disabled).
  if (HOMES_COMING_SOON) return <HomesComingSoon />;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border pb-10 pt-32"
        style={{ background: "linear-gradient(180deg, hsl(var(--sand-light)) 0%, hsl(var(--background)) 100%)" }}
      >
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <div className="flex items-end justify-between">
            <div>
              <div className="mb-3 h-px w-12 bg-primary/60" />
              <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.25em] text-muted-foreground font-body">Curated Collection</p>
              <h1 className="font-display text-4xl font-light tracking-tight text-foreground sm:text-5xl">Properties</h1>
            </div>
            {total > 0 && !isLoading && (
              <p className="text-sm text-muted-foreground/70 font-body tracking-wide">
                {total.toLocaleString()} {total === 1 ? "property" : "properties"}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Filter Bar — sticks below the fixed navbar (h-14 / md:h-[5.5rem]) */}
      <section className="sticky top-14 md:top-[5.5rem] z-20 border-b border-border bg-background/95 backdrop-blur-md shadow-sm">
        <div className="mx-auto max-w-7xl px-6 md:px-12 py-3">
          <div className="flex flex-col gap-2.5">

            {/* Row 1 — listing type, location, property type, bedrooms + Filters */}
            <div className="flex flex-wrap items-center gap-3">

              {/* Listing type */}
              <div className="flex overflow-hidden rounded-sm border border-border h-9">
                {["sale", "rent"].map((lt) => (
                  <button key={lt} onClick={() => updateBasic("listing_type", lt)}
                    className={`px-3.5 text-[11px] font-medium font-body tracking-wide transition-colors ${filters.listing_type === lt ? activeClass : inactiveClass}`}
                  >
                    {lt === "sale" ? "Sale" : "Rent"}
                  </button>
                ))}
              </div>

              <span className="hidden sm:block h-6 w-px bg-border self-center" />

              {/* Region */}
              <div className="flex items-center gap-1.5 min-w-[140px]">
                <MapPin className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                <SelectDropdown value={filters.region} options={regionOptions} onChange={(v) => updateBasic("region", v)} placeholder="Region" />
              </div>

              {/* City — always visible, independent of region */}
              <div className="min-w-[120px]">
                <SelectDropdown value={filters.city} options={cityOptions} onChange={(v) => updateBasic("city", v)} placeholder="City" />
              </div>

              {/* Area — only when region or city is set AND >1 area exists */}
              {areaOptions.length > 0 && (
                <div className="min-w-[120px]">
                  <SelectDropdown value={filters.area} options={areaOptions} onChange={(v) => updateBasic("area", v)} placeholder="Area" />
                </div>
              )}

              <span className="hidden sm:block h-6 w-px bg-border self-center" />

              {/* Type */}
              <div className="min-w-[120px]">
                <SelectDropdown
                  value={filters.type}
                  options={(facets?.property_types ?? []).map(pt => ({ value: pt, label: getPropertyTypeLabel(pt, t) }))}
                  onChange={(v) => updateBasic("type", v)}
                  placeholder="Type"
                />
              </div>

              {/* Bedrooms */}
              <ToggleGroup
                inline
                options={[1, 2, 3, 4, 5]}
                value={filters.min_bedrooms}
                onChange={(v) => updateBasic("min_bedrooms", v)}
                formatOption={(v) => v === "5" ? "5+" : v}
              />

              {/* Filters button — pinned to the right edge of the column */}
              <button onClick={() => { setDraftFilters(filters); setDrawerOpen(true); }}
                className="relative ml-auto flex h-9 items-center gap-2 rounded-sm border border-border bg-background px-4 text-xs font-medium font-body tracking-wide text-foreground transition hover:bg-muted hover:border-foreground/20"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

            {/* Row 2 — price range + sort/clear (aligned under Filters) */}
            <div className="flex flex-wrap items-center gap-3">

              {/* Price */}
              <div className="flex items-center gap-1.5">
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground/50">€</span>
                  <input type="number" placeholder="Min" value={filters.min_price}
                    onChange={(e) => updateBasic("min_price", e.target.value)}
                    className="h-9 w-[5.5rem] rounded-sm border border-border bg-background pl-6 pr-2 text-xs text-foreground font-body outline-none transition focus:border-primary/50 focus:ring-1 focus:ring-primary/20 placeholder:text-muted-foreground/35"
                  />
                </div>
                <span className="text-muted-foreground/25 text-xs">–</span>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground/50">€</span>
                  <input type="number" placeholder="Max" value={filters.max_price}
                    onChange={(e) => updateBasic("max_price", e.target.value)}
                    className="h-9 w-[5.5rem] rounded-sm border border-border bg-background pl-6 pr-2 text-xs text-foreground font-body outline-none transition focus:border-primary/50 focus:ring-1 focus:ring-primary/20 placeholder:text-muted-foreground/35"
                  />
                </div>
              </div>

              {/* Sort + Clear — pinned to the right edge of the column */}
              <div className="ml-auto flex items-center gap-2">
                <SelectDropdown value={filters.sort_by} options={SORT_OPTIONS} onChange={(v) => updateBasic("sort_by", v || "featured")} placeholder="Sort" />
                {activeFilterCount > 0 && (
                  <button onClick={resetAll} className="flex h-9 items-center gap-1.5 rounded px-2.5 text-xs text-muted-foreground font-body transition hover:text-foreground">
                    <RotateCcw className="h-3 w-3" /> Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Results */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 md:px-12 py-10" ref={resultsRef}>
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1"><FilterChips filters={filters} onRemove={removeChip} /></div>
          <div className="flex items-center gap-0.5 rounded-sm border border-border bg-background p-0.5">
            <button onClick={() => setViewMode("grid")} className={`rounded-sm p-1.5 transition ${viewMode === "grid" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setViewMode("list")} className={`rounded-sm p-1.5 transition ${viewMode === "list" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {isLoading && (
          <div className={viewMode === "grid" ? "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" : "flex flex-col gap-4"}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse overflow-hidden rounded-sm border border-border bg-card">
                <div className="aspect-[4/3] bg-muted" />
                <div className="p-5 space-y-3">
                  <div className="h-2.5 w-1/4 rounded bg-muted" />
                  <div className="h-4 w-2/3 rounded bg-muted" />
                  <div className="h-2.5 w-1/2 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && fallbackLocation && properties.length > 0 && (
          <div className="mb-6 rounded-sm border border-border bg-card/60 px-4 py-3 text-sm text-muted-foreground font-body">
            {t("properties", "location_fallback", "No properties currently in {location} — showing our full collection.")
              .replace("{location}", fallbackLocation)}
          </div>
        )}

        {!isLoading && properties.length > 0 && (
          <motion.div key={`${page}-${viewMode}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className={viewMode === "grid" ? "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" : "flex flex-col gap-4"}
          >
            {properties.map((listing: Listing) => (
              <PropertyCard key={listing.id} listing={listing} view={viewMode} />
            ))}
          </motion.div>
        )}

        {!isLoading && properties.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <MapPin className="h-7 w-7 text-primary/50" />
            </div>
            <h2 className="mb-2 font-display text-xl font-light text-foreground">No properties found</h2>
            <p className="mb-8 max-w-sm text-sm leading-relaxed text-muted-foreground font-body">
              Adjust your filters or explore our full collection to discover your perfect property.
            </p>
            <button onClick={resetAll} className="rounded-sm border border-foreground/20 bg-foreground px-6 py-2.5 text-sm font-body font-medium text-background transition hover:bg-foreground/90">
              View all properties
            </button>
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-12 flex items-center justify-center gap-2">
            <button onClick={() => { setPage(p => Math.max(0, p - 1)); resultsRef.current?.scrollIntoView({ behavior: "smooth" }); }}
              disabled={page === 0} className="rounded border border-border px-4 py-2 text-sm font-body text-foreground transition hover:bg-muted disabled:opacity-30">
              Previous
            </button>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button key={i} onClick={() => { setPage(i); resultsRef.current?.scrollIntoView({ behavior: "smooth" }); }}
                className={`rounded border px-4 py-2 text-sm font-body transition ${i === page ? "border-foreground bg-foreground text-background" : "border-border bg-background text-foreground hover:bg-muted"}`}>
                {i + 1}
              </button>
            ))}
            <button onClick={() => { setPage(p => Math.min(totalPages - 1, p + 1)); resultsRef.current?.scrollIntoView({ behavior: "smooth" }); }}
              disabled={page >= totalPages - 1} className="rounded border border-border px-4 py-2 text-sm font-body text-foreground transition hover:bg-muted disabled:opacity-30">
              Next
            </button>
          </div>
        )}
      </main>

      <Footer />

      {/* Filters Drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm"
            />
            <motion.aside initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col bg-background shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-border px-6 py-5">
                <div>
                  <h2 className="font-display text-base font-light text-foreground">All Filters</h2>
                  {countActiveFilters(draftFilters) > 0 && (
                    <p className="text-xs text-muted-foreground font-body">{countActiveFilters(draftFilters)} active</p>
                  )}
                </div>
                <button onClick={() => setDrawerOpen(false)} className="rounded p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">

                <div className="space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground font-body">Location</h3>
                  <SelectDropdown label="Region" value={draftFilters.region}
                    options={(facets?.regions ?? []).map(r => ({ value: r, label: r }))}
                    onChange={(v) => updateDraft("region", v)} placeholder="Any region"
                  />
                  <SelectDropdown label="City" value={draftFilters.city}
                    options={(facets?.all_cities ?? []).map(c => ({ value: c, label: c }))}
                    onChange={(v) => updateDraft("city", v)} placeholder="Any city"
                  />
                  {(() => {
                    const drawerAreaList = facets
                      ? (draftFilters.city
                          ? facets.areas_by_city[draftFilters.city] ?? []
                          : draftFilters.region
                            ? facets.areas_by_region[draftFilters.region] ?? []
                            : []
                        )
                      : [];
                    return drawerAreaList.length > 1 ? (
                      <SelectDropdown label="Area / Neighbourhood" value={draftFilters.area}
                        options={drawerAreaList.map(a => ({ value: a, label: a }))}
                        onChange={(v) => updateDraft("area", v)} placeholder="Any area"
                      />
                    ) : null;
                  })()}
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground font-body">Property</h3>
                  <SelectDropdown label="Type" value={draftFilters.type}
                    options={(facets?.property_types ?? []).map(pt => ({ value: pt, label: getPropertyTypeLabel(pt, t) }))}
                    onChange={(v) => updateDraft("type", v)} placeholder="Any type"
                  />
                  <SelectDropdown label="Condition" value={draftFilters.condition}
                    options={(facets?.conditions ?? []).map(c => ({ value: c, label: CONDITION_LABELS[c] ?? c }))}
                    onChange={(v) => updateDraft("condition", v)} placeholder="Any condition"
                  />
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground font-body">Price</h3>
                  <RangeInputs
                    label={`Range${facets ? ` (€${facets.price_range.min.toLocaleString()} – €${facets.price_range.max.toLocaleString()})` : ""}`}
                    minKey="min_price" maxKey="max_price" prefix="€" filters={draftFilters} onChange={updateDraft}
                  />
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground font-body">Rooms</h3>
                  <ToggleGroup label="Bedrooms (min)"
                    options={facets?.bedroom_counts.length ? facets.bedroom_counts : [0, 1, 2, 3, 4, 5]}
                    value={draftFilters.min_bedrooms} onChange={(v) => updateDraft("min_bedrooms", v)}
                  />
                  <ToggleGroup label="Bathrooms (min)"
                    options={facets?.bathroom_counts.length ? facets.bathroom_counts : [1, 2, 3, 4]}
                    value={draftFilters.min_bathrooms} onChange={(v) => updateDraft("min_bathrooms", v)}
                  />
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground font-body">Interior Area</h3>
                  <RangeInputs
                    label={`Range${facets ? ` (${facets.area_range.min}–${facets.area_range.max} m²)` : ""}`}
                    minKey="min_area" maxKey="max_area" suffix="m²" filters={draftFilters} onChange={updateDraft}
                  />
                </div>

                {(facets?.views ?? []).length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground font-body">Views</h3>
                    <div className="flex flex-wrap gap-2">
                      {(facets?.views ?? []).map((v) => {
                        const active = draftFilters.views.includes(v);
                        return (
                          <button key={v} onClick={() => toggleArrayItem("views", v, true)}
                            className={`rounded-full border px-3 py-1 text-xs font-medium font-body transition-all ${active ? activeClass : "border-border bg-background text-muted-foreground hover:border-foreground/40"}`}
                          >
                            {VIEW_LABELS[v] ?? v}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground font-body">Features</h3>
                  <div className="grid grid-cols-2 gap-y-2 gap-x-3">
                    {FEATURE_OPTIONS.map(({ key, label }) => {
                      const active = draftFilters.features.includes(key);
                      return (
                        <label key={key} onClick={() => toggleArrayItem("features", key, true)}
                          className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground font-body hover:text-foreground transition"
                        >
                          <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${active ? "border-foreground bg-foreground" : "border-border bg-background"}`}>
                            {active && <svg viewBox="0 0 10 8" className="h-2.5 w-2.5"><path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                          </span>
                          {label}
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground font-body">Other</h3>
                  <label onClick={() => updateDraft("featured_only", !draftFilters.featured_only)}
                    className="flex cursor-pointer items-center gap-3 text-sm text-muted-foreground font-body hover:text-foreground transition"
                  >
                    <span className={`flex h-4 w-4 items-center justify-center rounded border transition ${draftFilters.featured_only ? "border-foreground bg-foreground" : "border-border bg-background"}`}>
                      {draftFilters.featured_only && <svg viewBox="0 0 10 8" className="h-2.5 w-2.5"><path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                    </span>
                    Featured listings only
                  </label>
                </div>

              </div>

              <div className="border-t border-border px-6 py-4 flex gap-3">
                <button onClick={() => setDraftFilters({ ...DEFAULT_FILTERS })}
                  className="flex-1 rounded border border-border py-2.5 text-sm font-body text-foreground transition hover:bg-muted">
                  Reset
                </button>
                <button onClick={() => applyFilters(draftFilters)}
                  className="flex-1 rounded bg-foreground py-2.5 text-sm font-medium font-body text-background transition hover:bg-foreground/90">
                  Show results
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}