/**
 * Schema validation harness.
 *
 * Runs every migration against a real PostgreSQL instance (PGlite — Postgres
 * compiled to WASM, in-process), then exercises the RLS policies as actual
 * users to prove they do what the comments claim.
 *
 * Why this exists: a migration that parses is not a migration that works, and
 * an RLS policy that exists is not an RLS policy that denies. The tests below
 * are the brief's Phase 32 rules stated as SQL rather than as intentions.
 *
 *   npm run db:validate
 */
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

import { PG_ENUM_MAP } from '../lib/work/types/enums.ts'

const MIGRATIONS_DIR = path.join(process.cwd(), 'supabase-work', 'migrations')

/**
 * Supabase provides auth.users, the auth.uid() helper and the anon /
 * authenticated / service_role roles. PGlite does not, so we recreate just
 * enough of that contract for the migrations to be exercised faithfully.
 */
const SUPABASE_SHIM = `
create schema if not exists auth;

do $$ begin
  create role anon nologin;          exception when duplicate_object then null; end $$;
do $$ begin
  create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin
  create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;

create table if not exists auth.users (
  id                 uuid primary key default gen_random_uuid(),
  email              text unique,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now()
);

-- Stands in for Supabase's JWT-derived auth.uid(). The tests set
-- app.test_user_id to impersonate a signed-in user.
create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('app.test_user_id', true), '')::uuid;
$$;

grant usage on schema auth to anon, authenticated, service_role;
`

/**
 * Supabase pre-configures default privileges so new public tables are granted
 * to anon/authenticated, with RLS doing the actual restricting. Mirror that,
 * otherwise every policy test would fail on a missing GRANT rather than on the
 * policy under test.
 */
const GRANTS = `
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables    in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all routines  in schema public to anon, authenticated, service_role;
grant execute on all routines in schema app to anon, authenticated, service_role;
`

let passed = 0
let failed = 0
const failures = []

function check(name, condition, detail = '') {
  if (condition) {
    passed++
    console.log(`  [32mPASS[0m  ${name}`)
  } else {
    failed++
    failures.push(name)
    console.log(`  [31mFAIL[0m  ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

/** Runs a callback impersonating a user under the `authenticated` role. */
async function asUser(db, userId, fn) {
  await db.exec('begin')
  try {
    await db.exec(`set local role authenticated`)
    await db.exec(`set local app.test_user_id = '${userId}'`)
    return await fn()
  } finally {
    await db.exec('rollback')
  }
}

/** Counts rows visible to a given user, returning -1 if the query errors. */
async function countAs(db, userId, sql) {
  return asUser(db, userId, async () => {
    try {
      const r = await db.query(sql)
      return Number(r.rows[0].count)
    } catch {
      return -1
    }
  })
}

/** Attempts a write as a user; resolves to the error message, or null on success. */
async function writeAs(db, userId, sql) {
  return asUser(db, userId, async () => {
    try {
      await db.query(sql)
      return null
    } catch (error) {
      return error.message
    }
  })
}

async function main() {
  const db = await PGlite.create({ extensions: { pgcrypto, pg_trgm } })

  console.log('\n[1mSetting up Supabase-compatible environment[0m')
  await db.exec(SUPABASE_SHIM)
  console.log('  auth schema, roles and auth.uid() shim ready')

  // ---------------------------------------------------------------------------
  console.log('\n[1mApplying migrations[0m')
  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort()

  if (files.length === 0) {
    console.error('No migrations found.')
    process.exit(1)
  }

  for (const file of files) {
    const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8')
    try {
      await db.exec(sql)
      console.log(`  [32mok[0m    ${file}`)
    } catch (error) {
      console.error(`  [31mFAILED[0m ${file}`)
      console.error(`        ${error.message}`)
      process.exit(1)
    }
  }
  await db.exec(GRANTS)

  // ---------------------------------------------------------------------------
  console.log('\n[1mStructural checks[0m')

  const expectedTables = [
    'profiles',
    'organizations',
    'organization_members',
    'clients',
    'projects',
    'project_members',
    'project_scopes',
    'project_features',
    'project_pricing_items',
    'agreements',
    'agreement_versions',
    'agreement_acceptances',
    'payment_plans',
    'payment_milestones',
    'payments',
    'payment_provider_events',
    'documents',
    'activity_logs',
  ]
  const tables = (
    await db.query(
      `select table_name from information_schema.tables
       where table_schema = 'public' and table_type = 'BASE TABLE'`,
    )
  ).rows.map((r) => r.table_name)

  for (const t of expectedTables) {
    check(`table ${t} exists`, tables.includes(t))
  }

  // Every table must have RLS on. A table that ships without it is a table
  // that is readable by anyone holding the anon key.
  const noRls = (
    await db.query(
      `select c.relname from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`,
    )
  ).rows.map((r) => r.relname)
  check(
    'RLS enabled on every public table',
    noRls.length === 0,
    `missing on: ${noRls.join(', ')}`,
  )

  const policyCount = Number(
    (
      await db.query(
        `select count(*)::int as count from pg_policies where schemaname = 'public'`,
      )
    ).rows[0].count,
  )
  check(`policies defined (${policyCount})`, policyCount > 30)

  // Money must never be floating point.
  const floatMoney = (
    await db.query(
      `select table_name, column_name, data_type from information_schema.columns
       where table_schema = 'public'
         and (column_name like '%amount%' or column_name = 'unit_amount')
         and data_type not in ('bigint', 'integer')`,
    )
  ).rows
  check(
    'all money columns are integer types',
    floatMoney.length === 0,
    floatMoney.map((r) => `${r.table_name}.${r.column_name}:${r.data_type}`).join(', '),
  )

  // Every foreign key should be indexed, or cascading deletes and joins do
  // sequential scans as the table grows.
  const unindexedFks = (
    await db.query(`
      select con.conrelid::regclass::text as tbl, att.attname as col
      from pg_constraint con
      join pg_namespace n on n.oid = con.connamespace and n.nspname = 'public'
      cross join lateral unnest(con.conkey) as k(attnum)
      join pg_attribute att on att.attrelid = con.conrelid and att.attnum = k.attnum
      where con.contype = 'f'
        and array_length(con.conkey, 1) = 1
        and not exists (
          select 1 from pg_index i
          where i.indrelid = con.conrelid and i.indkey[0] = k.attnum
        )
    `)
  ).rows
  check(
    'every single-column foreign key is indexed',
    unindexedFks.length === 0,
    unindexedFks.map((r) => `${r.tbl}.${r.col}`).join(', '),
  )

  // ---------------------------------------------------------------------------
  // Prove the hand-written TypeScript unions match the database exactly, so
  // lib/types/enums.ts cannot silently drift from the schema.
  console.log('\n[1mTypeScript enum parity[0m')

  const dbEnums = new Map()
  for (const row of (
    await db.query(`
      select t.typname as name, e.enumlabel as label
      from pg_type t
      join pg_enum e on e.enumtypid = t.oid
      join pg_namespace n on n.oid = t.typnamespace and n.nspname = 'public'
      order by t.typname, e.enumsortorder
    `)
  ).rows) {
    if (!dbEnums.has(row.name)) dbEnums.set(row.name, [])
    dbEnums.get(row.name).push(row.label)
  }

  for (const [pgName, tsValues] of Object.entries(PG_ENUM_MAP)) {
    const dbValues = dbEnums.get(pgName)
    if (!dbValues) {
      check(`enum ${pgName} exists in the database`, false, 'declared in TS but missing in SQL')
      continue
    }
    const same =
      dbValues.length === tsValues.length && dbValues.every((v, i) => v === tsValues[i])
    check(
      `enum ${pgName} matches TypeScript (${dbValues.length} values)`,
      same,
      same ? '' : `db=[${dbValues}] ts=[${tsValues}]`,
    )
  }

  const untyped = [...dbEnums.keys()].filter((n) => !(n in PG_ENUM_MAP))
  check(
    'every database enum is mirrored in TypeScript',
    untyped.length === 0,
    untyped.join(', '),
  )

  // ---------------------------------------------------------------------------
  console.log('\n[1mSeeding two isolated tenants[0m')

  const ids = (
    await db.query(`
      -- Agency staff
      with u as (
        insert into auth.users (email) values
          ('admin@agency.test'),      -- 0 agency admin
          ('dev@agency.test'),        -- 1 agency developer
          ('clienta@abc.test'),       -- 2 client A owner
          ('clientb@xyz.test'),       -- 3 client B owner
          ('outsider@nowhere.test')   -- 4 no memberships at all
        returning id, email
      )
      select
        (select id from u where email = 'admin@agency.test')     as admin_id,
        (select id from u where email = 'dev@agency.test')       as dev_id,
        (select id from u where email = 'clienta@abc.test')      as client_a_id,
        (select id from u where email = 'clientb@xyz.test')      as client_b_id,
        (select id from u where email = 'outsider@nowhere.test') as outsider_id
    `)
  ).rows[0]

  check(
    'profiles auto-created by auth.users trigger',
    Number((await db.query(`select count(*)::int as count from profiles`)).rows[0].count) === 5,
  )

  const seed = (
    await db.query(
      `
      with org as (
        insert into organizations (name, slug, created_by)
        values ('Centered Studio', 'centered', $1) returning id
      ),
      mem as (
        insert into organization_members (organization_id, profile_id, role)
        select org.id, x.pid, x.role from org,
          (values ($1::uuid, 'admin'::org_role), ($2::uuid, 'developer'::org_role)) as x(pid, role)
        returning 1
      ),
      ca as (
        insert into clients (organization_id, name, client_code, created_by)
        select org.id, 'ABC Company', 'CLI-2026-001', $1 from org returning id, organization_id
      ),
      cb as (
        insert into clients (organization_id, name, client_code, created_by)
        select org.id, 'XYZ Limited', 'CLI-2026-002', $1 from org returning id, organization_id
      ),
      pa as (
        insert into projects (organization_id, client_id, project_code, name, total_amount, created_by)
        select ca.organization_id, ca.id, 'PRJ-2026-001', 'ABC Website', 3000000, $1 from ca
        returning id
      ),
      pb as (
        insert into projects (organization_id, client_id, project_code, name, total_amount, created_by)
        select cb.organization_id, cb.id, 'PRJ-2026-002', 'XYZ Platform', 4800000, $1 from cb
        returning id
      ),
      pma as (
        insert into project_members (project_id, profile_id, role)
        select pa.id, $3, 'client_owner' from pa returning 1
      ),
      pmb as (
        insert into project_members (project_id, profile_id, role)
        select pb.id, $4, 'client_owner' from pb returning 1
      )
      select (select id from org) as org_id,
             (select id from pa)  as project_a,
             (select id from pb)  as project_b,
             (select id from ca)  as client_a_co,
             (select id from cb)  as client_b_co
      `,
      [ids.admin_id, ids.dev_id, ids.client_a_id, ids.client_b_id],
    )
  ).rows[0]

  console.log(`  org ${seed.org_id}`)
  console.log(`  project A ${seed.project_a} (ABC)`)
  console.log(`  project B ${seed.project_b} (XYZ)`)

  // ---------------------------------------------------------------------------
  console.log('\n[1mRLS — tenant isolation[0m')

  check(
    'agency admin sees both projects',
    (await countAs(db, ids.admin_id, `select count(*)::int as count from projects`)) === 2,
  )
  check(
    'client A sees exactly one project',
    (await countAs(db, ids.client_a_id, `select count(*)::int as count from projects`)) === 1,
  )
  check(
    'client A sees only their own project',
    (await countAs(
      db,
      ids.client_a_id,
      `select count(*)::int as count from projects where id = '${seed.project_a}'`,
    )) === 1,
  )

  // The headline rule from the brief: knowing the UUID must not be enough.
  check(
    "client A cannot read client B's project even with the exact UUID",
    (await countAs(
      db,
      ids.client_b_id,
      `select count(*)::int as count from projects where id = '${seed.project_a}'`,
    )) === 0,
  )
  check(
    'a user with no memberships sees nothing',
    (await countAs(db, ids.outsider_id, `select count(*)::int as count from projects`)) === 0,
  )
  check(
    'clients cannot enumerate the agency customer list',
    (await countAs(db, ids.client_a_id, `select count(*)::int as count from clients`)) === 0,
  )
  check(
    'agency staff can read the customer list',
    (await countAs(db, ids.admin_id, `select count(*)::int as count from clients`)) === 2,
  )

  // ---------------------------------------------------------------------------
  console.log('\n[1mRLS — write protection[0m')

  const stealErr = await writeAs(
    db,
    ids.client_b_id,
    `update projects set name = 'pwned' where id = '${seed.project_a}'`,
  )
  const stealCount = await countAs(
    db,
    ids.admin_id,
    `select count(*)::int as count from projects where name = 'pwned'`,
  )
  check(
    "client B cannot rename client A's project",
    stealCount === 0,
    stealErr ?? 'no error raised',
  )

  const selfPromote = await writeAs(
    db,
    ids.dev_id,
    `update organization_members set role = 'super_admin' where profile_id = '${ids.dev_id}'`,
  )
  const promoted = await countAs(
    db,
    ids.admin_id,
    `select count(*)::int as count from organization_members
     where profile_id = '${ids.dev_id}' and role = 'super_admin'`,
  )
  check(
    'a developer cannot promote themselves to super_admin',
    promoted === 0,
    selfPromote ?? '',
  )

  // Seed a payment so clients have something to try to tamper with.
  await db.exec(`
    insert into payment_plans (project_id, type, total_amount)
    values ('${seed.project_a}', 'DEPOSIT_FINAL', 3000000);
    insert into payment_milestones (plan_id, project_id, sequence, name, percentage_bp, amount, unlock_rules)
    select id, '${seed.project_a}', 1, 'มัดจำ', 3000, 900000, '["workspace"]'::jsonb from payment_plans
    where project_id = '${seed.project_a}';
    insert into payment_milestones (plan_id, project_id, sequence, name, percentage_bp, amount, unlock_rules)
    select id, '${seed.project_a}', 2, 'งวดสุดท้าย', 7000, 2100000, '["source_code"]'::jsonb from payment_plans
    where project_id = '${seed.project_a}';
    insert into payments (project_id, amount, status)
    values ('${seed.project_a}', 900000, 'PENDING');
  `)

  check(
    'client A can read their own milestones',
    (await countAs(
      db,
      ids.client_a_id,
      `select count(*)::int as count from payment_milestones where project_id = '${seed.project_a}'`,
    )) === 2,
  )

  const markPaid = await writeAs(
    db,
    ids.client_a_id,
    `update payments set status = 'PAID', paid_at = now() where project_id = '${seed.project_a}'`,
  )
  const paidCount = await countAs(
    db,
    ids.admin_id,
    `select count(*)::int as count from payments where status = 'PAID'`,
  )
  check('a client cannot mark their own payment PAID', paidCount === 0, markPaid ?? '')

  const forgeInsert = await writeAs(
    db,
    ids.client_a_id,
    `insert into payments (project_id, amount, status, paid_at)
     values ('${seed.project_a}', 2100000, 'PAID', now())`,
  )
  check(
    'a client cannot insert a PAID payment',
    forgeInsert !== null,
    'insert unexpectedly allowed',
  )

  // ---------------------------------------------------------------------------
  console.log('\n[1mBusiness rules[0m')

  let err = await writeAs(
    db,
    ids.admin_id,
    `update payment_milestones set status = 'PAID' where project_id = '${seed.project_a}' and sequence = 1`,
  )
  check('a milestone cannot be PAID without paid_at', err !== null, 'constraint did not fire')

  // Deferred constraint trigger: milestones must sum to the plan total.
  try {
    await db.exec('begin')
    await db.exec(`
      insert into payment_milestones (plan_id, project_id, sequence, name, amount)
      select id, '${seed.project_a}', 3, 'ส่วนเกิน', 500000 from payment_plans
      where project_id = '${seed.project_a}'
    `)
    await db.exec('commit')
    check('milestone amounts must sum to the plan total', false, 'over-allocation was accepted')
  } catch {
    await db.exec('rollback').catch(() => {})
    check('milestone amounts must sum to the plan total', true)
  }

  err = await writeAs(
    db,
    ids.admin_id,
    `insert into project_pricing_items (project_id, name, unit_amount, created_by)
     values ('${seed.project_a}', 'ติดลบ', -100, '${ids.admin_id}')`,
  )
  check('pricing amounts cannot be negative', err !== null)

  // amount is computed by trigger, so it cannot disagree with its own inputs.
  await db.exec(`
    insert into project_pricing_items (project_id, name, quantity, unit_amount, amount, created_by)
    values ('${seed.project_a}', 'พัฒนาเว็บไซต์', 3, 500000, 999, '${ids.admin_id}')
  `)
  const computed = Number(
    (
      await db.query(
        `select amount from project_pricing_items where project_id = '${seed.project_a}'`,
      )
    ).rows[0].amount,
  )
  check('pricing line total is computed, not trusted', computed === 1500000, `got ${computed}`)

  const totals = (
    await db.query(
      `select * from project_pricing_totals where project_id = '${seed.project_a}'`,
    )
  ).rows[0]
  check('pricing totals view sums correctly', Number(totals.subtotal) === 1500000)

  // Append-only tables.
  await db.exec(`
    insert into agreements (project_id, title) values ('${seed.project_a}', 'สัญญา');
    insert into agreement_versions (agreement_id, project_id, version, body, body_hash, total_amount)
    select id, '${seed.project_a}', 1, 'terms', encode(digest('terms','sha256'),'hex'), 3000000
    from agreements where project_id = '${seed.project_a}';
  `)
  try {
    await db.exec(`update agreement_versions set body = 'tampered'`)
    check('agreement versions are immutable', false, 'update was accepted')
  } catch {
    check('agreement versions are immutable', true)
  }

  await db.exec(
    `select app.log_activity('${seed.org_id}', 'project.created', 'project', '${seed.project_a}', '${seed.project_a}')`,
  )
  try {
    await db.exec(`delete from activity_logs`)
    check('activity logs are immutable', false, 'delete was accepted')
  } catch {
    check('activity logs are immutable', true)
  }

  check(
    'client sees activity only on their own project',
    (await countAs(db, ids.client_a_id, `select count(*)::int as count from activity_logs`)) ===
      1,
  )
  check(
    'unrelated client sees no activity',
    (await countAs(db, ids.client_b_id, `select count(*)::int as count from activity_logs`)) ===
      0,
  )

  // Draft documents must not reach the portal.
  await db.exec(`
    insert into documents (organization_id, project_id, type, status, title, amount)
    values ('${seed.org_id}', '${seed.project_a}', 'INVOICE', 'DRAFT', 'ร่างใบแจ้งหนี้', 900000);
    insert into documents (organization_id, project_id, type, status, title, amount, document_number, issued_at)
    values ('${seed.org_id}', '${seed.project_a}', 'INVOICE', 'ISSUED', 'ใบแจ้งหนี้', 900000, 'INV-2026-001', now());
  `)
  check(
    'client sees issued documents but not drafts',
    (await countAs(db, ids.client_a_id, `select count(*)::int as count from documents`)) === 1,
  )
  check(
    'agency staff see drafts too',
    (await countAs(db, ids.admin_id, `select count(*)::int as count from documents`)) === 2,
  )

  err = await writeAs(
    db,
    ids.admin_id,
    `insert into documents (organization_id, project_id, type, status, title)
     values ('${seed.org_id}', '${seed.project_a}', 'INVOICE', 'ISSUED', 'ไม่มีเลขที่')`,
  )
  check('an issued document must carry a number and issue date', err !== null)

  // Cross-tenant referential integrity.
  err = await writeAs(
    db,
    ids.admin_id,
    `insert into organizations (name, slug, created_by)
     values ('Rogue', 'rogue', '${ids.admin_id}')`,
  )
  check('any authenticated user may create an organization', err === null, err ?? '')

  // Display codes are per-organization unique.
  err = await writeAs(
    db,
    ids.admin_id,
    `insert into projects (organization_id, client_id, project_code, name, created_by)
     values ('${seed.org_id}', '${seed.client_a_co}', 'PRJ-2026-001', 'ซ้ำ', '${ids.admin_id}')`,
  )
  check('project_code is unique within an organization', err !== null)

  const code = (await db.query(`select app.next_code('${seed.org_id}', 'INV') as code`)).rows[0]
    .code
  check(`code generator produces ${code}`, /^INV-\d{4}-\d{3}$/.test(code))

  // ---------------------------------------------------------------------------
  console.log(`\n[1mResult[0m  ${passed} passed, ${failed} failed\n`)
  if (failed > 0) {
    console.log('Failures:')
    for (const f of failures) console.log(`  - ${f}`)
    process.exit(1)
  }
  await db.close()
}

main().catch((error) => {
  console.error('\nHarness error:', error)
  process.exit(1)
})
