-- =============================================================================
-- 0015 — Storage bucket for documents
-- =============================================================================
-- Invoices, receipts, quotations and agreements. The `documents` table holds
-- the metadata and `documents.storage_path` points here.
--
-- PRIVATE, AND WITH NO POLICIES ON storage.objects FOR END USERS.
--
-- That is deliberate, and it is the whole security model for files:
--
--   1. A client asks for a document through /work/api/documents/[id]/download.
--   2. That route reads the `documents` row with the CALLER'S session, so RLS
--      decides whether the row exists for them at all. A client who passes
--      another client's document id gets nothing back — same control that
--      protects every other table.
--   3. Only after that check does the server mint a short-lived signed URL.
--
-- So the storage path never needs to be unguessable, and no policy on
-- storage.objects has to re-derive project membership from a filename. The
-- authorization lives in one place, next to the data it protects.
--
-- A public bucket would break all of this: the path alone would be the
-- credential, and paths leak — in emails, in logs, in browser history.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'work-documents',
  'work-documents',
  false,
  -- 25 MB. Invoices and agreements are small; anything larger is a mistake or
  -- an upload being used as file hosting.
  26214400,
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Path convention, enforced by the application rather than the database
-- because storage.objects has no room for a foreign key:
--
--   {organization_id}/{project_id | 'org'}/{document_id}/{filename}
--
-- Ordering by organization first keeps a listing operation from ever spanning
-- tenants, which matters if a future admin tool lists objects directly.
-- No `comment on table storage.buckets` here: that table belongs to Supabase
-- and is shared by every bucket in the project, so a comment about this one
-- would overwrite theirs and mislead about the others.
