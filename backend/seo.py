# backend/seo.py
"""
SEO injection module for LUME by Mark.

Replaces placeholder strings in the HTML template with dynamic meta tags,
JSON-LD structured data, and hidden content blocks based on the requested URL.

Normal users see the React app — it overwrites everything client-side.
Crawlers (Google, Bing, ChatGPT, Claude) see real content in the initial HTML.

Adapted from the ADU media pattern (proven to work with Google indexing + LLM discovery).
"""

import json
import os
import re
import time
import html as html_module
from typing import Optional, Dict, Any, Tuple, List

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

SITE_URL = os.getenv("SITE_URL", "https://lumebymark.com")
R2_PUBLIC_URL = os.getenv("R2_PUBLIC_URL", "")
IMAGE_BASE_URL = os.getenv("IMAGE_BASE_URL", R2_PUBLIC_URL)  # fallback to R2

DEFAULT_TITLE = "LUME by Mark — Homes, Life & Art Advisory in Portugal"
DEFAULT_DESCRIPTION = (
    "LUME by Mark helps you find your home, build your life, "
    "and collect with meaning in Portugal."
)
DEFAULT_OG_IMAGE = f"{SITE_URL}/og-default.png"

# ---------------------------------------------------------------------------
# In-memory cache (same pattern as ADU — simple and effective)
# ---------------------------------------------------------------------------

_cache: Dict[str, Tuple[Any, float]] = {}
CACHE_TTL_LISTINGS = 3600      # 1 hour for property listings
CACHE_TTL_PAGES = 86400        # 24 hours for static pages
CACHE_TTL_SITEMAP = 3600       # 1 hour for sitemap


def _get_cached(key: str, ttl: int = CACHE_TTL_LISTINGS) -> Optional[Any]:
    if key in _cache:
        data, ts = _cache[key]
        if time.time() - ts < ttl:
            return data
        del _cache[key]
    return None


def _set_cached(key: str, data: Any) -> None:
    _cache[key] = (data, time.time())


def clear_cache(prefix: str = "") -> int:
    """Clear cache entries matching prefix. Returns count cleared."""
    if not prefix:
        count = len(_cache)
        _cache.clear()
        return count
    keys = [k for k in _cache if k.startswith(prefix)]
    for k in keys:
        del _cache[k]
    return len(keys)


# ---------------------------------------------------------------------------
# URL routing — define all LUME page types
# ---------------------------------------------------------------------------

_PROPERTY_RE = re.compile(r"^/properties/([a-z0-9-]+)$")
_LOCATION_RE = re.compile(r"^/locations/([a-z0-9-]+)$")
_SERVICE_RE = re.compile(r"^/services/([a-z0-9-]+)$")

STATIC_PAGES = {
    "/": "home",
    "/properties": "properties",
    "/services": "services",
    "/about": "about",
    "/contact": "contact",
    "/privacy": "privacy",
    "/investment": "investment",
}


def _parse_route(path: str) -> Tuple[str, dict]:
    """Parse URL path into (page_type, params)."""
    path = path.rstrip("/") or "/"

    # Static pages first
    if path in STATIC_PAGES:
        return STATIC_PAGES[path], {}

    # Dynamic routes
    m = _PROPERTY_RE.match(path)
    if m:
        return "property", {"slug": m.group(1)}

    m = _LOCATION_RE.match(path)
    if m:
        return "location", {"slug": m.group(1)}

    m = _SERVICE_RE.match(path)
    if m:
        return "service", {"slug": m.group(1)}

    return "other", {}


# ---------------------------------------------------------------------------
# Data fetchers — these call your Supabase database
#
# IMPORTANT: You'll need to implement the actual database.py module
# with functions like get_property_by_slug(), get_properties_by_location(), etc.
# The pattern is identical to ADU's database.py
# ---------------------------------------------------------------------------


def _fetch_property(slug: str) -> Optional[Dict[str, Any]]:
    """Fetch a single property listing by slug (cached)."""
    cache_key = f"property:{slug}"
    cached = _get_cached(cache_key)
    if cached is not None:
        return cached

    try:
        from database import get_property_by_slug
        prop = get_property_by_slug(slug)
        if prop:
            _set_cached(cache_key, prop)
        return prop
    except Exception as e:
        print(f"[SEO] Error fetching property {slug}: {e}")
        return None


def _fetch_properties_list() -> List[Dict[str, Any]]:
    """Fetch all active/featured properties for listings page (cached)."""
    cache_key = "properties:featured"
    cached = _get_cached(cache_key)
    if cached is not None:
        return cached

    try:
        from database import get_featured_properties
        props = get_featured_properties() or []
        _set_cached(cache_key, props)
        return props
    except Exception as e:
        print(f"[SEO] Error fetching properties list: {e}")
        return []


def _fetch_location(slug: str) -> Optional[Dict[str, Any]]:
    """Fetch location data + property count (cached)."""
    cache_key = f"location:{slug}"
    cached = _get_cached(cache_key)
    if cached is not None:
        return cached

    try:
        from database import get_location_by_slug
        loc = get_location_by_slug(slug)
        if loc:
            _set_cached(cache_key, loc)
        return loc
    except Exception as e:
        print(f"[SEO] Error fetching location {slug}: {e}")
        return None


def _fetch_service(slug: str) -> Optional[Dict[str, Any]]:
    """Fetch service page data (cached 24h)."""
    cache_key = f"service:{slug}"
    cached = _get_cached(cache_key, ttl=CACHE_TTL_PAGES)
    if cached is not None:
        return cached

    try:
        from database import get_service_by_slug
        svc = get_service_by_slug(slug)
        if svc:
            _set_cached(cache_key, svc)
        return svc
    except Exception as e:
        print(f"[SEO] Error fetching service {slug}: {e}")
        return None


# ---------------------------------------------------------------------------
# Image URL helper
# ---------------------------------------------------------------------------


def _image_url(item: Dict[str, Any], field: str = "image_path") -> str:
    """Build full image URL from a record's image field."""
    path = item.get(field) or item.get("image_url") or item.get("og_image") or ""
    if not path:
        return DEFAULT_OG_IMAGE
    if path.startswith("http"):
        return path
    base = IMAGE_BASE_URL.rstrip("/")
    return f"{base}/{path}" if base else DEFAULT_OG_IMAGE


# ---------------------------------------------------------------------------
# JSON-LD builders — Schema.org structured data
# ---------------------------------------------------------------------------


def _wrap_jsonld(data: dict) -> str:
    return (
        '<script type="application/ld+json">'
        + json.dumps(data, ensure_ascii=False)
        + "</script>"
    )


def _jsonld_real_estate_listing(prop: Dict[str, Any], url: str) -> str:
    """Schema.org RealEstateListing for individual property pages."""
    title = prop.get("title") or ""
    description = prop.get("description") or prop.get("ai_summary") or ""
    image = _image_url(prop)
    price = prop.get("price")
    currency = prop.get("currency", "EUR")
    bedrooms = prop.get("bedrooms")
    bathrooms = prop.get("bathrooms")
    area_sqm = prop.get("area_sqm")
    city = prop.get("city") or prop.get("location_city") or ""
    region = prop.get("region") or ""
    address_text = prop.get("address") or f"{city}, {region}" if city else "Portugal"

    ld: Dict[str, Any] = {
        "@context": "https://schema.org",
        "@type": "RealEstateListing",
        "name": title,
        "description": _truncate(description, 300),
        "url": url,
        "image": image,
        "datePosted": prop.get("published_at") or prop.get("created_at") or "",
    }

    # Offer (price)
    if price:
        ld["offers"] = {
            "@type": "Offer",
            "price": price,
            "priceCurrency": currency,
            "availability": "https://schema.org/InStock",
        }

    # Property details via additionalProperty
    additional = []
    if bedrooms is not None:
        additional.append({
            "@type": "PropertyValue",
            "name": "Bedrooms",
            "value": bedrooms,
        })
    if bathrooms is not None:
        additional.append({
            "@type": "PropertyValue",
            "name": "Bathrooms",
            "value": bathrooms,
        })
    if area_sqm is not None:
        additional.append({
            "@type": "PropertyValue",
            "name": "Floor area",
            "value": f"{area_sqm} m²",
            "unitCode": "MTK",
        })

    if additional:
        ld["additionalProperty"] = additional

    # Location
    ld["contentLocation"] = {
        "@type": "Place",
        "name": address_text,
        "address": {
            "@type": "PostalAddress",
            "addressLocality": city,
            "addressRegion": region,
            "addressCountry": "PT",
        },
    }

    # Publisher
    ld["provider"] = {
        "@type": "RealEstateAgent",
        "name": "LUME by Mark",
        "url": SITE_URL,
    }

    return _wrap_jsonld(ld)


def _jsonld_item_list(items: List[Dict[str, Any]], name: str, url: str) -> str:
    """Schema.org ItemList for collection pages (properties, locations)."""
    list_items = []
    for i, item in enumerate(items[:20], 1):  # limit to 20 for JSON-LD size
        slug = item.get("slug") or ""
        item_url = f"{SITE_URL}/properties/{slug}" if slug else url
        list_items.append({
            "@type": "ListItem",
            "position": i,
            "url": item_url,
            "name": item.get("title") or "",
        })

    ld = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": name,
        "url": url,
        "numberOfItems": len(items),
        "itemListElement": list_items,
    }
    return _wrap_jsonld(ld)


def _jsonld_organization() -> str:
    """Schema.org Organization for the homepage."""
    ld = {
        "@context": "https://schema.org",
        "@type": "RealEstateAgent",
        "name": "LUME by Mark",
        "url": SITE_URL,
        "description": DEFAULT_DESCRIPTION,
        "areaServed": {
            "@type": "Country",
            "name": "Portugal",
        },
        "address": {
            "@type": "PostalAddress",
            "addressCountry": "PT",
        },
    }
    return _wrap_jsonld(ld)


def _jsonld_service(svc: Dict[str, Any], url: str) -> str:
    """Schema.org Service for service pages."""
    ld = {
        "@context": "https://schema.org",
        "@type": "Service",
        "name": svc.get("title") or "",
        "description": svc.get("description") or "",
        "url": url,
        "provider": {
            "@type": "RealEstateAgent",
            "name": "LUME by Mark",
            "url": SITE_URL,
        },
        "areaServed": {
            "@type": "Country",
            "name": "Portugal",
        },
    }
    return _wrap_jsonld(ld)


# ---------------------------------------------------------------------------
# Hidden SEO content block builders
#
# These produce <div style="display:none"> blocks with real text content.
# Crawlers read them, React overwrites the page for humans.
# ---------------------------------------------------------------------------


def _seo_content_property(prop: Dict[str, Any]) -> str:
    """Build hidden content block for a property listing."""
    esc = html_module.escape

    title = esc(prop.get("title") or "")
    location = esc(prop.get("city") or "")
    region = esc(prop.get("region") or "")
    price = prop.get("price")
    currency = prop.get("currency", "EUR")
    bedrooms = prop.get("bedrooms")
    bathrooms = prop.get("bathrooms")
    area = prop.get("area_sqm")
    prop_type = esc(prop.get("property_type") or "")
    description = esc(prop.get("description") or "")
    ai_summary = esc(prop.get("ai_summary") or "")
    features = prop.get("features") or []
    tags = prop.get("tags") or []

    parts = [
        '<div id="seo-content" style="display:none" aria-hidden="true">',
        f"<h1>{title}</h1>",
    ]

    # Location subtitle
    loc_text = f"{location}, {region}" if location and region else location or region
    if loc_text:
        parts.append(f"<h2>{esc(loc_text)}, Portugal</h2>")

    # Key specs
    specs = []
    if price:
        specs.append(f"Price: {currency} {price:,.0f}" if isinstance(price, (int, float)) else f"Price: {price}")
    if prop_type:
        specs.append(f"Type: {prop_type}")
    if bedrooms is not None:
        specs.append(f"Bedrooms: {bedrooms}")
    if bathrooms is not None:
        specs.append(f"Bathrooms: {bathrooms}")
    if area is not None:
        specs.append(f"Area: {area} m²")
    if specs:
        parts.append(f"<p>{' · '.join(specs)}</p>")

    # Description
    if ai_summary:
        parts.append(f"<p>{ai_summary}</p>")
    elif description:
        parts.append(f"<p>{esc(description[:500])}</p>")

    # Features
    if features:
        items = "".join(f"<li>{esc(f)}</li>" for f in features[:15])
        parts.append(f"<ul>{items}</ul>")

    # Tags
    if tags:
        items = "".join(f"<li>{esc(t)}</li>" for t in tags)
        parts.append(f"<ul>{items}</ul>")

    parts.append("</div>")
    return "\n".join(parts)


def _seo_content_properties_list(properties: List[Dict[str, Any]]) -> str:
    """Build hidden content block for the properties index page."""
    if not properties:
        return ""
    esc = html_module.escape

    parts = [
        '<div id="seo-content" style="display:none" aria-hidden="true">',
        "<h1>Luxury Properties in Portugal — LUME by Mark</h1>",
        "<p>Curated selection of luxury real estate across Lisbon, Porto, Algarve, Cascais, and beyond.</p>",
    ]
    for p in properties[:30]:
        title = esc(p.get("title") or "")
        slug = esc(p.get("slug") or "")
        city = esc(p.get("city") or "")
        price = p.get("price")
        price_text = f" — €{price:,.0f}" if isinstance(price, (int, float)) else ""
        link = f"/properties/{slug}"
        parts.append(f'<article><h2><a href="{link}">{title}</a></h2>')
        parts.append(f"<p>{city}{price_text}</p></article>")
    parts.append("</div>")
    return "\n".join(parts)


def _seo_content_location(loc: Dict[str, Any], properties: List[Dict[str, Any]]) -> str:
    """Build hidden content block for a location page."""
    esc = html_module.escape
    name = esc(loc.get("name") or loc.get("city") or "")
    description = esc(loc.get("description") or "")

    parts = [
        '<div id="seo-content" style="display:none" aria-hidden="true">',
        f"<h1>Luxury Properties in {name}, Portugal</h1>",
    ]
    if description:
        parts.append(f"<p>{description}</p>")

    for p in properties[:20]:
        title = esc(p.get("title") or "")
        slug = esc(p.get("slug") or "")
        link = f"/properties/{slug}"
        parts.append(f'<p><a href="{link}">{title}</a></p>')
    parts.append("</div>")
    return "\n".join(parts)


def _seo_content_home(properties: List[Dict[str, Any]]) -> str:
    """Build hidden content block for the homepage."""
    if not properties:
        return ""
    esc = html_module.escape

    parts = [
        '<div id="seo-content" style="display:none" aria-hidden="true">',
        "<h1>LUME by Mark — Homes, Life & Art Advisory in Portugal</h1>",
        "<p>Your light to living in Portugal. LUME helps you find your home, "
        "build your life, and collect with meaning.</p>",
        '<p><a href="/properties">View all properties</a></p>',
    ]
    for p in properties[:10]:
        title = esc(p.get("title") or "")
        slug = esc(p.get("slug") or "")
        link = f"/properties/{slug}"
        parts.append(f'<p><a href="{link}">{title}</a></p>')
    parts.append("</div>")
    return "\n".join(parts)


# ---------------------------------------------------------------------------
# Formatting helpers
# ---------------------------------------------------------------------------


def _truncate(text: str, max_len: int = 160) -> str:
    if not text or len(text) <= max_len:
        return text or ""
    return text[: max_len - 1].rsplit(" ", 1)[0] + "…"


def _format_price(price: Any, currency: str = "EUR") -> str:
    if not price:
        return "Price on request"
    if isinstance(price, (int, float)):
        return f"€{price:,.0f}"
    return str(price)


# ---------------------------------------------------------------------------
# Core replacement engine
# ---------------------------------------------------------------------------


def _replace_placeholders(
    html: str,
    *,
    title: str = DEFAULT_TITLE,
    description: str = DEFAULT_DESCRIPTION,
    og_type: str = "website",
    url: str = SITE_URL,
    image: str = DEFAULT_OG_IMAGE,
    jsonld: str = "",
    seo_content: str = "",
) -> str:
    esc = html_module.escape
    replacements = {
        "__PAGE_TITLE__": esc(title),
        "__PAGE_DESCRIPTION__": esc(_truncate(description)),
        "__OG_TITLE__": esc(title),
        "__OG_DESCRIPTION__": esc(_truncate(description)),
        "__OG_TYPE__": esc(og_type),
        "__OG_URL__": esc(url),
        "__OG_IMAGE__": esc(image),
        "__JSON_LD__": jsonld,          # already safe (we build it ourselves)
        "__SEO_CONTENT__": seo_content,  # already escaped per-field
    }
    for placeholder, value in replacements.items():
        html = html.replace(placeholder, value)
    return html


def _replace_with_defaults(html: str, path: str) -> str:
    """Fallback: replace all placeholders with safe default values."""
    url = f"{SITE_URL}{path}" if path != "/" else SITE_URL
    return _replace_placeholders(html, url=url)


# ---------------------------------------------------------------------------
# Page-specific SEO builders
# ---------------------------------------------------------------------------


def _build_property_seo(html: str, params: dict) -> str:
    slug = params["slug"]
    prop = _fetch_property(slug)
    url = f"{SITE_URL}/properties/{slug}"

    if not prop:
        return _replace_placeholders(html, url=url)

    title_parts = [prop.get("title") or "Property"]
    city = prop.get("city") or ""
    if city:
        title_parts.append(city)
    title = " · ".join(title_parts) + " — LUME by Mark"

    price = prop.get("price")
    price_text = _format_price(price)
    bedrooms = prop.get("bedrooms")
    area = prop.get("area_sqm")

    # Build description from specs
    desc_parts = [prop.get("ai_summary") or prop.get("description") or ""]
    spec_bits = []
    if bedrooms:
        spec_bits.append(f"{bedrooms} bedrooms")
    if area:
        spec_bits.append(f"{area}m²")
    spec_bits.append(price_text)
    if spec_bits and not desc_parts[0]:
        desc_parts = [f"Luxury property in {city}. {' · '.join(spec_bits)}."]

    description = desc_parts[0] if desc_parts else DEFAULT_DESCRIPTION
    image = _image_url(prop)

    jsonld = _jsonld_real_estate_listing(prop, url)
    seo_content = _seo_content_property(prop)

    return _replace_placeholders(
        html,
        title=title,
        description=description,
        og_type="article",  # og:type "article" works for listings too
        url=url,
        image=image,
        jsonld=jsonld,
        seo_content=seo_content,
    )


def _build_properties_seo(html: str) -> str:
    url = f"{SITE_URL}/properties"
    properties = _fetch_properties_list()

    title = "Luxury Properties in Portugal — LUME by Mark"
    description = (
        "Browse curated luxury real estate across Lisbon, Porto, Cascais, "
        "Algarve, and Portugal's most desirable addresses."
    )
    image = _image_url(properties[0]) if properties else DEFAULT_OG_IMAGE

    jsonld = _jsonld_item_list(properties, title, url)
    seo_content = _seo_content_properties_list(properties)

    return _replace_placeholders(
        html,
        title=title,
        description=description,
        url=url,
        image=image,
        jsonld=jsonld,
        seo_content=seo_content,
    )


def _build_location_seo(html: str, params: dict) -> str:
    slug = params["slug"]
    url = f"{SITE_URL}/locations/{slug}"
    loc = _fetch_location(slug)

    if not loc:
        display_name = slug.replace("-", " ").title()
        return _replace_placeholders(
            html,
            title=f"Properties in {display_name} — LUME by Mark",
            url=url,
        )

    name = loc.get("name") or slug.replace("-", " ").title()
    title = f"Luxury Properties in {name}, Portugal — LUME by Mark"
    description = loc.get("description") or (
        f"Explore curated luxury real estate in {name}, Portugal. "
        f"Handpicked properties by LUME by Mark."
    )
    properties = loc.get("properties") or []

    jsonld = _jsonld_item_list(properties, title, url)
    seo_content = _seo_content_location(loc, properties)

    return _replace_placeholders(
        html,
        title=title,
        description=description,
        url=url,
        jsonld=jsonld,
        seo_content=seo_content,
    )


def _build_service_seo(html: str, params: dict) -> str:
    slug = params["slug"]
    url = f"{SITE_URL}/services/{slug}"
    svc = _fetch_service(slug)

    if not svc:
        display_name = slug.replace("-", " ").title()
        return _replace_placeholders(
            html,
            title=f"{display_name} — LUME by Mark",
            url=url,
        )

    title = f"{svc.get('title', '')} — LUME by Mark"
    description = svc.get("description") or DEFAULT_DESCRIPTION

    jsonld = _jsonld_service(svc, url)

    return _replace_placeholders(
        html,
        title=title,
        description=description,
        url=url,
        jsonld=jsonld,
    )


def _build_home_seo(html: str) -> str:
    properties = _fetch_properties_list()

    jsonld = _jsonld_organization()
    seo_content = _seo_content_home(properties)

    return _replace_placeholders(
        html,
        jsonld=jsonld,
        seo_content=seo_content,
    )


# Static page metadata
_STATIC_META: Dict[str, Tuple[str, str]] = {
    "about": (
        "About — LUME by Mark",
        "Meet LUME by Mark — homes, lifestyle management, "
        "and art & antiques advisory in Portugal.",
    ),
    "contact": (
        "Contact — LUME by Mark",
        "Get in touch with LUME by Mark. Homes, life in Portugal, "
        "and art & antiques advisory.",
    ),
    "services": (
        "Services — LUME by Mark",
        "Lifestyle management, art & antiques advisory, and concierge services. "
        "LUME by Mark handles every detail of your life in Portugal.",
    ),
    "investment": (
        "Investment — LUME by Mark",
        "Strategic property investment in Portugal. Investment homes, second homes, "
        "and development opportunities curated by LUME by Mark.",
    ),
    "privacy": (
        "Privacy Policy — LUME by Mark",
        "Privacy policy for LUME by Mark (lumebymark.com).",
    ),
}


def _build_static_seo(html: str, page_type: str) -> str:
    title, description = _STATIC_META.get(
        page_type, (DEFAULT_TITLE, DEFAULT_DESCRIPTION)
    )
    url = f"{SITE_URL}/{page_type}"
    return _replace_placeholders(html, title=title, description=description, url=url)


# ---------------------------------------------------------------------------
# Public API — called from main.py on every request
# ---------------------------------------------------------------------------


def inject_seo(html_template: str, path: str) -> str:
    """
    Replace placeholders in HTML template with actual SEO data.

    Args:
        html_template: Raw index.html content with __PLACEHOLDER__ strings
        path: Request URL path (e.g., "/properties/riverfront-penthouse-lisbon")

    Returns:
        HTML string with all placeholders replaced
    """
    try:
        page_type, params = _parse_route(path)

        if page_type == "property":
            return _build_property_seo(html_template, params)
        if page_type == "properties":
            return _build_properties_seo(html_template)
        if page_type == "location":
            return _build_location_seo(html_template, params)
        if page_type == "service":
            return _build_service_seo(html_template, params)
        if page_type == "home":
            return _build_home_seo(html_template)
        if page_type in _STATIC_META:
            return _build_static_seo(html_template, page_type)

        # Unknown route — use defaults
        return _replace_with_defaults(html_template, path)

    except Exception as e:
        print(f"[SEO] Error injecting SEO for {path}: {e}")
        return _replace_with_defaults(html_template, path)
