-- ---------------------------------------------------------------------------
-- Make the `journal-images` bucket public.
--
-- The bucket was originally created in 20260603000000_journal.sql with
-- `insert ... on conflict (id) do nothing`. If the bucket already existed
-- (auto-created by an upload, or created by hand) as a *private* bucket, that
-- `do nothing` clause means it was never flipped to public. The result: the
-- service key can upload fine (so the file appears in Storage as .webp), but
-- the `/object/public/...` URL returns 400 for anonymous requests, so the
-- preview is broken in the admin uploader and on the public journal pages.
--
-- An UPDATE (unlike the original idempotent INSERT) actually corrects a
-- pre-existing private bucket. Safe to run repeatedly.
-- ---------------------------------------------------------------------------

update storage.buckets
set public = true
where id = 'journal-images';
