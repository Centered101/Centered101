/**
 * Writes supabase-work/schema.sql and supabase-work/storage.sql from the
 * migrations.
 *
 *   npm run work:db:snapshot
 *
 * WHY BOTH EXIST, AND WHICH ONE IS THE TRUTH.
 *
 * The other two projects in this repo (supabase/, supabase-shop/) keep one
 * schema.sql, one storage.sql and one seed.sql. That works because they are
 * applied to an empty database.
 *
 * This project cannot work that way: its database is already live, and a
 * single schema.sql can only ever be applied to an empty one. Changing a
 * deployed schema needs incremental, ordered, forward-only steps — which is
 * what supabase-work/migrations/ is. It is also what `npm run work:db:validate`
 * applies in order to run its 86 RLS and business-rule tests, so collapsing
 * them would delete the only automated check this schema has.
 *
 * So the migrations stay the SOURCE OF TRUTH, and these two files are a
 * GENERATED SNAPSHOT of what they add up to — matching the house layout for
 * reading and for bootstrapping a fresh database, without pretending the live
 * one can be rebuilt from scratch.
 *
 * Regenerate after adding a migration. Never hand-edit the output: the next
 * run overwrites it.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.join(process.cwd(), 'supabase-work')
const MIGRATIONS = path.join(ROOT, 'migrations')

/**
 * A migration belongs in storage.sql when it touches the `storage` schema —
 * buckets and object policies — and in schema.sql otherwise. Detected from the
 * content rather than the filename so a storage change tucked into a
 * differently named migration still lands in the right file.
 */
function isStorage(sql) {
  return /\bstorage\.\w/.test(sql)
}

function header(title, note, files) {
  return [
    '-- ============================================================================',
    `-- Centered101's Work — ${title}`,
    '--',
    '-- GENERATED FILE. DO NOT EDIT.',
    '--   Source of truth: supabase-work/migrations/',
    '--   Regenerate with: npm run work:db:snapshot',
    '--',
    `-- ${note}`,
    '--',
    `-- Built from ${files.length} migration(s):`,
    ...files.map((f) => `--   ${f}`),
    '-- ============================================================================',
    '',
  ].join('\n')
}

const all = (await readdir(MIGRATIONS)).filter((f) => f.endsWith('.sql')).sort()

if (all.length === 0) {
  console.error('No migrations found in supabase-work/migrations/.')
  process.exit(1)
}

const schemaParts = []
const storageParts = []
const schemaFiles = []
const storageFiles = []

for (const file of all) {
  const sql = (await readFile(path.join(MIGRATIONS, file), 'utf8')).trimEnd()
  const target = isStorage(sql) ? storageParts : schemaParts
  const names = isStorage(sql) ? storageFiles : schemaFiles

  names.push(file)
  target.push(`-- ▼ ${file}`, sql, `-- ▲ ${file}`, '')
}

await writeFile(
  path.join(ROOT, 'schema.sql'),
  header(
    'database schema',
    'Tables, types, functions, indexes, triggers and RLS policies. Storage buckets and object policies live in storage.sql; seed data in seed.sql.',
    schemaFiles,
  ) + schemaParts.join('\n'),
  'utf8',
)

await writeFile(
  path.join(ROOT, 'storage.sql'),
  header(
    'storage buckets and policies',
    'Buckets and object policies only. Apply after schema.sql.',
    storageFiles,
  ) + storageParts.join('\n'),
  'utf8',
)

console.error(`schema.sql   ${schemaFiles.length} migrations`)
console.error(`storage.sql  ${storageFiles.length} migrations`)
console.error('seed.sql     hand-written, not generated')
