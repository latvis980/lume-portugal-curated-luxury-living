-- Rename Brazilian Portuguese (pt_br) to Portugal Portuguese (pt_pt).
--
-- Historical migration: at the time it was written, the translations table
-- had a pt_br column and listings/services stored a "pt_br" key in their
-- *_i18n JSONB columns. Since then the baseline schema snapshot was
-- regenerated and no longer carries those pt_br artifacts (the translations
-- column is created as pt_pt directly, and services.subtitle_i18n was
-- dropped). On a fresh DB this migration is therefore a no-op — every step
-- below is guarded so the SQL never references a column that doesn't exist.
-- Production databases that still have pt_br data are unaffected.

-- Helper: rename a JSONB key from pt_br → pt_pt on a given column, but
-- only if that column actually exists on the target table.
create or replace function pg_temp.migrate_pt_br_key(tbl text, col text) returns void
language plpgsql as $$
begin
    if exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name   = tbl
          and column_name  = col
    ) then
        execute format(
            'update public.%I
                set %I = (%I - ''pt_br'') || jsonb_build_object(''pt_pt'', %I -> ''pt_br'')
              where %I ? ''pt_br''',
            tbl, col, col, col, col
        );
    end if;
end $$;

-- 1. Rename the column on the translations table.
do $$
begin
    if exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name   = 'translations'
          and column_name  = 'pt_br'
    ) then
        alter table public.translations
            rename column pt_br to pt_pt;
    end if;
end $$;

-- 2. Migrate the JSONB i18n keys on listings.
select pg_temp.migrate_pt_br_key('listings', 'title_i18n');
select pg_temp.migrate_pt_br_key('listings', 'short_description_i18n');
select pg_temp.migrate_pt_br_key('listings', 'full_description_i18n');
select pg_temp.migrate_pt_br_key('listings', 'ai_summary_i18n');

-- 3. Migrate the JSONB i18n keys on services.
select pg_temp.migrate_pt_br_key('services', 'title_i18n');
select pg_temp.migrate_pt_br_key('services', 'subtitle_i18n');
select pg_temp.migrate_pt_br_key('services', 'description_i18n');
