# backend/routes/translations.py
"""
Translation + team-member endpoints.

Public:
    GET  /api/translations                List all translations (optionally
                                          filtered by ?namespace=).  The
                                          frontend fetches this once at boot.
    GET  /api/team                        Active team members for the About
                                          page.

Admin (require_admin):
    GET    /api/admin/translations
    POST   /api/admin/translations        Upsert keyed on (namespace, key)
    PUT    /api/admin/translations/:id
    DELETE /api/admin/translations/:id
    POST   /api/admin/translations/:id/translate
                                          Detect the source language from
                                          which fields are populated, call
                                          DeepL, fill in the missing locales,
                                          persist, and return the row.

    GET    /api/admin/team
    POST   /api/admin/team
    PUT    /api/admin/team/:id
    DELETE /api/admin/team/:id

    POST   /api/admin/listings/:id/translate
                                          Translate a single field of a listing
                                          (title, short_description, etc.)
                                          to all other locales via DeepL.
                                          Writes results into <field>_i18n JSONB.

    POST   /api/admin/services/:id/translate
                                          Same for services (title,
                                          description).
"""

from __future__ import annotations

import os
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from auth import require_admin


router = APIRouter(tags=["translations"])

# --- Locale → DeepL language code -------------------------------------------
_DEEPL_SOURCE = {
    "en":    "EN",
    "es":    "ES",
    "ru":    "RU",
    "pt_pt": "PT",
}
_DEEPL_TARGET = {
    "en":    "EN-US",
    "es":    "ES",
    "ru":    "RU",
    "pt_pt": "PT-PT",
}
_LOCALES = ("en", "pt_pt", "ru", "es")

# Fields that can be auto-translated on each table
_LISTING_TRANSLATABLE = ("title", "short_description", "full_description", "ai_summary")
_SERVICE_TRANSLATABLE = ("title", "description")


# ═══════════════════════════════════════════════════════════════════════════
# SHARED DEEPL HELPER
# ═══════════════════════════════════════════════════════════════════════════

def _deepl_translate(text: str, source: str, target: str) -> str:
    api_key = os.getenv("DEEPL_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="DEEPL_API_KEY is not configured on the server.",
        )
    base = (
        "https://api-free.deepl.com/v2/translate"
        if api_key.endswith(":fx")
        else "https://api.deepl.com/v2/translate"
    )
    try:
        resp = httpx.post(
            base,
            data={
                "text": text,
                "source_lang": _DEEPL_SOURCE[source],
                "target_lang": _DEEPL_TARGET[target],
                "preserve_formatting": "1",
            },
            headers={"Authorization": f"DeepL-Auth-Key {api_key}"},
            timeout=20.0,
        )
        resp.raise_for_status()
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"DeepL request failed: {e}")
    payload = resp.json()
    translations = payload.get("translations") or []
    if not translations:
        raise HTTPException(status_code=502, detail="DeepL returned no translations")
    return translations[0].get("text", "")


# ═══════════════════════════════════════════════════════════════════════════
# PUBLIC
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/api/translations")
async def list_translations_public(namespace: Optional[str] = Query(None)):
    """Return all translations the site needs to render."""
    from database import public_list_translations
    return {"translations": public_list_translations(namespace=namespace)}


@router.get("/api/team")
async def list_team_public():
    """Active team members for the About page."""
    from database import public_list_team
    return {"team": public_list_team()}


# ═══════════════════════════════════════════════════════════════════════════
# ADMIN — translations table (static site copy)
# ═══════════════════════════════════════════════════════════════════════════

class TranslationIn(BaseModel):
    namespace: str
    key: str
    en: Optional[str] = None
    pt_pt: Optional[str] = None
    ru: Optional[str] = None
    es: Optional[str] = None


@router.get("/api/admin/translations")
async def admin_translations_list(
    namespace: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    admin=Depends(require_admin),
):
    from database import admin_list_translations
    return {"translations": admin_list_translations(namespace=namespace, search=search)}


@router.post("/api/admin/translations", status_code=201)
async def admin_translations_upsert(body: TranslationIn, admin=Depends(require_admin)):
    """Create or update a translation row keyed on (namespace, key)."""
    from database import admin_upsert_translation
    try:
        row = admin_upsert_translation(body.model_dump())
        if not row:
            raise HTTPException(status_code=500, detail="Failed to save translation")
        return row
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/api/admin/translations/{translation_id}")
async def admin_translations_update(
    translation_id: str, body: dict, admin=Depends(require_admin)
):
    from database import admin_update_translation
    if not body:
        raise HTTPException(status_code=422, detail="Empty body")
    row = admin_update_translation(translation_id, body)
    if not row:
        raise HTTPException(status_code=404, detail="Translation not found")
    return row


@router.delete("/api/admin/translations/{translation_id}")
async def admin_translations_delete(
    translation_id: str, admin=Depends(require_admin)
):
    from database import admin_delete_translation
    success = admin_delete_translation(translation_id)
    if not success:
        raise HTTPException(status_code=404, detail="Translation not found")
    return {"detail": "Translation deleted"}


# ─── DeepL fan-out for static translations table ─────────────────────────────

class TranslateRequest(BaseModel):
    source: Optional[str] = None  # "en" | "pt_pt" | "ru" | "es"; auto-detect if None
    overwrite: bool = False        # if False, only fill empty locales


@router.post("/api/admin/translations/{translation_id}/translate")
async def admin_translate_row(
    translation_id: str,
    body: TranslateRequest = TranslateRequest(),
    admin=Depends(require_admin),
):
    """
    Take the source-language text from a translation row, run it through
    DeepL into every other supported locale, save the row, and return it.
    """
    from database import admin_get_translation, admin_update_translation

    row = admin_get_translation(translation_id)
    if not row:
        raise HTTPException(status_code=404, detail="Translation not found")

    source = body.source
    if source not in _LOCALES:
        source = next(
            (loc for loc in ("en", *(l for l in _LOCALES if l != "en"))
             if (row.get(loc) or "").strip()),
            None,
        )
    if not source:
        raise HTTPException(
            status_code=422,
            detail="No source text to translate from. Fill in at least one locale.",
        )

    src_text = (row.get(source) or "").strip()
    if not src_text:
        raise HTTPException(
            status_code=422,
            detail=f"Source locale '{source}' is empty.",
        )

    updates: dict = {}
    for target in _LOCALES:
        if target == source:
            continue
        if not body.overwrite and (row.get(target) or "").strip():
            continue
        updates[target] = _deepl_translate(src_text, source=source, target=target)

    if not updates:
        return row

    updated = admin_update_translation(translation_id, updates)
    return updated or row


# ═══════════════════════════════════════════════════════════════════════════
# ADMIN — team members
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/api/admin/team")
async def admin_team_list(admin=Depends(require_admin)):
    from database import admin_list_team
    return {"team": admin_list_team()}


@router.post("/api/admin/team", status_code=201)
async def admin_team_create(body: dict, admin=Depends(require_admin)):
    from database import admin_create_team_member
    try:
        row = admin_create_team_member(body)
        if not row:
            raise HTTPException(status_code=500, detail="Failed to create team member")
        return row
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/api/admin/team/{member_id}")
async def admin_team_update(member_id: str, body: dict, admin=Depends(require_admin)):
    from database import admin_update_team_member
    row = admin_update_team_member(member_id, body)
    if not row:
        raise HTTPException(status_code=404, detail="Team member not found")
    return row


@router.delete("/api/admin/team/{member_id}")
async def admin_team_delete(member_id: str, admin=Depends(require_admin)):
    from database import admin_delete_team_member
    success = admin_delete_team_member(member_id)
    if not success:
        raise HTTPException(status_code=404, detail="Team member not found")
    return {"detail": "Team member deleted"}


# ═══════════════════════════════════════════════════════════════════════════
# ADMIN — stateless text translation (no DB write — used by new-listing form)
# ═══════════════════════════════════════════════════════════════════════════

class TextTranslateRequest(BaseModel):
    text: str
    source_locale: str = "en"


@router.post("/api/admin/translate-text")
async def translate_text(body: TextTranslateRequest, admin=Depends(require_admin)):
    """
    Translate raw text to every other supported locale via DeepL, without
    touching the database. Returns {"translations": {pt_pt, ru, es, en}} —
    the source locale is omitted from the result.
    """
    source = body.source_locale
    if source not in _LOCALES:
        raise HTTPException(status_code=422, detail=f"Invalid source_locale '{source}'.")

    src_text = (body.text or "").strip()
    if not src_text:
        raise HTTPException(status_code=422, detail="No source text provided.")

    translations: dict[str, str] = {}
    for target in _LOCALES:
        if target == source:
            continue
        translations[target] = _deepl_translate(src_text, source=source, target=target)
    return {"translations": translations}


# ═══════════════════════════════════════════════════════════════════════════
# ADMIN — translate listing fields (JSONB _i18n columns)
# ═══════════════════════════════════════════════════════════════════════════

class FieldTranslateRequest(BaseModel):
    field: str                    # "title" | "short_description" | "full_description" | "ai_summary"
    source_locale: str = "en"    # which locale holds the source text
    overwrite: bool = False       # if False, skip locales that already have text


@router.post("/api/admin/listings/{listing_id}/translate")
async def translate_listing_field(
    listing_id: str,
    body: FieldTranslateRequest,
    admin=Depends(require_admin),
):
    """
    Translate one text field of a listing to all other locales via DeepL.

    - English text lives in the base column (e.g. listing.title).
    - Other locales are stored in listing.title_i18n as
      {"pt_pt": "...", "ru": "...", "es": "..."}.
    - If source_locale is "en", reads from the base column.
    - If source_locale is "ru"/"es"/"pt_pt", reads from the _i18n column.
    - After translation, writes results back to the appropriate column.
    - Returns the full updated listing row.
    """
    from database import admin_get_listing, admin_update_listing

    if body.field not in _LISTING_TRANSLATABLE:
        raise HTTPException(
            status_code=422,
            detail=f"Field '{body.field}' is not translatable. "
                   f"Choose from: {', '.join(_LISTING_TRANSLATABLE)}",
        )

    source = body.source_locale
    if source not in _LOCALES:
        raise HTTPException(status_code=422, detail=f"Invalid source_locale '{source}'.")

    listing = admin_get_listing(listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    # Read source text
    if source == "en":
        src_text = (listing.get(body.field) or "").strip()
    else:
        i18n = listing.get(f"{body.field}_i18n") or {}
        src_text = (i18n.get(source) or "").strip()

    if not src_text:
        raise HTTPException(
            status_code=422,
            detail=f"No text found in '{body.field}' for locale '{source}'. "
                   "Fill it in first, then translate.",
        )

    # Current i18n state
    current_i18n = dict(listing.get(f"{body.field}_i18n") or {})
    db_updates: dict = {}

    for target in _LOCALES:
        if target == source:
            continue
        # Check if already filled
        if target == "en":
            existing = (listing.get(body.field) or "").strip()
        else:
            existing = (current_i18n.get(target) or "").strip()

        if not body.overwrite and existing:
            continue  # don't overwrite existing translations

        translated = _deepl_translate(src_text, source=source, target=target)

        if target == "en":
            db_updates[body.field] = translated
        else:
            current_i18n[target] = translated

    # Always persist the i18n dict (even if unchanged, keeps it clean)
    db_updates[f"{body.field}_i18n"] = current_i18n

    updated = admin_update_listing(listing_id, db_updates)
    return updated or listing


# ═══════════════════════════════════════════════════════════════════════════
# ADMIN — translate service fields (JSONB _i18n columns)
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/api/admin/services/{service_id}/translate")
async def translate_service_field(
    service_id: str,
    body: FieldTranslateRequest,
    admin=Depends(require_admin),
):
    """
    Translate one text field of a service to all other locales via DeepL.

    Translatable fields: title, description.
    English lives in the base column; other locales in <field>_i18n JSONB.
    Returns the full updated service row.
    """
    from database import admin_get_service, admin_update_service

    if body.field not in _SERVICE_TRANSLATABLE:
        raise HTTPException(
            status_code=422,
            detail=f"Field '{body.field}' is not translatable. "
                   f"Choose from: {', '.join(_SERVICE_TRANSLATABLE)}",
        )

    source = body.source_locale
    if source not in _LOCALES:
        raise HTTPException(status_code=422, detail=f"Invalid source_locale '{source}'.")

    service = admin_get_service(service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    if source == "en":
        src_text = (service.get(body.field) or "").strip()
    else:
        i18n = service.get(f"{body.field}_i18n") or {}
        src_text = (i18n.get(source) or "").strip()

    if not src_text:
        raise HTTPException(
            status_code=422,
            detail=f"No text found in '{body.field}' for locale '{source}'. "
                   "Fill it in first, then translate.",
        )

    current_i18n = dict(service.get(f"{body.field}_i18n") or {})
    db_updates: dict = {}

    for target in _LOCALES:
        if target == source:
            continue
        if target == "en":
            existing = (service.get(body.field) or "").strip()
        else:
            existing = (current_i18n.get(target) or "").strip()

        if not body.overwrite and existing:
            continue

        translated = _deepl_translate(src_text, source=source, target=target)

        if target == "en":
            db_updates[body.field] = translated
        else:
            current_i18n[target] = translated

    db_updates[f"{body.field}_i18n"] = current_i18n

    updated = admin_update_service(service_id, db_updates)
    return updated or service