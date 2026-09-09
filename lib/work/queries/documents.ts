import 'server-only'

import { createClient } from '@/lib/work/supabase/server'
import type { DocumentStatus, DocumentType, DocumentVisibility } from '@/lib/work/types/enums'
import { unwrapOr } from './internal'

/**
 * Documents — quotations, invoices, receipts, agreements.
 *
 * One table serves all of them, distinguished by `type`. Invoices are not a
 * separate table: an invoice IS a document with type = 'INVOICE', and giving
 * it its own table would duplicate numbering, storage, status and totals for
 * no gain (see `invoices.ts`, which is a view over this one).
 *
 * `storage_path` is never handed to the browser. Files are fetched through
 * /work/api/documents/[id]/download, which re-checks access and mints a
 * short-lived signed URL.
 */

export type DocumentListItem = {
  id: string
  type: DocumentType
  status: DocumentStatus
  documentNumber: string | null
  title: string
  amount: number
  currency: string
  issuedAt: string | null
  dueDate: string | null
  projectId: string | null
  projectName: string | null
  clientName: string | null
  /** Who may read it (migration 0039). Never inferred from `status`. */
  visibility: DocumentVisibility
  archivedAt: string | null
  /** The document this one replaced, if any — the history chain. */
  supersedesId: string | null
  uploadedByName: string | null
  hasFile: boolean
  fileSize: number | null
  mimeType: string | null
  createdAt: string
}

type DocumentRow = {
  id: string
  type: DocumentType
  status: DocumentStatus
  document_number: string | null
  title: string
  amount: number
  currency: string
  issued_at: string | null
  due_date: string | null
  project_id: string | null
  visibility: DocumentVisibility
  archived_at: string | null
  supersedes_id: string | null
  storage_path: string | null
  file_size: number | null
  mime_type: string | null
  created_at: string
  projects: { name: string } | null
  clients: { name: string } | null
  uploader: { full_name: string | null; email: string | null } | null
}

const DOCUMENT_COLUMNS =
  'id, type, status, document_number, title, amount, currency, issued_at, due_date, ' +
  'project_id, visibility, archived_at, supersedes_id, storage_path, file_size, mime_type, ' +
  'created_at, projects(name), clients(name), ' +
  'uploader:profiles!documents_created_by_fkey(full_name, email)'

function toDocument(row: DocumentRow): DocumentListItem {
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    documentNumber: row.document_number,
    title: row.title,
    amount: row.amount ?? 0,
    currency: row.currency ?? 'THB',
    issuedAt: row.issued_at,
    dueDate: row.due_date,
    projectId: row.project_id,
    projectName: row.projects?.name ?? null,
    clientName: row.clients?.name ?? null,
    visibility: row.visibility,
    archivedAt: row.archived_at,
    supersedesId: row.supersedes_id,
    uploadedByName: row.uploader?.full_name ?? row.uploader?.email ?? null,
    // The path itself stays server-side; the UI only needs to know whether
    // there is anything to download.
    hasFile: !!row.storage_path,
    fileSize: row.file_size,
    mimeType: row.mime_type,
    createdAt: row.created_at,
  }
}

/**
 * Documents visible to the caller.
 *
 * `includeArchived` defaults to FALSE, so archived documents drop out of every
 * existing caller without any of them changing. It is a convenience only —
 * for a client, RLS already excludes archived rows outright (migration 0039),
 * so passing `true` cannot widen what a client sees. It exists for the staff
 * history view.
 */
export async function getDocuments(
  options: {
    projectId?: string
    type?: DocumentType
    limit?: number
    includeArchived?: boolean
  } = {},
): Promise<DocumentListItem[]> {
  const supabase = await createClient()

  let query = supabase
    .from('documents')
    .select(DOCUMENT_COLUMNS)
    .order('created_at', { ascending: false })

  if (options.projectId) query = query.eq('project_id', options.projectId)
  if (options.type) query = query.eq('type', options.type)
  if (!options.includeArchived) query = query.is('archived_at', null)
  if (options.limit) query = query.limit(options.limit)

  const rows = unwrapOr<DocumentRow[]>(await query, 'เอกสาร', [])
  return rows.map(toDocument)
}

/**
 * The storage path for one document, or null.
 *
 * Read under the caller's session, so RLS answers "may this person have this
 * file?" before a path exists to sign. This is the ONLY function that returns
 * a storage path, and only the download route calls it.
 */
export async function getDocumentStoragePath(
  id: string,
): Promise<{ path: string; title: string; mimeType: string | null } | null> {
  const supabase = await createClient()

  const result = await supabase
    .from('documents')
    .select('storage_path, title, mime_type')
    .eq('id', id)
    .maybeSingle()

  const row = unwrapOr<{
    storage_path: string | null
    title: string
    mime_type: string | null
  } | null>(result, 'เอกสาร', null)

  if (!row?.storage_path) return null
  return { path: row.storage_path, title: row.title, mimeType: row.mime_type }
}
