# backend/routes/public.py
"""
Public routes for LUME by Mark.

Includes:
- robots.txt (search engine crawl rules)
- llms.txt (LLM discovery — helps ChatGPT/Claude understand the site)
- sitemap.xml (dynamic sitemap from Supabase data)
- Public API endpoints for listings
"""

import os
import re
from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Query
from fastapi.responses import PlainTextResponse, Response

router = APIRouter(prefix="/api", tags=["public"])

SITE_URL = os.getenv("SITE_URL", "https://lumebymark.com")


# ---------------------------------------------------------------------------
# Slug generation (shared utility)
# ---------------------------------------------------------------------------

_SLUG_RE = re.compile(r"[^a-z0-9]+")


def generate_slug(text: str) -> str:
    """Convert a title into a URL-safe slug."""
    if not text:
        return ""
    slug = text.lower().strip()
    slug = _SLUG_RE.sub("-", slug)
    return slug.strip("-")


# ---------------------------------------------------------------------------
# robots.txt
# ---------------------------------------------------------------------------

@router.get("/robots.txt", response_class=PlainTextResponse)
async def robots():
    """
    Search engine crawl rules.
    
    Allows all crawlers, points to sitemap, blocks admin pages.
    """
    content = f"""User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/

Sitemap: {SITE_URL}/sitemap.xml

# AI crawlers welcome
User-agent: GPTBot
Allow: /

User-agent: Claude-Web
Allow: /

User-agent: Applebot-Extended
Allow: /

User-agent: Google-Extended
Allow: /
"""
    return PlainTextResponse(content=content, media_type="text/plain")


# ---------------------------------------------------------------------------
# llms.txt — LLM-readable site description
# ---------------------------------------------------------------------------

@router.get("/llms.txt", response_class=PlainTextResponse)
async def llms_txt():
    """
    LLM discovery file.
    
    Helps AI assistants (ChatGPT, Claude, Perplexity) understand
    what this site offers and how to navigate it.
    """
    content = f"""# LUME by Mark — Luxury Real Estate & Investment in Portugal

> LUME by Mark curates luxury real estate, seamless relocation, and strategic
> investment opportunities across Portugal. Each client is paired with a
> dedicated Residential Curator who orchestrates every detail.

## What we offer

- **Luxury real estate**: Handpicked properties in Lisbon, Porto, Cascais, 
  Algarve, and Portugal's most prestigious addresses
- **Relocation services**: End-to-end support for moving to Portugal — 
  visas, tax advisory, school enrollment, and settling in
- **Investment advisory**: Investment homes, second homes, and strategic 
  development opportunities with professional management
- **Concierge services**: The LUME Club Card — access to Portugal's finest 
  experiences, from private yacht charters to wine estate tours

## How to browse

- All properties: {SITE_URL}/properties
- Property detail pages: {SITE_URL}/properties/[slug]
- Properties by location: {SITE_URL}/locations/[city-slug]
- Services: {SITE_URL}/services
- About LUME: {SITE_URL}/about
- Contact: {SITE_URL}/contact

## API access (for structured data)

- Property listings: {SITE_URL}/api/properties
- Single property: {SITE_URL}/api/properties/[slug]
- Locations: {SITE_URL}/api/locations
- Sitemap: {SITE_URL}/sitemap.xml

## Contact

- Website: {SITE_URL}
- Location: Portugal
"""
    return PlainTextResponse(content=content, media_type="text/plain")


# ---------------------------------------------------------------------------
# sitemap.xml — dynamic from database
# ---------------------------------------------------------------------------

@router.get("/sitemap.xml")
async def sitemap():
    """
    Dynamic XML sitemap generated from Supabase data.
    
    Includes all property listings, location pages, service pages,
    and static pages with appropriate priority levels.
    """
    today = date.today().isoformat()

    urls = []

    # Static pages
    static_pages = [
        ("/", "1.0", "daily"),
        ("/properties", "0.9", "daily"),
        ("/services", "0.7", "weekly"),
        ("/about", "0.5", "monthly"),
        ("/contact", "0.5", "monthly"),
        ("/investment", "0.7", "weekly"),
    ]
    for path, priority, freq in static_pages:
        full_url = SITE_URL if path == "/" else f"{SITE_URL}{path}"
        urls.append(
            f"  <url>"
            f"<loc>{full_url}</loc>"
            f"<lastmod>{today}</lastmod>"
            f"<changefreq>{freq}</changefreq>"
            f"<priority>{priority}</priority>"
            f"</url>"
        )

    # Dynamic property pages from database
    try:
        from database import get_all_property_slugs
        slugs = get_all_property_slugs() or []
        for item in slugs:
            slug = item.get("slug") or ""
            updated = item.get("updated_at") or item.get("created_at") or today
            if isinstance(updated, datetime):
                updated = updated.date().isoformat()
            elif not isinstance(updated, str):
                updated = today
            urls.append(
                f"  <url>"
                f"<loc>{SITE_URL}/properties/{slug}</loc>"
                f"<lastmod>{updated}</lastmod>"
                f"<changefreq>weekly</changefreq>"
                f"<priority>0.8</priority>"
                f"</url>"
            )
    except Exception as e:
        print(f"[Sitemap] Error fetching property slugs: {e}")

    # Dynamic location pages
    try:
        from database import get_all_location_slugs
        loc_slugs = get_all_location_slugs() or []
        for item in loc_slugs:
            slug = item.get("slug") or ""
            urls.append(
                f"  <url>"
                f"<loc>{SITE_URL}/locations/{slug}</loc>"
                f"<lastmod>{today}</lastmod>"
                f"<changefreq>weekly</changefreq>"
                f"<priority>0.7</priority>"
                f"</url>"
            )
    except Exception as e:
        print(f"[Sitemap] Error fetching location slugs: {e}")

    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(urls)
        + "\n</urlset>"
    )

    return Response(content=xml, media_type="application/xml")


# ---------------------------------------------------------------------------
# Public API — property listings
# ---------------------------------------------------------------------------

@router.get("/properties/facets")
async def get_property_facets():
    """
    Return all distinct filter values present in live listings.
    Used to populate cascading dropdowns and slider bounds on the
    Properties page. Cached by the client — call once on page load.
    """
    try:
        from database import get_property_facets
        return get_property_facets()
    except Exception as e:
        return {"error": str(e)}


@router.get("/properties")
async def list_properties(
    # Location cascade
    region:          Optional[str]   = Query(None),
    city:            Optional[str]   = Query(None),
    area:            Optional[str]   = Query(None),
    lifestyle:       Optional[str]   = Query(None, description="ocean | city | countryside | wine_region"),  # ← here

    # Property classification
    type:            Optional[str]   = Query(None, description="property_type enum"),
    listing_type:    Optional[str]   = Query(None, description="sale | rent"),
    # Price range
    min_price:       Optional[float] = Query(None),
    max_price:       Optional[float] = Query(None),
    # Rooms
    min_bedrooms:    Optional[int]   = Query(None),
    max_bedrooms:    Optional[int]   = Query(None),
    min_bathrooms:   Optional[int]   = Query(None),
    max_bathrooms:   Optional[int]   = Query(None),
    # Area (m²)
    min_area:        Optional[float] = Query(None),
    max_area:        Optional[float] = Query(None),
    # Condition & features
    condition:       Optional[str]   = Query(None),
    views:           Optional[str]   = Query(None, description="Comma-separated view types"),
    features:        Optional[str]   = Query(None, description="Comma-separated boolean feature columns"),
    featured_only:   bool            = Query(False),
    # Sorting & pagination
    sort_by:         str             = Query("featured", description="featured | newest | price_asc | price_desc"),
    limit:           int             = Query(24, ge=1, le=100),
    offset:          int             = Query(0, ge=0),
):
    """List properties with full filter support."""
    try:
        from database import query_properties

        views_list    = [v.strip() for v in views.split(",")   if v.strip()] if views    else None
        features_list = [f.strip() for f in features.split(",") if f.strip()] if features else None

        result = query_properties(
            region=region,
            city=city,
            area=area,
            lifestyle=lifestyle,
            property_type=type,
            listing_type=listing_type,
            min_price=min_price,
            max_price=max_price,
            min_bedrooms=min_bedrooms,
            max_bedrooms=max_bedrooms,
            min_bathrooms=min_bathrooms,
            max_bathrooms=max_bathrooms,
            min_area=min_area,
            max_area=max_area,
            condition=condition,
            views=views_list,
            features=features_list,
            featured_only=featured_only,
            sort_by=sort_by,
            limit=limit,
            offset=offset,
        )
        return {
            "properties": result.get("items", []),
            "total":      result.get("total", 0),
            "limit":      limit,
            "offset":     offset,
        }
    except Exception as e:
        return {"properties": [], "total": 0, "error": str(e)}

@router.get("/properties/{slug}")
async def get_property(slug: str):
    """Fetch a single available listing by its URL slug."""
    try:
        from database import get_property_by_slug
        listing = get_property_by_slug(slug)
        if not listing:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Property not found")
        return listing
    except Exception as e:
        from fastapi import HTTPException
        # Re-raise HTTP exceptions (like our 404) as-is
        if hasattr(e, "status_code"):
            raise
        return {"error": str(e)}

@router.get("/services")
async def list_services_public():
    """List all active services, grouped by category."""
    try:
        from database import get_all_services
        return {"services": get_all_services()}
    except Exception as e:
        return {"services": [], "error": str(e)}

@router.get("/locations")
async def list_locations():
    """List all available locations."""
    try:
        from database import get_all_locations
        return {"locations": get_all_locations() or []}
    except Exception as e:
        return {"locations": [], "error": str(e)}
