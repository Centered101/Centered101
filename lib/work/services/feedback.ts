'use server'

import { randomUUID } from 'node:crypto'
import { headers } from 'next/headers'

import { getAccessContext } from '@/lib/work/auth/permissions'
import { createAdminClient } from '@/lib/work/supabase/admin'
import { createClient } from '@/lib/work/supabase/server'
import type { ActionState } from '@/lib/work/services/projects'
import {
  describeImageRejection,
  submitFeedbackSchema,
} from '@/lib/work/validation/feedback'
import { logActivity } from './activity'

/**
 * The in-app feedback widget's one action.
 *
 * Follows the same four steps as every other action in this folder (see
 * services/projects.ts): authorize, parse, write under the caller's session so
 * RLS re-checks it, then log.
 *
 * WHAT THE BROWSER IS TRUSTED WITH is only the kind, the message and the path
 * it was on. The author, the email and the user agent are read on the server —
 * a widget that let the page name its own submitter would be a widget for
 * filing reports as somebody else.
 *
 * WHO MAY SUBMIT is "anyone signed in", which is why this reaches for
 * `getAccessContext()` rather than `requireAdmin()` / `requireClient()`: both
 * audiences use the same topbar, and a client hitting a broken invoice page is
 * the most valuable report this table will ever hold.
 */

const BUCKET = 'work-feedback'

/** Long enough to identify a browser, short enough not to be a payload. */
const USER_AGENT_MAX = 400

export async function submitFeedback(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const context = await getAccessContext()
  if (!context) {
    return { error: 'กรุณาเข้าสู่ระบบก่อนส่งความคิดเห็น' }
  }

  const parsed = submitFeedbackSchema.safeParse({
    kind: formData.get('kind'),
    message: formData.get('message'),
    pagePath: formData.get('pagePath') ?? undefined,
  })

  if (!parsed.success) {
    // One textarea, so a field error and a form error would land in the same
    // place. The first issue is the message.
    return { error: parsed.error.issues[0]?.message ?? 'ข้อความไม่ถูกต้อง' }
  }

  const input = parsed.data
  const supabase = await createClient()

  // Which workspace this is about. Staff carry it on their context; a client
  // reaches it through a project, read under their own session so the answer
  // can only ever be an organization they belong to. Null is a valid outcome —
  // a brand-new account with no project yet can still tell us something is
  // broken (migration 0017 allows the null and hides such rows from staff
  // until someone assigns them).
  let organizationId: string | null = null
  if (context.kind === 'staff') {
    organizationId = context.organizationId
  } else {
    const { data } = await supabase
      .from('projects')
      .select('organization_id')
      .limit(1)
      .maybeSingle()
    organizationId = (data?.organization_id as string | undefined) ?? null
  }

  // ---------------------------------------------------------------------------
  // The screenshot
  // ---------------------------------------------------------------------------
  // Uploaded BEFORE the row is inserted, so a storage failure costs a retry
  // rather than leaving a row pointing at a file that is not there. The
  // reverse order fails the other way: an orphaned object is invisible, an
  // orphaned path renders as a broken image forever.
  //
  // The privileged client appears here and nowhere else in this action. The
  // bucket has no user-facing policies at all (migration 0018), so uploading
  // needs storage credentials the session does not have — it is not being used
  // to widen what the caller may do. The path is chosen here, from the
  // caller's own id, so nothing the browser sent decides where the file lands.
  let screenshotPath: string | null = null
  const screenshot = formData.get('screenshot')

  if (screenshot instanceof File && screenshot.size > 0) {
    const rejection = describeImageRejection(screenshot)
    if (rejection) return { error: rejection }

    const extension = screenshot.type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'png'
    const path = `${context.userId}/${randomUUID()}.${extension}`

    const admin = createAdminClient()
    const { error } = await admin.storage.from(BUCKET).upload(path, screenshot, {
      contentType: screenshot.type,
      upsert: false,
    })

    if (error) {
      console.error('[feedback] screenshot upload failed:', error)
      return { error: 'อัปโหลดรูปภาพไม่สำเร็จ กรุณาลองใหม่หรือส่งโดยไม่แนบรูป' }
    }

    screenshotPath = path
  }

  // ---------------------------------------------------------------------------
  // The report
  // ---------------------------------------------------------------------------
  // The user agent is read from the request rather than from navigator, for
  // the same reason as the author: a field the page fills in is a field the
  // page can lie about, and this one exists to reproduce bugs.
  const requestHeaders = await headers()
  const userAgent = requestHeaders.get('user-agent')?.slice(0, USER_AGENT_MAX) ?? null

  const { data, error } = await supabase
    .from('feedback')
    .insert({
      organization_id: organizationId,
      profile_id: context.userId,
      submitter_email: context.email || null,
      kind: input.kind,
      message: input.message,
      page_path: input.pagePath,
      user_agent: userAgent,
      screenshot_path: screenshotPath,
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('[feedback] insert failed:', error)

    // The row is what was promised; an uploaded file with nothing pointing at
    // it is litter in a bucket nobody lists. Clean it up rather than leave it.
    if (screenshotPath) {
      const admin = createAdminClient()
      await admin.storage.from(BUCKET).remove([screenshotPath])
    }

    return { error: 'ส่งความคิดเห็นไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' }
  }

  const feedback = data as unknown as { id: string }

  // Only when there is an organization to log against. log_activity requires
  // one, and an unassigned report has no workspace whose feed it belongs in.
  if (organizationId) {
    await logActivity({
      organizationId,
      action: 'feedback.submitted',
      entityType: 'feedback',
      entityId: feedback.id,
      metadata: {
        kind: input.kind,
        page_path: input.pagePath,
        has_screenshot: screenshotPath !== null,
      },
    })
  }

  // No revalidatePath: nothing on screen renders this table yet, and the
  // widget reports the result itself. Adding one would refresh the page under
  // a user who is mid-sentence somewhere else.
  return { message: 'ส่งความคิดเห็นแล้ว ขอบคุณมากครับ' }
}
