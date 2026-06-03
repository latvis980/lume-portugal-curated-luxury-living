-- Journal articles — drop excerpt, add main_sources.
--
-- Excerpt is gone (cards now use subtitle). main_sources is an optional
-- multi-line text block shown at the end of an article ("Main sources" in
-- the mockup). Both have a matching _i18n JSONB for per-locale variants.
--
-- Idempotent.

-- ---------------------------------------------------------------------------
-- 1. Drop the FTS index that referenced excerpt, recreate against subtitle.
-- ---------------------------------------------------------------------------

drop index if exists public.idx_journal_articles_fts;

-- ---------------------------------------------------------------------------
-- 2. Drop excerpt columns.
-- ---------------------------------------------------------------------------

alter table public.journal_articles drop column if exists excerpt;
alter table public.journal_articles drop column if exists excerpt_i18n;

-- ---------------------------------------------------------------------------
-- 3. Add main_sources.
-- ---------------------------------------------------------------------------

alter table public.journal_articles
    add column if not exists main_sources text;
alter table public.journal_articles
    add column if not exists main_sources_i18n jsonb not null default '{}'::jsonb;

-- ---------------------------------------------------------------------------
-- 4. Re-create FTS index against title + subtitle.
-- ---------------------------------------------------------------------------

create index if not exists idx_journal_articles_fts on public.journal_articles using gin (
    to_tsvector(
        'english'::regconfig,
        coalesce(title, '') || ' ' || coalesce(subtitle, '')
    )
);
