-- =============================================================================
-- 0011 — documents
-- =============================================================================
-- Quotations, invoices, receipts, agreements and credit/debit notes.
--
-- A NOTE ON TAX INVOICES: document_type includes 'TAX_INVOICE', but storing a
-- row with that label does not make the artefact a legally valid Thai e-Tax
-- Invoice. That requires RDMS certification, digital signatures and submission
-- — none of which this schema implements. The type is a filing category, not a
-- legal claim (brief Phase 18, docs/ARCHITECTURE.md §16).
-- =============================================================================

create table documents (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  -- Nullable: an organization-level document (a template, a general receipt)
  -- need not belong to a project.
  project_id      uuid references projects (id) on delete cascade,
  client_id       uuid references clients (id)  on delete set null,

  type            document_type   not null,
  status          document_status not null default 'DRAFT',
  -- Display-only human code: INV-2026-001, QUO-2026-014.
  document_number text,
  title           text not null,
  notes           text,

  -- Denormalised money for listing and totals without opening the file.
  amount          bigint  not null default 0,
  currency        char(3) not null default 'THB',

  issued_at       timestamptz,
  due_date        date,
  voided_at       timestamptz,

  -- Path in Supabase Storage. NEVER a public URL: access goes through a
  -- server-side authorization check that issues a short-lived signed URL.
  -- A storage path that is guessable is fine; a public bucket is not.
  storage_path    text,
  file_size       bigint,
  mime_type       text,

  created_by      uuid references profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint documents_title_not_blank    check (length(btrim(title)) > 0),
  constraint documents_amount_non_negative check (amount >= 0),
  constraint documents_currency_format    check (currency ~ '^[A-Z]{3}$'),
  constraint documents_file_size_non_negative check (file_size is null or file_size >= 0),
  -- An issued document must record when, and must have a number to be
  -- referenced by. Drafts need neither.
  constraint documents_issued_has_metadata check (
    status = 'DRAFT'
    or (issued_at is not null and document_number is not null)
  ),
  constraint documents_void_has_timestamp
    check (status <> 'VOID' or voided_at is not null)
);

create unique index documents_org_number_key
  on documents (organization_id, document_number)
  where document_number is not null;
create index documents_org_idx      on documents (organization_id);
create index documents_project_idx  on documents (project_id);
create index documents_client_idx   on documents (client_id);
create index documents_type_idx     on documents (organization_id, type, status);
create index documents_issued_idx   on documents (issued_at desc) where status <> 'DRAFT';

create trigger documents_set_updated_at
  before update on documents
  for each row execute function app.set_updated_at();

-- =============================================================================
-- RLS
-- =============================================================================
alter table documents enable row level security;

-- Two audiences, deliberately asymmetric.
--
-- Agency staff see every document in their organization, including drafts and
-- organization-level documents with no project.
--
-- A client sees ONLY documents attached to a project they are a member of, and
-- only once ISSUED. Drafts are working documents — an invoice being edited, a
-- quotation not yet approved — and must not appear in the portal.
create policy documents_select_staff on documents
  for select to authenticated
  using (organization_id in (select app.org_ids()));

create policy documents_select_client on documents
  for select to authenticated
  using (
    project_id is not null
    and status <> 'DRAFT'
    and app.is_project_client(project_id)
  );

create policy documents_insert_staff on documents
  for insert to authenticated
  with check (
    app.has_org_role(organization_id, 'super_admin', 'admin', 'accountant')
    and (project_id is null or app.can_read_project(project_id))
  );

create policy documents_update_staff on documents
  for update to authenticated
  using (app.has_org_role(organization_id, 'super_admin', 'admin', 'accountant'))
  with check (app.has_org_role(organization_id, 'super_admin', 'admin', 'accountant'));

-- Only managers may delete, and issued financial documents should be VOIDed
-- rather than removed.
create policy documents_delete_managers on documents
  for delete to authenticated
  using (app.is_org_manager(organization_id));
