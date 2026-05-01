-- 20260501_translation_duplicates_cleanup.sql
--
-- Deletes duplicate translation rows where the same English text is stored
-- under two (namespace, key) addresses. The "keeper" is the key that the
-- frontend code actually reads via t(namespace, key); the "legacy" key is
-- unreferenced and safe to drop.
--
-- Categories handled:
--
--   1. investment namespace — old underscore-scheme keys whose dot-scheme
--      equivalents are referenced by InvestmentSection.tsx. Same English
--      text on both sides, so locale values are merged via COALESCE before
--      delete (keeper wins where it has a value, legacy fills any gaps).
--
--   2. nav namespace — legacy keys seeded by 20260430_contact_section_*
--      that the Navbar never started using. Code still calls
--      nav.request_private_access / nav.request_private_access_sub /
--      nav.browse_homes / nav.discover_services, so those stay; the
--      "Contact" / "Homes" / "Services" variants are deleted.
--      No automatic locale transfer is performed for these pairs because the
--      English source text differs semantically (e.g. "Contact" vs.
--      "Request Private Access") — translations of one are not safe to copy
--      onto the other.
--
-- Out of scope (kept as-is):
--   * contact.* / private_access.* pairs (thank_you_*, message_placeholder,
--     error_fallback, submitting) — both sides are referenced by their
--     respective sections.
--   * questionnaire.error.generic — also referenced.
--   * team.partner-N hyphen convention — flagged for human review, not
--     touched here.

begin;

-- ─────────────────────────────────────────────────────────────────────────
-- 1. investment namespace: backfill keeper locales from legacy rows
-- ─────────────────────────────────────────────────────────────────────────
-- Pattern per pair:
--   keeper.locale := coalesce(keeper.locale, legacy.locale)
-- Safe because both rows describe the same English source string.

update public.translations dst set
    en    = coalesce(dst.en,    src.en),
    pt_pt = coalesce(dst.pt_pt, src.pt_pt),
    ru    = coalesce(dst.ru,    src.ru),
    es    = coalesce(dst.es,    src.es)
from public.translations src
where dst.namespace = 'investment' and src.namespace = 'investment'
  and (dst.key, src.key) in (
        ('cta.button',        'cta_button'),
        ('cta.url_label',     'cta_caption'),
        ('cta.heading',       'closing_title'),
        ('cta.body.line1',    'closing_p1'),
        ('cta.body.line2',    'closing_p2'),
        ('quote.line1',       'quote_line_1'),
        ('quote.line2',       'quote_line_2'),
        ('block1.heading',    'section_01_title'),
        ('block1.p1',         'section_01_p1'),
        ('block1.p2',         'section_01_p2'),
        ('block1.p3',         'section_01_p3'),
        ('block2.heading',    'section_02_title'),
        ('block2.p2',         'section_02_p2'),
        ('block3.heading',    'section_03_title'),
        ('block3.bullet1',    'value_long_term'),
        ('block3.bullet2',    'value_locations'),
        ('block3.bullet3',    'value_architecture'),
        ('block3.bullet4',    'value_projects')
  );

-- Now drop the legacy underscore-scheme rows.
delete from public.translations
where namespace = 'investment'
  and key in (
        'cta_button',
        'cta_caption',
        'closing_title',
        'closing_p1',
        'closing_p2',
        'quote_line_1',
        'quote_line_2',
        'section_01_title',
        'section_01_p1',
        'section_01_p2',
        'section_01_p3',
        'section_02_title',
        'section_02_p2',
        'section_03_title',
        'value_long_term',
        'value_locations',
        'value_architecture',
        'value_projects'
  );

-- ─────────────────────────────────────────────────────────────────────────
-- 2. nav namespace: drop unreferenced legacy keys
-- ─────────────────────────────────────────────────────────────────────────
-- These were seeded by 20260430_contact_section_translations.sql with the
-- intent of replacing request_private_access / browse_homes / etc., but
-- Navbar.tsx was never updated. Until that intent is reconciled in code,
-- they're dead rows. No locale merge — text differs semantically.

delete from public.translations
where (namespace, key) in (
        ('nav', 'contact'),
        ('nav', 'contact_sub'),
        ('nav', 'homes'),
        ('nav', 'services')
  );

commit;
