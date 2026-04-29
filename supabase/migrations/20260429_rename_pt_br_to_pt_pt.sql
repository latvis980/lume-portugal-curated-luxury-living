-- Rename Brazilian Portuguese (pt_br) to Portugal Portuguese (pt_pt).
--
-- The translations table has a dedicated pt_br column for Braziilan Portuguese → rename it.
-- Listings and services store other locales as JSONB under <field>_i18n,
-- with a "pt_br" key → rename that key to "pt_pt" wherever it exists.

-- 1. Rename the column on the translations table.
alter table public.translations
    rename column pt_br to pt_pt;

-- 2. Migrate the JSONB i18n keys on listings.
update public.listings
set title_i18n = (title_i18n - 'pt_br') || jsonb_build_object('pt_pt', title_i18n -> 'pt_br')
where title_i18n ? 'pt_br';

update public.listings
set short_description_i18n = (short_description_i18n - 'pt_br') || jsonb_build_object('pt_pt', short_description_i18n -> 'pt_br')
where short_description_i18n ? 'pt_br';

update public.listings
set full_description_i18n = (full_description_i18n - 'pt_br') || jsonb_build_object('pt_pt', full_description_i18n -> 'pt_br')
where full_description_i18n ? 'pt_br';

update public.listings
set ai_summary_i18n = (ai_summary_i18n - 'pt_br') || jsonb_build_object('pt_pt', ai_summary_i18n -> 'pt_br')
where ai_summary_i18n ? 'pt_br';

-- 3. Migrate the JSONB i18n keys on services.
update public.services
set title_i18n = (title_i18n - 'pt_br') || jsonb_build_object('pt_pt', title_i18n -> 'pt_br')
where title_i18n ? 'pt_br';

update public.services
set subtitle_i18n = (subtitle_i18n - 'pt_br') || jsonb_build_object('pt_pt', subtitle_i18n -> 'pt_br')
where subtitle_i18n ? 'pt_br';

update public.services
set description_i18n = (description_i18n - 'pt_br') || jsonb_build_object('pt_pt', description_i18n -> 'pt_br')
where description_i18n ? 'pt_br';
