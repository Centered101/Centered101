import { NextResponse, type NextRequest } from 'next/server'

import { isUuid } from '@/lib/work/auth/permissions'
import { getAssetStoragePath } from '@/lib/work/queries/assets'
import { createAdminClient } from '@/lib/work/supabase/admin'

const BUCKET = 'work-assets'
const SIGNED_URL_TTL_SECONDS = 60

/**
 * Brand/reference asset download — same shape as
 * app/work/api/documents/[id]/download/route.ts, for the same reason:
 *
 *   1. Read the `project_assets` row under the CALLER'S session. RLS
 *      (`project_assets_select`, migration 0031) decides whether this row
 *      exists for them — anyone who can read the project, which for the
 *      uploader's own project means them, and for staff means any project
 *      in their organization. A wrong project's asset id comes back as
 *      nothing here.
 *   2. ONLY THEN mint a signed URL, valid for one minute.
 *
 * A guessable storage path is therefore harmless: the path is never the
 * credential. The bucket is private and has no user-facing policies at all
 * (migration 0031).
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  if (!isUuid(id)) {
    return NextResponse.json({ error: 'ไม่พบไฟล์' }, { status: 404 })
  }

  const asset = await getAssetStoragePath(id)

  // Same answer for "does not exist", "not yours", and "has no file
  // attached" (a reference-website link) — distinguishing them would
  // confirm which ids are real.
  if (!asset) {
    return NextResponse.json({ error: 'ไม่พบไฟล์' }, { status: 404 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(asset.path, SIGNED_URL_TTL_SECONDS)

  if (error || !data?.signedUrl) {
    console.error('[assets] failed to sign url for', id, error)
    return NextResponse.json({ error: 'ไม่สามารถเปิดไฟล์ได้ กรุณาลองใหม่อีกครั้ง' }, { status: 502 })
  }

  return NextResponse.redirect(data.signedUrl, { status: 302 })
}
