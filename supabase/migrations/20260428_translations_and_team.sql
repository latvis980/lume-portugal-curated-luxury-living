-- Multi-language CMS strings + Team (founders) for the About page.
--
-- Everything user-visible that is not a property listing lives in the
-- `translations` table.  Keys are addressed by (namespace, key) pairs, e.g.
-- ("about", "title"), ("nav", "browse_homes"), ("about.founder.1", "bio").
-- Each row stores the source text per supported locale.
--
-- Supported locales: en, pt_br, ru, es.

create table if not exists public.translations (
    id uuid primary key default gen_random_uuid(),
    namespace text not null,
    key text not null,
    en text,
    pt_br text,
    ru text,
    es text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (namespace, key)
);

create index if not exists translations_namespace_idx
    on public.translations (namespace);

-- The public site reads translations directly through the publishable key.
alter table public.translations enable row level security;

drop policy if exists "translations are public read" on public.translations;
create policy "translations are public read"
    on public.translations
    for select
    using (true);

-- Bump updated_at on change.
create or replace function public.translations_set_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists translations_set_updated_at on public.translations;
create trigger translations_set_updated_at
    before update on public.translations
    for each row execute function public.translations_set_updated_at();


-- Team members shown on the About page.  Bio strings live in `translations`
-- (namespace `team.<slug>`, key `bio`); only structural data lives here.
create table if not exists public.team_members (
    id uuid primary key default gen_random_uuid(),
    slug text not null unique,
    name text not null,
    role text,
    image_url text,
    sort_order integer not null default 0,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.team_members enable row level security;

drop policy if exists "team_members are public read" on public.team_members;
create policy "team_members are public read"
    on public.team_members
    for select
    using (is_active);

drop trigger if exists team_members_set_updated_at on public.team_members;
create trigger team_members_set_updated_at
    before update on public.team_members
    for each row execute function public.translations_set_updated_at();


-- Seed: About page copy (English source, other locales filled via the
-- "Translate" button in the admin or by manual editing).
insert into public.translations (namespace, key, en) values
    ('nav', 'browse_homes',          'Browse Homes'),
    ('nav', 'discover_services',     'Discover Services'),
    ('nav', 'collect_with_lume',     'Collect with LUME'),
    ('nav', 'request_private_access','Request Private Access'),
    ('nav', 'about',                 'About'),

    ('about', 'eyebrow',  'About LUME'),
    ('about', 'title',    'A calm, precise way to enter life in Portugal'),
    ('about', 'tagline',  'LUME by Mark is a calm, precise and thoughtful way to enter life in Portugal. It is not simply a real estate platform.'),

    ('about', 'intro_p1', 'We created LUME for those who are looking not for a property, but for an environment. Not square meters, but the rhythm, light and structure of life.'),
    ('about', 'intro_p2', 'Today, people come to Portugal from all over the world. But behind the postcard landscapes lies a complex system: cities and neighborhoods, processes and people, rules and invisible connections.'),
    ('about', 'intro_p3', 'LUME was created out of the need to make the transition from interest to real life considered, precise and personal.'),

    ('about', 'what_we_do_title', 'What we do'),
    ('about', 'what_we_do_lead',  'LUME connects three layers:'),
    ('about', 'what_we_do_homes',      'Homes — carefully selected properties aligned with real living scenarios.'),
    ('about', 'what_we_do_living',     'Living — an understanding of how life in the country actually works, from everyday decisions to cultural context.'),
    ('about', 'what_we_do_collecting', 'Collecting — access to objects and experiences that shape personal space and identity.'),
    ('about', 'what_we_do_outro',      'We do not show everything. We curate and accompany.'),

    ('about', 'how_we_work_title', 'How we work'),
    ('about', 'how_we_work_p1',    'LUME is a curated model.'),
    ('about', 'how_we_work_p2',    'We begin not with an offer, but with understanding: what matters now, what rhythm of life is needed, how a home should feel.'),
    ('about', 'how_we_work_p3',    'From there, we shape the selection, structure the process, guide the transaction, and continue working with life beyond it.'),

    ('about', 'why_lume_title', 'Why LUME'),
    ('about', 'why_lume_p1',    'The project was created at the intersection of three areas of expertise: investment and transactions, global luxury brand management, and media, culture and lived experience.'),
    ('about', 'why_lume_p2',    'This combination allows us to operate not as an agency, but as a system that connects people, space and decisions.'),

    ('about', 'goal_title', 'Our goal'),
    ('about', 'goal_p1',    'To create a new way of entering a country — through quality, trust and precision.'),
    ('about', 'goal_p2',    'We do not accelerate the process. We make it right.'),

    ('about', 'team_title',   'The people behind LUME'),
    ('about', 'team_eyebrow', 'Founders & Curators')
on conflict (namespace, key) do nothing;

-- Seed: five placeholder founders.  Edit names/photos in the CMS later.
insert into public.team_members (slug, name, role, sort_order) values
    ('mark',     'Mark',     'Founder',                  1),
    ('partner-2','Co-founder','Curator, Living',         2),
    ('partner-3','Co-founder','Curator, Homes',          3),
    ('partner-4','Co-founder','Curator, Collecting',     4),
    ('partner-5','Co-founder','Investment & Transactions',5)
on conflict (slug) do nothing;

insert into public.translations (namespace, key, en) values
    ('team.mark',      'bio', 'Brand and lived-experience lead. Connects people, space and decisions across the LUME ecosystem.'),
    ('team.partner-2', 'bio', 'Guides families through the everyday reality of life in Portugal — schools, healthcare, neighborhoods.'),
    ('team.partner-3', 'bio', 'Sources and curates the Homes layer: properties aligned with real living scenarios, not square meters.'),
    ('team.partner-4', 'bio', 'Leads the Collecting practice — art, antiques, and objects that shape a personal interior.'),
    ('team.partner-5', 'bio', 'Twenty years across investment and transactions in international luxury markets.')
on conflict (namespace, key) do nothing;
