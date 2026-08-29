import 'server-only'

import { createClient } from '@/lib/work/supabase/server'
import type { DocumentStatus, DocumentType } from '@/lib/work/types/enums'
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
  storage_path: string | null
  file_size: number | null
  mime_type: string | null
  created_at: string
  projects: { name: string } | null
  clients: { name: string } | null
}

const DOCUMENT_COLUMNS =
  'id, type, status, document_number, title, amount, currency, issued_at, due_date, ' +
  'project_id, storage_path, file_size, mime_type, created_at, projects(name), clients(name)'

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
    // The path itself stays server-side; the UI only needs to know whether
    // there is anything to download.
    hasFile: !!row.storage_path,
    fileSize: row.file_size,
    mimeType: row.mime_type,
    createdAt: row.created_at,
  }
}

export async function getDocuments(
  options: { projectId?: string; type?: DocumentType; limit?: number } = {},
): Promise<DocumentListItem[]> {
  const supabase = await createClient()

  let query = supabase
    .from('documents')
    .select(DOCUMENT_COLUMNS)
    .order('created_at', { ascending: false })

  if (options.projectId) query = query.eq('project_id', options.projectId)
  if (options.type) query = query.eq('type', options.type)
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
