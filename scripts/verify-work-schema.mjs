/**
 * Writes verify-work-schema.sql — a read-only query that reports which parts
 * of the schema are present in a database and which are missing.
 *
 *   npm run work:db:verify          # writes verify-work-schema.sql
 *
 * Paste the output into the Supabase SQL editor for the work project. Every
 * row should say OK; a MISSING row names a migration that has not been applied
 * there.
 *
 * WHY IT IS GENERATED RATHER THAN WRITTEN BY HAND. The previous verification
 * file was hand-written for one phase, and by the time two more migrations
 * landed it was quietly checking an old schema and still reporting all-OK —
 * a check that goes stale silently is worse than no check.
 *
 * The expected objects are not parsed out of the SQL either. They are obtained
 * by APPLYING the migrations to a throwaway in-process Postgres and asking it
 * what exists, so the expectation is whatever the migrations actually build,
 * not whatever a regular expression could recognise in them.
 */
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const MIGRATIONS = path.join(process.cwd(), 'supabase-work', 'migrations')
const OUT = path.join(process.cwd(), 'verify-work-schema.sql')

// Just enough of Supabase for the migrations to apply. Mirrors the shim in
// scripts/validate-work-schema.mjs.
const SHIM = `
create schema if not exists auth;
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(), email text unique,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now());
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('app.test_user_id', true), '')::uuid; $$;
grant usage on schema auth to anon, authenticated, service_role;
create schema if not exists storage;
create table if not exists storage.buckets (
  id text primary key, name text not null, public boolean not null default false,
  file_size_limit bigint, allowed_mime_types text[],
  created_at timestamptz not null default now());
grant usage on schema storage to anon, authenticated, service_role;
`

const db = await PGlite.create({ extensions: { pgcrypto, pg_trgm } })
await db.exec(SHIM)

const files = (await readdir(MIGRATIONS)).filter((f) => f.endsWith('.sql')).sort()
for (const file of files) {
  await db.exec(await readFile(path.join(MIGRATIONS, file), 'utf8'))
}

const rows = async (sql) => (await db.query(sql)).rows

const tables = await rows(`
  select tablename as name from pg_tables
  where schemaname = 'public' order by tablename`)

const enums = await rows(`
  select t.typname as name from pg_type t
  join pg_namespace n on n.oid = t.typnamespace
  where n.nspname = 'public' and t.typtype = 'e' order by t.typname`)

// Extension-owned functions are excluded. pgcrypto and pg_trgm install theirs
// into `public` here, but Supabase puts extensions in their own schema — so
// listing them would produce a screenful of MISSING rows for functions this
// project never created and does not need there.
const functions = await rows(`
  select n.nspname || '.' || p.proname as name
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('public', 'app')
    and not exists (
      select 1 from pg_depend d
      where d.objid = p.oid and d.deptype = 'e'
    )
  order by 1`)

const triggers = await rows(`
  select tgname as name from pg_trigger where not tgisinternal order by tgname`)

// RLS is the control this schema leans on hardest, so it is checked per table
// rather than as one total: a table that lost its policies would otherwise be
// hidden by the others still having theirs.
const policies = await rows(`
  select tablename as name, count(*)::int as n from pg_policies
  where schemaname = 'public' group by tablename order by tablename`)

const rlsTables = await rows(`
  select c.relname as name from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
  order by c.relname`)

const buckets = await rows(`select id as name, public from storage.buckets order by id`)

const columns = await rows(`
  select table_name || '.' || column_name as name
  from information_schema.columns
  where table_schema = 'public'
    and (table_name, column_name) in (
      ('projects','progress'), ('projects','project_code'), ('documents','storage_path'))
  order by 1`)

const q = (s) => "'" + String(s).split("'").join("''") + "'"

const section = (label, list) =>
  list.length === 0
    ? null
    : `select ${q(label)} as kind, t.name, case when ${list[0].check} then 'OK' else 'MISSING' end as status
from (values ${list.map((i) => `(${q(i.name)})`).join(', ')}) as t(name)`

// Each block is its own UNION arm with its own existence test.
const blocks = [
  {
    kind: 'table',
    names: tables.map((r) => r.name),
    test: `exists (select 1 from pg_tables where schemaname='public' and tablename = t.name)`,
  },
  {
    kind: 'enum type',
    names: enums.map((r) => r.name),
    test: `exists (select 1 from pg_type ty join pg_namespace n on n.oid=ty.typnamespace
           where n.nspname='public' and ty.typtype='e' and ty.typname = t.name)`,
  },
  {
    kind: 'function',
    names: functions.map((r) => r.name),
    test: `exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
           where n.nspname || '.' || p.proname = t.name)`,
  },
  {
    kind: 'trigger',
    names: triggers.map((r) => r.name),
    test: `exists (select 1 from pg_trigger where not tgisinternal and tgname = t.name)`,
  },
  {
    kind: 'RLS enabled',
    names: rlsTables.map((r) => r.name),
    test: `exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
           where n.nspname='public' and c.relkind='r' and c.relrowsecurity and c.relname = t.name)`,
  },
  {
    kind: 'column',
    names: columns.map((r) => r.name),
    test: `exists (select 1 from information_schema.columns
           where table_schema='public' and table_name || '.' || column_name = t.name)`,
  },
]

const arms = blocks
  .filter((b) => b.names.length > 0)
  .map(
    (b) => `select ${q(b.kind)} as kind, t.name,
       case when ${b.test} then 'OK' else 'MISSING' end as status
from (values ${b.names.map((n) => `(${q(n)})`).join(',\n              ')}) as t(name)`,
  )

// Policy counts: fewer than expected means some were dropped or never applied.
arms.push(
  `select 'policies' as kind, t.name,
       case when coalesce((select count(*) from pg_policies p
                           where p.schemaname='public' and p.tablename = t.name), 0) >= t.n
            then 'OK (' || coalesce((select count(*) from pg_policies p
                                     where p.schemaname='public' and p.tablename = t.name), 0) || '/' || t.n || ')'
            else 'MISSING (' || coalesce((select count(*) from pg_policies p
                                          where p.schemaname='public' and p.tablename = t.name), 0) || '/' || t.n || ')'
       end as status
from (values ${policies.map((p) => `(${q(p.name)}, ${p.n})`).join(',\n              ')}) as t(name, n)`,
)

arms.push(
  `select 'storage bucket' as kind, t.name,
       coalesce((select case when b.public then 'WRONG — PUBLIC' else 'OK (private)' end
                 from storage.buckets b where b.id = t.name), 'MISSING') as status
from (values ${buckets.map((b) => `(${q(b.name)})`).join(', ')}) as t(name)`,
)

const total =
  tables.length + enums.length + functions.length + triggers.length +
  rlsTables.length + columns.length + policies.length + buckets.length

const sql = `-- ============================================================================
-- Centered101's Work — is this database up to date?
--
-- GENERATED FILE. DO NOT EDIT.
--   Source of truth: supabase-work/migrations/ (${files.length} migrations)
--   Regenerate with: npm run work:db:verify
--
-- READ-ONLY. Safe to run any number of times, on any database.
--
-- Run it in the Supabase SQL editor for the work project. Every one of the
-- ${total} rows should say OK. A MISSING row means that object was never
-- created there — apply the migration that adds it.
--
-- Built from:
${files.map((f) => `--   ${f}`).join('\n')}
-- ============================================================================

${arms.join('\n\nunion all\n\n')}

order by 1, 2;
`

await writeFile(OUT, sql, 'utf8')

console.error(`wrote ${path.basename(OUT)} — ${total} checks from ${files.length} migrations`)
console.error(
  `  ${tables.length} tables, ${enums.length} enums, ${functions.length} functions, ` +
    `${triggers.length} triggers, ${rlsTables.length} RLS, ${policies.length} policy sets, ` +
    `${buckets.length} buckets, ${columns.length} columns`,
)
