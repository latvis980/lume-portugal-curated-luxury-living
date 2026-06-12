"""
Collecting gallery media (homepage "Lume Signature Services" block).

Public:
    GET  /api/collecting-media           List active items in display order.

Admin (require_admin):
    GET    /api/admin/collecting-media
    POST   /api/admin/collecting-media
    PUT    /api/admin/collecting-media/reorder      Persist a new ordering.
    PUT    /api/admin/collecting-media/{id}
    DELETE /api/admin/collecting-media/{id}
    POST   /api/admin/collecting-media/{id}/translate   DeepL tag/label.
    POST   /api/admin/collecting-media/upload-image     Photo -> resized WebP.
    POST   /api/admin/collecting-media/upload-video     Clip -> muted MP4 + poster.
"""

from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from pydantic import BaseModel

from auth import require_admin
from routes.translations import _deepl_translate, _LOCALES


router = APIRouter(tags=["collecting"])

_COLLECTING_TRANSLATABLE = ("tag", "label")
_MAX_IMAGE_UPLOAD_BYTES = 8 * 1024 * 1024     # 8 MB
_MAX_VIDEO_UPLOAD_BYTES = 200 * 1024 * 1024   # 200 MB


# ═══════════════════════════════════════════════════════════════════════════
# PUBLIC
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/api/collecting-media")
async def list_collecting_public(locale: str = Query("en")):
    from database import public_list_collecting_media
    return {"items": public_list_collecting_media(locale=locale)}


# ═══════════════════════════════════════════════════════════════════════════
# ADMIN — CRUD
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/api/admin/collecting-media")
async def admin_collecting_list(admin=Depends(require_admin)):
    from database import admin_list_collecting_media
    return {"items": admin_list_collecting_media()}


@router.post("/api/admin/collecting-media", status_code=201)
async def admin_collecting_create(body: dict, admin=Depends(require_admin)):
    from database import admin_create_collecting_media
    if not body.get("src"):
        raise HTTPException(status_code=422, detail="src is required — upload the media first")
    if body.get("media_type") not in ("image", "video"):
        raise HTTPException(status_code=422, detail="media_type must be 'image' or 'video'")
    try:
        row = admin_create_collecting_media(body)
        if not row:
            raise HTTPException(status_code=500, detail="Failed to create gallery item")
        return row
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class CollectingReorderRequest(BaseModel):
    ids: List[str]  # item ids in the desired display order


@router.put("/api/admin/collecting-media/reorder")
async def admin_collecting_reorder(
    body: CollectingReorderRequest, admin=Depends(require_admin)
):
    from database import admin_list_collecting_media, admin_update_collecting_media
    if not body.ids:
        raise HTTPException(status_code=422, detail="ids must not be empty")
    for position, item_id in enumerate(body.ids):
        admin_update_collecting_media(item_id, {"sort_order": position})
    return {"items": admin_list_collecting_media()}


@router.put("/api/admin/collecting-media/{item_id}")
async def admin_collecting_update(
    item_id: str, body: dict, admin=Depends(require_admin)
):
    from database import admin_update_collecting_media
    if not body:
        raise HTTPException(status_code=422, detail="Empty body")
    row = admin_update_collecting_media(item_id, body)
    if not row:
        raise HTTPException(status_code=404, detail="Gallery item not found")
    return row


@router.delete("/api/admin/collecting-media/{item_id}")
async def admin_collecting_delete(item_id: str, admin=Depends(require_admin)):
    from database import admin_delete_collecting_media, admin_get_collecting_media
    if not admin_get_collecting_media(item_id):
        raise HTTPException(status_code=404, detail="Gallery item not found")
    if not admin_delete_collecting_media(item_id):
        raise HTTPException(status_code=500, detail="Failed to delete gallery item")
    return {"detail": "Gallery item deleted"}


# ═══════════════════════════════════════════════════════════════════════════
# ADMIN — translate tag / label (JSONB _i18n columns, same flow as services)
# ═══════════════════════════════════════════════════════════════════════════

class CollectingFieldTranslateRequest(BaseModel):
    field: str                    # one of _COLLECTING_TRANSLATABLE
    source_locale: str = "en"
    overwrite: bool = False


@router.post("/api/admin/collecting-media/{item_id}/translate")
async def admin_collecting_translate_field(
    item_id: str,
    body: CollectingFieldTranslateRequest,
    admin=Depends(require_admin),
):
    from database import admin_get_collecting_media, admin_update_collecting_media

    if body.field not in _COLLECTING_TRANSLATABLE:
        raise HTTPException(
            status_code=422,
            detail=f"Field '{body.field}' is not translatable. "
                   f"Choose from: {', '.join(_COLLECTING_TRANSLATABLE)}",
        )
    if body.source_locale not in _LOCALES:
        raise HTTPException(
            status_code=422, detail=f"Invalid source_locale '{body.source_locale}'."
        )

    item = admin_get_collecting_media(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Gallery item not found")

    if body.source_locale == "en":
        src_text = (item.get(body.field) or "").strip()
    else:
        i18n = item.get(f"{body.field}_i18n") or {}
        src_text = (i18n.get(body.source_locale) or "").strip()
    if not src_text:
        raise HTTPException(
            status_code=422,
            detail=f"No text found in '{body.field}' for locale '{body.source_locale}'. "
                   "Fill it in first, then translate.",
        )

    current_i18n = dict(item.get(f"{body.field}_i18n") or {})
    updates: dict = {}

    for target in _LOCALES:
        if target == body.source_locale:
            continue
        if target == "en":
            existing = (item.get(body.field) or "").strip()
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
    updated = admin_update_collecting_media(item_id, updates)
    return updated or item


# ═══════════════════════════════════════════════════════════════════════════
# ADMIN — media uploads
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/api/admin/collecting-media/upload-image")
async def admin_collecting_upload_image(
    file: UploadFile = File(...),
    admin=Depends(require_admin),
):
    from database import admin_upload_collecting_image

    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(status_code=422, detail="File must be an image")

    contents = await file.read()
    if len(contents) > _MAX_IMAGE_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Image exceeds {_MAX_IMAGE_UPLOAD_BYTES // (1024 * 1024)} MB limit",
        )

    try:
        return admin_upload_collecting_image(
            file_bytes=contents,
            filename=file.filename or "image",
            content_type=file.content_type,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {e}")


@router.post("/api/admin/collecting-media/upload-video")
async def admin_collecting_upload_video(
    file: UploadFile = File(...),
    admin=Depends(require_admin),
):
    from database import admin_upload_collecting_video

    if not (file.content_type or "").startswith("video/"):
        raise HTTPException(status_code=422, detail="File must be a video")

    contents = await file.read()
    if len(contents) > _MAX_VIDEO_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Video exceeds {_MAX_VIDEO_UPLOAD_BYTES // (1024 * 1024)} MB limit. "
                   "Trim or compress the clip before uploading.",
        )

    try:
        return admin_upload_collecting_video(
            file_bytes=contents,
            filename=file.filename or "video",
            content_type=file.content_type,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {e}")
