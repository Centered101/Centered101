import 'server-only'

import { createAdminClient } from '@/lib/work/supabase/admin'
import { createClient } from '@/lib/work/supabase/server'
import { unwrapOr } from './internal'

export type ProjectPublishing = {
  repositoryUrl: string | null
  repositoryBranch: string | null
  repositoryCommitSha: string | null
  repositoryNotes: string | null
  sourceDocumentId: string | null
  deliveryVersion: string | null
  productionUrl: string | null
  previewUrl: string | null
  domain: string | null
  hostingProvider: string | null
  notes: string | null
  publishedAt: string | null
  unpublishedAt: string | null
  /** Live now: published, and not unpublished since. Derived, never stored. */
  isPublished: boolean
  /**
   * Whether the LIVE url is https. Read from the scheme of the URL actually
   * stored — this is not a certificate check and does not claim to be one.
   * Nothing here performs a TLS handshake, so nothing here reports on one.
   */
  productionIsHttps: boolean
}

type PublishingRow = {
  repository_url: string | null
  repository_branch: string | null
  repository_commit_sha: string | null
  repository_notes: string | null
  source_document_id: string | null
  delivery_version: string | null
  production_url: string | null
  preview_url: string | null
  domain: string | null
  hosting_provider: string | null
  notes: string | null
  published_at: string | null
  unpublished_at: string | null
}

const COLUMNS =
  'repository_url, repository_branch, repository_commit_sha, repository_notes, ' +
  'source_document_id, delivery_version, production_url, preview_url, domain, ' +
  'hosting_provider, notes, published_at, unpublished_at'

const EMPTY: ProjectPublishing = {
  repositoryUrl: null,
  repositoryBranch: null,
  repositoryCommitSha: null,
  repositoryNotes: null,
  sourceDocumentId: null,
  deliveryVersion: null,
  productionUrl: null,
  previewUrl: null,
  domain: null,
  hostingProvider: null,
  notes: null,
  publishedAt: null,
  unpublishedAt: null,
  isPublished: false,
  productionIsHttps: false,
}

/**
 * A project's publishing identity (migration 0040).
 *
 * RLS-scoped like every other read here: `project_publishing_select` is
 * `app.can_read_project`, so a caller asking about a project they cannot see
 * gets no row — and therefore the same empty record as a project that has
 * simply never been configured. That collapse is deliberate: "not yours" and
 * "not set up" must be indistinguishable from the outside.
 *
 * Never returns null. A project with no publishing row yet is not an error
 * state; it is a project nobody has published, which is most of them.
 */
export async function getProjectPublishing(projectId: string): Promise<ProjectPublishing> {
  const supabase = await createClient()

  const result = await supabase
    .from('project_publishing')
    .select(COLUMNS)
    .eq('project_id', projectId)
    .maybeSingle<PublishingRow>()

  const row = unwrapOr<PublishingRow | null>(result, 'ข้อมูลการเผยแพร่', null)
  if (!row) return EMPTY

  // Re-publishing after an unpublish sets published_at again, so the newer
  // timestamp wins rather than "unpublished once, unpublished forever".
  const isPublished =
    row.published_at !== null &&
    (row.unpublished_at === null || row.unpublished_at < row.published_at)

  return {
    repositoryUrl: row.repository_url,
    repositoryBranch: row.repository_branch,
    repositoryCommitSha: row.repository_commit_sha,
    repositoryNotes: row.repository_notes,
    sourceDocumentId: row.source_document_id,
    deliveryVersion: row.delivery_version,
    productionUrl: row.production_url,
    previewUrl: row.preview_url,
    domain: row.domain,
    hostingProvider: row.hosting_provider,
    notes: row.notes,
    publishedAt: row.published_at,
    unpublishedAt: row.unpublished_at,
    isPublished,
    productionIsHttps: (row.production_url ?? '').toLowerCase().startsWith('https://'),
  }
}

/**
 * The storage path of a project's delivered source-code package, for the
 * download route ONLY.
 *
 * CALLERS MUST HAVE AUTHORIZED FIRST. This uses the privileged client and
 * therefore decides nothing: the route calls `requireProjectAccess` and then
 * `isResourceUnlocked(projectId, 'source_code')` BEFORE reaching this, and
 * only a caller who passed both ever gets here. Same ordering rule as every
 * other privileged read in this codebase — authorize on the real session,
 * then use the service client purely to fetch what that decision permits.
 *
 * It cannot be the caller's session, and that is the whole design: the linked
 * document is deliberately INTERNAL so `documents_select_client` refuses a
 * client the row outright. Reading it as the client would return null even
 * when they have paid for it. The unlock rules are what say yes here, not the
 * document's visibility — which is exactly the separation Phase 5 built.
 */
export async function getSourceCodeStoragePath(
  projectId: string,
): Promise<{ path: string; documentId: string; title: string } | null> {
  const admin = createAdminClient()

  const publishing = await admin
    .from('project_publishing')
    .select('source_document_id')
    .eq('project_id', projectId)
    .maybeSingle<{ source_document_id: string | null }>()

  const documentId = publishing.data?.source_document_id
  if (!documentId) return null

  const { data } = await admin
    .from('documents')
    .select('id, title, storage_path')
    .eq('id', documentId)
    // Scoped to the project the caller was authorized for. Without this a
    // publishing row pointing at ANOTHER project's document would hand that
    // document over under this project's authorization — the privileged
    // client would not stop it, because stopping it is not its job.
    .eq('project_id', projectId)
    .maybeSingle<{ id: string; title: string; storage_path: string | null }>()

  if (!data?.storage_path) return null
  return { path: data.storage_path, documentId: data.id, title: data.title }
}
