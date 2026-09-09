import 'server-only'

import { createClient } from '@/lib/work/supabase/server'
import type { DeliverableStatus } from '@/lib/work/types/enums'
import { unwrapOr } from './internal'

export type Deliverable = {
  id: string
  itemKey: string | null
  title: string
  description: string | null
  notes: string | null
  clientRequested: boolean
  status: DeliverableStatus
  documentId: string | null
  sortOrder: number
  deliveredAt: string | null
  deliveredByName: string | null
}

type DeliverableRow = {
  id: string
  item_key: string | null
  title: string
  description: string | null
  notes: string | null
  client_requested: boolean
  status: DeliverableStatus
  document_id: string | null
  sort_order: number
  delivered_at: string | null
  delivered_by_profile: { full_name: string | null } | null
}

const COLUMNS =
  'id, item_key, title, description, notes, client_requested, status, document_id, ' +
  'sort_order, delivered_at, ' +
  'delivered_by_profile:profiles!project_deliverables_delivered_by_fkey(full_name)'

/**
 * The AGREED deliverables for a project, in display order.
 *
 * RLS-scoped: `project_deliverables_select` is `app.can_read_project`, so a
 * client sees their own checklist and nobody else's, and a caller with no
 * access gets an empty list rather than an error.
 */
export async function getDeliverables(projectId: string): Promise<Deliverable[]> {
  const supabase = await createClient()

  const result = await supabase
    .from('project_deliverables')
    .select(COLUMNS)
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  const rows = unwrapOr<DeliverableRow[]>(result, 'รายการส่งมอบ', [])

  return rows.map((row) => ({
    id: row.id,
    itemKey: row.item_key,
    title: row.title,
    description: row.description,
    notes: row.notes,
    clientRequested: row.client_requested,
    status: row.status,
    documentId: row.document_id,
    sortOrder: row.sort_order,
    deliveredAt: row.delivered_at,
    deliveredByName: row.delivered_by_profile?.full_name ?? null,
  }))
}

export type HandoverAcknowledgement = {
  id: string
  acknowledgedName: string
  acknowledgedEmail: string
  note: string | null
  acknowledgedAt: string
}

/** Who has signed for the handover. Immutable rows (migration 0041). */
export async function getHandoverAcknowledgements(
  projectId: string,
): Promise<HandoverAcknowledgement[]> {
  const supabase = await createClient()

  const result = await supabase
    .from('project_handover_acknowledgements')
    .select('id, acknowledged_name, acknowledged_email, note, acknowledged_at')
    .eq('project_id', projectId)
    .order('acknowledged_at', { ascending: false })

  const rows = unwrapOr<
    {
      id: string
      acknowledged_name: string
      acknowledged_email: string
      note: string | null
      acknowledged_at: string
    }[]
  >(result, 'การยืนยันการรับมอบ', [])

  return rows.map((row) => ({
    id: row.id,
    acknowledgedName: row.acknowledged_name,
    acknowledgedEmail: row.acknowledged_email,
    note: row.note,
    acknowledgedAt: row.acknowledged_at,
  }))
}

export type HandoverReadiness = {
  total: number
  delivered: number
  waived: number
  /** Agreed items still owed: everything not DELIVERED and not WAIVED. */
  outstanding: Deliverable[]
  /** Every agreed item is settled one way or the other. */
  isComplete: boolean
  /** Percent of non-waived items delivered. 100 when there is nothing to do. */
  percent: number
}

/**
 * Whether the checklist is finished, derived from the rows themselves.
 *
 * WAIVED counts as settled, not delivered: the team and client agreed not to
 * hand that item over, so it cannot block a handover, and it must not inflate
 * the delivered figure either. An empty checklist is complete — a project may
 * legitimately have no itemised deliverables — but `completeHandover` refuses
 * that case separately, because "nothing was agreed" is not the same as
 * "everything agreed is done".
 *
 * Pure derivation over rows the caller can already read. It is NOT an
 * authorization check and nothing gates on it client-side: the server action
 * re-derives it from the database before performing a handover.
 */
export function computeHandoverReadiness(deliverables: Deliverable[]): HandoverReadiness {
  const delivered = deliverables.filter((d) => d.status === 'DELIVERED').length
  const waived = deliverables.filter((d) => d.status === 'WAIVED').length
  const outstanding = deliverables.filter(
    (d) => d.status !== 'DELIVERED' && d.status !== 'WAIVED',
  )
  const countable = deliverables.length - waived

  return {
    total: deliverables.length,
    delivered,
    waived,
    outstanding,
    isComplete: outstanding.length === 0,
    percent: countable === 0 ? 100 : Math.round((delivered / countable) * 100),
  }
}
