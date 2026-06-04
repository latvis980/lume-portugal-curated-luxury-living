#!/usr/bin/env python3
"""
Read-only diagnostic for the `journal-images` bucket.

Symptom this answers: a newly uploaded journal image lands in Storage as
`.webp`, but the preview is broken in the admin uploader and on the public
pages. The upload itself uses the secret key (bypasses RLS), so a file showing
up in Storage does NOT prove it is publicly readable — and the admin preview
renders the returned public URL directly, with no DB round-trip. So a broken
preview almost always means the bucket is not `public=true`.

This script makes no changes. It prints:
  1. the bucket's `public` flag,
  2. each object's name + mimetype + size,
  3. an *anonymous* HTTP GET (exactly like a browser <img>) of one object's
     public URL, showing the status + Content-Type.

Run it from an environment that can reach Supabase (the backend host, or
locally with SUPABASE_URL + SUPABASE_SECRET_KEY set):

    python scripts/diagnose_journal_images.py

Expected when the bucket is misconfigured (the bug):
    public = False ... and the anon GET returns 400 (Bucket not found).
Expected after the fix (bucket made public):
    public = True  ... and the anon GET returns 200 with Content-Type image/webp.
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request

# Make the backend package importable whether run from repo root or backend/.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from dotenv import load_dotenv

    load_dotenv()
except Exception:
    pass

BUCKET = "journal-images"


def _http(url: str, headers: dict | None = None, want_body: bool = True):
    """Return (status, content_type, body_text_or_None). Never raises."""
    req = urllib.request.Request(url, headers=headers or {}, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            ct = resp.headers.get("Content-Type")
            body = resp.read().decode("utf-8", "replace")[:2000] if want_body else None
            return resp.status, ct, body
    except urllib.error.HTTPError as e:
        ct = e.headers.get("Content-Type") if e.headers else None
        body = e.read().decode("utf-8", "replace")[:2000]
        return e.code, ct, body
    except Exception as e:  # noqa: BLE001
        return None, None, str(e)


def main() -> int:
    base = os.getenv("SUPABASE_URL", "").rstrip("/")
    secret = os.getenv("SUPABASE_SECRET_KEY", "")
    if not base or not secret:
        print("SUPABASE_URL and SUPABASE_SECRET_KEY must be set.", file=sys.stderr)
        return 1

    admin_headers = {"apikey": secret, "Authorization": f"Bearer {secret}"}

    # 1. Bucket public flag.
    status, _, body = _http(f"{base}/storage/v1/bucket/{BUCKET}", headers=admin_headers)
    print(f"=== Bucket '{BUCKET}' (GET /storage/v1/bucket) -> {status} ===")
    is_public = None
    if status == 200:
        try:
            meta = json.loads(body)
            is_public = meta.get("public")
            print(f"  public = {is_public}")
        except Exception:
            print(f"  (could not parse) {body}")
    else:
        print(f"  {body}")

    # 2. List objects + their content types.
    req = urllib.request.Request(
        f"{base}/storage/v1/object/list/{BUCKET}",
        data=json.dumps({"prefix": "", "limit": 100, "offset": 0}).encode(),
        headers={**admin_headers, "Content-Type": "application/json"},
        method="POST",
    )
    print(f"\n=== Objects in '{BUCKET}' ===")
    first_object = None
    non_webp = 0
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            objects = json.loads(resp.read().decode())
        files = [o for o in objects if o.get("name") and o.get("id")]
        print(f"  {len(files)} object(s).")
        for o in files:
            name = o["name"]
            meta = o.get("metadata") or {}
            ct = meta.get("mimetype")
            size = meta.get("size")
            if not name.lower().endswith(".webp"):
                non_webp += 1
            if first_object is None:
                first_object = name
            print(f"   {name}  mimetype={ct}  size={size}")
        if non_webp:
            print(f"  -> {non_webp} object(s) are NOT .webp (backfill still needed).")
    except Exception as e:  # noqa: BLE001
        print(f"  list failed: {e}")

    # 3. Anonymous GET of one object's public URL (mimics a browser <img>).
    if first_object:
        public_url = f"{base}/storage/v1/object/public/{BUCKET}/{first_object}"
        status, ct, body = _http(public_url, headers=None, want_body=False)
        print(f"\n=== Anonymous GET of public URL ===")
        print(f"  {public_url}")
        print(f"  -> status={status}  Content-Type={ct}")
        if status == 200:
            print("  OK: object is publicly readable.")
        else:
            print(
                "  BROKEN: anon cannot read this object. If 'public' above is "
                "False, make the bucket public (migration "
                "20260604000000_journal_images_public.sql or the Supabase "
                "dashboard)."
            )

    print("\nSummary:")
    print(f"  bucket public = {is_public}")
    print(f"  non-webp objects = {non_webp}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
