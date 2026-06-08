# backend/routes/public.py
"""
Public routes for LUME by Mark.

Includes:
- robots.txt (search engine crawl rules)
- llms.txt (LLM discovery — helps ChatGPT/Claude understand the site)
- sitemap.xml (dynamic sitemap from Supabase data)
- Public API endpoints for listings and services

Phase 4 — locale-awareness:
  All content endpoints now accept an optional ?locale=ru|es|pt_pt|en
  parameter. The backend merges the appropriate _i18n translation into
  the base fields before returning, so the response shape is unchanged.
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
    content = f"""User-agent: *
Allow: /
Disallow: /admin
Disallow: /*/admin
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
    content = f"""# LUME by Mark — Homes, Life in Portugal & Art & Antiques Advisory

> LUME by Mark helps discerning individuals find their home, build their
> life, and collect with meaning in Portugal. Each client is paired with a
> dedicated Curator who orchestrates every detail.

## What we offer

- **Homes**: Handpicked properties in Lisbon, Porto, Cascais, Algarve,
  and Portugal's most prestigious addresses
- **Life in Portugal**: End-to-end lifestyle management — from NIF and
  visas to schools, healthcare, interior design, home management, and
  everything in between
- **Art & Antiques Advisory**: A dedicated Collection Curator who guides
  clients in building personal art and antiques collections — sourcing
  contemporary Portuguese artists, antique azulejo panels, navigating
  auction houses and private dealers, authentication, provenance,
  installation, and long-term collection management
- **Investment**: Investment homes, second homes, and strategic
  development opportunities with professional management
- **Concierge**: The LUME Club Card — access to Portugal's finest
  experiences, from private yacht charters to wine estate tours

## How to browse

- All properties: {SITE_URL}/properties
- Property detail pages: {SITE_URL}/properties/[slug]
- Properties by region: {SITE_URL}/properties/lisbon, /properties/algarve,
  /properties/silver-coast, /properties/porto, /properties/alentejo
- Properties by region + type: {SITE_URL}/properties/algarve/villas,
  /properties/lisbon/apartments, /properties/silver-coast/new-developments
- About LUME: {SITE_URL}/about
- About Portugal (journal): {SITE_URL}/journal

Localised versions are available under /pt, /ru and /es prefixes
(e.g. {SITE_URL}/pt/properties/algarve/villas).

## API access (for structured data)

- Property listings: {SITE_URL}/api/properties
- Single property: {SITE_URL}/api/properties/[slug]
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
    from seo import (
        ALL_LOCALES, LOCALE_BCP47, _abs_url, CURATED_SECTIONS,
    )

    today = date.today().isoformat()
    entries: list[str] = []

    def add(rest: str, priority: str, freq: str, lastmod: str = today):
        """Emit one <url> (English loc) with hreflang alternates for every locale."""
        loc = _abs_url("en", rest)
        alts = "".join(
            f'<xhtml:link rel="alternate" hreflang="{LOCALE_BCP47[l]}" href="{_abs_url(l, rest)}"/>'
            for l in ALL_LOCALES
        )
        alts += f'<xhtml:link rel="alternate" hreflang="x-default" href="{_abs_url("en", rest)}"/>'
        entries.append(
            f"  <url><loc>{loc}</loc><lastmod>{lastmod}</lastmod>"
            f"<changefreq>{freq}</changefreq><priority>{priority}</priority>{alts}</url>"
        )

    # ── Static pages ────────────────────────────────────────────────────────
    for rest, priority, freq in [
        ("/",           "1.0", "daily"),
        ("/properties", "0.9", "daily"),
        ("/journal",    "0.7", "weekly"),
        ("/about",      "0.5", "monthly"),
        ("/about/team", "0.4", "monthly"),
        ("/about/news", "0.5", "weekly"),
        ("/investment", "0.7", "weekly"),
    ]:
        add(rest, priority, freq)

    # ── Curated section / landing pages ─────────────────────────────────────
    for region_slug, type_slug in CURATED_SECTIONS:
        rest = f"/properties/{region_slug}" + (f"/{type_slug}" if type_slug else "")
        add(rest, "0.8", "weekly")

    # ── Property detail pages ───────────────────────────────────────────────
    try:
        from database import get_all_property_slugs
        for item in get_all_property_slugs() or []:
            slug = item.get("slug") or ""
            if not slug:
                continue
            updated = item.get("updated_at") or item.get("created_at") or today
            if isinstance(updated, datetime):
                updated = updated.date().isoformat()
            elif not isinstance(updated, str):
                updated = today
            add(f"/properties/{slug}", "0.8", "weekly", updated)
    except Exception as e:
        print(f"[Sitemap] Error fetching property slugs: {e}")

    # ── Journal articles ────────────────────────────────────────────────────
    try:
        from database import get_all_journal_slugs
        for item in get_all_journal_slugs() or []:
            slug = item.get("slug") or ""
            if not slug:
                continue
            updated = item.get("updated_at") or item.get("published_at") or today
            if isinstance(updated, datetime):
                updated = updated.date().isoformat()
            elif not isinstance(updated, str):
                updated = today
            add(f"/journal/{slug}", "0.6", "weekly", updated)
    except Exception as e:
        print(f"[Sitemap] Error fetching journal slugs: {e}")

    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
        'xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
        + "\n".join(entries)
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
    Used to populate cascading dropdowns and slider bounds.
    Facets are locale-independent (they're filter values, not display text).
    """
    try:
        from database import get_property_facets
        return get_property_facets()
    except Exception as e:
        return {"error": str(e)}


@router.get("/properties")
async def list_properties(
    # ── Locale (Phase 4) ────────────────────────────────────────────────────
    locale:          Optional[str]   = Query(None, description="en | pt_pt | ru | es"),

    # ── Location cascade ─────────────────────────────────────────────────────
    region:          Optional[str]   = Query(None),
    city:            Optional[str]   = Query(None),
    area:            Optional[str]   = Query(None),
    lifestyle:       Optional[str]   = Query(None, description="ocean | city | countryside | wine_region"),

    # ── Property classification ───────────────────────────────────────────────
    type:            Optional[str]   = Query(None, description="apartment | penthouse | townhouse | villa | project_apartment | project_villa"),
    types:           Optional[str]   = Query(None, description="Comma-separated property_type values (match any) — used by section landing pages"),
    listing_type:    Optional[str]   = Query(None, description="sale | rent"),

    # ── Price range ───────────────────────────────────────────────────────────
    min_price:       Optional[float] = Query(None),
    max_price:       Optional[float] = Query(None),

    # ── Rooms ─────────────────────────────────────────────────────────────────
    min_bedrooms:    Optional[int]   = Query(None),
    max_bedrooms:    Optional[int]   = Query(None),
    min_bathrooms:   Optional[int]   = Query(None),
    max_bathrooms:   Optional[int]   = Query(None),

    # ── Area (m²) ─────────────────────────────────────────────────────────────
    min_area:        Optional[float] = Query(None),
    max_area:        Optional[float] = Query(None),

    # ── Condition & features ──────────────────────────────────────────────────
    condition:       Optional[str]   = Query(None),
    views:           Optional[str]   = Query(None, description="Comma-separated view types"),
    features:        Optional[str]   = Query(None, description="Comma-separated boolean feature columns"),
    featured_only:   bool            = Query(False),

    # ── Sorting & pagination ──────────────────────────────────────────────────
    sort_by:         str             = Query("featured", description="featured | newest | price_asc | price_desc"),
    limit:           int             = Query(24, ge=1, le=100),
    offset:          int             = Query(0, ge=0),
):
    """
    List properties with full filter support.
    Pass ?locale=ru to receive translated titles and descriptions.
    """
    try:
        from database import query_properties

        views_list    = [v.strip() for v in views.split(",")   if v.strip()] if views    else None
        features_list = [f.strip() for f in features.split(",") if f.strip()] if features else None
        types_list    = [t.strip() for t in types.split(",")   if t.strip()] if types    else None

        result = query_properties(
            locale=locale or "en",
            region=region,
            city=city,
            area=area,
            lifestyle=lifestyle,
            property_type=type,
            property_types=types_list,
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
async def get_property(
    slug: str,
    locale: Optional[str] = Query(None, description="en | pt_pt | ru | es"),
):
    """
    Fetch a single available listing by its URL slug.
    Pass ?locale=ru to receive translated title and descriptions.
    """
    try:
        from database import get_property_by_slug
        listing = get_property_by_slug(slug, locale=locale or "en")
        if not listing:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Property not found")
        return listing
    except Exception as e:
        from fastapi import HTTPException
        if hasattr(e, "status_code"):
            raise
        return {"error": str(e)}


@router.get("/services")
async def list_services_public(
    locale: Optional[str] = Query(None, description="en | pt_pt | ru | es"),
):
    """
    List all active services, grouped by category.
    Pass ?locale=ru to receive translated service titles and descriptions.
    """
    try:
        from database import get_all_services
        return {"services": get_all_services(locale=locale or "en")}
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