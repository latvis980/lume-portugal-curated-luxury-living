#!/usr/bin/env python3
"""
One-off backfill: optimise images already sitting in the `journal-images` bucket.

New uploads are optimised automatically (see image_utils.optimize_image), but
images uploaded before that change are still multi-MB originals. This script
walks the bucket, re-encodes every raster object to a downscaled WebP, swaps it
in under a new `.webp` path, and rewrites every reference to the old URL across
`journal_articles` (cover_image + the Tiptap body / body_i18n documents, which
is where inline editor images live).

It is idempotent: objects already stored as `.webp` are skipped, so it's safe
to run more than once.

Usage (from the backend/ directory, with SUPABASE_URL + SUPABASE_SECRET_KEY set):

    python scripts/optimize_journal_images.py            # dry run — reports only
    python scripts/optimize_journal_images.py --apply    # actually rewrite

Requires Pillow:  pip install Pillow
"""

from __future__ import annotations

import argparse
import json
import os
import sys

# Make the backend package importable whether run from repo root or backend/.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from dotenv import load_dotenv

    load_dotenv()
except Exception:
    pass

from database import _get_admin_client  # noqa: E402
from image_utils import optimize_image  # noqa: E402

BUCKET = "journal-images"


def _public_url(client, path: str) -> str:
    url = client.storage.from_(BUCKET).get_public_url(path)
    return url.rstrip("?") if isinstance(url, str) else url


def _list_all(client) -> list[dict]:
    """List every object in the bucket (paginated)."""
    objects: list[dict] = []
    offset = 0
    page = 100
    while True:
        batch = client.storage.from_(BUCKET).list(
            "", {"limit": page, "offset": offset}
        )
        if not batch:
            break
        objects.extend(batch)
        if len(batch) < page:
            break
        offset += page
    return objects


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--apply",
        action="store_true",
        help="Actually rewrite storage + DB (default is a dry run).",
    )
    args = ap.parse_args()
    apply = args.apply

    client = _get_admin_client()
    storage = client.storage.from_(BUCKET)

    objects = _list_all(client)
    # Only real files (a folder placeholder has no id / no metadata).
    files = [o for o in objects if o.get("name") and o.get("id")]
    print(f"Found {len(files)} object(s) in '{BUCKET}'.")

    url_map: dict[str, str] = {}
    saved_bytes = 0

    for obj in files:
        name = obj["name"]
        if name.lower().endswith(".webp"):
            continue  # already optimised

        try:
            original = storage.download(name)
        except Exception as e:
            print(f"  ! skip {name}: download failed ({e})")
            continue

        content_type = (obj.get("metadata") or {}).get("mimetype")
        new_bytes, ext, new_ct = optimize_image(original, content_type)
        if ext != ".webp":
            print(f"  · skip {name}: not a re-encodable raster image")
            continue

        stem = name.rsplit(".", 1)[0] if "." in name else name
        new_name = f"{stem}.webp"

        before, after = len(original), len(new_bytes)
        saved_bytes += max(0, before - after)
        print(
            f"  {'WOULD ' if not apply else ''}optimise {name} "
            f"({before // 1024} KB) -> {new_name} ({after // 1024} KB)"
        )

        if apply:
            storage.upload(
                path=new_name,
                file=new_bytes,
                file_options={"content-type": new_ct, "upsert": "true"},
            )

        url_map[_public_url(client, name)] = _public_url(client, new_name)

    if not url_map:
        print("Nothing to do — all images already optimised.")
        return 0

    print(f"\nRewriting {len(url_map)} URL(s) across journal_articles…")
    rows = client.table("journal_articles").select(
        "id, cover_image, body, body_i18n"
    ).execute().data or []

    db_updates = 0
    for row in rows:
        updates: dict = {}

        cover = row.get("cover_image")
        if cover and cover in url_map:
            updates["cover_image"] = url_map[cover]

        for field in ("body", "body_i18n"):
            value = row.get(field)
            if value is None:
                continue
            blob = json.dumps(value)
            new_blob = blob
            for old, new in url_map.items():
                new_blob = new_blob.replace(old, new)
            if new_blob != blob:
                updates[field] = json.loads(new_blob)

        if updates:
            db_updates += 1
            print(f"  {'WOULD ' if not apply else ''}update article {row['id']}: "
                  f"{', '.join(updates)}")
            if apply:
                client.table("journal_articles").update(updates).eq(
                    "id", row["id"]
                ).execute()

    # Remove the old originals only after every reference has been moved.
    if apply:
        for old_name in [
            o["name"]
            for o in files
            if not o["name"].lower().endswith(".webp")
            and _public_url(client, o["name"]) in url_map
        ]:
            try:
                storage.remove([old_name])
            except Exception as e:
                print(f"  ! could not delete old object {old_name}: {e}")

    print(
        f"\nDone. {db_updates} article(s) {'updated' if apply else 'would be updated'}, "
        f"~{saved_bytes // 1024} KB {'saved' if apply else 'would be saved'} in storage."
    )
    if not apply:
        print("\nDry run only — re-run with --apply to make these changes.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
