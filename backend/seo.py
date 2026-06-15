# backend/seo.py
"""
SEO injection module for LUME by Mark.

Replaces placeholder strings in the HTML template with dynamic meta tags,
JSON-LD structured data, canonical + hreflang links, and a VISIBLE
server-rendered content snapshot based on the requested URL.

The snapshot is injected INSIDE `<div id="root">` as real, visible markup
(no `display:none`). Because the SPA boots with `createRoot().render()`
(not `hydrateRoot`), React discards the snapshot and re-renders the app on
mount — so crawlers and no-JS users get real content, humans get the app,
and the content shown to crawlers matches what users see (no cloaking).

Localised routing: URLs may be prefixed with `/pt`, `/ru`, `/es` (English at
root). Every page emits a self-canonical and reciprocal hreflang alternates.
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
DEFAULT_OG_IMAGE_ALT = "LUME by Mark — luxury homes in Portugal"

# ---------------------------------------------------------------------------
# Locale model — URL prefix <-> internal locale code
# ---------------------------------------------------------------------------

ALL_LOCALES = ["en", "pt_pt", "ru", "es"]
URL_LOCALES = {"pt": "pt_pt", "ru": "ru", "es": "es"}          # url segment -> locale
LOCALE_TO_URL = {"pt_pt": "pt", "ru": "ru", "es": "es", "en": ""}  # locale -> url prefix
LOCALE_BCP47 = {"en": "en", "pt_pt": "pt-PT", "ru": "ru", "es": "es"}
OG_LOCALE = {"en": "en_US", "pt_pt": "pt_PT", "ru": "ru_RU", "es": "es_ES"}


def _locale_prefix(locale: str) -> str:
    seg = LOCALE_TO_URL.get(locale, "")
    return f"/{seg}" if seg else ""


def _abs_url(locale: str, rest: str) -> str:
    """Absolute URL for `rest` (a path beginning with '/') in `locale`."""
    prefix = _locale_prefix(locale)
    if rest == "/":
        return f"{SITE_URL}{prefix}" if prefix else SITE_URL
    return f"{SITE_URL}{prefix}{rest}"


def _strip_locale_prefix(path: str) -> Tuple[str, str]:
    """Split a request path into (locale, rest_without_prefix)."""
    path = path or "/"
    segments = path.strip("/").split("/")
    if segments and segments[0] in URL_LOCALES:
        locale = URL_LOCALES[segments[0]]
        rest = "/" + "/".join(segments[1:])
        return locale, rest.rstrip("/") or "/"
    return "en", path.rstrip("/") or "/"


# ---------------------------------------------------------------------------
# Section / landing pages — region x type (curated)
#
# This mirrors frontend/src/config/sectionPages.ts. The parity test
# frontend/src/test/sectionPages.test.ts fails the build if the slug sets
# diverge. Region slugs are a CLOSED SET checked before property-by-slug so
# server and client always agree on /properties/<seg>.
# ---------------------------------------------------------------------------

SECTION_REGIONS: Dict[str, str] = {
    "lisbon": "Lisbon",
    "algarve": "Algarve",
    "silver-coast": "Silver Coast",
    "porto": "Porto",
    "alentejo": "Alentejo",
}

# type_slug -> (property_types, plural noun, title prefix)
SECTION_TYPES: Dict[str, Tuple[List[str], str, str]] = {
    "apartments": (["apartment"], "apartments", "Luxury apartments in"),
    "villas": (["villa"], "villas", "Villas in"),
    "penthouses": (["penthouse"], "penthouses", "Penthouses in"),
    "townhouses": (["townhouse"], "townhouses", "Townhouses in"),
    "new-developments": (
        ["project_apartment", "project_villa"],
        "new developments",
        "New developments in",
    ),
}

# Curated set advertised in the sitemap / footer (routing itself is permissive).
CURATED_SECTIONS: List[Tuple[str, Optional[str]]] = [
    ("lisbon", None), ("algarve", None), ("silver-coast", None),
    ("porto", None), ("alentejo", None),
    ("lisbon", "apartments"), ("lisbon", "penthouses"),
    ("algarve", "villas"), ("algarve", "apartments"),
    ("silver-coast", "apartments"), ("silver-coast", "new-developments"),
    ("porto", "apartments"), ("alentejo", "villas"),
]

# ---------------------------------------------------------------------------
# In-memory cache
# ---------------------------------------------------------------------------

_cache: Dict[str, Tuple[Any, float]] = {}
CACHE_TTL_LISTINGS = 3600      # 1 hour for property listings
CACHE_TTL_PAGES = 86400        # 24 hours for static pages


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
# URL routing
# ---------------------------------------------------------------------------

_PROPERTY_RE = re.compile(r"^/properties/([a-z0-9-]+)$")
_SECTION_TYPE_RE = re.compile(r"^/properties/([a-z0-9-]+)/([a-z0-9-]+)$")
_JOURNAL_RE = re.compile(r"^/journal/([a-z0-9-]+)$")

STATIC_PAGES = {
    "/": "home",
    "/properties": "properties",
    "/journal": "journal",
    "/about": "about",
    "/about/team": "about_team",
    "/about/news": "about_news",
    "/contact": "contact",
    "/privacy": "privacy",
    "/investment": "investment",
}


def _parse_route(rest: str) -> Tuple[str, dict]:
    """Parse a locale-stripped path into (page_type, params)."""
    rest = rest.rstrip("/") or "/"

    if rest in STATIC_PAGES:
        return STATIC_PAGES[rest], {}

    # /properties/<region>/<type>  → section page
    m = _SECTION_TYPE_RE.match(rest)
    if m and m.group(1) in SECTION_REGIONS:
        return "section", {"region_slug": m.group(1), "type_slug": m.group(2)}

    # /properties/<seg> → section page if seg is a known region, else a listing
    m = _PROPERTY_RE.match(rest)
    if m:
        seg = m.group(1)
        if seg in SECTION_REGIONS:
            return "section", {"region_slug": seg, "type_slug": None}
        return "property", {"slug": seg}

    m = _JOURNAL_RE.match(rest)
    if m:
        return "article", {"slug": m.group(1)}

    return "other", {}


# ---------------------------------------------------------------------------
# Data fetchers
# ---------------------------------------------------------------------------


def _fetch_property(slug: str, locale: str) -> Optional[Dict[str, Any]]:
    cache_key = f"property:{locale}:{slug}"
    cached = _get_cached(cache_key)
    if cached is not None:
        return cached
    try:
        from database import get_property_by_slug
        prop = get_property_by_slug(slug, locale=locale)
        if prop:
            _set_cached(cache_key, prop)
        return prop
    except Exception as e:
        print(f"[SEO] Error fetching property {slug}: {e}")
        return None


def _fetch_properties_list(locale: str) -> List[Dict[str, Any]]:
    cache_key = f"properties:featured:{locale}"
    cached = _get_cached(cache_key)
    if cached is not None:
        return cached
    try:
        from database import get_featured_properties
        props = get_featured_properties(locale=locale) or []
        _set_cached(cache_key, props)
        return props
    except Exception as e:
        print(f"[SEO] Error fetching properties list: {e}")
        return []


def _fetch_section(region: str, property_types: Optional[List[str]], locale: str) -> List[Dict[str, Any]]:
    cache_key = f"section:{locale}:{region}:{','.join(property_types or [])}"
    cached = _get_cached(cache_key)
    if cached is not None:
        return cached
    try:
        from database import query_properties
        result = query_properties(
            locale=locale,
            region=region,
            property_types=property_types,
            sort_by="featured",
            limit=24,
        )
        items = result.get("items", [])
        _set_cached(cache_key, items)
        return items
    except Exception as e:
        print(f"[SEO] Error fetching section {region}/{property_types}: {e}")
        return []


def _fetch_journal_list(locale: str) -> List[Dict[str, Any]]:
    cache_key = f"journal:list:{locale}"
    cached = _get_cached(cache_key)
    if cached is not None:
        return cached
    try:
        from database import public_list_journal
        result = public_list_journal(locale=locale, limit=30)
        items = result.get("articles", [])
        _set_cached(cache_key, items)
        return items
    except Exception as e:
        print(f"[SEO] Error fetching journal list: {e}")
        return []


def _fetch_article(slug: str, locale: str) -> Optional[Dict[str, Any]]:
    cache_key = f"article:{locale}:{slug}"
    cached = _get_cached(cache_key)
    if cached is not None:
        return cached
    try:
        from database import public_get_journal_by_slug
        article = public_get_journal_by_slug(slug, locale=locale)
        if article:
            _set_cached(cache_key, article)
        return article
    except Exception as e:
        print(f"[SEO] Error fetching article {slug}: {e}")
        return None


# ---------------------------------------------------------------------------
# Image URL helper
# ---------------------------------------------------------------------------


def _image_url(item: Dict[str, Any], field: str = "cover_image") -> str:
    """Build an absolute image URL from a record's image field."""
    path = (
        item.get(field)
        or item.get("image_path")
        or item.get("image_url")
        or item.get("og_image")
        or ""
    )
    if not path:
        return DEFAULT_OG_IMAGE
    if path.startswith("http"):
        return path
    base = IMAGE_BASE_URL.rstrip("/")
    if base:
        return f"{base}/{path.lstrip('/')}"
    return f"{SITE_URL}/{path.lstrip('/')}"


# ---------------------------------------------------------------------------
# JSON-LD builders — Schema.org structured data
# ---------------------------------------------------------------------------


def _wrap_jsonld(data: dict) -> str:
    return (
        '<script type="application/ld+json">'
        + json.dumps(data, ensure_ascii=False)
        + "</script>"
    )


def _jsonld_organization() -> dict:
    return {
        "@context": "https://schema.org",
        "@type": "RealEstateAgent",
        "name": "LUME by Mark",
        "url": SITE_URL,
        "logo": f"{SITE_URL}/logo-footer-symbol.png",
        "image": DEFAULT_OG_IMAGE,
        "description": DEFAULT_DESCRIPTION,
        "telephone": "+351213212800",
        "areaServed": {"@type": "Country", "name": "Portugal"},
        "address": {
            "@type": "PostalAddress",
            "streetAddress": "Avenida da Liberdade 129, 7.º C",
            "postalCode": "1250-140",
            "addressLocality": "Lisboa",
            "addressCountry": "PT",
        },
    }


def _jsonld_website() -> dict:
    # NOTE: the WebSite SearchAction (sitelinks searchbox) is deprecated by
    # Google and no longer rendered, so it is intentionally omitted.
    return {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "LUME by Mark",
        "url": SITE_URL,
        "inLanguage": ["en", "pt-PT", "ru", "es"],
        "publisher": {"@type": "RealEstateAgent", "name": "LUME by Mark", "url": SITE_URL},
    }


def _jsonld_site_navigation(locale: str) -> dict:
    items = []
    for i, (href, name) in enumerate(_primary_nav(locale), 1):
        items.append({
            "@type": "SiteNavigationElement",
            "position": i,
            "name": name,
            "url": f"{SITE_URL}{href}",
        })
    return {"@context": "https://schema.org", "@type": "ItemList", "itemListElement": items}


def _jsonld_breadcrumb(crumbs: List[Tuple[str, str]]) -> dict:
    """crumbs: list of (name, absolute_url)."""
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": i, "name": name, "item": url}
            for i, (name, url) in enumerate(crumbs, 1)
        ],
    }


def _jsonld_real_estate_listing(prop: Dict[str, Any], url: str) -> dict:
    title = prop.get("title") or ""
    description = prop.get("ai_summary") or prop.get("description") or prop.get("short_description") or ""
    image = _image_url(prop)
    price = prop.get("price")
    currency = prop.get("currency", "EUR")
    city = prop.get("city") or ""
    region = prop.get("region") or ""
    address_text = prop.get("address") or (f"{city}, {region}" if city else "Portugal")

    ld: Dict[str, Any] = {
        "@context": "https://schema.org",
        "@type": "RealEstateListing",
        "name": title,
        "description": _truncate(description, 300),
        "url": url,
        "image": image,
        "datePosted": prop.get("published_at") or prop.get("created_at") or "",
    }
    if price:
        ld["offers"] = {
            "@type": "Offer",
            "price": price,
            "priceCurrency": currency,
            "availability": "https://schema.org/InStock",
        }
    additional = []
    for name, value, unit in (
        ("Bedrooms", prop.get("bedrooms"), None),
        ("Bathrooms", prop.get("bathrooms"), None),
        ("Floor area", prop.get("interior_living_area"), "MTK"),
    ):
        if value is not None:
            pv = {"@type": "PropertyValue", "name": name, "value": value}
            if unit:
                pv["unitCode"] = unit
            additional.append(pv)
    if additional:
        ld["additionalProperty"] = additional
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
    ld["provider"] = {"@type": "RealEstateAgent", "name": "LUME by Mark", "url": SITE_URL}
    return ld


def _jsonld_item_list(items: List[Dict[str, Any]], name: str, url: str, locale: str) -> dict:
    list_items = []
    for i, item in enumerate(items[:20], 1):
        slug = item.get("slug") or ""
        item_url = _abs_url(locale, f"/properties/{slug}") if slug else url
        list_items.append({
            "@type": "ListItem",
            "position": i,
            "url": item_url,
            "name": item.get("title") or "",
        })
    return {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": name,
        "url": url,
        "numberOfItems": len(items),
        "itemListElement": list_items,
    }


def _jsonld_article(article: Dict[str, Any], url: str, locale: str) -> dict:
    return {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": article.get("title") or "",
        "description": _truncate(article.get("subtitle") or "", 300),
        "image": _image_url(article),
        "url": url,
        "datePublished": article.get("published_at") or "",
        "dateModified": article.get("updated_at") or article.get("published_at") or "",
        "inLanguage": LOCALE_BCP47.get(locale, "en"),
        "author": {"@type": "Organization", "name": article.get("author") or "LUME by Mark"},
        "publisher": _jsonld_organization(),
    }


# ---------------------------------------------------------------------------
# Visible server-rendered snapshot (placed INSIDE #root)
# ---------------------------------------------------------------------------

_SSR_STYLE = (
    "<style>#seo-ssr{min-height:60vh;max-width:1100px;margin:0 auto;"
    "padding:7rem 1.5rem 3rem;font-family:'Cormorant Garamond',Georgia,serif;"
    "color:#1a1108;background:#f5f0ea}"
    "#seo-ssr a{color:#b04e1a;text-decoration:none}"
    "#seo-ssr h1{font-size:2.25rem;font-weight:300;margin:0 0 .5rem}"
    "#seo-ssr h2{font-size:1.25rem;font-weight:400;margin:0 0 1rem}"
    "#seo-ssr nav a{margin-right:1rem;font-size:.85rem;text-transform:uppercase;letter-spacing:.12em}"
    "#seo-ssr ul.cards{list-style:none;padding:0;display:grid;gap:1rem}"
    "#seo-ssr .intro{font-size:1.05rem;line-height:1.6;max-width:48rem}</style>"
)


def _primary_nav(locale: str) -> List[Tuple[str, str]]:
    """Primary internal links (href, label) — drives crawl + sitelinks."""
    p = _locale_prefix(locale)
    return [
        (f"{p}/properties", "Properties in Portugal"),
        (f"{p}/properties/lisbon", "Lisbon & Cascais"),
        (f"{p}/properties/algarve", "Algarve"),
        (f"{p}/properties/silver-coast", "Silver Coast"),
        (f"{p}/about", "About Us"),
        (f"{p}/journal", "About Portugal"),
    ]


def _ssr_nav(locale: str) -> str:
    links = "".join(
        f'<a href="{html_module.escape(href)}">{html_module.escape(label)}</a>'
        for href, label in _primary_nav(locale)
    )
    home = _locale_prefix(locale) or "/"
    return (
        f'<nav><a href="{home}"><strong>LUME by Mark</strong></a> {links}</nav>'
    )


def _ssr_wrap(inner: str, locale: str) -> str:
    if not inner:
        return ""
    return (
        f'{_SSR_STYLE}<div id="seo-ssr">{_ssr_nav(locale)}{inner}</div>'
    )


def _ssr_cards(items: List[Dict[str, Any]], locale: str, limit: int = 24) -> str:
    if not items:
        return ""
    esc = html_module.escape
    lis = []
    for p in items[:limit]:
        title = esc(p.get("title") or "")
        slug = esc(p.get("slug") or "")
        city = esc(p.get("city") or "")
        price = p.get("price")
        price_text = f" — €{price:,.0f}" if isinstance(price, (int, float)) else ""
        href = f'{_locale_prefix(locale)}/properties/{slug}'
        lis.append(
            f'<li><a href="{href}"><strong>{title}</strong></a>'
            f"<div>{city}{price_text}</div></li>"
        )
    return f'<ul class="cards">{"".join(lis)}</ul>'


# ---------------------------------------------------------------------------
# Formatting helpers
# ---------------------------------------------------------------------------


def _truncate(text: str, max_len: int = 160) -> str:
    if not text or len(text) <= max_len:
        return text or ""
    return text[: max_len - 1].rsplit(" ", 1)[0] + "…"


def _format_price(price: Any) -> str:
    if not price:
        return "Price on request"
    if isinstance(price, (int, float)):
        return f"€{price:,.0f}"
    return str(price)


# ---------------------------------------------------------------------------
# hreflang / canonical
# ---------------------------------------------------------------------------


def _alt_links(rest: str) -> str:
    """Build canonical-companion <link rel=alternate hreflang> block for `rest`."""
    links = []
    for loc in ALL_LOCALES:
        href = _abs_url(loc, rest)
        links.append(f'<link rel="alternate" hreflang="{LOCALE_BCP47[loc]}" href="{href}" />')
    links.append(f'<link rel="alternate" hreflang="x-default" href="{_abs_url("en", rest)}" />')
    return "".join(links)


def _og_locale_alternate(locale: str) -> str:
    return "".join(
        f'<meta property="og:locale:alternate" content="{OG_LOCALE[loc]}" />'
        for loc in ALL_LOCALES if loc != locale
    )


# ---------------------------------------------------------------------------
# Core replacement engine
# ---------------------------------------------------------------------------


def _replace_placeholders(
    html: str,
    *,
    locale: str = "en",
    rest: str = "/",
    title: str = DEFAULT_TITLE,
    description: str = DEFAULT_DESCRIPTION,
    og_type: str = "website",
    image: str = DEFAULT_OG_IMAGE,
    image_alt: str = DEFAULT_OG_IMAGE_ALT,
    jsonld: str = "",
    root_content: str = "",
) -> str:
    esc = html_module.escape
    canonical = _abs_url(locale, rest)
    replacements = {
        "__PAGE_TITLE__": esc(title),
        "__PAGE_DESCRIPTION__": esc(_truncate(description)),
        "__OG_TITLE__": esc(title),
        "__OG_DESCRIPTION__": esc(_truncate(description)),
        "__OG_TYPE__": esc(og_type),
        "__OG_URL__": esc(canonical),
        "__OG_IMAGE__": esc(image),
        "__OG_IMAGE_ALT__": esc(image_alt),
        "__OG_LOCALE__": OG_LOCALE.get(locale, "en_US"),
        "__OG_LOCALE_ALTERNATE__": _og_locale_alternate(locale),
        "__CANONICAL__": esc(canonical),
        "__HREFLANG__": _alt_links(rest),
        "__HTML_LANG__": LOCALE_BCP47.get(locale, "en"),
        "__JSON_LD__": jsonld,            # already safe (we build it ourselves)
        "__ROOT_CONTENT__": _ssr_wrap(root_content, locale),  # per-field escaped
    }
    for placeholder, value in replacements.items():
        html = html.replace(placeholder, value)
    return html


# ---------------------------------------------------------------------------
# Page-specific SEO builders
# ---------------------------------------------------------------------------


def _crumb(name: str, locale: str, rest: str) -> Tuple[str, str]:
    return (name, _abs_url(locale, rest))


def _build_property_seo(html: str, params: dict, locale: str, rest: str) -> str:
    slug = params["slug"]
    prop = _fetch_property(slug, locale)
    if not prop:
        return _replace_placeholders(html, locale=locale, rest=rest)

    city = prop.get("city") or ""
    region = prop.get("region") or ""
    title = " · ".join([prop.get("title") or "Property"] + ([city] if city else [])) + " — LUME by Mark"

    price_text = _format_price(prop.get("price"))
    spec_bits = []
    if prop.get("bedrooms"):
        spec_bits.append(f"{prop['bedrooms']} bedrooms")
    if prop.get("interior_living_area"):
        spec_bits.append(f"{prop['interior_living_area']}m²")
    spec_bits.append(price_text)
    description = prop.get("ai_summary") or prop.get("short_description") or (
        f"Luxury property in {city}. {' · '.join(spec_bits)}."
    )
    image = _image_url(prop)
    url = _abs_url(locale, rest)

    crumbs = [
        _crumb("Home", locale, "/"),
        _crumb("Properties", locale, "/properties"),
    ]
    if region:
        crumbs.append(_crumb(region, locale, "/properties"))
    crumbs.append((prop.get("title") or "Property", url))

    jsonld = _wrap_jsonld(_jsonld_real_estate_listing(prop, url)) + _wrap_jsonld(_jsonld_breadcrumb(crumbs))

    esc = html_module.escape
    inner_parts = [f"<h1>{esc(prop.get('title') or '')}</h1>"]
    loc_text = f"{city}, {region}" if city and region else city or region
    if loc_text:
        inner_parts.append(f"<h2>{esc(loc_text)}, Portugal</h2>")
    specs = " · ".join(
        x for x in [
            price_text,
            esc(prop.get("property_type") or ""),
            f"{prop['bedrooms']} bed" if prop.get("bedrooms") is not None else "",
            f"{prop['bathrooms']} bath" if prop.get("bathrooms") is not None else "",
            f"{prop['interior_living_area']} m²" if prop.get("interior_living_area") else "",
        ] if x
    )
    if specs:
        inner_parts.append(f"<p>{specs}</p>")
    body = prop.get("ai_summary") or prop.get("short_description") or ""
    if body:
        inner_parts.append(f'<p class="intro">{esc(body[:600])}</p>')
    inner_parts.append(f'<p><a href="{_locale_prefix(locale)}/properties">View all properties</a></p>')

    return _replace_placeholders(
        html, locale=locale, rest=rest, title=title, description=description,
        og_type="article", image=image, image_alt=f"{prop.get('title') or ''} — {loc_text}",
        jsonld=jsonld, root_content="".join(inner_parts),
    )


def _build_properties_seo(html: str, locale: str, rest: str) -> str:
    properties = _fetch_properties_list(locale)
    url = _abs_url(locale, rest)
    title = "Luxury Properties in Portugal — LUME by Mark"
    description = (
        "Browse curated luxury real estate across Lisbon, Porto, Cascais, "
        "Algarve, and Portugal's most desirable addresses."
    )
    image = _image_url(properties[0]) if properties else DEFAULT_OG_IMAGE
    crumbs = [_crumb("Home", locale, "/"), ("Properties", url)]
    jsonld = (
        _wrap_jsonld(_jsonld_item_list(properties, title, url, locale))
        + _wrap_jsonld(_jsonld_breadcrumb(crumbs))
    )
    inner = (
        "<h1>Luxury Properties in Portugal</h1>"
        "<p class=\"intro\">A curated selection of luxury homes across Lisbon, "
        "Porto, Cascais, the Algarve, the Silver Coast, and Alentejo.</p>"
        + _ssr_cards(properties, locale)
    )
    return _replace_placeholders(
        html, locale=locale, rest=rest, title=title, description=description,
        image=image, jsonld=jsonld, root_content=inner,
    )


def _build_section_seo(html: str, params: dict, locale: str, rest: str) -> str:
    region_slug = params["region_slug"]
    type_slug = params.get("type_slug")
    region = SECTION_REGIONS[region_slug]

    property_types = None
    type_noun = "properties"
    title_prefix = "Luxury properties in"
    if type_slug and type_slug in SECTION_TYPES:
        property_types, type_noun, title_prefix = SECTION_TYPES[type_slug]
    elif type_slug:
        # Unknown type under a known region — treat as bare region page.
        type_slug = None

    h1 = f"{title_prefix} {region}" if type_slug else f"Luxury properties in {region}, Portugal"
    title = f"{h1} — LUME by Mark"
    description = (
        f"Discover {type_noun} in {region}, Portugal — a curated selection of "
        f"luxury homes by LUME by Mark."
    )

    items = _fetch_section(region, property_types, locale)
    url = _abs_url(locale, rest)
    image = _image_url(items[0]) if items else f"{SITE_URL}/og-{region_slug}.png"

    crumbs = [
        _crumb("Home", locale, "/"),
        _crumb("Properties", locale, "/properties"),
        _crumb(region, locale, f"/properties/{region_slug}"),
    ]
    if type_slug:
        crumbs.append((type_noun.title(), url))

    jsonld = (
        _wrap_jsonld(_jsonld_item_list(items, h1, url, locale))
        + _wrap_jsonld(_jsonld_breadcrumb(crumbs))
    )
    inner = (
        f"<h1>{html_module.escape(h1)}</h1>"
        f'<p class="intro">{html_module.escape(description)}</p>'
        + _ssr_cards(items, locale)
    )
    return _replace_placeholders(
        html, locale=locale, rest=rest, title=title, description=description,
        image=image, image_alt=h1, jsonld=jsonld, root_content=inner,
    )


def _build_journal_index_seo(html: str, locale: str, rest: str) -> str:
    articles = _fetch_journal_list(locale)
    url = _abs_url(locale, rest)
    title = "About Portugal — Notes & Memoranda — LUME by Mark"
    description = (
        "Notes and memoranda on living, investing, and collecting in Portugal "
        "from LUME by Mark."
    )
    crumbs = [_crumb("Home", locale, "/"), ("About Portugal", url)]
    list_items = [
        {"@type": "ListItem", "position": i,
         "url": _abs_url(locale, f"/journal/{a.get('slug', '')}"),
         "name": a.get("title") or ""}
        for i, a in enumerate(articles[:20], 1)
    ]
    jsonld = (
        _wrap_jsonld({"@context": "https://schema.org", "@type": "ItemList",
                      "name": title, "url": url, "itemListElement": list_items})
        + _wrap_jsonld(_jsonld_breadcrumb(crumbs))
    )
    esc = html_module.escape
    lis = "".join(
        f'<li><a href="{_locale_prefix(locale)}/journal/{esc(a.get("slug") or "")}">'
        f'<strong>{esc(a.get("title") or "")}</strong></a></li>'
        for a in articles[:30]
    )
    inner = (
        "<h1>About Portugal</h1>"
        "<p class=\"intro\">Notes and memoranda on living, investing, and "
        "collecting in Portugal.</p>"
        f'<ul class="cards">{lis}</ul>'
    )
    return _replace_placeholders(
        html, locale=locale, rest=rest, title=title, description=description,
        jsonld=jsonld, root_content=inner,
    )


def _build_article_seo(html: str, params: dict, locale: str, rest: str) -> str:
    slug = params["slug"]
    article = _fetch_article(slug, locale)
    if not article:
        return _replace_placeholders(html, locale=locale, rest=rest)

    url = _abs_url(locale, rest)
    title = f"{article.get('title') or 'Article'} — LUME by Mark"
    description = article.get("subtitle") or DEFAULT_DESCRIPTION
    image = _image_url(article)
    crumbs = [
        _crumb("Home", locale, "/"),
        _crumb("About Portugal", locale, "/journal"),
        (article.get("title") or "Article", url),
    ]
    jsonld = (
        _wrap_jsonld(_jsonld_article(article, url, locale))
        + _wrap_jsonld(_jsonld_breadcrumb(crumbs))
    )
    esc = html_module.escape
    inner_parts = []
    if article.get("kicker"):
        inner_parts.append(f"<p>{esc(article['kicker'])}</p>")
    inner_parts.append(f"<h1>{esc(article.get('title') or '')}</h1>")
    if article.get("subtitle"):
        inner_parts.append(f'<p class="intro">{esc(article["subtitle"])}</p>')
    return _replace_placeholders(
        html, locale=locale, rest=rest, title=title, description=description,
        og_type="article", image=image, image_alt=article.get("title") or "",
        jsonld=jsonld, root_content="".join(inner_parts),
    )


def _build_home_seo(html: str, locale: str, rest: str) -> str:
    properties = _fetch_properties_list(locale)
    jsonld = (
        _wrap_jsonld(_jsonld_organization())
        + _wrap_jsonld(_jsonld_website())
        + _wrap_jsonld(_jsonld_site_navigation(locale))
    )
    title = DEFAULT_TITLE
    description = (
        "Your light to living in Portugal. LUME by Mark helps you find your home, "
        "build your life, and collect with meaning — curated luxury real estate "
        "across Lisbon, Porto, Cascais, the Algarve and beyond."
    )
    image = DEFAULT_OG_IMAGE
    image_alt = "LUME by Mark — your light to living in Portugal"
    inner = (
        "<h1>LUME by Mark — Homes, Life & Art Advisory in Portugal</h1>"
        "<p class=\"intro\">Your light to living in Portugal. LUME helps you find "
        "your home, build your life, and collect with meaning.</p>"
        + _ssr_cards(properties, locale, limit=10)
    )
    return _replace_placeholders(
        html, locale=locale, rest=rest, title=title, description=description,
        image=image, image_alt=image_alt, jsonld=jsonld, root_content=inner,
    )


# Static page metadata: page_type -> (title, description, h1)
_STATIC_META: Dict[str, Tuple[str, str, str]] = {
    "about": (
        "About — LUME by Mark",
        "Meet LUME by Mark — homes, lifestyle management, and art & antiques advisory in Portugal.",
        "A calm, precise way to enter life in Portugal",
    ),
    "about_team": (
        "Our Team — LUME by Mark",
        "Meet the team behind LUME by Mark — your curators for homes and life in Portugal.",
        "Our Team",
    ),
    "about_news": (
        "Company News — LUME by Mark",
        "The latest news and announcements from LUME by Mark.",
        "Company News",
    ),
    "contact": (
        "Contact — LUME by Mark",
        "Get in touch with LUME by Mark. Homes, life in Portugal, and art & antiques advisory.",
        "Contact LUME by Mark",
    ),
    "investment": (
        "Investment — LUME by Mark",
        "Strategic property investment in Portugal — investment homes, second homes, and developments.",
        "Investing in real estate in Portugal",
    ),
    "privacy": (
        "Privacy Policy — LUME by Mark",
        "Privacy policy for LUME by Mark (lumebymark.com).",
        "Privacy Policy",
    ),
}


def _build_static_seo(html: str, page_type: str, locale: str, rest: str) -> str:
    title, description, h1 = _STATIC_META.get(
        page_type, (DEFAULT_TITLE, DEFAULT_DESCRIPTION, "LUME by Mark")
    )
    crumbs = [_crumb("Home", locale, "/")]
    if page_type in ("about_team", "about_news"):
        crumbs.append(_crumb("About", locale, "/about"))
    crumbs.append((h1, _abs_url(locale, rest)))
    jsonld = _wrap_jsonld(_jsonld_breadcrumb(crumbs))
    inner = f"<h1>{html_module.escape(h1)}</h1><p class=\"intro\">{html_module.escape(description)}</p>"
    return _replace_placeholders(
        html, locale=locale, rest=rest, title=title, description=description,
        jsonld=jsonld, root_content=inner,
    )


# ---------------------------------------------------------------------------
# Public API — called from main.py on every request
# ---------------------------------------------------------------------------


def inject_seo(html_template: str, path: str) -> str:
    """Replace placeholders in the HTML template with SEO data for `path`."""
    try:
        locale, rest = _strip_locale_prefix(path)
        page_type, params = _parse_route(rest)

        if page_type == "property":
            return _build_property_seo(html_template, params, locale, rest)
        if page_type == "properties":
            return _build_properties_seo(html_template, locale, rest)
        if page_type == "section":
            return _build_section_seo(html_template, params, locale, rest)
        if page_type == "journal":
            return _build_journal_index_seo(html_template, locale, rest)
        if page_type == "article":
            return _build_article_seo(html_template, params, locale, rest)
        if page_type == "home":
            return _build_home_seo(html_template, locale, rest)
        if page_type in _STATIC_META:
            return _build_static_seo(html_template, page_type, locale, rest)

        # Unknown route — safe defaults (self-canonical to the requested path).
        return _replace_placeholders(html_template, locale=locale, rest=rest)

    except Exception as e:
        print(f"[SEO] Error injecting SEO for {path}: {e}")
        return _replace_placeholders(html_template)
