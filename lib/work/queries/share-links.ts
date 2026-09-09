import 'server-only'

import { createClient } from '@/lib/work/supabase/server'
import { createAdminClient } from '@/lib/work/supabase/admin'
import { hashShareToken, isPlausibleShareToken } from '@/lib/work/tokens'
import { unwrapOr } from './internal'

export type ShareLinkListItem = {
  id: string
  label: string | null
  expiresAt: string
  revokedAt: string | null
  maxViews: number | null
  viewCount: number
  lastViewedAt: string | null
  createdAt: string
  /**
   * Computed here, server-side, at read time — not in the browser. A React
   * component render must be pure (no `Date.now()` inside it), and the
   * admin's clock is not something a table row should depend on anyway; the
   * server that just read `expires_at` is the one place this is unambiguous.
   */
  status: 'active' | 'expired' | 'exhausted' | 'revoked'
}

function shareLinkStatus(row: {
  revoked_at: string | null
  expires_at: string
  max_views: number | null
  view_count: number
}): ShareLinkListItem['status'] {
  if (row.revoked_at) return 'revoked'
  if (new Date(row.expires_at).getTime() < Date.now()) return 'expired'
  if (row.max_views !== null && row.view_count >= row.max_views) return 'exhausted'
  return 'active'
}

/** Every share link ever issued on a project, newest first. RLS-scoped to staff. */
export async function getShareLinks(projectId: string): Promise<ShareLinkListItem[]> {
  const supabase = await createClient()

  const result = await supabase
    .from('share_links')
    .select('id, label, expires_at, revoked_at, max_views, view_count, last_viewed_at, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  const rows = unwrapOr<
    {
      id: string
      label: string | null
      expires_at: string
      revoked_at: string | null
      max_views: number | null
      view_count: number
      last_viewed_at: string | null
      created_at: string
    }[]
  >(result, 'ลิงก์แชร์', [])

  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    maxViews: row.max_views,
    viewCount: row.view_count,
    lastViewedAt: row.last_viewed_at,
    createdAt: row.created_at,
    status: shareLinkStatus(row),
  }))
}

export type ShareLinkResolution =
  | { status: 'ok'; projectName: string; previewUrl: string | null; expiresAt: string }
  | { status: 'invalid' }
  | { status: 'revoked' }
  | { status: 'expired' }
  | { status: 'exhausted' }

/**
 * Resolves an anonymous visitor's token to a project's preview information.
 *
 * PRIVILEGED CLIENT, DELIBERATELY. There is no session here to run RLS under
 * — the visitor is anonymous by design — so this is read under the SAME
 * "check first, then hand over the minimum" shape as the documents download
 * route (migration 0015): the token is hashed and looked up before anything
 * about the project is touched, and only `status: 'ok'` carries any data back
 * to the page. Every other outcome answers with a plain status the page turns
 * into one of a small set of Thai messages — never "which part was wrong",
 * which would turn this into a token-guessing oracle the same way a 403 would
 * for a project id.
 *
 * Returns ONLY a project name and a preview URL. No pricing, no client
 * contact details, no documents, no payment status — a share link is a
 * preview, not a window into the account.
 */
export async function resolveShareLink(token: string): Promise<ShareLinkResolution> {
  if (!isPlausibleShareToken(token)) return { status: 'invalid' }

  const admin = createAdminClient()
  const tokenHash = hashShareToken(token)

  const { data: link, error } = await admin
    .from('share_links')
    .select('id, project_id, expires_at, revoked_at, max_views, view_count')
    .eq('token_hash', tokenHash)
    .maybeSingle<{
      id: string
      project_id: string
      expires_at: string
      revoked_at: string | null
      max_views: number | null
      view_count: number
    }>()

  // A missing table (schema not yet migrated) must read the same as "no such
  // link" — never a 500 that tells an anonymous visitor something about the
  // server's internals.
  if (error || !link) return { status: 'invalid' }

  if (link.revoked_at) return { status: 'revoked' }
  if (new Date(link.expires_at).getTime() < Date.now()) return { status: 'expired' }
  if (link.max_views !== null && link.view_count >= link.max_views) return { status: 'exhausted' }

  const { data: project } = await admin
    .from('projects')
    .select('name')
    .eq('id', link.project_id)
    .maybeSingle<{ name: string }>()

  if (!project) return { status: 'invalid' }

  const { data: deployment } = await admin
    .from('project_deployments')
    .select('url')
    .eq('project_id', link.project_id)
    .eq('environment', 'PREVIEW')
    .order('deployed_at', { ascending: false })
    .limit(1)
    .maybeSingle<{ url: string | null }>()

  // Best-effort bookkeeping — a failed counter update must never be the
  // reason a valid link stops resolving.
  await admin
    .from('share_links')
    .update({ view_count: link.view_count + 1, last_viewed_at: new Date().toISOString() })
    .eq('id', link.id)

  return {
    status: 'ok',
    projectName: project.name,
    previewUrl: deployment?.url ?? null,
    expiresAt: link.expires_at,
  }
}
