import { NextResponse, type NextRequest } from 'next/server'

import { isUuid } from '@/lib/work/auth/permissions'
import { getFeedbackScreenshotPath } from '@/lib/work/queries/feedback'
import { createAdminClient } from '@/lib/work/supabase/admin'

const BUCKET = 'work-feedback'
const SIGNED_URL_TTL_SECONDS = 60

/**
 * The screenshot attached to a feedback report.
 *
 * THE ORDER OF THESE STEPS IS THE SECURITY MODEL, and it is the same one the
 * document download uses:
 *
 *   1. Read the `feedback` row with the CALLER'S session. RLS decides whether
 *      that row exists for them — its author, or staff of the organization it
 *      was filed against. Anyone else gets nothing, including with a valid id.
 *   2. ONLY THEN mint a signed URL, valid for one minute.
 *
 * The privileged client appears at step 2 and never at step 1: minting a
 * signed URL needs storage credentials the user session does not have, which
 * is not the same thing as widening what the caller may see. The bucket is
 * private and carries no user-facing policies at all (migration 0018), so the
 * storage path is never the credential.
 *
 * A screenshot is the likeliest place in this app for one client's data to end
 * up in another's report by accident, which is why this route exists rather
 * than a public URL stored on the row.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  if (!isUuid(id)) {
    return NextResponse.json({ error: 'ไม่พบรูปภาพ' }, { status: 404 })
  }

  const path = await getFeedbackScreenshotPath(id)

  // Same answer for "does not exist", "not yours" and "no image attached".
  // Distinguishing them would confirm which ids are real.
  if (!path) {
    return NextResponse.json({ error: 'ไม่พบรูปภาพ' }, { status: 404 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)

  if (error || !data?.signedUrl) {
    console.error('[feedback] failed to sign screenshot url for', id, error)
    return NextResponse.json({ error: 'ไม่สามารถเปิดรูปภาพได้' }, { status: 502 })
  }

  // 302 rather than a JSON body, so an <img src> can point straight at this
  // route and the signed URL never lands in application state.
  return NextResponse.redirect(data.signedUrl, { status: 302 })
}
