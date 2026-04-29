-- Hero section copy. Keys mirror the calls to t("hero", ...) in
-- frontend/src/components/HeroSection.tsx.

insert into public.translations (namespace, key, en) values
    ('hero', 'eyebrow',              'Homes · Living · Collecting'),
    ('hero', 'logo',                 'LUME'),
    ('hero', 'logo_subtitle',        'by Mark'),
    ('hero', 'tagline',              'Your light to living in Portugal'),
    ('hero', 'cta_explore_homes',    'Explore Homes'),
    ('hero', 'cta_let_us_guide_you', 'Let Us Guide You'),
    ('hero', 'scroll',               'Scroll')
on conflict (namespace, key) do nothing;
