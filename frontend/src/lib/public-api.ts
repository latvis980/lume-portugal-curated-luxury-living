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

export interface ListingsResponse {
  properties: Listing[];
  count: number;
}

export interface ListingsQuery {
  city?: string;
  type?: string;
  min_price?: number;
  max_price?: number;
  bedrooms?: number;
  limit?: number;
  offset?: number;
}

export async function fetchListings(params: ListingsQuery = {}): Promise<ListingsResponse> {
  const query = new URLSearchParams();
  if (params.city) query.set("city", params.city);
  if (params.type) query.set("type", params.type);
  if (params.min_price) query.set("min_price", String(params.min_price));
  if (params.max_price) query.set("max_price", String(params.max_price));
  if (params.bedrooms) query.set("bedrooms", String(params.bedrooms));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.offset) query.set("offset", String(params.offset));
  const qs = query.toString();
  const res = await fetch(`/api/properties${qs ? `?${qs}` : ""}`);
  if (!res.ok) return { properties: [], count: 0 };
  return res.json();
}
