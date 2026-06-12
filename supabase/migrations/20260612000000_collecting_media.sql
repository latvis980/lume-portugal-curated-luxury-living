-- Collecting gallery media for the LUME homepage.
--
-- The "Lume Signature Services" (Collecting) block replaces its single static
-- photo with a small editor-managed gallery of photos and looped video clips.
--
-- Adds:
--   - enum: collecting_media_type ('image' | 'video')
--   - table: public.collecting_media (tag/label plain-text fields + matching
--           _i18n JSONBs, media src + optional video poster, sort order)
--   - set_updated_at trigger
--   - RLS: admin full access; public can read active rows
--   - Storage bucket `collecting-media` (public read, authenticated write)
--
-- Idempotent: safe to apply against a database that already has it.

-- ---------------------------------------------------------------------------
-- 1. Enum
-- ---------------------------------------------------------------------------

do $$
begin
    if not exists (select 1 from pg_type where typname = 'collecting_media_type') then
        create type public.collecting_media_type as enum ('image', 'video');
    end if;
end$$;


-- ---------------------------------------------------------------------------
-- 2. Table
-- ---------------------------------------------------------------------------

create table if not exists public.collecting_media (
    id               uuid primary key default gen_random_uuid(),
    media_type       public.collecting_media_type not null default 'image',

    -- Public URLs in the `collecting-media` bucket. `poster` is the WebP
    -- still extracted from a video's first frame (shown while it loads).
    src              text not null,
    poster           text,

    -- Small uppercase chip on the media (e.g. GLASSWARE) and the italic
    -- caption under the gallery (EN base + per-locale JSONB).
    tag              text,
    tag_i18n         jsonb not null default '{}'::jsonb,
    label            text,
    label_i18n       jsonb not null default '{}'::jsonb,

    sort_order       integer not null default 0,
    is_active        boolean not null default true,

    -- Video metadata captured at upload time (drives editor warnings).
    duration_seconds numeric(8,2),
    file_size_bytes  bigint,

    created_at       timestamptz not null default now(),
    updated_at       timestamptz not null default now()
);

create index if not exists idx_collecting_media_sort   on public.collecting_media (sort_order);
create index if not exists idx_collecting_media_active on public.collecting_media (is_active);


-- ---------------------------------------------------------------------------
-- 3. Trigger
-- ---------------------------------------------------------------------------

drop trigger if exists trg_collecting_media_updated_at on public.collecting_media;
create trigger trg_collecting_media_updated_at
    before update on public.collecting_media
    for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------------
-- 4. RLS
-- ---------------------------------------------------------------------------

alter table public.collecting_media enable row level security;

do $$
begin
    if not exists (select 1 from pg_policies
        where schemaname='public' and tablename='collecting_media'
          and policyname='Admin full access to collecting_media') then
        create policy "Admin full access to collecting_media" on public.collecting_media
            for all to authenticated using (true) with check (true);
    end if;

    if not exists (select 1 from pg_policies
        where schemaname='public' and tablename='collecting_media'
          and policyname='Public can read active collecting_media') then
        create policy "Public can read active collecting_media" on public.collecting_media
            for select to anon using (is_active = true);
    end if;
end$$;


-- ---------------------------------------------------------------------------
-- 5. Storage bucket for collecting gallery media (photos + video clips)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('collecting-media', 'collecting-media', true)
on conflict (id) do nothing;

do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname='storage' and tablename='objects'
          and policyname='Public can read collecting-media'
    ) then
        create policy "Public can read collecting-media" on storage.objects
            for select to anon
            using (bucket_id = 'collecting-media');
    end if;

    if not exists (
        select 1 from pg_policies
        where schemaname='storage' and tablename='objects'
          and policyname='Authenticated can write collecting-media'
    ) then
        create policy "Authenticated can write collecting-media" on storage.objects
            for all to authenticated
            using (bucket_id = 'collecting-media')
            with check (bucket_id = 'collecting-media');
    end if;
end$$;
