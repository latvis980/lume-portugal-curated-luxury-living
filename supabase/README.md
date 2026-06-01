# Supabase migrations & schema

This directory is the **single source of truth** for the Lume Postgres schema
on Supabase (project `ryizbwtscuczqusoeuvc`).

## Files

- `migrations/` — ordered SQL files applied in timestamp order by the Supabase
  CLI. Every schema change lives here. **Never edit a file after it has been
  pushed.** Add a new migration instead.
- `schema.sql` — full `pg_dump` of the `public` schema. Regenerated on every
  migration via `npm run db:dump`. Committed so PRs show the schema diff in
  plain SQL.
- `config.toml` — Supabase CLI project config.

## Day-to-day workflow

1. Pull the latest schema from production into a fresh migration if anything
   was changed in the dashboard since you last synced:
   ```
   npm run db:pull
   ```
   Review the generated file and commit it.

2. Make a schema change locally (e.g. add a column in a local `psql`),
   then capture it as a migration:
   ```
   npm run db:diff add_foo_column
   ```

3. Apply pending migrations to the linked remote project:
   ```
   npm run db:push
   ```

4. Refresh the committed snapshot:
   ```
   npm run db:dump
   git add supabase/schema.sql
   ```

## Rules

- **No schema edits in the Supabase dashboard.** If it happens by accident,
  immediately run `npm run db:pull` and commit the generated migration so
  the diff is visible in code review.
- **Never modify an applied migration.** Add a new one. Old migrations are
  historical record.
- **Renames are two-step:** add the new column + backfill in one migration;
  drop the old column in a follow-up *after* application code is updated and
  deployed. This prevents silent content loss between deploys.
- **Translation seed data lives in migrations**, not in the dashboard. New
  keys go in via `INSERT ... ON CONFLICT (namespace, key) DO UPDATE`. PRs
  then show every new key that the frontend will start calling.

## Bootstrap

The `20260101000000_baseline_dashboard_schema.sql` migration recreates every
table, enum, index, trigger, and policy that was originally built in the
Supabase dashboard before this folder became authoritative. It is idempotent
(`CREATE ... IF NOT EXISTS`) so it is safe to run against the live database;
on a fresh database it builds the schema from scratch before the older
content-only migrations seed it.

## CI

`.github/workflows/db-check.yml` runs on every PR. It starts a clean local
Postgres, applies every migration in order, dumps the resulting schema, and
fails the build if it differs from the committed `schema.sql`. This catches:

- migrations that don't reproduce the snapshot,
- snapshot edits that have no matching migration,
- accidental edits to applied migrations.
