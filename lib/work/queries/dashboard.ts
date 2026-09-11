import 'server-only'

import { sumBy } from './internal'
import { getActivity, type ActivityItem } from './activity'
import { getMaintenancePlans } from './maintenance'
import {
  getMonthlyRevenue,
  getPayments,
  getProjectPaymentSummary,
  type MilestoneListItem,
  type MonthlyRevenue,
} from './payments'
import {
  getProjectById,
  getProjectFeatures,
  getProjects,
  summariseProjects,
  type ProjectDetail,
  type ProjectFeature,
  type ProjectListItem,
} from './projects'

/**
 * Dashboard aggregates.
 *
 * Every number below is computed from rows the caller is allowed to read. None
 * is stored, cached or hardcoded, so a figure on the dashboard can always be
 * traced to the payments and projects behind it — the brief's "Total Revenue =
 * 125000" is exactly the kind of value that goes stale and lies.
 *
 * REVENUE MEANS MONEY RECEIVED. Only payments with status PAID count. Invoiced
 * but unpaid work is "pending", never revenue: counting it as revenue is how a
 * dashboard tells you a business is healthy while its bank account is empty.
 */

export type AdminDashboardData = {
  totalRevenue: number
  pendingAmount: number
  overdueAmount: number
  activeProjects: number
  overdueProjects: number
  maintenanceCount: number
  maintenanceRevenue: number
  currency: string
  revenue: MonthlyRevenue[]
  recentProjects: ProjectListItem[]
  activity: (ActivityItem & { projectName: string | null })[]
  hasAnyData: boolean
}

export async function getAdminDashboard(): Promise<AdminDashboardData> {
  const [projects, payments, revenue, activity, maintenance] = await Promise.all([
    getProjects(),
    getPayments(),
    getMonthlyRevenue(12),
    getActivity({ limit: 6 }),
    getMaintenancePlans(),
  ])

  const summary = summariseProjects(projects)

  // getPayments() and getMaintenancePlans() are not scoped by project status
  // — unlike getProjects(), they return rows for archived projects too. Every
  // figure below is money/retainers on the ACTIVE book, so it's rescoped to
  // the same project set `projects` (and activeProjects/overdueProjects) is
  // already limited to. Left unscoped, an archived project's payments and
  // retainer would go on inflating รายได้รวม/การชำระเงินที่รอดำเนินการ/
  // การดูแลรักษาที่ใช้งานอยู่ forever, even after it stopped counting toward
  // "active projects" itself.
  const activeProjectIds = new Set(projects.map((project) => project.id))
  const activePayments = payments.filter((payment) => activeProjectIds.has(payment.projectId))
  const activeMaintenancePlans = maintenance.filter((plan) =>
    activeProjectIds.has(plan.projectId),
  )

  const paidPayments = activePayments.filter((p) => p.status === 'PAID')
  const pendingPayments = activePayments.filter(
    (p) => p.status === 'PENDING' || p.status === 'PROCESSING',
  )

  const activeMaintenance = activeMaintenancePlans.filter((plan) => plan.status === 'ACTIVE')

  // Monthly-equivalent value of the retainer book, so quarterly and yearly
  // plans are comparable to monthly ones instead of inflating the figure.
  const maintenanceRevenue = sumBy(activeMaintenance, (plan) =>
    plan.billingCycle === 'YEARLY'
      ? Math.round(plan.priceAmount / 12)
      : plan.billingCycle === 'QUARTERLY'
        ? Math.round(plan.priceAmount / 3)
        : plan.priceAmount,
  )

  return {
    totalRevenue: sumBy(paidPayments, (p) => p.amount),
    pendingAmount: sumBy(pendingPayments, (p) => p.amount),
    // "Overdue" is money owed on a project already past its delivery date.
    overdueAmount: sumBy(
      pendingPayments.filter((payment) =>
        projects.some(
          (project) =>
            project.id === payment.projectId &&
            (project.status === 'OVERDUE' ||
              (project.expectedDelivery !== null &&
                new Date(project.expectedDelivery) < new Date() &&
                project.status !== 'COMPLETED')),
        ),
      ),
      (p) => p.amount,
    ),
    activeProjects: summary.activeCount,
    overdueProjects: summary.overdueCount,
    maintenanceCount: activeMaintenance.length,
    maintenanceRevenue,
    currency: projects[0]?.currency ?? 'THB',
    revenue,
    recentProjects: projects.slice(0, 5),
    activity,
    hasAnyData: projects.length > 0 || payments.length > 0,
  }
}

export type PortalDashboardData = {
  projects: ProjectListItem[]
  activeProjects: number
  totalPaid: number
  outstanding: number
  currency: string
  /**
   * The project the portal leads with — most recently updated.
   *
   * Returned as the FULL detail, not the list row: the page needs delivery
   * method, ownership and start date, and fetching those itself meant reading
   * the same project a second time on every portal visit.
   */
  featured: ProjectDetail | null
  /** Scope items for the featured project, for the timeline panel. */
  featuredFeatures: ProjectFeature[]
  nextDue: MilestoneListItem | null
  maintenance: Awaited<ReturnType<typeof getMaintenancePlans>>[number] | null
}

/**
 * The client portal's own view.
 *
 * Reads the same tables through the same RLS as the admin dashboard. There is
 * no "client mode" flag and no filter by client id in application code —
 * a client's session simply cannot see another client's rows.
 */
export async function getPortalDashboard(): Promise<PortalDashboardData> {
  const projects = await getProjects()
  const summary = summariseProjects(projects)
  const lead = projects[0] ?? null

  // Everything below depends only on which project leads, so it all goes out
  // together rather than in sequence.
  const [featured, featuredFeatures, paymentSummary, maintenancePlans] = await Promise.all([
    lead ? getProjectById(lead.id) : Promise.resolve(null),
    lead ? getProjectFeatures(lead.id) : Promise.resolve([]),
    lead ? getProjectPaymentSummary(lead.id) : Promise.resolve(null),
    getMaintenancePlans(),
  ])

  return {
    projects,
    activeProjects: summary.activeCount,
    totalPaid: summary.paidAmount,
    outstanding: summary.outstandingAmount,
    currency: lead?.currency ?? 'THB',
    featured,
    featuredFeatures,
    nextDue: paymentSummary?.nextDue ?? null,
    maintenance:
      maintenancePlans.find((plan) => plan.projectId === lead?.id) ??
      maintenancePlans[0] ??
      null,
  }
}
