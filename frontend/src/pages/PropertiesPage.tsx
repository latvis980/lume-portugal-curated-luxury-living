// frontend/src/pages/PropertiesPage.tsx
import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  SlidersHorizontal, X, LayoutGrid, List, ChevronDown,
  RotateCcw, MapPin
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PropertyCard from "@/components/PropertyCard";
import {
  fetchListings, fetchPropertyFacets,
  type ListingsQuery, type PropertyFacets, type Listing,
} from "@/lib/public-api";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 24;

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartment: "Apartment", penthouse: "Penthouse", villa: "Villa",
  townhouse: "Townhouse", estate: "Estate", farmhouse: "Farmhouse",
  quinta: "Quinta", land: "Land", new_development_unit: "New Development",
};

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
  { key: "pool",           label: "Pool" },
  { key: "heated_pool",    label: "Heated Pool" },
  { key: "garage",         label: "Garage" },
  { key: "garden",         label: "Garden" },
  { key: "terrace",        label: "Terrace" },
  { key: "balcony",        label: "Balcony" },
  { key: "elevator",       label: "Elevator" },
  { key: "fireplace",      label: "Fireplace" },
  { key: "air_conditioning", label: "Air Conditioning" },
  { key: "solar_panels",   label: "Solar Panels" },
  { key: "alarm_system",   label: "Alarm System" },
  { key: "smart_home",     label: "Smart Home" },
  { key: "wine_cellar",    label: "Wine Cellar" },
  { key: "home_cinema",    label: "Home Cinema" },
  { key: "gym",            label: "Gym" },
  { key: "concierge",      label: "Concierge" },
  { key: "furnished",      label: "Furnished" },
];

const SORT_OPTIONS = [
  { value: "featured",   label: "Featured" },
  { value: "newest",     label: "Newest" },
  { value: "price_asc",  label: "Price: Low → High" },
  { value: "price_desc", label: "Price: High → Low" },
];

// ─── URL ↔ Filter state helpers ───────────────────────────────────────────────

interface Filters {
  region: string;
  city: string;
  area: string;
  type: string;
  listing_type: string;
  min_price: string;
  max_price: string;
  min_bedrooms: string;
  max_bedrooms: string;
  min_bathrooms: string;
  max_bathrooms: string;
  min_area: string;
  max_area: string;
  condition: string;
  views: string[];
  features: string[];
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
    region:       p.get("region")       ?? "",
    city:         p.get("city")         ?? "",
    area:         p.get("area")         ?? "",
    type:         p.get("type")         ?? "",
    listing_type: p.get("listing_type") ?? "sale",
    min_price:    p.get("min_price")    ?? "",
    max_price:    p.get("max_price")    ?? "",
    min_bedrooms: p.get("min_bedrooms") ?? "",
    max_bedrooms: p.get("max_bedrooms") ?? "",
    min_bathrooms: p.get("min_bathrooms") ?? "",
    max_bathrooms: p.get("max_bathrooms") ?? "",
    min_area:     p.get("min_area")     ?? "",
    max_area:     p.get("max_area")     ?? "",
    condition:    p.get("condition")    ?? "",
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
  if (f.region)       n++;
  if (f.city)         n++;
  if (f.area)         n++;
  if (f.type)         n++;
  if (f.listing_type && f.listing_type !== "sale") n++;
  if (f.min_price)    n++;
  if (f.max_price)    n++;
  if (f.min_bedrooms) n++;
  if (f.max_bedrooms) n++;
  if (f.min_bathrooms) n++;
  if (f.max_bathrooms) n++;
  if (f.min_area)     n++;
  if (f.max_area)     n++;
  if (f.condition)    n++;
  n += f.views.length;
  n += f.features.length;
  if (f.featured_only) n++;
  return n;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ToggleGroup({
  label, options, value, onChange,
}: { label: string; options: (string | number)[]; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-widest text-stone-400">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const v = String(opt);
          const active = value === v;
          return (
            <button
              key={v}
              onClick={() => onChange(active ? "" : v)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                active
                  ? "border-stone-900 bg-stone-900 text-white"
                  : "border-stone-200 bg-white text-stone-600 hover:border-stone-400"
              }`}
            >
              {v === "0" ? "Studio" : v}
            </button>
          );
        })}
        <button
          onClick={() => onChange("")}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
            value === ""
              ? "border-stone-900 bg-stone-900 text-white"
              : "border-stone-200 bg-white text-stone-600 hover:border-stone-400"
          }`}
        >
          Any
        </button>
      </div>
    </div>
  );
}

function RangeInputs({
  label, minKey, maxKey, prefix, suffix,
  filters, onChange,
}: {
  label: string;
  minKey: keyof Filters;
  maxKey: keyof Filters;
  prefix?: string;
  suffix?: string;
  filters: Filters;
  onChange: (k: keyof Filters, v: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-widest text-stone-400">{label}</p>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">{prefix}</span>}
          <input
            type="number"
            placeholder="Min"
            value={filters[minKey] as string}
            onChange={(e) => onChange(minKey, e.target.value)}
            className={`w-full rounded-lg border border-stone-200 bg-white py-2 text-sm text-stone-800 outline-none transition placeholder:text-stone-300 focus:border-stone-400 ${prefix ? "pl-7 pr-3" : "px-3"}`}
          />
        </div>
        <span className="text-stone-300">—</span>
        <div className="relative flex-1">
          {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">{prefix}</span>}
          <input
            type="number"
            placeholder="Max"
            value={filters[maxKey] as string}
            onChange={(e) => onChange(maxKey, e.target.value)}
            className={`w-full rounded-lg border border-stone-200 bg-white py-2 text-sm text-stone-800 outline-none transition placeholder:text-stone-300 focus:border-stone-400 ${prefix ? "pl-7 pr-3" : "px-3"}`}
          />
          {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">{suffix}</span>}
        </div>
      </div>
    </div>
  );
}

function SelectDropdown({
  label, value, options, onChange, placeholder = "Any",
}: {
  label?: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      {label && <p className="mb-2 text-xs uppercase tracking-widest text-stone-400">{label}</p>}
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-lg border border-stone-200 bg-white px-3 py-2 pr-8 text-sm text-stone-700 outline-none transition focus:border-stone-400"
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
      </div>
    </div>
  );
}

// ─── Active Filter Chips ──────────────────────────────────────────────────────

function FilterChips({
  filters, onRemove,
}: { filters: Filters; onRemove: (k: string, v?: string) => void }) {
  const chips: { key: string; label: string; subKey?: string }[] = [];

  if (filters.region)       chips.push({ key: "region",   label: filters.region });
  if (filters.city)         chips.push({ key: "city",     label: filters.city });
  if (filters.area)         chips.push({ key: "area",     label: filters.area });
  if (filters.type)         chips.push({ key: "type",     label: PROPERTY_TYPE_LABELS[filters.type] ?? filters.type });
  if (filters.listing_type && filters.listing_type !== "sale")
    chips.push({ key: "listing_type", label: filters.listing_type === "rent" ? "For Rent" : "Seasonal Rent" });
  if (filters.min_price)    chips.push({ key: "min_price", label: `From €${Number(filters.min_price).toLocaleString()}` });
  if (filters.max_price)    chips.push({ key: "max_price", label: `To €${Number(filters.max_price).toLocaleString()}` });
  if (filters.min_bedrooms) chips.push({ key: "min_bedrooms", label: `${filters.min_bedrooms}+ bed` });
  if (filters.max_bedrooms) chips.push({ key: "max_bedrooms", label: `max ${filters.max_bedrooms} bed` });
  if (filters.min_bathrooms) chips.push({ key: "min_bathrooms", label: `${filters.min_bathrooms}+ bath` });
  if (filters.min_area)     chips.push({ key: "min_area", label: `From ${filters.min_area} m²` });
  if (filters.max_area)     chips.push({ key: "max_area", label: `To ${filters.max_area} m²` });
  if (filters.condition)    chips.push({ key: "condition", label: CONDITION_LABELS[filters.condition] ?? filters.condition });
  filters.views.forEach((v)    => chips.push({ key: "views",    subKey: v, label: VIEW_LABELS[v]    ?? v }));
  filters.features.forEach((f) => chips.push({ key: "features", subKey: f, label: FEATURE_OPTIONS.find(o => o.key === f)?.label ?? f }));
  if (filters.featured_only) chips.push({ key: "featured_only", label: "Featured only" });

  if (!chips.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip, i) => (
        <span
          key={i}
          className="flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs text-stone-600"
        >
          {chip.label}
          <button
            onClick={() => onRemove(chip.key, chip.subKey)}
            className="ml-0.5 rounded-full p-0.5 hover:bg-stone-200 transition"
          >
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
  const [filters, setFilters] = useState<Filters>(() => searchParamsToFilters(searchParams));
  const [draftFilters, setDraftFilters] = useState<Filters>(filters);
  const [page, setPage] = useState(0);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Sync URL → state
  useEffect(() => {
    const f = searchParamsToFilters(searchParams);
    setFilters(f);
    setDraftFilters(f);
    setPage(0);
  }, [searchParams]);

  // Facets (loaded once)
  const { data: facets } = useQuery<PropertyFacets | null>({
    queryKey: ["property-facets"],
    queryFn: fetchPropertyFacets,
    staleTime: 5 * 60 * 1000,
  });

  // Listings
  const queryKey = ["listings", filters, page];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchListings(filtersToQuery(filters, page * PAGE_SIZE)),
    placeholderData: keepPreviousData,
  });

  const properties = data?.properties ?? [];
  const total      = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // ── Filter helpers ──────────────────────────────────────────────────────────

  const applyFilters = useCallback((f: Filters) => {
    setSearchParams(filtersToSearchParams(f));
    setPage(0);
    setDrawerOpen(false);
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [setSearchParams]);

  const updateBasic = useCallback((key: keyof Filters, value: string | string[] | boolean) => {
    const next = { ...filters, [key]: value };
    if (key === "region") { next.city = ""; next.area = ""; }
    if (key === "city")   { next.area = ""; }
    applyFilters(next);
  }, [filters, applyFilters]);

  const updateDraft = useCallback((key: keyof Filters, value: string | string[] | boolean) => {
    setDraftFilters(prev => {
      const next = { ...prev, [key]: value };
      if (key === "region") { next.city = ""; next.area = ""; }
      if (key === "city")   { next.area = ""; }
      return next;
    });
  }, []);

  const toggleArrayItem = (key: "views" | "features", item: string, inDraft: boolean) => {
    const current = inDraft ? draftFilters[key] : filters[key];
    const next = current.includes(item) ? current.filter(v => v !== item) : [...current, item];
    if (inDraft) updateDraft(key, next);
    else         updateBasic(key, next);
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

  const resetAll = () => {
    applyFilters({ ...DEFAULT_FILTERS });
    setDraftFilters({ ...DEFAULT_FILTERS });
  };

  // ── Derived cascading options ───────────────────────────────────────────────

  const regionOptions = (facets?.regions ?? []).map(r => ({ value: r, label: r }));

  const cityOptions = facets
    ? (filters.region ? (facets.cities_by_region ?? {})[filters.region] ?? [] : Object.values(facets.cities_by_region ?? {}).flat())
        .filter((v, i, a) => a.indexOf(v) === i)
        .sort()
        .map(c => ({ value: c, label: c }))
    : [];

  const areaOptions = facets && filters.city
    ? (facets.areas_by_city[filters.city] ?? []).map(a => ({ value: a, label: a }))
    : [];

  const activeFilterCount = countActiveFilters(filters);

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <Navbar />

      {/* ── Hero ── */}
      <section className="bg-white border-b border-stone-100 pb-8 pt-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between">
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-stone-400">
                LUME by Mark
              </p>
              <h1 className="text-3xl font-light tracking-tight text-stone-900 sm:text-4xl">
                Properties
              </h1>
            </div>
            {total > 0 && !isLoading && (
              <p className="text-sm text-stone-400">
                {total.toLocaleString()} {total === 1 ? "property" : "properties"}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── Basic Filters Bar ── */}
      <section className="sticky top-0 z-20 border-b border-stone-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end gap-3">

            {/* Listing type */}
            <div className="flex overflow-hidden rounded-lg border border-stone-200">
              {["sale", "rent", "seasonal_rent"].map((lt) => (
                <button
                  key={lt}
                  onClick={() => updateBasic("listing_type", lt)}
                  className={`px-3 py-2 text-xs font-medium transition-colors ${
                    filters.listing_type === lt
                      ? "bg-stone-900 text-white"
                      : "bg-white text-stone-500 hover:bg-stone-50"
                  }`}
                >
                  {lt === "sale" ? "Sale" : lt === "rent" ? "Rent" : "Seasonal"}
                </button>
              ))}
            </div>

            {/* Region */}
            {regionOptions.length > 0 && (
              <div className="flex items-center gap-1.5 min-w-[140px]">
                <MapPin className="h-3.5 w-3.5 text-stone-400 flex-shrink-0" />
                <SelectDropdown
                  value={filters.region}
                  options={regionOptions}
                  onChange={(v) => updateBasic("region", v)}
                  placeholder="Region"
                />
              </div>
            )}

            {/* City */}
            {cityOptions.length > 0 && (
              <div className="min-w-[130px]">
                <SelectDropdown
                  value={filters.city}
                  options={cityOptions}
                  onChange={(v) => updateBasic("city", v)}
                  placeholder="City"
                />
              </div>
            )}

            {/* Area */}
            {filters.city && areaOptions.length > 1 && (
              <div className="min-w-[130px]">
                <SelectDropdown
                  value={filters.area}
                  options={areaOptions}
                  onChange={(v) => updateBasic("area", v)}
                  placeholder="Area"
                />
              </div>
            )}

            {/* Property type */}
            <div className="min-w-[140px]">
              <SelectDropdown
                value={filters.type}
                options={(facets?.property_types ?? []).map(t => ({
                  value: t,
                  label: PROPERTY_TYPE_LABELS[t] ?? t,
                }))}
                onChange={(v) => updateBasic("type", v)}
                placeholder="Type"
              />
            </div>

            {/* Bedrooms */}
            <div>
              <p className="mb-1.5 text-[10px] uppercase tracking-widest text-stone-400">Beds</p>
              <div className="flex gap-1">
                {["Any", "1", "2", "3", "4", "5+"].map((opt) => {
                  const val = opt === "Any" ? "" : opt === "5+" ? "5" : opt;
                  const isAnyActive = opt === "Any" && !filters.min_bedrooms;
                  const isActive = isAnyActive || (!!val && filters.min_bedrooms === val);
                  return (
                    <button
                      key={opt}
                      onClick={() => updateBasic("min_bedrooms", val)}
                      className={`rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                        isActive
                          ? "border-stone-900 bg-stone-900 text-white"
                          : "border-stone-200 bg-white text-stone-500 hover:border-stone-300"
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Price range */}
            <div className="flex items-center gap-1.5">
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-stone-400">€</span>
                <input
                  type="number"
                  placeholder="Min price"
                  value={filters.min_price}
                  onChange={(e) => updateBasic("min_price", e.target.value)}
                  className="w-28 rounded-lg border border-stone-200 bg-white py-2 pl-6 pr-2 text-xs text-stone-700 outline-none transition focus:border-stone-400 placeholder:text-stone-300"
                />
              </div>
              <span className="text-stone-300 text-sm">–</span>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-stone-400">€</span>
                <input
                  type="number"
                  placeholder="Max price"
                  value={filters.max_price}
                  onChange={(e) => updateBasic("max_price", e.target.value)}
                  className="w-28 rounded-lg border border-stone-200 bg-white py-2 pl-6 pr-2 text-xs text-stone-700 outline-none transition focus:border-stone-400 placeholder:text-stone-300"
                />
              </div>
            </div>

            {/* Spacer */}
            <div className="ml-auto flex items-center gap-2">
              {/* Sort */}
              <SelectDropdown
                value={filters.sort_by}
                options={SORT_OPTIONS}
                onChange={(v) => updateBasic("sort_by", v || "featured")}
                placeholder="Sort"
              />

              {/* All Filters button */}
              <button
                onClick={() => { setDraftFilters(filters); setDrawerOpen(true); }}
                className="relative flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-400 hover:bg-stone-50"
              >
                <SlidersHorizontal className="h-4 w-4" />
                All Filters
                {activeFilterCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-stone-900 text-[10px] text-white">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {activeFilterCount > 0 && (
                <button
                  onClick={resetAll}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-stone-400 transition hover:text-stone-700"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Results ── */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8" ref={resultsRef}>

        {/* Active chips + view toggle row */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1">
            <FilterChips filters={filters} onRemove={removeChip} />
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-stone-200 bg-white p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`rounded-md p-1.5 transition ${viewMode === "grid" ? "bg-stone-900 text-white" : "text-stone-400 hover:text-stone-700"}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`rounded-md p-1.5 transition ${viewMode === "list" ? "bg-stone-900 text-white" : "text-stone-400 hover:text-stone-700"}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className={viewMode === "grid"
            ? "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
            : "flex flex-col gap-4"
          }>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse overflow-hidden rounded-xl border border-stone-100 bg-white">
                <div className="aspect-[4/3] bg-stone-100" />
                <div className="p-4 space-y-2">
                  <div className="h-3 w-1/3 rounded bg-stone-100" />
                  <div className="h-4 w-2/3 rounded bg-stone-100" />
                  <div className="h-3 w-1/2 rounded bg-stone-100" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results grid / list */}
        {!isLoading && properties.length > 0 && (
          <motion.div
            key={`${page}-${viewMode}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={viewMode === "grid"
              ? "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
              : "flex flex-col gap-4"
            }
          >
            {properties.map((listing: Listing) => (
              <PropertyCard key={listing.id} listing={listing} view={viewMode} />
            ))}
          </motion.div>
        )}

        {/* Empty state */}
        {!isLoading && properties.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <MapPin className="mb-4 h-10 w-10 text-stone-200" />
            <h2 className="mb-2 text-lg font-light text-stone-500">No properties found</h2>
            <p className="mb-6 text-sm text-stone-400">Try adjusting your filters to see more results.</p>
            <button
              onClick={resetAll}
              className="rounded-lg border border-stone-200 px-5 py-2.5 text-sm text-stone-600 transition hover:bg-stone-50"
            >
              Clear all filters
            </button>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-12 flex items-center justify-center gap-2">
            <button
              onClick={() => { setPage(p => Math.max(0, p - 1)); resultsRef.current?.scrollIntoView({ behavior: "smooth" }); }}
              disabled={page === 0}
              className="rounded-lg border border-stone-200 px-4 py-2 text-sm text-stone-600 transition hover:bg-stone-50 disabled:opacity-30"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => { setPage(i); resultsRef.current?.scrollIntoView({ behavior: "smooth" }); }}
                className={`rounded-lg border px-4 py-2 text-sm transition ${
                  i === page
                    ? "border-stone-900 bg-stone-900 text-white"
                    : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => { setPage(p => Math.min(totalPages - 1, p + 1)); resultsRef.current?.scrollIntoView({ behavior: "smooth" }); }}
              disabled={page >= totalPages - 1}
              className="rounded-lg border border-stone-200 px-4 py-2 text-sm text-stone-600 transition hover:bg-stone-50 disabled:opacity-30"
            >
              Next
            </button>
          </div>
        )}
      </main>

      <Footer />

      {/* ── All Filters Side Drawer ── */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            />

            {/* Drawer panel */}
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col bg-white shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-stone-100 px-6 py-5">
                <div>
                  <h2 className="text-base font-light tracking-tight text-stone-900">All Filters</h2>
                  {countActiveFilters(draftFilters) > 0 && (
                    <p className="text-xs text-stone-400">{countActiveFilters(draftFilters)} active</p>
                  )}
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-lg p-2 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">

                {/* Location */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-stone-400">Location</h3>
                  <SelectDropdown
                    label="Region"
                    value={draftFilters.region}
                    options={(facets?.regions ?? []).map(r => ({ value: r, label: r }))}
                    onChange={(v) => updateDraft("region", v)}
                    placeholder="Any region"
                  />
                  {(draftFilters.region
                    ? facets?.cities_by_region[draftFilters.region] ?? []
                    : Object.values(facets?.cities_by_region ?? {}).flat().filter((v, i, a) => a.indexOf(v) === i).sort()
                  ).length > 0 && (
                    <SelectDropdown
                      label="City"
                      value={draftFilters.city}
                      options={(draftFilters.region
                        ? facets?.cities_by_region[draftFilters.region] ?? []
                        : Object.values(facets?.cities_by_region ?? {}).flat().filter((v, i, a) => a.indexOf(v) === i).sort()
                      ).map(c => ({ value: c, label: c }))}
                      onChange={(v) => updateDraft("city", v)}
                      placeholder="Any city"
                    />
                  )}
                  {draftFilters.city && (facets?.areas_by_city[draftFilters.city] ?? []).length > 0 && (
                    <SelectDropdown
                      label="Area / Neighbourhood"
                      value={draftFilters.area}
                      options={(facets?.areas_by_city[draftFilters.city] ?? []).map(a => ({ value: a, label: a }))}
                      onChange={(v) => updateDraft("area", v)}
                      placeholder="Any area"
                    />
                  )}
                </div>

                {/* Property */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-stone-400">Property</h3>
                  <SelectDropdown
                    label="Type"
                    value={draftFilters.type}
                    options={(facets?.property_types ?? []).map(t => ({
                      value: t, label: PROPERTY_TYPE_LABELS[t] ?? t,
                    }))}
                    onChange={(v) => updateDraft("type", v)}
                    placeholder="Any type"
                  />
                  <SelectDropdown
                    label="Condition"
                    value={draftFilters.condition}
                    options={(facets?.conditions ?? []).map(c => ({
                      value: c, label: CONDITION_LABELS[c] ?? c,
                    }))}
                    onChange={(v) => updateDraft("condition", v)}
                    placeholder="Any condition"
                  />
                </div>

                {/* Price */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-stone-400">Price</h3>
                  <RangeInputs
                    label={`Range${facets ? ` (€${facets.price_range.min.toLocaleString()} – €${facets.price_range.max.toLocaleString()})` : ""}`}
                    minKey="min_price" maxKey="max_price"
                    prefix="€"
                    filters={draftFilters} onChange={updateDraft}
                  />
                </div>

                {/* Rooms */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-stone-400">Rooms</h3>
                  <ToggleGroup
                    label="Bedrooms (min)"
                    options={facets?.bedroom_counts.length ? facets.bedroom_counts : [0, 1, 2, 3, 4, 5]}
                    value={draftFilters.min_bedrooms}
                    onChange={(v) => updateDraft("min_bedrooms", v)}
                  />
                  <ToggleGroup
                    label="Bathrooms (min)"
                    options={facets?.bathroom_counts.length ? facets.bathroom_counts : [1, 2, 3, 4]}
                    value={draftFilters.min_bathrooms}
                    onChange={(v) => updateDraft("min_bathrooms", v)}
                  />
                </div>

                {/* Area */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-stone-400">Interior Area</h3>
                  <RangeInputs
                    label={`Range${facets ? ` (${facets.area_range.min}–${facets.area_range.max} m²)` : ""}`}
                    minKey="min_area" maxKey="max_area"
                    suffix="m²"
                    filters={draftFilters} onChange={updateDraft}
                  />
                </div>

                {/* Views */}
                {(facets?.views ?? []).length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-stone-400">Views</h3>
                    <div className="flex flex-wrap gap-2">
                      {(facets?.views ?? []).map((v) => {
                        const active = draftFilters.views.includes(v);
                        return (
                          <button
                            key={v}
                            onClick={() => toggleArrayItem("views", v, true)}
                            className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                              active
                                ? "border-stone-900 bg-stone-900 text-white"
                                : "border-stone-200 bg-white text-stone-600 hover:border-stone-400"
                            }`}
                          >
                            {VIEW_LABELS[v] ?? v}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Features */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-stone-400">Features</h3>
                  <div className="grid grid-cols-2 gap-y-2 gap-x-3">
                    {FEATURE_OPTIONS.map(({ key, label }) => {
                      const active = draftFilters.features.includes(key);
                      return (
                        <label
                          key={key}
                          className="flex cursor-pointer items-center gap-2 text-sm text-stone-600 hover:text-stone-900 transition"
                        >
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                              active
                                ? "border-stone-900 bg-stone-900"
                                : "border-stone-200 bg-white"
                            }`}
                            onClick={() => toggleArrayItem("features", key, true)}
                          >
                            {active && (
                              <svg viewBox="0 0 10 8" className="h-2.5 w-2.5 fill-white">
                                <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </span>
                          <span onClick={() => toggleArrayItem("features", key, true)}>{label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Other */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-stone-400">Other</h3>
                  <label className="flex cursor-pointer items-center gap-3 text-sm text-stone-600">
                    <span
                      className={`flex h-4 w-4 items-center justify-center rounded border transition ${
                        draftFilters.featured_only ? "border-stone-900 bg-stone-900" : "border-stone-200"
                      }`}
                      onClick={() => updateDraft("featured_only", !draftFilters.featured_only)}
                    >
                      {draftFilters.featured_only && (
                        <svg viewBox="0 0 10 8" className="h-2.5 w-2.5 fill-white">
                          <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <span onClick={() => updateDraft("featured_only", !draftFilters.featured_only)}>
                      Featured listings only
                    </span>
                  </label>
                </div>

              </div>

              {/* Footer actions */}
              <div className="border-t border-stone-100 px-6 py-4 flex gap-3">
                <button
                  onClick={() => { setDraftFilters({ ...DEFAULT_FILTERS }); }}
                  className="flex-1 rounded-lg border border-stone-200 py-2.5 text-sm text-stone-600 transition hover:bg-stone-50"
                >
                  Reset
                </button>
                <button
                  onClick={() => applyFilters(draftFilters)}
                  className="flex-1 rounded-lg bg-stone-900 py-2.5 text-sm font-medium text-white transition hover:bg-stone-700"
                >
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