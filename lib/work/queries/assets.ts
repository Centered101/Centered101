import 'server-only'

import { createClient } from '@/lib/work/supabase/server'
import type { ProjectAssetKind, ProjectAssetReviewStatus } from '@/lib/work/types/enums'
import { unwrapOr } from './internal'

export type ProjectAsset = {
  id: string
  kind: ProjectAssetKind
  name: string
  notes: string | null
  hasFile: boolean
  externalUrl: string | null
  fileSize: number | null
  mimeType: string | null
  version: number
  reviewStatus: ProjectAssetReviewStatus
  reviewNote: string | null
  uploadedByName: string | null
  createdAt: string
}

type AssetRow = {
  id: string
  kind: ProjectAssetKind
  name: string
  notes: string | null
  storage_path: string | null
  external_url: string | null
  file_size: number | null
  mime_type: string | null
  version: number
  review_status: ProjectAssetReviewStatus
  review_note: string | null
  created_at: string
  profiles: { full_name: string | null; email: string } | null
}

/** Every brand/reference asset on a project (docs/ADMIN_PROJECT_REVIEW.md §4/§5) — RLS-scoped, same as every other project-child read here. */
export async function getProjectAssets(projectId: string): Promise<ProjectAsset[]> {
  const supabase = await createClient()

  const result = await supabase
    .from('project_assets')
    .select(
      'id, kind, name, notes, storage_path, external_url, file_size, mime_type, version, ' +
        'review_status, review_note, created_at, profiles!project_assets_uploaded_by_fkey(full_name, email)',
    )
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  const rows = unwrapOr<AssetRow[]>(result, 'ไฟล์แบรนด์', [])

  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    name: row.name,
    notes: row.notes,
    hasFile: row.storage_path !== null,
    externalUrl: row.external_url,
    fileSize: row.file_size,
    mimeType: row.mime_type,
    version: row.version,
    reviewStatus: row.review_status,
    reviewNote: row.review_note,
    uploadedByName: row.profiles?.full_name ?? row.profiles?.email ?? null,
    createdAt: row.created_at,
  }))
}

/** The storage path for one asset — used only by the signed-download route, under the caller's own session (see app/work/api/assets/[id]/download/route.ts). */
export async function getAssetStoragePath(assetId: string): Promise<{ path: string; projectId: string } | null> {
  const supabase = await createClient()

  const result = await supabase
    .from('project_assets')
    .select('storage_path, project_id')
    .eq('id', assetId)
    .maybeSingle<{ storage_path: string | null; project_id: string }>()

  const row = unwrapOr<{ storage_path: string | null; project_id: string } | null>(result, 'ไฟล์', null)
  if (!row?.storage_path) return null
  return { path: row.storage_path, projectId: row.project_id }
}
