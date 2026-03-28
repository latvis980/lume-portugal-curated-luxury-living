# backend/database.py
"""
Supabase database client for LUME by Mark.

All database queries used by seo.py, routes, and the CMS go through here.
Thin wrapper around the Supabase Python client.

ENV VARS:
    SUPABASE_URL             — your project URL (e.g., https://xxxx.supabase.co)
    SUPABASE_PUBLISHABLE_KEY — publishable key (sb_publishable_...) for public routes
    SUPABASE_SECRET_KEY      — secret key (sb_secret_...) for admin routes, bypasses RLS

NOTE: Supabase replaced the legacy anon/service_role JWT keys in late 2025.
    New projects use publishable + secret keys. They're drop-in replacements
    in the Python client — no code changes needed beyond the env var names.
"""

import os
import re
from typing import Optional, List, Dict, Any

# ---------------------------------------------------------------------------
# Supabase clients
# ---------------------------------------------------------------------------

_anon_client = None
_admin_client = None


def _get_client():
    """Lazy-init Supabase publishable client (respects RLS)."""
    global _anon_client
    if _anon_client is None:
        from supabase import create_client

        url = os.getenv("SUPABASE_URL", "")
        key = os.getenv("SUPABASE_PUBLISHABLE_KEY", "")
        if not url or not key:
            raise RuntimeError(
                "SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be set. "
                "Get them from Supabase Dashboard → Settings → API Keys."
            )
        _anon_client = create_client(url, key)
    return _anon_client


def _get_admin_client():
    """
    Lazy-init Supabase secret-key client (bypasses RLS).
    Used by admin/CMS routes that need full read/write access.
    Falls back to publishable key if secret key not set.
    """
    global _admin_client
    if _admin_client is None:
        from supabase import create_client

        url = os.getenv("SUPABASE_URL", "")
        key = os.getenv("SUPABASE_SECRET_KEY", "") or os.getenv("SUPABASE_PUBLISHABLE_KEY", "")
        if not url or not key:
            raise RuntimeError(
                "SUPABASE_URL and SUPABASE_SECRET_KEY must be set. "
                "Get the secret key from Supabase Dashboard → Settings → API Keys."
            )
        _admin_client = create_client(url, key)
    return _admin_client


def test_connection() -> bool:
    """Test database connectivity."""
    try:
        client = _get_admin_client()
        client.table("listings").select("id").limit(1).execute()
        return True
    except Exception as e:
        print(f"[DB] Connection test failed: {e}")
        return False


# ---------------------------------------------------------------------------
# Slug helper
# ---------------------------------------------------------------------------

_SLUG_RE = re.compile(r"[^a-z0-9]+")


def generate_slug(text: str) -> str:
    """Convert a title into a URL-safe slug."""
    if not text:
        return ""
    slug = text.lower().strip()
    slug = _SLUG_RE.sub("-", slug)
    return slug.strip("-")


# ═══════════════════════════════════════════════════════════════════════════
# PUBLIC QUERIES — used by seo.py and public routes
# These use the anon client and only see rows allowed by RLS
# ═══════════════════════════════════════════════════════════════════════════


# ---------------------------------------------------------------------------
# Listing queries (public)
# ---------------------------------------------------------------------------

# Column mapping note (old → new):
#   properties table → listings table
#   area_sqm          → interior_living_area
#   image_path        → cover_image
#   description       → short_description / full_description
#   status: 'active'  → status: 'available'
#   features (jsonb)  → boolean columns + lifestyle_tags
#   tags (jsonb)      → lifestyle_tags


# Select fields for list/card views (avoid pulling the whole row)
_LISTING_CARD_FIELDS = (
    "id, slug, title, reference, "
    "city, region, area, country, "
    "price, currency, listing_type, property_type, "
    "bedrooms, bathrooms, interior_living_area, plot_size, "
    "views, featured, "
    "cover_image, short_description, ai_summary, "
    "lifestyle_tags, "
    "published_at, created_at, updated_at"
)


def get_property_by_slug(slug: str) -> Optional[Dict[str, Any]]:
    """Fetch a single available listing by its URL slug."""
    try:
        client = _get_client()
        result = (
            client.table("listings")
            .select("*")
            .eq("slug", slug)
            .eq("status", "available")
            .limit(1)
            .execute()
        )
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"[DB] Error fetching listing {slug}: {e}")
        return None


def get_featured_properties(limit: int = 30) -> List[Dict[str, Any]]:
    """Fetch featured/available listings for the listings page and SEO."""
    try:
        client = _get_client()
        result = (
            client.table("listings")
            .select(_LISTING_CARD_FIELDS)
            .eq("status", "available")
            .order("featured", desc=True)
            .order("published_at", desc=True)
            .limit(limit)
            .execute()
        )
        return result.data or []
    except Exception as e:
        print(f"[DB] Error fetching featured listings: {e}")
        return []


def get_all_property_slugs() -> List[Dict[str, Any]]:
    """Fetch all listing slugs + dates for the sitemap."""
    try:
        client = _get_client()
        result = (
            client.table("listings")
            .select("slug, updated_at, created_at")
            .eq("status", "available")
            .execute()
        )
        return result.data or []
    except Exception as e:
        print(f"[DB] Error fetching listing slugs: {e}")
        return []


def query_properties(
    region: Optional[str] = None,
    city: Optional[str] = None,
    area: Optional[str] = None,
    lifestyle: Optional[str] = None,
    property_type: Optional[str] = None,
    listing_type: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_bedrooms: Optional[int] = None,
    max_bedrooms: Optional[int] = None,
    min_bathrooms: Optional[int] = None,
    max_bathrooms: Optional[int] = None,
    min_area: Optional[float] = None,
    max_area: Optional[float] = None,
    condition: Optional[str] = None,
    views: Optional[List[str]] = None,        # list of view_type values
    features: Optional[List[str]] = None,     # list of boolean column names
    featured_only: bool = False,
    sort_by: str = "featured",                # featured | newest | price_asc | price_desc
    limit: int = 20,
    offset: int = 0,
) -> Dict[str, Any]:
    """Query listings with full filter set (public API). Returns {items, total}."""
    try:
        client = _get_client()

        # ── Build count query (same filters, no range/order) ──────────────────
        count_q = client.table("listings").select("id", count="exact").eq("status", "available")
        data_q  = client.table("listings").select(_LISTING_CARD_FIELDS).eq("status", "available")

        # Resolve lifestyle → matching region names from the regions table
        lifestyle_regions: Optional[List[str]] = None
        if lifestyle and not region:  # only apply if user hasn't already picked a region
            try:
                regions_result = (
                    _get_client()
                    .table("regions")
                    .select("name")
                    .contains("lifestyle_tags", [lifestyle])# cs = "contains"
                    .eq("active", True)
                    .execute()
                )
                lifestyle_regions = [r["name"] for r in (regions_result.data or [])]
                print(f"[DB] lifestyle={lifestyle} → regions: {lifestyle_regions}")
            except Exception as e:
                print(f"[DB] Error resolving lifestyle regions: {e}")
        
        def apply_filters(q):
            if region:
                q = q.ilike("region", f"%{region}%")
            elif lifestyle_regions is not None:          # ← add this block
                if lifestyle_regions:
                    q = q.in_("region", lifestyle_regions)
                else:
                    # No regions matched — return nothing (don't show all listings)
                    q = q.eq("region", "__no_match__")
            if city:
                q = q.ilike("city", f"%{city}%")
            if area:
                q = q.ilike("area", f"%{area}%")
            if property_type:
                q = q.eq("property_type", property_type)
            if listing_type:
                q = q.eq("listing_type", listing_type)
            if min_price is not None:
                q = q.gte("price", min_price)
            if max_price is not None:
                q = q.lte("price", max_price)
            if min_bedrooms is not None:
                q = q.gte("bedrooms", min_bedrooms)
            if max_bedrooms is not None:
                q = q.lte("bedrooms", max_bedrooms)
            if min_bathrooms is not None:
                q = q.gte("bathrooms", min_bathrooms)
            if max_bathrooms is not None:
                q = q.lte("bathrooms", max_bathrooms)
            if min_area is not None:
                q = q.gte("interior_living_area", min_area)
            if max_area is not None:
                q = q.lte("interior_living_area", max_area)
            if condition:
                q = q.eq("property_condition", condition)
            if featured_only:
                q = q.eq("featured", True)
            # Boolean feature flags (pool, garage, garden, etc.)
            if features:
                for feature in features:
                    q = q.eq(feature, True)
            # Views array containment: each requested view must be in the array
            if views:
                for view in views:
                    q = q.contains("views", [view])
            return q

        count_q = apply_filters(count_q)
        data_q  = apply_filters(data_q)

        # ── Count ──────────────────────────────────────────────────────────────
        count_result = count_q.execute()
        total = count_result.count if count_result.count is not None else 0

        # ── Sort ──────────────────────────────────────────────────────────────
        if sort_by == "price_asc":
            data_q = data_q.order("price", desc=False)
        elif sort_by == "price_desc":
            data_q = data_q.order("price", desc=True)
        elif sort_by == "newest":
            data_q = data_q.order("published_at", desc=True)
        else:  # "featured" (default)
            data_q = data_q.order("featured", desc=True).order("published_at", desc=True)

        result = data_q.range(offset, offset + limit - 1).execute()
        return {"items": result.data or [], "total": total}

    except Exception as e:
        print(f"[DB] Error querying listings: {e}")
        return {"items": [], "total": 0}


def get_property_facets() -> Dict[str, Any]:
    """
    Return all distinct filter values present in available listings.
    Used to populate dropdowns and slider bounds on the Properties page.
    Only reads available listings (respects RLS via publishable key).
    """
    try:
        client = _get_client()
        # Fetch only the fields we need for facet computation
        result = client.table("listings").select(
            "region, city, area, property_type, listing_type, "
            "price, interior_living_area, bedrooms, bathrooms, "
            "condition, views"
        ).eq("status", "available").execute()
        
        rows = result.data or []
        if not rows:
            return {
                "regions": [],
                "all_cities": [],
                "cities_by_region": {},
                "areas_by_city": {},
                "areas_by_region": {},
                "property_types": [],
                "listing_types": [],
                "price_range": {"min": 0, "max": 5000000},
                "area_range": {"min": 0, "max": 500},
                "bedroom_counts": [],
                "bathroom_counts": [],
                "conditions": [],
                "views": [],
            }

        # Build cascading location sets
        regions = sorted({r["region"] for r in rows if r.get("region")})

        cities_by_region: Dict[str, Any] = {}
        for r in rows:
            reg = r.get("region") or ""
            cit = r.get("city") or ""
            if reg and cit:
                cities_by_region.setdefault(reg, set()).add(cit)
        cities_by_region = {k: sorted(v) for k, v in cities_by_region.items()}

        areas_by_city: Dict[str, Any] = {}
        for r in rows:
            cit  = r.get("city") or ""
            ar   = r.get("area") or ""
            if cit and ar:
                areas_by_city.setdefault(cit, set()).add(ar)
        areas_by_city = {k: sorted(v) for k, v in areas_by_city.items()}

        # Flat city list for independent city dropdown
        all_cities = sorted({r["city"] for r in rows if r.get("city")})

        # Areas indexed by region (for Area dropdown when no city is picked yet)
        areas_by_region: Dict[str, Any] = {}
        for r in rows:
            reg = r.get("region") or ""
            ar  = r.get("area") or ""
            if reg and ar:
                areas_by_region.setdefault(reg, set()).add(ar)
        areas_by_region = {k: sorted(v) for k, v in areas_by_region.items()}

        # Enums
        property_types = sorted({r["property_type"] for r in rows if r.get("property_type")})
        listing_types  = sorted({r["listing_type"]  for r in rows if r.get("listing_type")})
        conditions = sorted({r["condition"] for r in rows if r.get("condition")})

        # Views — flatten the arrays
        all_views: set = set()
        for r in rows:
            for v in (r.get("views") or []):
                all_views.add(v)
        views_list = sorted(all_views)

        # Numeric ranges
        prices = [r["price"] for r in rows if r.get("price") is not None]
        areas  = [r["interior_living_area"] for r in rows if r.get("interior_living_area")]
        beds   = sorted({r["bedrooms"] for r in rows if r.get("bedrooms") is not None})
        baths  = sorted({r["bathrooms"] for r in rows if r.get("bathrooms") is not None})

        return {
            "regions": regions,
            "all_cities": all_cities,
            "cities_by_region": cities_by_region,
            "areas_by_city": areas_by_city,
            "areas_by_region": areas_by_region,
            "property_types": property_types,
            "listing_types": listing_types,
            "price_range": {
                "min": int(min(prices)) if prices else 0,
                "max": int(max(prices)) if prices else 5000000,
            },
            "area_range": {
                "min": int(min(areas)) if areas else 0,
                "max": int(max(areas)) if areas else 500,
            },
            "bedroom_counts": beds,
            "bathroom_counts": baths,
            "conditions": conditions,
            "views": views_list,
        }

    except Exception as e:
        print(f"[DB] Error fetching property facets: {e}")
        return {}


# ---------------------------------------------------------------------------
# Location queries (public)
# ---------------------------------------------------------------------------

def get_location_by_slug(slug: str) -> Optional[Dict[str, Any]]:
    """Fetch location info + its listings."""
    try:
        client = _get_client()
        loc_result = (
            client.table("locations")
            .select("*")
            .eq("slug", slug)
            .limit(1)
            .execute()
        )
        if not loc_result.data:
            return None

        loc = loc_result.data[0]
        city = loc.get("city") or loc.get("name") or ""

        # Fetch listings in this location
        props_result = (
            client.table("listings")
            .select(_LISTING_CARD_FIELDS)
            .eq("status", "available")
            .ilike("city", f"%{city}%")
            .order("published_at", desc=True)
            .limit(20)
            .execute()
        )
        loc["properties"] = props_result.data or []
        return loc
    except Exception as e:
        print(f"[DB] Error fetching location {slug}: {e}")
        return None


def get_all_location_slugs() -> List[Dict[str, Any]]:
    """Fetch all location slugs for the sitemap."""
    try:
        client = _get_client()
        result = (
            client.table("locations")
            .select("slug")
            .execute()
        )
        return result.data or []
    except Exception as e:
        print(f"[DB] Error fetching location slugs: {e}")
        return []


def get_all_locations() -> List[Dict[str, Any]]:
    """Fetch all locations for the API."""
    try:
        client = _get_client()
        result = (
            client.table("locations")
            .select("id, slug, name, city, region, description, image_path, property_count")
            .execute()
        )
        return result.data or []
    except Exception as e:
        print(f"[DB] Error fetching locations: {e}")
        return []


# ---------------------------------------------------------------------------
# Service queries (public)
# ---------------------------------------------------------------------------

def get_service_by_slug(slug: str) -> Optional[Dict[str, Any]]:
    """Fetch a service page by slug."""
    try:
        client = _get_client()
        result = (
            client.table("services")
            .select("*")
            .eq("slug", slug)
            .eq("is_active", True)
            .limit(1)
            .execute()
        )
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"[DB] Error fetching service {slug}: {e}")
        return None


def get_all_services() -> List[Dict[str, Any]]:
    """Fetch all active services."""
    try:
        client = _get_client()
        result = (
            client.table("services")
            .select("*")
            .eq("is_active", True)
            .order("category")
            .order("sort_order")
            .execute()
        )
        return result.data or []
    except Exception as e:
        print(f"[DB] Error fetching services: {e}")
        return []

def get_all_regions() -> List[Dict[str, Any]]:
    """Fetch all active regions for dropdowns and Q2 lifestyle filter."""
    try:
        client = _get_client()
        result = (
            client.table("regions")
            .select("id, name, display_name, lifestyle_tags, sort_order")
            .eq("active", True)
            .order("sort_order")
            .execute()
        )
        return result.data or []
    except Exception as e:
        print(f"[DB] Error fetching regions: {e}")
        return []


# ═══════════════════════════════════════════════════════════════════════════
# ADMIN QUERIES — used by CMS routes
# These use the service-role client (bypasses RLS)
# ═══════════════════════════════════════════════════════════════════════════


# ---------------------------------------------------------------------------
# Listings CRUD (admin)
# ---------------------------------------------------------------------------

def admin_list_listings(
    status: Optional[str] = None,
    internal_status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> Dict[str, Any]:
    """List all listings for the CMS (including drafts, internal fields)."""
    try:
        client = _get_admin_client()
        q = client.table("listings").select("*", count="exact")

        if status:
            q = q.eq("status", status)
        if internal_status:
            q = q.eq("internal_status", internal_status)
        if search:
            q = q.or_(
                f"title.ilike.%{search}%,"
                f"reference.ilike.%{search}%,"
                f"city.ilike.%{search}%"
            )

        result = (
            q.order("updated_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        return {
            "listings": result.data or [],
            "total": result.count or 0,
        }
    except Exception as e:
        print(f"[DB] Error listing admin listings: {e}")
        return {"listings": [], "total": 0, "error": str(e)}


def admin_get_listing(listing_id: str) -> Optional[Dict[str, Any]]:
    """Fetch a single listing by ID (admin — all fields, any status)."""
    try:
        client = _get_admin_client()
        result = (
            client.table("listings")
            .select("*")
            .eq("id", listing_id)
            .limit(1)
            .execute()
        )
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"[DB] Error fetching listing {listing_id}: {e}")
        return None


def admin_create_listing(data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Create a new listing. Auto-generates slug if not provided."""
    try:
        client = _get_admin_client()

        # Auto-generate slug from title if not provided
        if not data.get("slug") and data.get("title"):
            base_slug = generate_slug(data["title"])
            city_slug = generate_slug(data.get("city", ""))
            data["slug"] = f"{base_slug}-{city_slug}" if city_slug else base_slug

        result = client.table("listings").insert(data).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"[DB] Error creating listing: {e}")
        raise


def admin_update_listing(listing_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Update a listing by ID."""
    try:
        client = _get_admin_client()

        # Re-generate slug if title changed and slug not explicitly set
        if "title" in data and "slug" not in data:
            existing = admin_get_listing(listing_id)
            if existing:
                old_slug = generate_slug(existing.get("title", ""))
                current_slug = existing.get("slug", "")
                # Only regenerate if slug was auto-generated (matches old title)
                if current_slug == old_slug or current_slug.startswith(old_slug):
                    city_slug = generate_slug(data.get("city", existing.get("city", "")))
                    base = generate_slug(data["title"])
                    data["slug"] = f"{base}-{city_slug}" if city_slug else base

        result = (
            client.table("listings")
            .update(data)
            .eq("id", listing_id)
            .execute()
        )
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"[DB] Error updating listing {listing_id}: {e}")
        raise


def admin_delete_listing(listing_id: str) -> bool:
    """Delete a listing by ID."""
    try:
        client = _get_admin_client()
        client.table("listings").delete().eq("id", listing_id).execute()
        return True
    except Exception as e:
        print(f"[DB] Error deleting listing {listing_id}: {e}")
        return False


# ---------------------------------------------------------------------------
# Contacts CRUD (admin)
# ---------------------------------------------------------------------------

def admin_list_contacts(
    source: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> Dict[str, Any]:
    """List contacts/leads for the CMS."""
    try:
        client = _get_admin_client()
        q = client.table("contacts").select("*", count="exact")

        if source:
            q = q.eq("source", source)
        if search:
            q = q.or_(f"email.ilike.%{search}%,name.ilike.%{search}%")

        result = (
            q.order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        return {
            "contacts": result.data or [],
            "total": result.count or 0,
        }
    except Exception as e:
        print(f"[DB] Error listing contacts: {e}")
        return {"contacts": [], "total": 0, "error": str(e)}


def admin_get_contact(contact_id: str) -> Optional[Dict[str, Any]]:
    """Fetch a single contact by ID."""
    try:
        client = _get_admin_client()
        result = (
            client.table("contacts")
            .select("*")
            .eq("id", contact_id)
            .limit(1)
            .execute()
        )
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"[DB] Error fetching contact {contact_id}: {e}")
        return None


def admin_delete_contact(contact_id: str) -> bool:
    """Delete a contact by ID."""
    try:
        client = _get_admin_client()
        client.table("contacts").delete().eq("id", contact_id).execute()
        return True
    except Exception as e:
        print(f"[DB] Error deleting contact {contact_id}: {e}")
        return False


def create_contact(data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    try:
        client = _get_admin_client()
        # DEBUG: which key is this client actually using?
        print(f"[DB DEBUG] Using admin client: {type(client)}")
        print(f"[DB DEBUG] Secret key env: {os.getenv('SUPABASE_SECRET_KEY', 'NOT SET')[:20]}...")
        result = client.table("contacts").insert(data).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"[DB] Error creating contact: {e}")
        raise


# ---------------------------------------------------------------------------
# Locations CRUD (admin)
# ---------------------------------------------------------------------------

def admin_list_locations() -> List[Dict[str, Any]]:
    """List all locations for the CMS."""
    try:
        client = _get_admin_client()
        result = (
            client.table("locations")
            .select("*")
            .order("name")
            .execute()
        )
        return result.data or []
    except Exception as e:
        print(f"[DB] Error listing locations: {e}")
        return []


def admin_create_location(data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Create a new location."""
    try:
        client = _get_admin_client()
        if not data.get("slug") and data.get("name"):
            data["slug"] = generate_slug(data["name"])
        result = client.table("locations").insert(data).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"[DB] Error creating location: {e}")
        raise


def admin_update_location(location_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Update a location by ID."""
    try:
        client = _get_admin_client()
        result = (
            client.table("locations")
            .update(data)
            .eq("id", location_id)
            .execute()
        )
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"[DB] Error updating location {location_id}: {e}")
        raise


def admin_delete_location(location_id: str) -> bool:
    """Delete a location by ID."""
    try:
        client = _get_admin_client()
        client.table("locations").delete().eq("id", location_id).execute()
        return True
    except Exception as e:
        print(f"[DB] Error deleting location {location_id}: {e}")
        return False


# ---------------------------------------------------------------------------
# Services CRUD (admin)
# ---------------------------------------------------------------------------

def admin_list_services() -> List[Dict[str, Any]]:
    """List all services for the CMS (including inactive)."""
    try:
        client = _get_admin_client()
        result = (
            client.table("services")
            .select("*")
            .order("category")
            .order("sort_order")
            .execute()
        )
        return result.data or []
    except Exception as e:
        print(f"[DB] Error listing services: {e}")
        return []


def admin_create_service(data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Create a new service."""
    try:
        client = _get_admin_client()
        if not data.get("slug") and data.get("title"):
            data["slug"] = generate_slug(data["title"])
        result = client.table("services").insert(data).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"[DB] Error creating service: {e}")
        raise


def admin_update_service(service_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Update a service by ID."""
    try:
        client = _get_admin_client()
        result = (
            client.table("services")
            .update(data)
            .eq("id", service_id)
            .execute()
        )
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"[DB] Error updating service {service_id}: {e}")
        raise


def admin_delete_service(service_id: str) -> bool:
    """Delete a service by ID."""
    try:
        client = _get_admin_client()
        client.table("services").delete().eq("id", service_id).execute()
        return True
    except Exception as e:
        print(f"[DB] Error deleting service {service_id}: {e}")
        return False


# ---------------------------------------------------------------------------
# Dashboard stats (admin)
# ---------------------------------------------------------------------------

def admin_get_stats() -> Dict[str, Any]:
    """Get quick counts for the CMS dashboard."""
    try:
        client = _get_admin_client()

        listings = client.table("listings").select("id", count="exact").execute()
        available = (
            client.table("listings")
            .select("id", count="exact")
            .eq("status", "available")
            .execute()
        )
        contacts = client.table("contacts").select("id", count="exact").execute()

        return {
            "total_listings": listings.count or 0,
            "available_listings": available.count or 0,
            "total_contacts": contacts.count or 0,
        }
    except Exception as e:
        print(f"[DB] Error fetching stats: {e}")
        return {"total_listings": 0, "available_listings": 0, "total_contacts": 0}