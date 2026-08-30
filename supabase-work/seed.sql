-- =============================================================================
-- DEVELOPMENT SEED — Centered101's Work
-- =============================================================================
-- Realistic data for local and preview work: one agency, two client companies
-- that must never see each other, two projects, a payment plan with paid and
-- unpaid milestones, an invoice, a preview deployment, a maintenance retainer,
-- a change request and an audit trail.
--
-- RUN IT LIKE THIS:
--   psql "$WORK_DATABASE_URL" -f supabase-work/seed.sql
-- or paste it into the Supabase SQL editor for the work project.
--
-- -----------------------------------------------------------------------------
-- THE CONFIGURATION BLOCK BELOW HOLDS REAL DEVELOPMENT ADDRESSES.
-- -----------------------------------------------------------------------------
-- They are committed so the file runs unedited. If that is not wanted, put the
-- placeholders back and keep the real ones out of the repo with:
--
--   git update-index --skip-worktree supabase-work/seed.sql
--
-- These are DEVELOPMENT accounts on a database the guard below refuses to run
-- against once any non-development organization exists.
-- -----------------------------------------------------------------------------
--   v_admin_email     REQUIRED. Becomes super_admin of the dev workspace.
--   v_client_a_email  Optional. Becomes client_owner of the ABC project.
--   v_client_b_email  Optional. Becomes client_owner of the XYZ project.
--
-- Every address must already exist as an account, because signing in is what
-- creates one — this file deliberately does not (see below). An address with
-- no account is reported and skipped rather than being fatal: only the
-- client-side PORTAL access depends on it. Every project, payment, invoice and
-- deployment still seeds, so the admin side is complete either way. Sign the
-- missing one up and re-run; it will be wired in.
--
-- -----------------------------------------------------------------------------
-- IT DOES NOT CREATE LOGIN ACCOUNTS, AND THAT IS DELIBERATE.
-- -----------------------------------------------------------------------------
-- Forging rows in auth.users means hand-writing GoTrue's internal columns —
-- encrypted_password, aud, confirmation tokens, the identities table — whose
-- shape changes between releases. A seed that gets one of them subtly wrong
-- produces accounts that exist but cannot sign in, which is worse than no
-- accounts at all.
--
-- -----------------------------------------------------------------------------
-- SAFE TO RUN TWICE. Every insert is keyed and idempotent, so re-running
-- refreshes the fixtures instead of duplicating them.
--
-- NOT FOR PRODUCTION. Everything below is scoped to the organization with slug
-- 'flowstate-dev'; nothing touches rows outside it. Even so, the guard at the
-- top refuses to run when any production-looking organization already exists.
--
-- THAT SLUG KEEPS THE OLD PRODUCT NAME ON PURPOSE. It is a data value, not a
-- label: databases seeded before the rename already hold it, and changing it
-- here would make this file create a SECOND organization — at which point the
-- guard above sees a non-dev org and refuses to run at all. Same for the
-- @flowstate.test placeholder addresses below, which are fixtures, not brand.
-- =============================================================================

do $$
declare
  -- ===========================================================================
  -- CONFIGURATION — edit these three lines
  -- ===========================================================================
  -- The admin address must be an account that already exists. The two client
  -- addresses may point at accounts that do not exist yet; the seed says so
  -- and carries on.
  --
  -- Filled in with the three accounts in the development database, so this
  -- file runs as-is. THAT PUTS THOSE ADDRESSES IN GIT — see the note at the
  -- top of the file if you would rather they were not.
  --
  -- The admin and client roles are mutually exclusive: staff are redirected out
  -- of /work/portal and clients out of /work/admin, so seeing both sides needs
  -- different accounts. One admin plus two clients covers every path, including
  -- "client A cannot reach client B's project".
  v_admin_email    text := 'savencenter5047@gmail.com';
  v_client_a_email text := 'centered101@outlook.com';
  v_client_b_email text := 'tcrffalok.1333118768@gmail.com';
  -- ===========================================================================

  v_admin    uuid;
  v_client_a uuid;
  v_client_b uuid;

  v_org      uuid;
  v_co_a     uuid;
  v_co_b     uuid;
  v_proj_a   uuid;
  v_proj_b   uuid;
  v_scope_a  uuid;
  v_plan_a   uuid;
  v_ms1      uuid;
  v_ms2      uuid;

  v_known    text;
  v_count    int;
begin
  -- ---------------------------------------------------------------------------
  -- Guard
  -- ---------------------------------------------------------------------------
  if exists (select 1 from organizations where slug <> 'flowstate-dev') then
    raise exception
      'Refusing to seed: this database already has non-development organizations. '
      'Seed data belongs in development only.';
  end if;

  -- ---------------------------------------------------------------------------
  -- People
  -- ---------------------------------------------------------------------------
  select id into v_admin    from profiles where lower(email) = lower(v_admin_email);
  select id into v_client_a from profiles where lower(email) = lower(v_client_a_email);
  select id into v_client_b from profiles where lower(email) = lower(v_client_b_email);

  -- The admin is the only hard requirement: the organization, every project
  -- and every document record it as their creator, and there is no sensible
  -- fallback for that.
  --
  -- The failure LISTS the accounts that do exist. "No profile found" on its own
  -- sends you off to run a query by hand to discover what to type; the seed
  -- already knows the answer, so it says it. Capped at ten so a database with
  -- many users produces a readable message rather than a wall of addresses.
  if v_admin is null then
    select count(*) into v_count from profiles;

    select string_agg(email, E'\n    ' order by created_at)
      into v_known
      from (select email, created_at from profiles order by created_at limit 10) p;

    if v_count = 0 then
      raise exception 'No accounts exist in this database yet. Sign in to /work/login once, then re-run this seed.';
    end if;

    -- Built with format() into one variable rather than as adjacent string
    -- literals: Postgres concatenates plain '...' continuations, but an E'...'
    -- escape string cannot be spliced into that sequence, which is a syntax
    -- error rather than a runtime one.
    raise exception '%', format(
      E'No profile found for %s.\n\nSet v_admin_email (near the top of this file) to one of these existing accounts:\n    %s\n\n(%s account(s) in total)',
      v_admin_email,
      v_known,
      v_count
    );
  end if;

  -- Missing client accounts are reported, not fatal. Everything except portal
  -- access still seeds, and re-running after signing them up fills in the rest.
  if v_client_a is null then
    raise notice
      'No profile for % — seeding project A without portal access. Sign that '
      'address up and re-run to grant it.', v_client_a_email;
  end if;
  if v_client_b is null then
    raise notice
      'No profile for % — seeding project B without portal access. Sign that '
      'address up and re-run to grant it.', v_client_b_email;
  end if;

  -- ---------------------------------------------------------------------------
  -- Organization and staff
  -- ---------------------------------------------------------------------------
  insert into organizations (name, slug, created_by)
  values ('Centered101 Studio (dev)', 'flowstate-dev', v_admin)
  on conflict (slug) do update set name = excluded.name
  returning id into v_org;

  insert into organization_members (organization_id, profile_id, role)
  values (v_org, v_admin, 'super_admin')
  on conflict (organization_id, profile_id) do update set role = excluded.role;

  -- ---------------------------------------------------------------------------
  -- Two client companies
  -- ---------------------------------------------------------------------------
  -- The whole point of two: every isolation claim in the brief is only
  -- testable with a second tenant to be excluded from.
  insert into clients (organization_id, name, client_code, contact_name, contact_email, created_by)
  values (v_org, 'ABC Company', 'CLI-DEV-001', 'คุณเอ', v_client_a_email, v_admin)
  -- clients_org_code_key is a PARTIAL unique index (where client_code is not
  -- null), so the conflict target must repeat that predicate — a bare column
  -- list does not match a partial index and the statement is rejected.
  on conflict (organization_id, client_code) where client_code is not null
  do update set name = excluded.name, contact_email = excluded.contact_email
  returning id into v_co_a;

  insert into clients (organization_id, name, client_code, contact_name, contact_email, created_by)
  values (v_org, 'XYZ Logistics', 'CLI-DEV-002', 'คุณบี', v_client_b_email, v_admin)
  on conflict (organization_id, client_code) where client_code is not null
  do update set name = excluded.name, contact_email = excluded.contact_email
  returning id into v_co_b;

  -- ---------------------------------------------------------------------------
  -- Two projects
  -- ---------------------------------------------------------------------------
  -- project_code is supplied here rather than left to the trigger, so that
  -- re-running the seed updates the same rows instead of creating new ones.
  insert into projects (
    organization_id, client_id, project_code, name, description, type, status, progress,
    start_date, expected_delivery, total_amount, delivery_method, source_code_ownership,
    maintenance_enabled, created_by
  )
  values (
    v_org, v_co_a, 'PRJ-DEV-001', 'เว็บไซต์องค์กร ABC',
    'เว็บไซต์องค์กรพร้อมระบบจัดการเนื้อหา', 'WEBSITE', 'IN_PROGRESS', 75,
    current_date - 30, current_date + 15, 3000000, 'DEVELOPER_HOSTED', 'CLIENT',
    true, v_admin
  )
  on conflict (organization_id, project_code) do update
    set name = excluded.name, status = excluded.status, progress = excluded.progress,
        total_amount = excluded.total_amount
  returning id into v_proj_a;

  insert into projects (
    organization_id, client_id, project_code, name, description, type, status, progress,
    start_date, expected_delivery, total_amount, delivery_method, source_code_ownership,
    maintenance_enabled, created_by
  )
  values (
    v_org, v_co_b, 'PRJ-DEV-002', 'แดชบอร์ดขนส่ง XYZ',
    'ระบบติดตามสถานะการจัดส่ง', 'DASHBOARD', 'CLIENT_REVIEW', 42,
    current_date - 60, current_date + 45, 5500000, 'CLIENT_HOSTED', 'DEVELOPER',
    false, v_admin
  )
  on conflict (organization_id, project_code) do update
    set name = excluded.name, status = excluded.status, progress = excluded.progress,
        total_amount = excluded.total_amount
  returning id into v_proj_b;

  -- ---------------------------------------------------------------------------
  -- Project access — the row that actually grants a client anything
  -- ---------------------------------------------------------------------------
  -- Client A is deliberately given ONLY project A. Confirming that they cannot
  -- reach project B, even with its UUID, is the check this seed exists for.
  -- Guarded because profile_id is NOT NULL: without an account there is nobody
  -- to grant access to, and inventing a row here would be inventing a user.
  if v_client_a is not null then
    insert into project_members (project_id, profile_id, role, created_by)
    values (v_proj_a, v_client_a, 'client_owner', v_admin)
    on conflict (project_id, profile_id) do update set role = excluded.role;
  end if;

  if v_client_b is not null then
    insert into project_members (project_id, profile_id, role, created_by)
    values (v_proj_b, v_client_b, 'client_owner', v_admin)
    on conflict (project_id, profile_id) do update set role = excluded.role;
  end if;

  -- ---------------------------------------------------------------------------
  -- Scope — the portal timeline reads these
  -- ---------------------------------------------------------------------------
  insert into project_scopes (project_id, version, title, summary, created_by)
  values (v_proj_a, 1, 'ขอบเขตงานเวอร์ชัน 1', 'ตามที่ตกลงในใบเสนอราคา', v_admin)
  on conflict (project_id, version) do update set title = excluded.title
  returning id into v_scope_a;

  delete from project_features where scope_id = v_scope_a;
  insert into project_features (scope_id, project_id, name, status, sort_order) values
    (v_scope_a, v_proj_a, 'เก็บความต้องการ',   'COMPLETED',   1),
    (v_scope_a, v_proj_a, 'ออกแบบ UI',          'COMPLETED',   2),
    (v_scope_a, v_proj_a, 'พัฒนาเว็บไซต์',      'COMPLETED',   3),
    (v_scope_a, v_proj_a, 'ทดสอบระบบ',          'IN_PROGRESS', 4),
    (v_scope_a, v_proj_a, 'อนุมัติขั้นสุดท้าย', 'PLANNED',     5),
    (v_scope_a, v_proj_a, 'ส่งมอบงาน',          'PLANNED',     6);

  -- ---------------------------------------------------------------------------
  -- Payment plan: 30% deposit paid, 70% outstanding
  -- ---------------------------------------------------------------------------
  -- Amounts must sum to the plan total or the trigger from migration 0009
  -- rejects the plan — which is exactly the behaviour worth having in a seed.
  insert into payment_plans (project_id, type, total_amount, created_by)
  values (v_proj_a, 'DEPOSIT_FINAL', 3000000, v_admin)
  on conflict (project_id) do update set total_amount = excluded.total_amount
  returning id into v_plan_a;

  delete from payments where project_id = v_proj_a;
  delete from payment_milestones where plan_id = v_plan_a;

  insert into payment_milestones (
    plan_id, project_id, sequence, name, percentage_bp, amount, due_date, status, paid_at, unlock_rules
  )
  values (
    v_plan_a, v_proj_a, 1, 'มัดจำ 30%', 3000, 900000,
    current_date - 25, 'PAID', now() - interval '25 days', '["preview"]'::jsonb
  )
  returning id into v_ms1;

  insert into payment_milestones (
    plan_id, project_id, sequence, name, percentage_bp, amount, due_date, status, unlock_rules
  )
  values (
    v_plan_a, v_proj_a, 2, 'งวดสุดท้าย 70%', 7000, 2100000,
    current_date + 15, 'PENDING', '["source_code", "credentials"]'::jsonb
  )
  returning id into v_ms2;

  -- One received payment and one still outstanding, so every dashboard figure
  -- has something real behind it.
  insert into payments (project_id, milestone_id, amount, status, method, paid_at, created_by)
  values (v_proj_a, v_ms1, 900000, 'PAID', 'BANK_TRANSFER', now() - interval '25 days', v_admin);

  insert into payments (project_id, milestone_id, amount, status, created_by)
  values (v_proj_a, v_ms2, 2100000, 'PENDING', v_admin);

  -- ---------------------------------------------------------------------------
  -- Documents
  -- ---------------------------------------------------------------------------
  -- One ISSUED and one DRAFT: the draft must be invisible in the client portal
  -- and visible to staff, which is a policy worth being able to see working.
  -- Neither carries a storage_path — there is no file to attach in a seed, and
  -- inventing one would produce a download button that leads nowhere.
  delete from documents where project_id = v_proj_a;

  insert into documents (
    organization_id, project_id, client_id, type, status, document_number, title,
    amount, issued_at, due_date, created_by
  )
  values (
    v_org, v_proj_a, v_co_a, 'INVOICE', 'ISSUED', 'INV-DEV-001', 'ใบแจ้งหนี้มัดจำ 30%',
    900000, now() - interval '30 days', current_date - 25, v_admin
  );

  insert into documents (
    organization_id, project_id, client_id, type, status, title, amount, created_by
  )
  values (
    v_org, v_proj_a, v_co_a, 'INVOICE', 'DRAFT', 'ร่างใบแจ้งหนี้งวดสุดท้าย', 2100000, v_admin
  );

  -- ---------------------------------------------------------------------------
  -- Deployment, maintenance, change request
  -- ---------------------------------------------------------------------------
  delete from project_deployments where project_id = v_proj_a;
  insert into project_deployments (
    project_id, environment, status, version, url, commit_sha, deployed_at, created_by
  )
  values (
    v_proj_a, 'PREVIEW', 'READY', 'v0.9.0', 'https://abc-preview.vercel.app',
    'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0', now() - interval '3 days', v_admin
  );

  insert into maintenance_plans (
    project_id, name, status, billing_cycle, price_amount, services,
    started_on, next_billing_date, created_by
  )
  values (
    v_proj_a, 'แพ็กเกจดูแลเว็บไซต์', 'ACTIVE', 'MONTHLY', 150000,
    '["โฮสติ้ง", "สำรองข้อมูล", "แก้ไขข้อผิดพลาด", "ความปลอดภัย"]'::jsonb,
    current_date - 20, current_date + 10, v_admin
  )
  on conflict (project_id) do update
    set price_amount = excluded.price_amount,
        next_billing_date = excluded.next_billing_date;

  delete from change_requests where project_id = v_proj_a;
  -- requested_by is nullable, so an absent client account leaves it null
  -- rather than misattributing the request to the admin — the portal reads
  -- that as "requested by the client", which is what happened.
  insert into change_requests (project_id, title, description, status, priority, requested_by)
  values (
    v_proj_a, 'เพิ่มหน้าติดต่อเรา', 'ขอเพิ่มฟอร์มติดต่อพร้อมแผนที่',
    'UNDER_REVIEW', 'NORMAL', v_client_a
  );

  -- ---------------------------------------------------------------------------
  -- Audit trail
  -- ---------------------------------------------------------------------------
  -- Inserted directly rather than through app.log_activity(), because that
  -- function attributes the actor from auth.uid() — which is null in a psql
  -- session. The seed therefore names the actor explicitly.
  --
  -- Guarded by a NOT EXISTS rather than the delete-then-insert used above:
  -- activity_logs is append-only and its trigger refuses DELETE even to the
  -- service role (migration 0012). Re-running the seed therefore leaves the
  -- existing trail alone instead of rewriting history, which is the whole
  -- point of an audit table.
  if not exists (select 1 from activity_logs where project_id = v_proj_a) then
  insert into activity_logs (
    organization_id, project_id, actor_id, actor_email, action, entity_type, entity_id,
    metadata, created_at
  )
  values
    (v_org, v_proj_a, v_admin, v_admin_email, 'project.created', 'project', v_proj_a,
     jsonb_build_object('name', 'เว็บไซต์องค์กร ABC'), now() - interval '30 days'),
    (v_org, v_proj_a, null, null, 'payment.succeeded', 'payment', null,
     jsonb_build_object('amount', 900000), now() - interval '25 days'),
    (v_org, v_proj_a, v_admin, v_admin_email, 'milestone.completed', 'milestone', v_ms1,
     jsonb_build_object('name', 'มัดจำ 30%'), now() - interval '25 days'),
    (v_org, v_proj_a, v_admin, v_admin_email, 'deployment.created', 'deployment', null,
     jsonb_build_object('title', 'v0.9.0'), now() - interval '3 days'),
    -- actor_id is null when the client has no account yet; actor_email still
    -- records who the actor WAS, which is why the trail keeps both columns.
    (v_org, v_proj_a, v_client_a, v_client_a_email, 'change_request.created',
     'change_request', null, jsonb_build_object('title', 'เพิ่มหน้าติดต่อเรา'),
     now() - interval '1 day');
  end if;

  raise notice 'Seed complete. Organization %, projects % and %.', v_org, v_proj_a, v_proj_b;
  raise notice 'Admin portal: sign in as %.', v_admin_email;
  if v_client_a is null or v_client_b is null then
    raise notice
      'Client portal access was NOT granted for every project — sign the '
      'missing addresses up and re-run this file.';
  end if;
end $$;
