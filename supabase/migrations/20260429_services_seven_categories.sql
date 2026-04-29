-- 20260429_services_seven_categories.sql
-- Replaces the four legacy service categories with the new seven-tab structure
-- used on the homepage. Old enum values stay (Postgres can't drop enum values
-- safely without complex type-swap). All existing service rows are
-- soft-archived so the homepage will only show the new content. Old rows can
-- be deleted manually later via the admin once everything is verified.

-- Step A — extend the enum with 7 new values.
-- Each ALTER TYPE ADD VALUE must be its own statement. Don't wrap in BEGIN/COMMIT.

ALTER TYPE public.service_category ADD VALUE IF NOT EXISTS 'settling_in';
ALTER TYPE public.service_category ADD VALUE IF NOT EXISTS 'health';
ALTER TYPE public.service_category ADD VALUE IF NOT EXISTS 'education';
ALTER TYPE public.service_category ADD VALUE IF NOT EXISTS 'lifestyle';
ALTER TYPE public.service_category ADD VALUE IF NOT EXISTS 'environment';
ALTER TYPE public.service_category ADD VALUE IF NOT EXISTS 'leisure';
ALTER TYPE public.service_category ADD VALUE IF NOT EXISTS 'signature';

-- Step B — soft-archive any pre-existing service rows (the legacy 4-column data).
-- This keeps the rows in the table for later inspection but hides them from the public site.
UPDATE public.services
SET is_active = false
WHERE category IN ('administrative', 'healthcare_family', 'home', 'investment_advisory');
