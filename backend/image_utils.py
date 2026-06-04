# backend/image_utils.py
"""
Image optimisation for journal uploads.

The CMS used to push the admin's raw file straight into Supabase Storage, so a
2 MB phone/camera JPEG was served, full-resolution, into a ~400 px card and
then magnified by the `scale(1.04)` hover. That looked noisy and loaded slowly.

`optimize_image` fixes this at the source:
  - honours EXIF orientation, then strips all metadata,
  - downscales so the longest edge is at most `max_dim` px (enough detail for a
    full-bleed cover *and* for retina + the hover zoom, with no wasteful excess),
  - re-encodes to WebP at a visually-lossless quality.

Typical result: 2 MB JPEG -> ~150-300 KB WebP, crisp at every render size.

Formats Pillow can't decode (e.g. SVG) are passed through untouched.
"""

from __future__ import annotations

import io
from typing import Optional, Tuple

# Longest-edge cap. 1920 px covers the full-width article cover and leaves
# generous headroom for high-DPI screens and the slight hover zoom on cards.
MAX_DIM = 1920

# WebP quality. 82 is visually lossless for photography while staying small.
WEBP_QUALITY = 82


def optimize_image(
    data: bytes,
    content_type: Optional[str] = None,
) -> Tuple[bytes, str, str]:
    """Return (optimised_bytes, file_extension, content_type).

    On success the result is always WebP (``".webp"`` / ``"image/webp"``).
    If the bytes can't be decoded as a raster image, the original bytes are
    returned unchanged with a sensible extension/content-type so callers can
    still store them (e.g. SVG logos).
    """
    try:
        from PIL import Image, ImageOps
    except Exception:
        # Pillow missing — never block an upload, just store the original.
        return data, _ext_for(content_type), content_type or "application/octet-stream"

    try:
        with Image.open(io.BytesIO(data)) as img:
            # Honour camera orientation, then drop the EXIF so it isn't baked in twice.
            img = ImageOps.exif_transpose(img)

            has_alpha = img.mode in ("RGBA", "LA") or (
                img.mode == "P" and "transparency" in img.info
            )
            img = img.convert("RGBA" if has_alpha else "RGB")

            # Downscale only — never upscale a small source.
            longest = max(img.size)
            if longest > MAX_DIM:
                scale = MAX_DIM / float(longest)
                new_size = (round(img.width * scale), round(img.height * scale))
                img = img.resize(new_size, Image.LANCZOS)

            out = io.BytesIO()
            img.save(
                out,
                format="WEBP",
                quality=WEBP_QUALITY,
                method=6,  # slowest/best compression
            )
            return out.getvalue(), ".webp", "image/webp"
    except Exception:
        # Unsupported/animated/corrupt — pass through untouched.
        return data, _ext_for(content_type), content_type or "application/octet-stream"


def _ext_for(content_type: Optional[str]) -> str:
    mapping = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/gif": ".gif",
        "image/svg+xml": ".svg",
    }
    return mapping.get((content_type or "").lower(), "")
