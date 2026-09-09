/**
 * Bundles the work migrations into one paste-ready SQL file.
 *
 * WHY THIS EXISTS: this repository holds three Supabase projects (main, shop,
 * work), so the work migrations live in `supabase/work/migrations/` rather
 * than the `supabase/migrations/` path the Supabase CLI expects. `supabase db
 * push` therefore cannot see them, and the working process has been to paste
 * SQL into the project's SQL editor.
 *
 * Pasting a dozen files by hand is where a half-applied schema comes from —
 * the exact failure that produces "column projects.progress does not exist" at
 * runtime. This concatenates them in filename order instead.
 *
 *   node scripts/bundle-work-migrations.mjs                 # every migration
 *   node scripts/bundle-work-migrations.mjs --since 2026082 # only newer ones
 *   node scripts/bundle-work-migrations.mjs --out apply.sql
 *
 * The output is ordinary SQL. Run it in the Supabase SQL editor for the
 * work project, or with psql against that database.
 *
 * NOTE ON RE-RUNNING: the migrations are forward-only, not idempotent —
 * `create table` and `create type` fail if the object already exists. Bundle
 * only what has not been applied yet, using --since.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const MIGRATIONS_DIR = path.join(process.cwd(), 'supabase', 'work', 'migrations')

function arg(name) {
  const index = process.argv.indexOf(name)
  return index === -1 ? undefined : process.argv[index + 1]
}

const since = arg('--since')
const out = arg('--out')

const files = (await readdir(MIGRATIONS_DIR))
  .filter((file) => file.endsWith('.sql'))
  .sort()
  // Filenames are timestamp-prefixed, so a lexicographic comparison is also a
  // chronological one.
  .filter((file) => !since || file >= since)

if (files.length === 0) {
  console.error(since ? `No migrations at or after ${since}.` : 'No migrations found.')
  process.exit(1)
}

const parts = [
  '-- =============================================================================',
  "-- Centered101's Work — bundled migrations",
  `-- Generated ${new Date().toISOString()} by scripts/bundle-work-migrations.mjs`,
  `-- Files: ${files.length}${since ? ` (from ${since})` : ''}`,
  '--',
  '-- Run this once, in full, against the work Supabase project. It is',
  '-- forward-only: running it twice will fail on the first `create table`.',
  '-- =============================================================================',
  '',
  // One transaction: a bundle that stops halfway leaves exactly the
  // half-applied schema this script exists to prevent. (An `ALTER TYPE ADD
  // VALUE` migration is the one exception — it runs outside the transaction,
  // see below — because Postgres will not let the new value be used otherwise.)
]

// `ALTER TYPE ... ADD VALUE` adds an enum value that Postgres refuses to USE
// (index predicates, some comparisons) until the adding transaction commits.
// Such a migration is deliberately split into its own file so it commits
// before the file that uses the value — a single wrapping transaction would
// put both in one tx and defeat that. So those files run in autocommit,
// between transactions, and everything else stays wrapped. `begin;` is
// emitted lazily so an ADD VALUE file at the very start does not produce a
// stray empty transaction.
const ADDS_ENUM_VALUE = /\balter\s+type\b[\s\S]*?\badd\s+value\b/i
let inTransaction = false

for (const file of files) {
  const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8')
  const isolate = ADDS_ENUM_VALUE.test(sql)

  if (isolate && inTransaction) {
    parts.push('commit;', '')
    inTransaction = false
  }
  if (!isolate && !inTransaction) {
    parts.push('begin;', '')
    inTransaction = true
  }

  parts.push(
    `-- ▼▼▼ ${file} ▼▼▼`,
    sql.trimEnd(),
    `-- ▲▲▲ ${file} ▲▲▲`,
    '',
  )
}

if (inTransaction) parts.push('commit;', '')

const bundle = parts.join('\n')

if (out) {
  await writeFile(out, bundle, 'utf8')
  console.error(`Wrote ${files.length} migrations to ${out}`)
} else {
  process.stdout.write(bundle)
}

for (const file of files) console.error(`  included ${file}`)
