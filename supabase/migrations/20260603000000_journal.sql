-- Journal articles (News + Memorandum) for the LUME CMS.
--
-- Adds:
--   - enums: article_type, article_status
--   - table: public.journal_articles (with title/kicker/subtitle/excerpt
--           plain-text fields + matching _i18n JSONBs, and body / body_i18n
--           as Tiptap JSON documents)
--   - GIN FTS + btree indexes
--   - set_updated_at + set_published_at_journal triggers
--   - RLS: admin full access; public can read published rows
--   - Storage bucket `journal-images` (public read, authenticated write)
--
-- Idempotent: safe to apply against a database that already has it.

-- ---------------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------------

do $$
begin
    if not exists (select 1 from pg_type where typname = 'article_type') then
        create type public.article_type as enum ('news', 'memorandum');
    end if;

    if not exists (select 1 from pg_type where typname = 'article_status') then
        create type public.article_status as enum ('draft', 'published');
    end if;
end$$;


-- ---------------------------------------------------------------------------
-- 2. Trigger function — set published_at on first transition to 'published'
-- ---------------------------------------------------------------------------

create or replace function public.set_published_at_journal()
returns trigger language plpgsql as $$
begin
    if new.status = 'published'
       and (old.status is null or old.status <> 'published')
       and new.published_at is null then
        new.published_at = now();
    end if;
    return new;
end;
$$;


-- ---------------------------------------------------------------------------
-- 3. Table
-- ---------------------------------------------------------------------------

create table if not exists public.journal_articles (
    id              uuid primary key default gen_random_uuid(),
    slug            text not null,
    type            public.article_type   not null default 'memorandum',
    status          public.article_status not null default 'draft',

    -- Plain-text fields (EN base + per-locale JSONB, matching listings.*_i18n)
    kicker          text,
    kicker_i18n     jsonb not null default '{}'::jsonb,
    title           text not null,
    title_i18n      jsonb not null default '{}'::jsonb,
    subtitle        text,
    subtitle_i18n   jsonb not null default '{}'::jsonb,
    excerpt         text,
    excerpt_i18n    jsonb not null default '{}'::jsonb,

    -- Rich-text body, stored as Tiptap JSON documents
    body            jsonb not null default '{}'::jsonb,
    body_i18n       jsonb not null default '{}'::jsonb,

    cover_image     text,
    author          text,
    sort_order      integer not null default 0,
    published_at    timestamptz,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),

    constraint journal_articles_slug_key unique (slug)
);

create index if not exists idx_journal_articles_type      on public.journal_articles (type);
create index if not exists idx_journal_articles_status    on public.journal_articles (status);
create index if not exists idx_journal_articles_published on public.journal_articles (published_at desc nulls last);
create index if not exists idx_journal_articles_slug      on public.journal_articles (slug);

create index if not exists idx_journal_articles_fts on public.journal_articles using gin (
    to_tsvector(
        'english'::regconfig,
        coalesce(title, '') || ' ' || coalesce(excerpt, '')
    )
);


-- ---------------------------------------------------------------------------
-- 4. Triggers
-- ---------------------------------------------------------------------------

drop trigger if exists trg_journal_articles_updated_at on public.journal_articles;
create trigger trg_journal_articles_updated_at
    before update on public.journal_articles
    for each row execute function public.set_updated_at();

drop trigger if exists trg_journal_articles_published_at on public.journal_articles;
create trigger trg_journal_articles_published_at
    before insert or update on public.journal_articles
    for each row execute function public.set_published_at_journal();


-- ---------------------------------------------------------------------------
-- 5. RLS
-- ---------------------------------------------------------------------------

alter table public.journal_articles enable row level security;

do $$
begin
    if not exists (select 1 from pg_policies
        where schemaname='public' and tablename='journal_articles'
          and policyname='Admin full access to journal_articles') then
        create policy "Admin full access to journal_articles" on public.journal_articles
            for all to authenticated using (true) with check (true);
    end if;

    if not exists (select 1 from pg_policies
        where schemaname='public' and tablename='journal_articles'
          and policyname='Public can read published journal_articles') then
        create policy "Public can read published journal_articles" on public.journal_articles
            for select to anon using (status = 'published'::public.article_status);
    end if;
end$$;


-- ---------------------------------------------------------------------------
-- 6. Storage bucket for journal images (cover + inline)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('journal-images', 'journal-images', true)
on conflict (id) do nothing;

do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname='storage' and tablename='objects'
          and policyname='Public can read journal-images'
    ) then
        create policy "Public can read journal-images" on storage.objects
            for select to anon
            using (bucket_id = 'journal-images');
    end if;

    if not exists (
        select 1 from pg_policies
        where schemaname='storage' and tablename='objects'
          and policyname='Authenticated can write journal-images'
    ) then
        create policy "Authenticated can write journal-images" on storage.objects
            for all to authenticated
            using (bucket_id = 'journal-images')
            with check (bucket_id = 'journal-images');
    end if;
end$$;
