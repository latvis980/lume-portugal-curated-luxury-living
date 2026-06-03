-- Property typology refactor.
--
-- Narrows the property_type enum to the 6 editorial categories used by the
-- curated catalog:
--   apartment, penthouse, townhouse, villa, project_apartment, project_villa
--
-- Removed: estate, farmhouse, quinta, land, new_development_unit
--   - `quinta` becomes the Portuguese display label of `villa` (handled via
--     the translations table — seeded at the bottom of this migration).
--   - `new_development_unit` is split into `project_apartment` /
--     `project_villa`.
--
-- Existing listings in those removed categories must already be remapped to
-- one of the 6 target values BEFORE this migration runs — Postgres will
-- refuse the column type swap otherwise.

begin;

-- 0. Remap any remaining listings on dropped categories to a surviving one
--    so the column type swap below doesn't choke on values that aren't in
--    the new enum. Following the mapping declared in this migration's
--    header: quinta/estate/farmhouse/land collapse into villa,
--    new_development_unit defaults to project_apartment. The ::text cast
--    keeps the literals as strings — safe even if some of these values
--    aren't present in the old enum on a given database. Idempotent.
update public.listings
    set property_type = 'villa'
    where property_type::text in ('farmhouse', 'estate', 'quinta', 'land');

update public.listings
    set property_type = 'project_apartment'
    where property_type::text = 'new_development_unit';

-- 1. Drop check constraints that reference the old enum values so the column
--    type swap doesn't trip over them.
alter table public.listings drop constraint if exists apartment_floor_check;
alter table public.listings drop constraint if exists land_plot_required_check;

-- 2. Create the new enum, swap the column over, then replace the old type.
create type public.property_type_v2 as enum (
    'apartment',
    'penthouse',
    'townhouse',
    'villa',
    'project_apartment',
    'project_villa'
);

alter table public.listings
    alter column property_type type public.property_type_v2
    using property_type::text::public.property_type_v2;

drop type public.property_type;
alter type public.property_type_v2 rename to property_type;

-- 3. Re-add the floor/plot constraints against the new enum values.
alter table public.listings
    add constraint apartment_floor_check
    check (
        property_type <> all (array[
            'apartment'::public.property_type,
            'penthouse'::public.property_type,
            'project_apartment'::public.property_type
        ])
        or floor_number is not null
    );

alter table public.listings
    add constraint land_plot_required_check
    check (
        property_type <> all (array[
            'villa'::public.property_type,
            'project_villa'::public.property_type
        ])
        or plot_size is not null
    );

-- 4. Seed EN + PT labels for the new typology so the UI localizes out of the
--    box. RU / ES can be filled in via the admin translations workflow.
insert into public.translations (namespace, key, en, pt_pt) values
    ('property_type', 'apartment',         'Apartment',           'Apartamento'),
    ('property_type', 'penthouse',         'Penthouse',           'Cobertura'),
    ('property_type', 'townhouse',         'Townhouse',           'Moradia em banda'),
    ('property_type', 'villa',             'Villa',               'Quinta'),
    ('property_type', 'project_apartment', 'Project / Apartment', 'Projeto / Apartamento'),
    ('property_type', 'project_villa',     'Project / Villa',     'Projeto / Quinta')
on conflict (namespace, key) do update
    set en     = excluded.en,
        pt_pt  = excluded.pt_pt;

commit;
