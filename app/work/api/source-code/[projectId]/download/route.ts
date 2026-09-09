import { NextResponse, type NextRequest } from 'next/server'

import { getAccessContext, isUuid, requireProjectAccess } from '@/lib/work/auth/permissions'
import { getSourceCodeStoragePath } from '@/lib/work/queries/publishing'
import { isResourceUnlocked } from '@/lib/work/queries/unlock'
import { logActivity } from '@/lib/work/services/activity'
import { createAdminClient } from '@/lib/work/supabase/admin'

const BUCKET = 'work-documents'
const SIGNED_URL_TTL_SECONDS = 60

/**
 * Source-code package download.
 *
 * THE ORDER OF THESE STEPS IS THE SECURITY MODEL, and there are three gates,
 * not one:
 *
 *   1. `requireProjectAccess` — is this caller on this project at all? A
 *      client passing another project's UUID is refused here, before anything
 *      else runs. This is what makes the id in the URL not worth guessing.
 *   2. `isResourceUnlocked(projectId, 'source_code')` — have their PAID
 *      milestones' `unlock_rules` actually released it? This is the EXISTING
 *      Phase 3 unlock system (lib/work/queries/unlock.ts), read fresh from the
 *      database on every request. Nothing about the client's session, cookies,
 *      or form input contributes to the answer, so there is nothing to forge.
 *      Staff pass this by definition — they are the ones preparing the
 *      handover, which has to be possible before the client has paid.
 *   3. ONLY THEN is the privileged client used, and only to resolve a storage
 *      path and mint a URL valid for one minute.
 *
 * The linked document is kept INTERNAL, so `documents_select_client` is a
 * fourth, independent barrier: even the ordinary document download route
 * refuses a client that row. The two systems answer different questions —
 * visibility is "has staff released this document", unlock is "has the client
 * paid for it" — and the source code needs both to say yes.
 *
 * A guessed storage path remains harmless: the path is never the credential,
 * the bucket is private, and it has no user-facing policies (migration 0015).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params

  if (!isUuid(projectId)) {
    return NextResponse.json({ error: 'ไม่พบไฟล์' }, { status: 404 })
  }

  // Throws/redirects for anyone not on this project. Never a privileged read
  // before this line.
  const access = await requireProjectAccess(projectId)

  const unlocked = await isResourceUnlocked(projectId, 'source_code')
  if (!unlocked) {
    // 403, not 404: the caller legitimately belongs to this project, so
    // "not yet" is the honest answer and is not information they lack.
    return NextResponse.json(
      { error: 'ยังไม่ปลดล็อกการส่งมอบซอร์สโค้ด กรุณาชำระเงินตามแผนที่ตกลงไว้' },
      { status: 403 },
    )
  }

  const source = await getSourceCodeStoragePath(projectId)

  // Same answer for "no package attached yet" and "attached but the file is
  // gone" — neither is something to elaborate on.
  if (!source) {
    return NextResponse.json({ error: 'ยังไม่มีไฟล์ซอร์สโค้ดสำหรับโปรเจกต์นี้' }, { status: 404 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(source.path, SIGNED_URL_TTL_SECONDS, { download: true })

  if (error || !data?.signedUrl) {
    console.error('[source-code] failed to sign url for', projectId, error)
    return NextResponse.json({ error: 'ไม่สามารถเปิดไฟล์ได้ กรุณาลองใหม่อีกครั้ง' }, { status: 502 })
  }

  // Handover of source code is exactly the event a later dispute asks about,
  // so it is recorded. Never fails the download: a missing audit line must not
  // withhold a file the client has paid for (same rule as services/activity).
  const context = await getAccessContext()
  await logActivity({
    organizationId: access.organizationId,
    action: 'source_code.downloaded',
    entityType: 'document',
    entityId: source.documentId,
    projectId,
    metadata: { title: source.title, actorKind: context?.kind ?? 'unknown' },
  })

  return NextResponse.redirect(data.signedUrl, { status: 302 })
}
