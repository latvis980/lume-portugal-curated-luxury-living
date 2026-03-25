# backend/database.py
"""
Supabase database client for LUME by Mark.

All database queries used by seo.py, routes, and the CMS go through here.
This is the same pattern as ADU's database.py — a thin wrapper around
the Supabase Python client.

SETUP:
    pip install supabase

ENV VARS:
    SUPABASE_URL  — your project URL (e.g., https://xxxx.supabase.co)
    SUPABASE_KEY  — your anon/public key
"""

import os
from typing import Optional, List, Dict, Any

# ---------------------------------------------------------------------------
# Supabase client
# ---------------------------------------------------------------------------

_client = None


def _get_client():
    """Lazy-init Supabase client."""
    global _client
    if _client is None:
        from supabase import create_client

        url = os.getenv("SUPABASE_URL", "")
        key = os.getenv("SUPABASE_KEY", "")
        if not url or not key:
            raise RuntimeError(
                "SUPABASE_URL and SUPABASE_KEY must be set. "
                "Get them from your Supabase project dashboard."
            )
        _client = create_client(url, key)
    return _client


def test_connection() -> bool:
    """Test database connectivity."""
    try:
        client = _get_client()
        # Simple query to check connection
        client.table("properties").select("id").limit(1).execute()
        return True
    except Exception as e:
        print(f"[DB] Connection test failed: {e}")
        return False


# ---------------------------------------------------------------------------
# Property queries
# ---------------------------------------------------------------------------

# Expected table: "properties"
# Columns (minimum for SEO to work):
#   id, slug, title, description, ai_summary,
#   city, region, address, property_type,
#   price, currency, bedrooms, bathrooms, area_sqm,
#   image_path (or image_url), features (jsonb array), tags (jsonb array),
#   status ('active', 'draft', 'sold'), published_at, created_at, updated_at


def get_property_by_slug(slug: str) -> Optional[Dict[str, Any]]:
    """Fetch a single active property by its URL slug."""
    try:
        client = _get_client()
        result = (
            client.table("properties")
            .select("*")
            .eq("slug", slug)
            .eq("status", "active")
            .limit(1)
            .execute()
        )
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"[DB] Error fetching property {slug}: {e}")
        return None


def get_featured_properties(limit: int = 30) -> List[Dict[str, Any]]:
    """Fetch featured/active properties for the listings page and SEO."""
    try:
        client = _get_client()
        result = (
            client.table("properties")
            .select("id, slug, title, city, region, price, currency, "
                    "bedrooms, bathrooms, area_sqm, property_type, "
                    "image_path, published_at")
            .eq("status", "active")
            .order("published_at", desc=True)
            .limit(limit)
            .execute()
        )
        return result.data or []
    except Exception as e:
        print(f"[DB] Error fetching featured properties: {e}")
        return []


def get_all_property_slugs() -> List[Dict[str, Any]]:
    """Fetch all property slugs + dates for the sitemap."""
    try:
        client = _get_client()
        result = (
            client.table("properties")
            .select("slug, updated_at, created_at")
            .eq("status", "active")
            .execute()
        )
        return result.data or []
    except Exception as e:
        print(f"[DB] Error fetching property slugs: {e}")
        return []


def query_properties(
    city: Optional[str] = None,
    property_type: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_bedrooms: Optional[int] = None,
    limit: int = 20,
    offset: int = 0,
) -> List[Dict[str, Any]]:
    """Query properties with filters (for the API)."""
    try:
        client = _get_client()
        q = (
            client.table("properties")
            .select("*")
            .eq("status", "active")
        )
        if city:
            q = q.ilike("city", f"%{city}%")
        if property_type:
            q = q.eq("property_type", property_type)
        if min_price is not None:
            q = q.gte("price", min_price)
        if max_price is not None:
            q = q.lte("price", max_price)
        if min_bedrooms is not None:
            q = q.gte("bedrooms", min_bedrooms)

        result = q.order("published_at", desc=True).range(offset, offset + limit - 1).execute()
        return result.data or []
    except Exception as e:
        print(f"[DB] Error querying properties: {e}")
        return []


# ---------------------------------------------------------------------------
# Location queries
# ---------------------------------------------------------------------------

# Expected table: "locations"
# Columns: id, slug, name, city, region, description, image_path, property_count


def get_location_by_slug(slug: str) -> Optional[Dict[str, Any]]:
    """Fetch location info + its properties."""
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

        # Fetch properties in this location
        props_result = (
            client.table("properties")
            .select("id, slug, title, city, price, currency, bedrooms, area_sqm, image_path")
            .eq("status", "active")
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
            .select("id, slug, name, city, region, description, property_count")
            .execute()
        )
        return result.data or []
    except Exception as e:
        print(f"[DB] Error fetching locations: {e}")
        return []


# ---------------------------------------------------------------------------
# Service queries
# ---------------------------------------------------------------------------

# Expected table: "services"
# Columns: id, slug, title, description, image_path


def get_service_by_slug(slug: str) -> Optional[Dict[str, Any]]:
    """Fetch a service page by slug."""
    try:
        client = _get_client()
        result = (
            client.table("services")
            .select("*")
            .eq("slug", slug)
            .limit(1)
            .execute()
        )
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"[DB] Error fetching service {slug}: {e}")
        return None
