-- 20260501_homepage_translations.sql
--
-- Closes the gap between the homepage components and the `translations`
-- table. Before this migration these namespaces were partially or entirely
-- hardcoded in the React source:
--
--   * questionnaire — never seeded (referenced from a missing
--     populate-questionnaire-translations.sql script)
--   * investment    — InvestmentSection.tsx used inline JSX strings
--   * footer        — Footer.tsx had a hardcoded © line
--   * cookies       — CookieConsent.tsx had hardcoded banner copy
--   * nav.*_sub     — Navbar.tsx renders subtitles that were never seeded
--
-- All inserts are `on conflict do nothing` so re-running is safe and any
-- copy already edited via the admin survives.

-- ── Nav subtitles (Navbar.tsx) ────────────────────────────────────────────

insert into public.translations (namespace, key, en) values
    ('nav', 'browse_homes_sub',      'View available places'),
    ('nav', 'discover_services_sub', 'What we take care of'),
    ('nav', 'collect_with_lume_sub', 'Thinking beyond the present'),
    ('nav', 'about_sub',             'The idea behind Lume')
on conflict (namespace, key) do nothing;


-- ── Questionnaire (QuestionnaireSection.tsx + questionnaire-schema.ts) ────

insert into public.translations (namespace, key, en) values
    -- Intro
    ('questionnaire', 'intro.eyebrow',  'Discover your match'),
    ('questionnaire', 'intro.title',    'Tell us what you seek'),
    ('questionnaire', 'intro.subtitle', 'Answer a few quick questions to receive a list of exclusive listings curated for you.'),

    -- Progress label (uses {current} / {total} placeholders)
    ('questionnaire', 'progress.label', 'Question {current} of {total}'),

    -- Email capture
    ('questionnaire', 'email.title',          'Excited to see what Lume has for you?'),
    ('questionnaire', 'email.subtitle',       'Enter your email to receive our exclusive properties and services list.'),
    ('questionnaire', 'email.placeholder',    'your@email.com'),
    ('questionnaire', 'email.button',         'Send'),
    ('questionnaire', 'email.button_loading', 'Sending…'),

    -- Errors
    ('questionnaire', 'error.generic', 'Something went wrong. Please try again.'),

    -- Thank-you
    ('questionnaire', 'thanks.title',   'Thank you!'),
    ('questionnaire', 'thanks.message', 'While we prepare your selection,'),
    ('questionnaire', 'thanks.cta',     'explore our current homes'),
    ('questionnaire', 'thanks.close',   'Close'),

    -- Q1 (shared entry point)
    ('questionnaire', 'q1.title',           'What brings you to Portugal?'),
    ('questionnaire', 'q1.opt.relocation',  'Relocation'),
    ('questionnaire', 'q1.opt.second_home', 'Second Home'),
    ('questionnaire', 'q1.opt.investment',  'Investment'),
    ('questionnaire', 'q1.opt.exploring',   'Just Exploring'),

    -- Branch: relocation
    ('questionnaire', 'relocation.q2.title',         'Who is moving with you?'),
    ('questionnaire', 'relocation.q2.opt.solo',      'On my own'),
    ('questionnaire', 'relocation.q2.opt.couple',    'As a couple'),
    ('questionnaire', 'relocation.q2.opt.family',    'With family'),
    ('questionnaire', 'relocation.q3.title',         'What kind of life do you imagine?'),
    ('questionnaire', 'relocation.q3.opt.ocean',         'By the ocean'),
    ('questionnaire', 'relocation.q3.opt.countryside',   'In the countryside'),
    ('questionnaire', 'relocation.q3.opt.historic_city', 'In a historic city'),
    ('questionnaire', 'relocation.q3.opt.wine_region',   'In a wine region'),
    ('questionnaire', 'relocation.q4.title',         'When are you hoping to move?'),
    ('questionnaire', 'relocation.q4.opt.now',       'As soon as possible'),
    ('questionnaire', 'relocation.q4.opt.6_months',  'Within six months'),
    ('questionnaire', 'relocation.q4.opt.exploring', 'Still exploring'),
    ('questionnaire', 'relocation.q5.title',         'What matters most to you?'),
    ('questionnaire', 'relocation.q5.opt.schools',    'Schools'),
    ('questionnaire', 'relocation.q5.opt.healthcare', 'Healthcare'),
    ('questionnaire', 'relocation.q5.opt.lifestyle',  'Lifestyle'),
    ('questionnaire', 'relocation.q5.opt.investment', 'Investment'),

    -- Branch: second_home
    ('questionnaire', 'second_home.q2.title',      'Who will be using the home?'),
    ('questionnaire', 'second_home.q2.opt.solo',   'On my own'),
    ('questionnaire', 'second_home.q2.opt.couple', 'As a couple'),
    ('questionnaire', 'second_home.q2.opt.family', 'With family'),
    ('questionnaire', 'second_home.q3.title',      'Where do you see yourself?'),
    ('questionnaire', 'second_home.q3.opt.ocean',         'By the ocean'),
    ('questionnaire', 'second_home.q3.opt.countryside',   'In the countryside'),
    ('questionnaire', 'second_home.q3.opt.historic_city', 'In a historic city'),
    ('questionnaire', 'second_home.q3.opt.wine_region',   'In a wine region'),
    ('questionnaire', 'second_home.q4.title',      'How often will you visit?'),
    ('questionnaire', 'second_home.q4.opt.year_round',    'Year round'),
    ('questionnaire', 'second_home.q4.opt.seasonally',    'Seasonally'),
    ('questionnaire', 'second_home.q4.opt.holidays_only', 'Holidays only'),
    ('questionnaire', 'second_home.q5.title',      'What matters most to you?'),
    ('questionnaire', 'second_home.q5.opt.privacy',          'Privacy'),
    ('questionnaire', 'second_home.q5.opt.lifestyle',        'Lifestyle'),
    ('questionnaire', 'second_home.q5.opt.rental_potential', 'Rental potential'),
    ('questionnaire', 'second_home.q5.opt.investment_value', 'Investment value'),

    -- Branch: investment
    ('questionnaire', 'investment.q2.title',       'How would you like to invest?'),
    ('questionnaire', 'investment.q2.opt.lead',    'Lead investor'),
    ('questionnaire', 'investment.q2.opt.co',      'Co-investor'),
    ('questionnaire', 'investment.q2.opt.various', 'Various structures'),
    ('questionnaire', 'investment.q3.title',           'What kind of project interests you?'),
    ('questionnaire', 'investment.q3.opt.branded',     'Branded residences'),
    ('questionnaire', 'investment.q3.opt.renovation',  'Renovation projects'),
    ('questionnaire', 'investment.q3.opt.new_dev',     'New developments'),

    -- Branch: exploring
    ('questionnaire', 'exploring.q2.title',          'Which region speaks to you?'),
    ('questionnaire', 'exploring.q2.opt.lisboa',     'Lisbon'),
    ('questionnaire', 'exploring.q2.opt.algarve',    'Algarve'),
    ('questionnaire', 'exploring.q2.opt.porto',      'Porto'),
    ('questionnaire', 'exploring.q2.opt.alentejo',   'Alentejo'),
    ('questionnaire', 'exploring.q3.title',          'What kind of life appeals to you?'),
    ('questionnaire', 'exploring.q3.opt.ocean',         'By the ocean'),
    ('questionnaire', 'exploring.q3.opt.countryside',   'In the countryside'),
    ('questionnaire', 'exploring.q3.opt.historic_city', 'In a historic city'),
    ('questionnaire', 'exploring.q3.opt.wine_region',   'In a wine region')
on conflict (namespace, key) do nothing;


-- ── Investment section (InvestmentSection.tsx) ────────────────────────────

insert into public.translations (namespace, key, en) values
    ('investment', 'eyebrow', 'Quiet Opportunities'),
    ('investment', 'heading', 'Investing in real estate in Portugal'),

    ('investment', 'block1.heading', 'Not all decisions are immediate'),
    ('investment', 'block1.p1',      'Some people come to Portugal not only to live, but to build something over time.'),
    ('investment', 'block1.p2',      'Some choices are made slowly — not from urgency, but from clarity.'),
    ('investment', 'block1.p3',      'In Portugal, this often means looking beyond the present, toward what will unfold over time.'),

    ('investment', 'block2.heading',         'Working with Mark'),
    ('investment', 'block2.p1.before_link',  'Through our partnership with '),
    ('investment', 'block2.link_label',      'Mark'),
    ('investment', 'block2.p1.after_link',   ', we offer access to a limited number of carefully selected opportunities — some are visible, others are not.'),
    ('investment', 'block2.p2',              'We don''t present everything, but only what is worth considering.'),

    ('investment', 'block3.heading',  'What we look for'),
    ('investment', 'block3.bullet1',  'Long-term value'),
    ('investment', 'block3.bullet2',  'Strong locations'),
    ('investment', 'block3.bullet3',  'Architectural integrity'),
    ('investment', 'block3.bullet4',  'Projects that shape their surroundings'),

    ('investment', 'quote.line1', 'Some opportunities never appear publicly.'),
    ('investment', 'quote.line2', 'They move quietly, between people who know where to look.'),

    ('investment', 'cta.heading',     'For those who think beyond the immediate'),
    ('investment', 'cta.body.line1',  'This is not for everyone — and it is not meant to be.'),
    ('investment', 'cta.body.line2',  'If this resonates, we will take the conversation further.'),
    ('investment', 'cta.button',      'Continue with Mark →'),
    ('investment', 'cta.button_aria', 'Continue with Mark on the OneMark website'),
    ('investment', 'cta.url_label',   'onemark.pt')
on conflict (namespace, key) do nothing;


-- ── Footer (Footer.tsx) ───────────────────────────────────────────────────

insert into public.translations (namespace, key, en) values
    ('footer', 'logo_alt',  'LUME by Mark'),
    ('footer', 'copyright', '© 2026 LUME by Mark · Real Estate, Relocation & Investment · Portugal')
on conflict (namespace, key) do nothing;


-- ── Cookie consent banner (CookieConsent.tsx) ─────────────────────────────

insert into public.translations (namespace, key, en) values
    ('cookies', 'message',           'We use cookies to remember your preferences and improve your experience.'),
    ('cookies', 'privacy_link',      'Privacy Policy'),
    ('cookies', 'decline',           'Decline'),
    ('cookies', 'accept',            'Accept')
on conflict (namespace, key) do nothing;
