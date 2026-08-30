-- ============================================================================
-- Centered101's Work — storage buckets and policies
--
-- GENERATED FILE. DO NOT EDIT.
--   Source of truth: supabase-work/migrations/
--   Regenerate with: npm run work:db:snapshot
--
-- Buckets and object policies only. Apply after schema.sql.
--
-- Built from 2 migration(s):
--   20260826120200_storage_documents.sql
--   20260830120100_storage_feedback.sql
-- ============================================================================
-- ▼ 20260826120200_storage_documents.sql
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
-- ▲ 20260826120200_storage_documents.sql

-- ▼ 20260830120100_storage_feedback.sql
-- =============================================================================
-- 0018 — Storage bucket for feedback screenshots
-- =============================================================================
-- The image a person attaches to a feedback report. `feedback.screenshot_path`
-- points here.
--
-- PRIVATE, AND WITH NO POLICIES ON storage.objects, exactly like
-- `work-documents` in migration 0015 — and for the same reason. Uploads and
-- reads both go through the server:
--
--   1. The Server Action establishes who the caller is, checks the file, and
--      uploads with the privileged client under a path it chooses itself.
--   2. A reader asks for the image through a route that first reads the
--      `feedback` row under the CALLER'S session, so RLS decides whether that
--      row exists for them, and only then mints a short-lived signed URL.
--
-- So the path is never the credential, and no policy has to re-derive
-- membership from a filename. A screenshot is the likeliest place in this app
-- for someone to capture another client's data by accident, which is exactly
-- why the bucket is not public.
--
-- IMAGES ONLY, and small. This is a screenshot of a screen, not an upload
-- feature — a bucket that accepts application/pdf is a bucket that will be
-- used as file hosting by the first person who finds it.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'work-feedback',
  'work-feedback',
  false,
  -- 5 MB. A full-page PNG screenshot at 2x lands well under this.
  5242880,
  array[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif'
  ]
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Path convention, chosen by the application and never by the browser:
--
--   {profile_id}/{uuid}.{ext}
--
-- Keyed by the submitter rather than by the organization, because feedback may
-- be filed with no organization at all (see 0017) and a path cannot be null.
-- The uuid is generated per upload, so re-sending the same file twice cannot
-- overwrite the first report's evidence.
-- ▲ 20260830120100_storage_feedback.sql
