-- 20260501_questionnaire_copy_resync.sql
--
-- Resyncs the questionnaire copy in Supabase with the canonical strings
-- that previously lived as fallbacks in QuestionnaireSection.tsx. The
-- original seed (20260501_homepage_translations.sql) used
-- `on conflict do nothing`, so any rows already present with stale or
-- incorrect copy were never overwritten. This migration force-updates the
-- English column for the 14 keys the component renders directly so the UI
-- shows the correct copy once the fallbacks are removed from the code.

insert into public.translations (namespace, key, en) values
    ('questionnaire', 'intro.eyebrow',          'Discover your match'),
    ('questionnaire', 'intro.title',            'Tell us what you seek'),
    ('questionnaire', 'intro.subtitle',         'Answer a few quick questions to receive a list of exclusive listings curated for you.'),
    ('questionnaire', 'progress.label',         'Question {current} of {total}'),
    ('questionnaire', 'email.title',            'Excited to see what Lume has for you?'),
    ('questionnaire', 'email.subtitle',         'Enter your email to receive our exclusive properties and services list.'),
    ('questionnaire', 'email.placeholder',      'your@email.com'),
    ('questionnaire', 'email.button',           'Send'),
    ('questionnaire', 'email.button_loading',   'Sending…'),
    ('questionnaire', 'error.generic',          'Something went wrong. Please try again.'),
    ('questionnaire', 'thanks.title',           'Thank you!'),
    ('questionnaire', 'thanks.message',         'While we prepare your selection,'),
    ('questionnaire', 'thanks.cta',             'explore our current homes'),
    ('questionnaire', 'thanks.close',           'Close')
on conflict (namespace, key) do update
    set en = excluded.en;
