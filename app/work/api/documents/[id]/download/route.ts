import { NextResponse, type NextRequest } from 'next/server'

import { isUuid } from '@/lib/work/auth/permissions'
import { getDocumentStoragePath } from '@/lib/work/queries/documents'
import { createAdminClient } from '@/lib/work/supabase/admin'

const BUCKET = 'work-documents'
const SIGNED_URL_TTL_SECONDS = 60

/**
 * Document download.
 *
 * THE ORDER OF THESE STEPS IS THE SECURITY MODEL:
 *
 *   1. Read the `documents` row with the CALLER'S session. RLS decides whether
 *      that row exists for them — staff see their organization's documents, a
 *      client sees only ISSUED documents on projects they belong to. Someone
 *      passing another client's document id gets nothing back.
 *   2. ONLY THEN mint a signed URL, valid for one minute.
 *
 * The privileged client appears at step 2 and never at step 1. It is used
 * because minting a signed URL requires storage credentials the user session
 * does not have — not to widen what the caller may see. Reversing these steps,
 * or using the admin client to read the row, would hand out any file to
 * anyone who knows an id.
 *
 * A guessable storage path is therefore harmless: the path is never the
 * credential. The bucket is private and has no user-facing policies at all
 * (migration 0015).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  if (!isUuid(id)) {
    return NextResponse.json({ error: 'ไม่พบเอกสาร' }, { status: 404 })
  }

  const document = await getDocumentStoragePath(id)

  // Same answer for "does not exist", "not yours" and "has no file attached".
  // Distinguishing them would confirm which ids are real.
  if (!document) {
    return NextResponse.json({ error: 'ไม่พบเอกสาร' }, { status: 404 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(document.path, SIGNED_URL_TTL_SECONDS, { download: true })

  if (error || !data?.signedUrl) {
    console.error('[documents] failed to sign url for', id, error)
    return NextResponse.json({ error: 'ไม่สามารถเปิดไฟล์ได้ กรุณาลองใหม่อีกครั้ง' }, { status: 502 })
  }

  // 302, not a JSON body: the browser follows straight to the file, and the
  // signed URL never lands in application state where it could be shared.
  return NextResponse.redirect(data.signedUrl, { status: 302 })
}
