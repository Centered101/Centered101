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
