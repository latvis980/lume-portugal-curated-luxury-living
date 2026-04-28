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
# DeepL accepts BCP-47-style codes; for source it expects the bare language
# (EN, ES, RU, PT) and for target it accepts EN-US, PT-BR, etc.
_DEEPL_SOURCE = {
    "en":    "EN",
    "es":    "ES",
    "ru":    "RU",
    "pt_br": "PT",
}
_DEEPL_TARGET = {
    "en":    "EN-US",
    "es":    "ES",
    "ru":    "RU",
    "pt_br": "PT-BR",
}
_LOCALES = ("en", "pt_br", "ru", "es")


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
# ADMIN — translations
# ═══════════════════════════════════════════════════════════════════════════

class TranslationIn(BaseModel):
    namespace: str
    key: str
    en: Optional[str] = None
    pt_br: Optional[str] = None
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


# ─── DeepL fan-out ──────────────────────────────────────────────────────────

class TranslateRequest(BaseModel):
    source: Optional[str] = None  # "en" | "pt_br" | "ru" | "es"; auto-detect if None
    overwrite: bool = False        # if False, only fill empty locales


def _deepl_translate(text: str, source: str, target: str) -> str:
    api_key = os.getenv("DEEPL_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="DEEPL_API_KEY is not configured on the server.",
        )
    # DeepL has both .com (paid) and api-free.deepl.com (free) endpoints.
    # Free keys end with ":fx".
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
        # Auto-detect: pick the first populated locale, prefer English.
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
        return row  # nothing to do

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
