-- Property typology refactor.
--
-- Narrows the property_type enum to the 6 editorial categories used by the
-- curated catalog:
--   apartment, penthouse, townhouse, villa, project_apartment, project_villa
--
-- Removed values are collapsed as follows:
--   farmhouse, estate, quinta, land   -> villa
--   new_development_unit              -> project_apartment
--
-- Strategy: pivot the column through `text` for the remap so we can hold
-- transitional values regardless of which enum (old or new) is currently
-- bound. Concretely:
--   1. drop check constraints that reference the old enum
--   2. cast the column to text
--   3. UPDATE the legacy values to surviving canonical ones
--   4. drop the old enum, create the new enum with the same name
--   5. cast the column back to the new enum
--   6. re-add the constraints, seed translations
--
-- The whole thing runs in one transaction. Re-running on an already-migrated
-- db is a no-op: the constraint drops, type drop, type create, and column
-- cast all become idempotent (or guarded) and the UPDATEs match zero rows.

begin;

-- 1. Drop check constraints that reference the old enum values so the column
--    type swap doesn't trip over them.
alter table public.listings drop constraint if exists apartment_floor_check;
alter table public.listings drop constraint if exists land_plot_required_check;

-- 2. Convert the column to plain text. This holds any value during the
--    remap, including values that are in neither the old enum nor the new
--    one (e.g. when we're about to write 'project_apartment' but the
--    column is still bound to the old enum which doesn't know that value).
alter table public.listings
    alter column property_type type text
    using property_type::text;

-- 3. Remap legacy categories. Now that the column is text, both sides of
--    the comparison and the new value are plain strings — no enum
--    coercion can fail.
update public.listings
    set property_type = 'villa'
    where property_type in ('farmhouse', 'estate', 'quinta', 'land');

update public.listings
    set property_type = 'project_apartment'
    where property_type = 'new_development_unit';

-- 4. Replace the enum. Drop the old one (now unreferenced) and create the
--    new one under the same name so nothing downstream needs to know.
drop type if exists public.property_type;

create type public.property_type as enum (
    'apartment',
    'penthouse',
    'townhouse',
    'villa',
    'project_apartment',
    'project_villa'
);

-- 5. Bind the column back to the enum. NOT NULL is preserved across
--    ALTER COLUMN TYPE, no need to re-assert it.
alter table public.listings
    alter column property_type type public.property_type
    using property_type::public.property_type;

-- 6. Re-add the floor/plot constraints against the new enum values.
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

-- 7. Seed EN + PT labels for the new typology so the UI localizes out of the
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
