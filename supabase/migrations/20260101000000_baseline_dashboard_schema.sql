-- Baseline migration: rebuild every schema object that was originally created
-- in the Supabase dashboard (before this migrations folder became the source
-- of truth).
--
-- Mirrors the live `public` schema as of 2026-06-01:
--   - 5 dashboard-only tables: contacts, listings, locations, regions, services
--   - 10 enums used by listings + services
--   - GIN/btree indexes, RLS policies, updated_at + published_at triggers
--
-- The translations and team_members tables, plus the service_category enum
-- value extensions, live in later migrations (2026-04-28 onwards) which run
-- on top of this baseline.
--
-- Idempotent: safe to run against the live database (already has everything)
-- and against a fresh database (builds from scratch). All statements are
-- guarded with IF NOT EXISTS / DO blocks.

-- ---------------------------------------------------------------------------
-- 1. Trigger functions
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create or replace function public.set_published_at()
returns trigger language plpgsql as $$
begin
    if new.status = 'available' and (old.status is null or old.status != 'available') then
        if new.published_at is null then
            new.published_at = now();
        end if;
    end if;
    return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Enums
-- ---------------------------------------------------------------------------

do $$
begin
    if not exists (select 1 from pg_type where typname = 'address_visibility') then
        create type public.address_visibility as enum ('exact', 'approximate', 'hidden');
    end if;

    if not exists (select 1 from pg_type where typname = 'internal_status') then
        create type public.internal_status as enum
            ('draft', 'ready_for_review', 'live', 'on_hold', 'off_market');
    end if;

    if not exists (select 1 from pg_type where typname = 'listing_status') then
        create type public.listing_status as enum
            ('draft', 'available', 'reserved', 'sold', 'rented', 'off_market');
    end if;

    if not exists (select 1 from pg_type where typname = 'listing_type') then
        create type public.listing_type as enum ('sale', 'rent', 'seasonal_rent');
    end if;

    if not exists (select 1 from pg_type where typname = 'priority_level') then
        create type public.priority_level as enum ('low', 'medium', 'high');
    end if;

    if not exists (select 1 from pg_type where typname = 'property_condition') then
        create type public.property_condition as enum
            ('new', 'excellent', 'renovated', 'good', 'to_refurbish');
    end if;

    if not exists (select 1 from pg_type where typname = 'property_type') then
        create type public.property_type as enum
            ('apartment', 'penthouse', 'townhouse', 'villa',
             'project_apartment', 'project_villa');
    end if;

    -- service_category: legacy 4 values + current 7 values. The legacy
    -- values (administrative, healthcare_family, home, investment_advisory)
    -- are dead but kept to mirror production. A follow-up migration will
    -- remove them via the standard rename-and-recreate dance.
    if not exists (select 1 from pg_type where typname = 'service_category') then
        create type public.service_category as enum
            ('administrative', 'healthcare_family', 'home', 'investment_advisory',
             'settling_in', 'health', 'education', 'lifestyle', 'environment',
             'leisure', 'signature');
    end if;

    if not exists (select 1 from pg_type where typname = 'view_tag') then
        create type public.view_tag as enum
            ('sea', 'ocean', 'river', 'golf', 'city', 'countryside', 'mountain',
             'garden', 'marina', 'panoramic', 'lake', 'pool', 'none');
    end if;
end$$;

-- ---------------------------------------------------------------------------
-- 3. contacts
-- ---------------------------------------------------------------------------

create table if not exists public.contacts (
    id                     uuid primary key default gen_random_uuid(),
    email                  text not null,
    name                   text,
    phone                  text,
    source                 text,
    questionnaire_answers  jsonb,
    message                text,
    created_at             timestamptz not null default now(),
    updated_at             timestamptz not null default now(),
    constraint contacts_email_unique unique (email)
);

create index if not exists idx_contacts_email  on public.contacts (email);
create index if not exists idx_contacts_source on public.contacts (source);

alter table public.contacts enable row level security;

do $$
begin
    if not exists (select 1 from pg_policies
        where schemaname='public' and tablename='contacts'
          and policyname='Admin full access to contacts') then
        create policy "Admin full access to contacts" on public.contacts
            for all to authenticated using (true) with check (true);
    end if;
    if not exists (select 1 from pg_policies
        where schemaname='public' and tablename='contacts'
          and policyname='Allow public insert on contacts') then
        create policy "Allow public insert on contacts" on public.contacts
            for insert to anon, authenticated with check (true);
    end if;
    if not exists (select 1 from pg_policies
        where schemaname='public' and tablename='contacts'
          and policyname='Anyone can submit a contact form') then
        create policy "Anyone can submit a contact form" on public.contacts
            for insert to public with check (true);
    end if;
    if not exists (select 1 from pg_policies
        where schemaname='public' and tablename='contacts'
          and policyname='Anyone can submit contact form') then
        create policy "Anyone can submit contact form" on public.contacts
            for insert to anon with check (true);
    end if;
    if not exists (select 1 from pg_policies
        where schemaname='public' and tablename='contacts'
          and policyname='Service role has full access to contacts') then
        create policy "Service role has full access to contacts" on public.contacts
            for all to public using (true) with check (true);
    end if;
end$$;

drop trigger if exists trg_contacts_updated_at on public.contacts;
create trigger trg_contacts_updated_at
    before update on public.contacts
    for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. regions
-- ---------------------------------------------------------------------------

create table if not exists public.regions (
    id              uuid primary key default gen_random_uuid(),
    name            text not null,
    display_name    text not null,
    lifestyle_tags  text[] not null default '{}',
    country         text not null default 'Portugal',
    sort_order      integer default 0,
    active          boolean not null default true,
    created_at      timestamptz not null default now(),
    constraint regions_name_key unique (name)
);

create index if not exists regions_lifestyle_tags_idx
    on public.regions using gin (lifestyle_tags);

alter table public.regions enable row level security;

do $$
begin
    if not exists (select 1 from pg_policies
        where schemaname='public' and tablename='regions'
          and policyname='Public can read active regions') then
        create policy "Public can read active regions" on public.regions
            for select to public using (active = true);
    end if;
end$$;

-- NOTE: regions has no updated_at column in production (an oversight when
-- the table was created in the dashboard). The baseline mirrors this; a
-- follow-up migration can add the column + trigger if desired.

-- ---------------------------------------------------------------------------
-- 5. locations
-- ---------------------------------------------------------------------------

create table if not exists public.locations (
    id              uuid primary key default gen_random_uuid(),
    slug            text not null,
    name            text not null,
    city            text not null,
    region          text,
    description     text,
    image_path      text,
    property_count  integer not null default 0,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    constraint locations_slug_key unique (slug)
);

create index if not exists idx_locations_city on public.locations (city);
create index if not exists idx_locations_slug on public.locations (slug);

alter table public.locations enable row level security;

do $$
begin
    if not exists (select 1 from pg_policies
        where schemaname='public' and tablename='locations'
          and policyname='Admin full access to locations') then
        create policy "Admin full access to locations" on public.locations
            for all to authenticated using (true) with check (true);
    end if;
    if not exists (select 1 from pg_policies
        where schemaname='public' and tablename='locations'
          and policyname='Public can read locations') then
        create policy "Public can read locations" on public.locations
            for select to anon using (true);
    end if;
end$$;

drop trigger if exists trg_locations_updated_at on public.locations;
create trigger trg_locations_updated_at
    before update on public.locations
    for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 6. services
-- ---------------------------------------------------------------------------

create table if not exists public.services (
    id                uuid primary key default gen_random_uuid(),
    slug              text not null,
    category          public.service_category not null,
    title             text not null,
    description       text,
    icon              text,
    image_path        text,
    sort_order        integer not null default 0,
    is_active         boolean not null default true,
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now(),
    title_i18n        jsonb not null default '{}'::jsonb,
    description_i18n  jsonb not null default '{}'::jsonb,
    constraint services_slug_key unique (slug)
);

create index if not exists idx_services_category on public.services (category);
create index if not exists idx_services_slug     on public.services (slug);

alter table public.services enable row level security;

do $$
begin
    if not exists (select 1 from pg_policies
        where schemaname='public' and tablename='services'
          and policyname='Admin full access to services') then
        create policy "Admin full access to services" on public.services
            for all to authenticated using (true) with check (true);
    end if;
    if not exists (select 1 from pg_policies
        where schemaname='public' and tablename='services'
          and policyname='Public can read active services') then
        create policy "Public can read active services" on public.services
            for select to anon using (is_active = true);
    end if;
end$$;

drop trigger if exists trg_services_updated_at on public.services;
create trigger trg_services_updated_at
    before update on public.services
    for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 7. listings
-- ---------------------------------------------------------------------------

create table if not exists public.listings (
    id                          uuid primary key default gen_random_uuid(),
    reference                   text not null,
    title                       text not null,
    slug                        text not null,
    property_type               public.property_type not null,
    listing_type                public.listing_type not null,
    status                      public.listing_status not null default 'draft',
    price                       numeric not null,
    currency                    text not null default 'EUR',
    featured                    boolean not null default false,
    country                     text not null default 'Portugal',
    region                      text not null,
    city                        text not null,
    area                        text not null,
    development_name            text,
    address_visibility          public.address_visibility not null default 'approximate',
    latitude                    numeric,
    longitude                   numeric,
    bedrooms                    integer not null,
    bathrooms                   numeric not null,
    interior_living_area        numeric not null,
    plot_size                   numeric,
    views                       public.view_tag[] not null default '{}',
    build_year                  integer,
    gross_built_area            numeric,
    gross_private_area          numeric,
    terrace_area                numeric,
    balcony_area                numeric,
    garden_area                 numeric,
    outdoor_area_total          numeric,
    suites                      integer,
    guest_wc                    integer,
    floors                      integer,
    floor_number                integer,
    living_rooms                integer,
    office                      boolean default false,
    storage_room                boolean default false,
    renovation_year             integer,
    condition                   public.property_condition,
    energy_rating               text,
    elevator                    boolean default false,
    new_development             boolean default false,
    garage                      boolean default false,
    parking_spaces              integer,
    covered_parking             boolean default false,
    underground_parking         boolean default false,
    ev_charging                 boolean default false,
    terrace                     boolean default false,
    balcony                     boolean default false,
    garden                      boolean default false,
    private_garden              boolean default false,
    roof_terrace                boolean default false,
    patio                       boolean default false,
    pool                        boolean default false,
    heated_pool                 boolean default false,
    outdoor_kitchen             boolean default false,
    bbq_area                    boolean default false,
    air_conditioning            boolean default false,
    heating                     boolean default false,
    underfloor_heating          boolean default false,
    fireplace                   boolean default false,
    equipped_kitchen            boolean default false,
    laundry_room                boolean default false,
    walk_in_wardrobe            boolean default false,
    smart_home                  boolean default false,
    alarm_system                boolean default false,
    security                    boolean default false,
    concierge                   boolean default false,
    furnished                   boolean default false,
    lifestyle_tags              text[] not null default '{}',
    short_description           text not null,
    full_description            text,
    key_selling_points          text[] not null default '{}',
    ai_summary                  text,
    cover_image                 text not null,
    gallery                     text[] not null default '{}',
    floor_plans                 text[] not null default '{}',
    video_url                   text,
    virtual_tour_url            text,
    brochure_url                text,
    agent_name                  text,
    agent_phone                 text,
    agent_email                 text,
    agent_whatsapp              text,
    office_name                 text,
    company                     text not null,
    listing_agent               text not null,
    partner                     text,
    partner_commission_percent  numeric,
    internal_status             public.internal_status not null default 'draft',
    source                      text,
    priority                    public.priority_level not null default 'medium',
    confidential                boolean not null default false,
    internal_notes              text,
    published_at                timestamptz,
    created_at                  timestamptz not null default now(),
    updated_at                  timestamptz not null default now(),
    nearby                      text[] not null default '{}',
    title_i18n                  jsonb not null default '{}'::jsonb,
    short_description_i18n      jsonb not null default '{}'::jsonb,
    full_description_i18n       jsonb not null default '{}'::jsonb,
    ai_summary_i18n             jsonb not null default '{}'::jsonb,
    constraint listings_reference_key unique (reference),
    constraint listings_slug_key      unique (slug)
);

-- Business-rule CHECK constraints (added separately so they can be checked
-- for existence -- ADD CONSTRAINT IF NOT EXISTS is PG 16+ only, hence the
-- DO block).
do $$
declare
    c record;
begin
    for c in
        select * from (values
            ('apartment_floor_check',
                'CHECK (property_type <> ALL (ARRAY[''apartment''::property_type, ''penthouse''::property_type, ''project_apartment''::property_type]) OR floor_number IS NOT NULL)'),
            ('land_plot_required_check',
                'CHECK (property_type <> ALL (ARRAY[''villa''::property_type, ''project_villa''::property_type]) OR plot_size IS NOT NULL)'),
            ('listings_balcony_area_check',                  'CHECK (balcony_area >= 0)'),
            ('listings_bathrooms_check',                     'CHECK (bathrooms >= 0)'),
            ('listings_bedrooms_check',                      'CHECK (bedrooms >= 0)'),
            ('listings_build_year_check',                    'CHECK (build_year >= 1800 AND build_year <= 2100)'),
            ('listings_floors_check',                        'CHECK (floors >= 0)'),
            ('listings_garden_area_check',                   'CHECK (garden_area >= 0)'),
            ('listings_gross_built_area_check',              'CHECK (gross_built_area >= 0)'),
            ('listings_gross_private_area_check',            'CHECK (gross_private_area >= 0)'),
            ('listings_guest_wc_check',                      'CHECK (guest_wc >= 0)'),
            ('listings_interior_living_area_check',          'CHECK (interior_living_area >= 0)'),
            ('listings_living_rooms_check',                  'CHECK (living_rooms >= 0)'),
            ('listings_outdoor_area_total_check',            'CHECK (outdoor_area_total >= 0)'),
            ('listings_parking_spaces_check',                'CHECK (parking_spaces >= 0)'),
            ('listings_partner_commission_percent_check',    'CHECK (partner_commission_percent IS NULL OR (partner_commission_percent >= 0 AND partner_commission_percent <= 100))'),
            ('listings_plot_size_check',                     'CHECK (plot_size >= 0)'),
            ('listings_renovation_year_check',               'CHECK (renovation_year >= 1800 AND renovation_year <= 2100)'),
            ('listings_suites_check',                        'CHECK (suites >= 0)'),
            ('listings_terrace_area_check',                  'CHECK (terrace_area >= 0)')
        ) as t(name, definition)
    loop
        if not exists (
            select 1 from pg_constraint
            where conname = c.name
              and conrelid = 'public.listings'::regclass
        ) then
            execute format(
                'alter table public.listings add constraint %I %s',
                c.name, c.definition
            );
        end if;
    end loop;
end$$;

create index if not exists idx_listings_bedrooms      on public.listings (bedrooms);
create index if not exists idx_listings_city          on public.listings (city);
create index if not exists idx_listings_featured      on public.listings (featured) where (featured = true);
create index if not exists idx_listings_internal      on public.listings (internal_status);
create index if not exists idx_listings_price         on public.listings (price);
create index if not exists idx_listings_property_type on public.listings (property_type);
create index if not exists idx_listings_published     on public.listings (published_at desc nulls last);
create index if not exists idx_listings_slug          on public.listings (slug);
create index if not exists idx_listings_status        on public.listings (status);

create index if not exists idx_listings_fts on public.listings using gin (
    to_tsvector(
        'english'::regconfig,
        coalesce(title, '') || ' ' ||
        coalesce(city, '')  || ' ' ||
        coalesce(region, '') || ' ' ||
        coalesce(short_description, '')
    )
);

alter table public.listings enable row level security;

do $$
begin
    if not exists (select 1 from pg_policies
        where schemaname='public' and tablename='listings'
          and policyname='Admin full access to listings') then
        create policy "Admin full access to listings" on public.listings
            for all to authenticated using (true) with check (true);
    end if;
    if not exists (select 1 from pg_policies
        where schemaname='public' and tablename='listings'
          and policyname='Public can read available listings') then
        create policy "Public can read available listings" on public.listings
            for select to anon using (status = 'available'::public.listing_status);
    end if;
end$$;

drop trigger if exists trg_listings_updated_at on public.listings;
create trigger trg_listings_updated_at
    before update on public.listings
    for each row execute function public.set_updated_at();

drop trigger if exists trg_listings_published_at on public.listings;
create trigger trg_listings_published_at
    before insert or update on public.listings
    for each row execute function public.set_published_at();
