// frontend/src/lib/public-api.ts
/**
 * Public API client for the LUME frontend.
 * Fetches data from /api/properties, /api/locations, etc.
 */

export interface Listing {
  id: string;
  reference: string;
  title: string;
  slug: string;

  // Classification
  property_type: string;
  listing_type: string;
  status: string;

  // Pricing
  price: number;
  currency: string;
  featured: boolean;

  // Location
  country: string;
  region: string;
  city: string;
  area: string;
  development_name?: string | null;
  address_visibility: string;
  latitude?: number | null;
  longitude?: number | null;

  // Core Specs
  bedrooms: number;
  bathrooms: number;
  interior_living_area: number;
  plot_size?: number | null;
  views: string[];
  nearby: string[];
  build_year?: number | null;
  renovation_year?: number | null;
  condition?: string | null;
  energy_rating?: string | null;

  // Detailed Measurements
  gross_built_area?: number | null;
  gross_private_area?: number | null;
  terrace_area?: number | null;
  balcony_area?: number | null;
  garden_area?: number | null;
  outdoor_area_total?: number | null;

  // Room Details
  suites?: number | null;
  guest_wc?: number | null;
  floors?: number | null;
  floor_number?: number | null;
  living_rooms?: number | null;
  office?: boolean | null;
  storage_room?: boolean | null;

  // Parking & Access
  elevator?: boolean | null;
  new_development?: boolean | null;
  garage?: boolean | null;
  parking_spaces?: number | null;
  covered_parking?: boolean | null;
  underground_parking?: boolean | null;
  ev_charging?: boolean | null;

  // Outdoor Features
  terrace?: boolean | null;
  balcony?: boolean | null;
  garden?: boolean | null;
  private_garden?: boolean | null;
  roof_terrace?: boolean | null;
  patio?: boolean | null;
  pool?: boolean | null;
  heated_pool?: boolean | null;
  outdoor_kitchen?: boolean | null;
  bbq_area?: boolean | null;

  // Indoor Features
  air_conditioning?: boolean | null;
  heating?: boolean | null;
  underfloor_heating?: boolean | null;
  fireplace?: boolean | null;
  equipped_kitchen?: boolean | null;
  laundry_room?: boolean | null;
  walk_in_wardrobe?: boolean | null;
  smart_home?: boolean | null;
  alarm_system?: boolean | null;
  security?: boolean | null;
  concierge?: boolean | null;
  furnished?: boolean | null;

  // Content
  lifestyle_tags: string[];
  short_description: string;
  full_description?: string | null;
  key_selling_points: string[];
  ai_summary?: string | null;

  // Media
  cover_image: string;
  gallery: string[];
  floor_plans: string[];
  video_url?: string | null;
  virtual_tour_url?: string | null;
  brochure_url?: string | null;

  // Agent
  agent_name?: string | null;
  agent_phone?: string | null;
  agent_email?: string | null;
  agent_whatsapp?: string | null;

  // Timestamps
  published_at?: string | null;
  created_at: string;
  updated_at: string;
}

export async function fetchListingBySlug(slug: string): Promise<Listing | null> {
  const res = await fetch(`/api/properties/${encodeURIComponent(slug)}`);
  if (!res.ok) return null;
  const data = await res.json();
  if (data.error) return null;
  return data as Listing;
}

// ─── Listings query (Properties page) ────────────────────────────────────────

export interface ListingsQuery {
  // Location cascade
  region?: string;
  city?: string;
  area?: string;
  lifestyle?: string;
  // Classification
  type?: string;           // property_type
  listing_type?: string;   // sale | rent
  // Price
  min_price?: number;
  max_price?: number;
  // Rooms
  min_bedrooms?: number;
  max_bedrooms?: number;
  min_bathrooms?: number;
  max_bathrooms?: number;
  // Area m²
  min_area?: number;
  max_area?: number;
  // Extras
  condition?: string;
  views?: string[];         // comma-joined before sending
  features?: string[];      // comma-joined before sending
  featured_only?: boolean;
  // Sort & page
  sort_by?: "featured" | "newest" | "price_asc" | "price_desc";
  limit?: number;
  offset?: number;
}

export interface ListingsResponse {
  properties: Listing[];
  total: number;
  limit: number;
  offset: number;
}

export async function fetchListings(params: ListingsQuery = {}): Promise<ListingsResponse> {
  const q = new URLSearchParams();
  if (params.region)        q.set("region",         params.region);
  if (params.city)          q.set("city",            params.city);
  if (params.area)          q.set("area",            params.area);
  if (params.lifestyle)     q.set("lifestyle",        params.lifestyle); 
  if (params.type)          q.set("type",            params.type);
  if (params.listing_type)  q.set("listing_type",    params.listing_type);
  if (params.min_price  != null) q.set("min_price",  String(params.min_price));
  if (params.max_price  != null) q.set("max_price",  String(params.max_price));
  if (params.min_bedrooms  != null) q.set("min_bedrooms",  String(params.min_bedrooms));
  if (params.max_bedrooms  != null) q.set("max_bedrooms",  String(params.max_bedrooms));
  if (params.min_bathrooms != null) q.set("min_bathrooms", String(params.min_bathrooms));
  if (params.max_bathrooms != null) q.set("max_bathrooms", String(params.max_bathrooms));
  if (params.min_area != null) q.set("min_area", String(params.min_area));
  if (params.max_area != null) q.set("max_area", String(params.max_area));
  if (params.condition)     q.set("condition",       params.condition);
  if (params.views?.length) q.set("views",           params.views.join(","));
  if (params.features?.length) q.set("features",     params.features.join(","));
  if (params.featured_only) q.set("featured_only",   "true");
  if (params.sort_by)       q.set("sort_by",         params.sort_by);
  if (params.limit  != null) q.set("limit",  String(params.limit));
  if (params.offset != null) q.set("offset", String(params.offset));

  const qs = q.toString();
  const res = await fetch(`/api/properties${qs ? `?${qs}` : ""}`);
  if (!res.ok) return { properties: [], total: 0, limit: 24, offset: 0 };
  return res.json();
}

// ─── Facets — populate filter dropdowns + slider bounds ──────────────────────

export interface PropertyFacets {
  regions: string[];
  all_cities: string[];                         
  cities_by_region: Record<string, string[]>;
  areas_by_city: Record<string, string[]>;
  areas_by_region: Record<string, string[]>;   
  property_types: string[];
  listing_types: string[];
  price_range: { min: number; max: number };
  area_range: { min: number; max: number };
  bedroom_counts: number[];
  bathroom_counts: number[];
  conditions: string[];
  views: string[];
}

export async function fetchPropertyFacets(): Promise<PropertyFacets | null> {
  try {
    const res = await fetch("/api/properties/facets");
    if (!res.ok) return null;
    const data = await res.json();
    // If backend returned an error body, treat as null
    if (data?.error || !data?.cities_by_region) return null;
    return data as PropertyFacets;
  } catch {
    return null;
  }
}