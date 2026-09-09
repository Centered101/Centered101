import 'server-only'

import { getChangeRequests } from './change-requests'
import { computeHandoverReadiness, getDeliverables } from './delivery'
import { getMaintenancePlan, getMaintenanceRecords } from './maintenance'
import { getProjectPaymentSummary } from './payments'
import { getProjectById } from './projects'
import { getProjectPublishing } from './publishing'
import { computeWorkProgress, getWorkMilestones } from './work-milestones'

export type ProjectReport = {
  project: NonNullable<Awaited<ReturnType<typeof getProjectById>>>

  payment: {
    total: number
    paid: number
    remaining: number
    currency: string
    percent: number
  }

  work: {
    percent: number
    completed: number
    total: number
    awaitingReview: number
  }

  delivery: {
    percent: number
    delivered: number
    waived: number
    outstanding: number
    total: number
    isComplete: boolean
    handedOverOn: string | null
  }

  publishing: {
    isPublished: boolean
    publishedAt: string | null
    productionUrl: string | null
    hasSourcePackage: boolean
  }

  changeRequests: {
    total: number
    open: number
    approved: number
    rejected: number
    /** Agreed cost of approved changes, minor units. */
    approvedValue: number
  }

  maintenance: {
    hasPlan: boolean
    status: string | null
    priceAmount: number | null
    recordCount: number
    minutesLogged: number
  }
}

/**
 * One project's summary, composed from the queries each phase already owns.
 *
 * NOTHING IS RECOMPUTED HERE. Payment progress comes from the payment
 * summary, work progress from `computeWorkProgress`, delivery from
 * `computeHandoverReadiness` — the same functions the pages themselves use. A
 * report that derived its own totals would eventually disagree with the screen
 * it summarises, and the report would be the one people quote.
 *
 * THE THREE PROGRESS FIGURES ARE KEPT SEPARATE and are never averaged into a
 * single "project percent". Work 60% with payment 50% is a valid, ordinary
 * state (docs/PROJECT_TIMELINE.md §1); a blended number would hide exactly the
 * mismatch a report exists to reveal.
 *
 * RLS-SCOPED THROUGHOUT: every underlying query runs on the caller's session,
 * so a client asking for a project they cannot see gets a null project and
 * empty aggregates rather than an error — and staff, client and accountant all
 * get exactly what their policies already allow them elsewhere. There is no
 * privileged read anywhere in this file.
 */
export async function getProjectReport(projectId: string): Promise<ProjectReport | null> {
  const project = await getProjectById(projectId)
  if (!project) return null

  const [payments, workMilestones, deliverables, publishing, requests, plan, records] =
    await Promise.all([
      getProjectPaymentSummary(projectId),
      getWorkMilestones(projectId),
      getDeliverables(projectId),
      getProjectPublishing(projectId),
      getChangeRequests({ projectId }),
      getMaintenancePlan(projectId),
      getMaintenanceRecords(projectId),
    ])

  const work = computeWorkProgress(workMilestones)
  const readiness = computeHandoverReadiness(deliverables)

  const approved = requests.filter((request) => request.status === 'APPROVED')

  return {
    project,

    payment: {
      total: payments.total,
      paid: payments.paid,
      remaining: payments.remaining,
      currency: project.currency,
      percent:
        payments.total > 0 ? Math.min(100, Math.round((payments.paid / payments.total) * 100)) : 0,
    },

    work: {
      percent: work.percent,
      completed: work.completed,
      total: work.total,
      awaitingReview: work.awaitingReview.length,
    },

    delivery: {
      percent: readiness.percent,
      delivered: readiness.delivered,
      waived: readiness.waived,
      outstanding: readiness.outstanding.length,
      total: readiness.total,
      isComplete: readiness.isComplete,
      handedOverOn: project.actualDelivery,
    },

    publishing: {
      isPublished: publishing.isPublished,
      publishedAt: publishing.publishedAt,
      productionUrl: publishing.productionUrl,
      hasSourcePackage: publishing.sourceDocumentId !== null,
    },

    changeRequests: {
      total: requests.length,
      open: requests.filter(
        (request) =>
          request.status !== 'COMPLETED' &&
          request.status !== 'REJECTED' &&
          request.status !== 'CANCELLED',
      ).length,
      approved: approved.length,
      rejected: requests.filter((request) => request.status === 'REJECTED').length,
      // Only APPROVED changes count toward agreed value. A quoted-but-undecided
      // change is not money anybody has agreed to.
      approvedValue: approved.reduce((sum, request) => sum + (request.estimatedAmount ?? 0), 0),
    },

    maintenance: {
      hasPlan: plan !== null,
      status: plan?.status ?? null,
      priceAmount: plan?.priceAmount ?? null,
      recordCount: records.length,
      minutesLogged: records.reduce((sum, record) => sum + (record.minutesSpent ?? 0), 0),
    },
  }
}
