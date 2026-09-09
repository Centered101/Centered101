import 'server-only'

import { createClient } from '@/lib/work/supabase/server'
import type { AgreementStatus } from '@/lib/work/types/enums'
import { unwrapOr } from './internal'

export type AgreementAcceptance = {
  acceptedName: string
  acceptedEmail: string
  acceptedAt: string
}

export type Agreement = {
  id: string
  status: AgreementStatus
  currentVersionId: string | null
  currentVersion: {
    id: string
    version: number
    body: string
    totalAmount: number
    currency: string
    sentAt: string | null
    expiresAt: string | null
    /** QT-2026-001 — null on any version sent before migration 0029. */
    quotationNumber: string | null
    /** The structured VAT breakdown as it stood when this version was sent — all null for a pre-0029 version, not zero (see that migration's own comment). */
    subtotal: number | null
    discountTotal: number | null
    taxableAmount: number | null
    vatEnabled: boolean | null
    vatRateBp: number | null
    vatAmount: number | null
  } | null
  acceptance: AgreementAcceptance | null
}

/**
 * The one agreement a project has (`agreements_project_key`, migration 0008),
 * with its current version and — if accepted — who accepted it. RLS-scoped:
 * a client sees this for their own project exactly like everything else.
 */
export async function getAgreement(projectId: string): Promise<Agreement | null> {
  const supabase = await createClient()

  const { data: agreement, error } = await supabase
    .from('agreements')
    .select('id, status, current_version_id')
    .eq('project_id', projectId)
    .maybeSingle<{ id: string; status: AgreementStatus; current_version_id: string | null }>()

  if (error && error.code !== 'PGRST205' && error.code !== '42P01') {
    console.error('[agreements] read failed:', error)
  }
  if (!agreement) return null

  const {
    data: versionRows,
    error: versionError,
    status: versionStatus,
  } = await supabase
    .from('agreement_versions')
    .select(
      'id, version, body, total_amount, currency, sent_at, expires_at, quotation_number, ' +
        'subtotal, discount_total, taxable_amount, vat_enabled, vat_rate_bp, vat_amount',
    )
    .eq('agreement_id', agreement.id)
    .order('version', { ascending: false })
    .limit(1)

  const version = (unwrapOr<
    {
      id: string
      version: number
      body: string
      total_amount: number
      currency: string
      sent_at: string | null
      expires_at: string | null
      quotation_number: string | null
      subtotal: number | null
      discount_total: number | null
      taxable_amount: number | null
      vat_enabled: boolean | null
      vat_rate_bp: number | null
      vat_amount: number | null
    }[]
  >({ data: versionRows, error: versionError, status: versionStatus }, 'สัญญา', []) ?? [])[0]

  let acceptance: AgreementAcceptance | null = null
  if (version && agreement.status === 'ACCEPTED') {
    const { data: acceptRow } = await supabase
      .from('agreement_acceptances')
      .select('accepted_name, accepted_email, accepted_at')
      .eq('version_id', version.id)
      .order('accepted_at', { ascending: false })
      .limit(1)
      .maybeSingle<{ accepted_name: string; accepted_email: string; accepted_at: string }>()

    if (acceptRow) {
      acceptance = {
        acceptedName: acceptRow.accepted_name,
        acceptedEmail: acceptRow.accepted_email,
        acceptedAt: acceptRow.accepted_at,
      }
    }
  }

  return {
    id: agreement.id,
    status: agreement.status,
    currentVersionId: agreement.current_version_id,
    currentVersion: version
      ? {
          id: version.id,
          version: version.version,
          body: version.body,
          totalAmount: version.total_amount,
          currency: version.currency,
          sentAt: version.sent_at,
          expiresAt: version.expires_at,
          quotationNumber: version.quotation_number,
          subtotal: version.subtotal,
          discountTotal: version.discount_total,
          taxableAmount: version.taxable_amount,
          vatEnabled: version.vat_enabled,
          vatRateBp: version.vat_rate_bp,
          vatAmount: version.vat_amount,
        }
      : null,
    acceptance,
  }
}
