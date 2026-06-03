"""
Journal articles (News + Memorandum) — public + admin routes.

Public:
    GET  /api/journal                List published articles (filter by type).
    GET  /api/journal/{slug}         Single published article.

Admin (require_admin):
    GET    /api/admin/journal
    POST   /api/admin/journal
    GET    /api/admin/journal/{id}
    PUT    /api/admin/journal/{id}
    DELETE /api/admin/journal/{id}
    POST   /api/admin/journal/{id}/translate         DeepL plain-text fields.
    POST   /api/admin/journal/{id}/translate-body    DeepL the Tiptap doc.
    POST   /api/admin/journal/upload-image           Multipart image upload.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from pydantic import BaseModel

from auth import require_admin
from routes.translations import _deepl_translate, _LOCALES


router = APIRouter(tags=["journal"])

_JOURNAL_TRANSLATABLE = ("kicker", "title", "subtitle", "excerpt")
_MAX_UPLOAD_BYTES = 8 * 1024 * 1024  # 8 MB


# ═══════════════════════════════════════════════════════════════════════════
# PUBLIC
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/api/journal")
async def list_journal_public(
    type: Optional[str] = Query(None, pattern="^(news|memorandum)$"),
    locale: str = Query("en"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    from database import public_list_journal
    return public_list_journal(type_=type, locale=locale, limit=limit, offset=offset)


@router.get("/api/journal/{slug}")
async def get_journal_public(slug: str, locale: str = Query("en")):
    from database import public_get_journal_by_slug
    article = public_get_journal_by_slug(slug, locale=locale)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return article


# ═══════════════════════════════════════════════════════════════════════════
# ADMIN — CRUD
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/api/admin/journal")
async def admin_journal_list(
    status: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    admin=Depends(require_admin),
):
    from database import admin_list_journal
    return admin_list_journal(
        status=status, type_=type, search=search, limit=limit, offset=offset
    )


@router.get("/api/admin/journal/{article_id}")
async def admin_journal_get(article_id: str, admin=Depends(require_admin)):
    from database import admin_get_journal
    article = admin_get_journal(article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return article


@router.post("/api/admin/journal", status_code=201)
async def admin_journal_create(body: dict, admin=Depends(require_admin)):
    from database import admin_create_journal
    if not body.get("title"):
        raise HTTPException(status_code=422, detail="title is required")
    try:
        row = admin_create_journal(body)
        if not row:
            raise HTTPException(status_code=500, detail="Failed to create article")
        return row
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/api/admin/journal/{article_id}")
async def admin_journal_update(
    article_id: str, body: dict, admin=Depends(require_admin)
):
    from database import admin_update_journal
    if not body:
        raise HTTPException(status_code=422, detail="Empty body")
    row = admin_update_journal(article_id, body)
    if not row:
        raise HTTPException(status_code=404, detail="Article not found")
    return row


@router.delete("/api/admin/journal/{article_id}")
async def admin_journal_delete(article_id: str, admin=Depends(require_admin)):
    from database import admin_delete_journal
    if not admin_delete_journal(article_id):
        raise HTTPException(status_code=404, detail="Article not found")
    return {"detail": "Article deleted"}


# ═══════════════════════════════════════════════════════════════════════════
# ADMIN — translate plain-text fields (title / kicker / subtitle / excerpt)
# ═══════════════════════════════════════════════════════════════════════════

class JournalFieldTranslateRequest(BaseModel):
    field: str                    # one of _JOURNAL_TRANSLATABLE
    source_locale: str = "en"
    overwrite: bool = False


@router.post("/api/admin/journal/{article_id}/translate")
async def admin_journal_translate_field(
    article_id: str,
    body: JournalFieldTranslateRequest,
    admin=Depends(require_admin),
):
    from database import admin_get_journal, admin_update_journal

    if body.field not in _JOURNAL_TRANSLATABLE:
        raise HTTPException(
            status_code=422,
            detail=f"Field '{body.field}' is not translatable. "
                   f"Choose from: {', '.join(_JOURNAL_TRANSLATABLE)}",
        )
    if body.source_locale not in _LOCALES:
        raise HTTPException(
            status_code=422, detail=f"Invalid source_locale '{body.source_locale}'."
        )

    article = admin_get_journal(article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    if body.source_locale == "en":
        src_text = (article.get(body.field) or "").strip()
    else:
        i18n = article.get(f"{body.field}_i18n") or {}
        src_text = (i18n.get(body.source_locale) or "").strip()
    if not src_text:
        raise HTTPException(
            status_code=422,
            detail=f"No text found in '{body.field}' for locale '{body.source_locale}'.",
        )

    current_i18n = dict(article.get(f"{body.field}_i18n") or {})
    updates: dict = {}

    for target in _LOCALES:
        if target == body.source_locale:
            continue
        if target == "en":
            existing = (article.get(body.field) or "").strip()
        else:
            existing = (current_i18n.get(target) or "").strip()
        if not body.overwrite and existing:
            continue

        translated = _deepl_translate(src_text, source=body.source_locale, target=target)
        if target == "en":
            updates[body.field] = translated
        else:
            current_i18n[target] = translated

    updates[f"{body.field}_i18n"] = current_i18n
    updated = admin_update_journal(article_id, updates)
    return updated or article


# ═══════════════════════════════════════════════════════════════════════════
# ADMIN — translate the rich-text body (Tiptap JSON)
# ═══════════════════════════════════════════════════════════════════════════

class JournalBodyTranslateRequest(BaseModel):
    source_locale: str = "en"
    overwrite: bool = False


def _collect_text_nodes(node: Any, out: List[Dict[str, Any]]) -> None:
    """Walk a Tiptap JSON document and collect references to text nodes."""
    if not isinstance(node, dict):
        return
    if node.get("type") == "text" and isinstance(node.get("text"), str):
        out.append(node)
    for child in node.get("content") or []:
        _collect_text_nodes(child, out)


def _translate_doc(doc: Any, source: str, target: str) -> Any:
    """Deep-copy a Tiptap doc and translate every text node via DeepL."""
    import copy
    if not isinstance(doc, dict):
        return doc
    translated_doc = copy.deepcopy(doc)
    text_nodes: List[Dict[str, Any]] = []
    _collect_text_nodes(translated_doc, text_nodes)
    for node in text_nodes:
        original = node.get("text") or ""
        if not original.strip():
            continue
        node["text"] = _deepl_translate(original, source=source, target=target)
    return translated_doc


@router.post("/api/admin/journal/{article_id}/translate-body")
async def admin_journal_translate_body(
    article_id: str,
    body: JournalBodyTranslateRequest,
    admin=Depends(require_admin),
):
    from database import admin_get_journal, admin_update_journal

    if body.source_locale not in _LOCALES:
        raise HTTPException(
            status_code=422, detail=f"Invalid source_locale '{body.source_locale}'."
        )

    article = admin_get_journal(article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    if body.source_locale == "en":
        src_doc = article.get("body") or {}
    else:
        src_doc = (article.get("body_i18n") or {}).get(body.source_locale) or {}

    if not isinstance(src_doc, dict) or not src_doc.get("content"):
        raise HTTPException(
            status_code=422,
            detail=f"No body content found for locale '{body.source_locale}'.",
        )

    current_i18n = dict(article.get("body_i18n") or {})
    updates: dict = {}

    for target in _LOCALES:
        if target == body.source_locale:
            continue
        if target == "en":
            existing = article.get("body") or {}
            is_empty = not (isinstance(existing, dict) and existing.get("content"))
        else:
            existing = current_i18n.get(target) or {}
            is_empty = not (isinstance(existing, dict) and existing.get("content"))
        if not body.overwrite and not is_empty:
            continue

        translated = _translate_doc(src_doc, source=body.source_locale, target=target)
        if target == "en":
            updates["body"] = translated
        else:
            current_i18n[target] = translated

    updates["body_i18n"] = current_i18n
    updated = admin_update_journal(article_id, updates)
    return updated or article


# ═══════════════════════════════════════════════════════════════════════════
# ADMIN — image upload (cover image + inline images in the editor)
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/api/admin/journal/upload-image")
async def admin_journal_upload_image(
    file: UploadFile = File(...),
    admin=Depends(require_admin),
):
    from database import admin_upload_journal_image

    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(status_code=422, detail="File must be an image")

    contents = await file.read()
    if len(contents) > _MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Image exceeds {_MAX_UPLOAD_BYTES // (1024 * 1024)} MB limit",
        )

    try:
        result = admin_upload_journal_image(
            file_bytes=contents,
            filename=file.filename or "image",
            content_type=file.content_type,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {e}")
    return result
