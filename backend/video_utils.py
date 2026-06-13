# backend/video_utils.py
"""
Video optimisation for the Collecting gallery uploads.

The gallery plays short, muted, looped clips inside a ~400 px column, so a
raw phone/camera video (often 50-200 MB of 4K HEVC) is massive overkill.
`optimize_video` re-encodes the upload at the source:
  - scales so the longest edge is at most `MAX_DIM` px (plenty for the
    gallery + lightbox on retina screens),
  - re-encodes to H.264 (universally supported, hardware-decoded) at a
    CRF tuned for small ambient clips, capped at 30 fps,
  - strips the audio track (clips autoplay muted),
  - moves the moov atom to the front (`+faststart`) so playback starts
    before the file finishes downloading.

`extract_poster` grabs the first frame as a WebP still so the gallery can
paint instantly while the clip buffers.

ffmpeg comes from the `imageio-ffmpeg` wheel (a static binary, no system
package needed). If it is unavailable or the encode fails, the original
bytes are passed through untouched — an upload is never blocked.
"""

from __future__ import annotations

import os
import re
import subprocess
import tempfile
from typing import Any, Dict, Optional, Tuple

# Longest-edge cap. The clip renders in a ~400 px column and a ~700 px
# lightbox; 1280 covers both at 2x DPI.
MAX_DIM = 1280

# H.264 constant-rate-factor. 26 is visually clean for ambient footage
# while keeping a 15 s clip around 2-4 MB.
CRF = 26

FPS_CAP = 30

# Give ffmpeg at most 10 minutes per encode so a pathological file can't
# wedge the worker.
ENCODE_TIMEOUT_S = 600


def _ffmpeg_exe() -> Optional[str]:
    try:
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return None


def _probe_path(exe: str, src_path: str) -> Dict[str, Any]:
    """Best-effort metadata for a video file: duration (s), width, height.

    imageio-ffmpeg ships ffmpeg but not ffprobe, so we parse the stream
    info ffmpeg prints to stderr when invoked without an output.
    """
    meta: Dict[str, Any] = {"duration_seconds": None, "width": None, "height": None}
    try:
        proc = subprocess.run(
            [exe, "-hide_banner", "-i", src_path],
            capture_output=True,
            text=True,
            timeout=60,
        )
        stderr = proc.stderr or ""
        m = re.search(r"Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)", stderr)
        if m:
            h, mnt, s = int(m.group(1)), int(m.group(2)), float(m.group(3))
            meta["duration_seconds"] = round(h * 3600 + mnt * 60 + s, 2)
        m = re.search(r"Video:.*?(\d{2,5})x(\d{2,5})", stderr)
        if m:
            meta["width"], meta["height"] = int(m.group(1)), int(m.group(2))
    except Exception:
        pass
    return meta


def probe_video(data: bytes) -> Dict[str, Any]:
    """Best-effort metadata for video bytes: duration (s), width, height."""
    exe = _ffmpeg_exe()
    if not exe:
        return {"duration_seconds": None, "width": None, "height": None}
    with tempfile.NamedTemporaryFile(suffix=".video", delete=False) as src:
        src.write(data)
        src_path = src.name
    try:
        return _probe_path(exe, src_path)
    finally:
        os.unlink(src_path)


def optimize_video(
    data: bytes,
    content_type: Optional[str] = None,
) -> Tuple[bytes, str, str, Dict[str, Any]]:
    """Return (optimised_bytes, file_extension, content_type, metadata).

    On success the result is a web-friendly MP4 (H.264, muted, faststart).
    If ffmpeg is unavailable or the encode fails, the original bytes are
    returned unchanged with a sensible extension/content-type.
    """
    exe = _ffmpeg_exe()
    if not exe:
        return (
            data,
            _ext_for(content_type),
            content_type or "video/mp4",
            {"duration_seconds": None, "width": None, "height": None},
        )

    # One temp copy serves both the metadata probe and the encode — these
    # uploads can be huge, so don't write them to disk twice.
    with tempfile.NamedTemporaryFile(suffix=".video", delete=False) as src:
        src.write(data)
        src_path = src.name
    dst_path = src_path + ".out.mp4"
    meta = _probe_path(exe, src_path)

    # Downscale only — never upscale a small source. Dimensions must stay
    # even for yuv420p, hence the -2.
    scale = (
        f"scale='if(gt(iw,ih),min(iw,{MAX_DIM}),-2)'"
        f":'if(gt(iw,ih),-2,min(ih,{MAX_DIM}))'"
    )

    try:
        proc = subprocess.run(
            [
                exe, "-hide_banner", "-y",
                "-i", src_path,
                "-vf", f"{scale},fps={FPS_CAP}",
                "-c:v", "libx264",
                "-crf", str(CRF),
                "-preset", "medium",
                "-pix_fmt", "yuv420p",
                "-an",
                "-movflags", "+faststart",
                dst_path,
            ],
            capture_output=True,
            timeout=ENCODE_TIMEOUT_S,
        )
        if proc.returncode != 0 or not os.path.exists(dst_path):
            raise RuntimeError(
                (proc.stderr or b"").decode("utf-8", "replace")[-500:]
            )
        with open(dst_path, "rb") as f:
            out = f.read()
        if not out:
            raise RuntimeError("ffmpeg produced an empty file")
        return out, ".mp4", "video/mp4", meta
    except Exception as e:
        print(f"[video] optimisation failed, storing original: {e}")
        return data, _ext_for(content_type), content_type or "video/mp4", meta
    finally:
        os.unlink(src_path)
        if os.path.exists(dst_path):
            os.unlink(dst_path)


def extract_poster(data: bytes) -> Optional[bytes]:
    """Extract the first frame as optimised WebP bytes, or None on failure."""
    exe = _ffmpeg_exe()
    if not exe:
        return None

    with tempfile.NamedTemporaryFile(suffix=".video", delete=False) as src:
        src.write(data)
        src_path = src.name
    dst_path = src_path + ".poster.png"

    try:
        proc = subprocess.run(
            [
                exe, "-hide_banner", "-y",
                "-i", src_path,
                "-frames:v", "1",
                dst_path,
            ],
            capture_output=True,
            timeout=120,
        )
        if proc.returncode != 0 or not os.path.exists(dst_path):
            return None
        with open(dst_path, "rb") as f:
            png = f.read()
        if not png:
            return None
        from image_utils import optimize_image

        webp, _suffix, _ctype = optimize_image(png, "image/png")
        return webp
    except Exception:
        return None
    finally:
        os.unlink(src_path)
        if os.path.exists(dst_path):
            os.unlink(dst_path)


def _ext_for(content_type: Optional[str]) -> str:
    mapping = {
        "video/mp4": ".mp4",
        "video/quicktime": ".mov",
        "video/webm": ".webm",
        "video/x-matroska": ".mkv",
        "video/x-m4v": ".m4v",
    }
    return mapping.get((content_type or "").lower(), ".mp4")
