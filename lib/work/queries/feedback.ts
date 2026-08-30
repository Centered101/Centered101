import 'server-only'

import { createClient } from '@/lib/work/supabase/server'
import { unwrapOr } from './internal'

/**
 * Feedback reads.
 *
 * The widget that writes this table lives in the topbar
 * (`components/work/layout/feedback-menu.tsx`); everything here is the other
 * side of it.
 *
 * `screenshot_path` is never handed to the browser, exactly as with documents:
 * images are fetched through /work/api/feedback/[id]/screenshot, which
 * re-checks access under the caller's session and mints a short-lived signed
 * URL against a private bucket.
 */

/**
 * The screenshot path attached to one feedback row, or null.
 *
 * Read under the CALLER'S session, so RLS decides whether the row exists for
 * them before there is a path to sign: the author sees their own report, staff
 * see their organization's, and anyone else gets nothing — including when they
 * have the exact id.
 *
 * This is the only function that returns a storage path, and only the
 * screenshot route calls it.
 */
export async function getFeedbackScreenshotPath(id: string): Promise<string | null> {
  const supabase = await createClient()

  const result = await supabase
    .from('feedback')
    .select('screenshot_path')
    .eq('id', id)
    .maybeSingle()

  const row = unwrapOr<{ screenshot_path: string | null } | null>(result, 'ความคิดเห็น', null)

  return row?.screenshot_path ?? null
}
