import { notFound } from 'next/navigation'
import { Code2, ExternalLink } from 'lucide-react'

import { Panel, PageHeading, PanelHead, ProgressBar } from '@/components/work/data/panel'
import { Status } from '@/components/work/data/status'
import { Timeline } from '@/components/work/data/timeline'
import { getAccessContext, requireProjectAccess } from '@/lib/work/auth/permissions'
import {
  DELIVERY_METHOD_LABELS,
  DEPLOYMENT_ENVIRONMENT_LABELS,
  MILESTONE_STATUS_LABELS,
  PAYMENT_PLAN_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  PROJECT_STATUS_LABELS,
  SOURCE_OWNERSHIP_LABELS,
  formatDate,
  formatDateTime,
  formatMoney,
  milestoneStatusTone,
  paymentStatusTone,
  projectStatusTone,
  toPaymentMilestoneOptions,
} from '@/lib/work/format'
import { getDeployments } from '@/lib/work/queries/deployments'
import { getProjectPaymentSummary } from '@/lib/work/queries/payments'
import {
  getPaymentPlanChangeRequests,
  getPaymentPlanComparison,
} from '@/lib/work/queries/payment-plans'
import {
  computeWorkProgress,
  getAssignableMembers,
  getTimelineComparison,
  getWorkMilestones,
} from '@/lib/work/queries/work-milestones'
import {
  getProjectById,
  getProjectFeatures,
  getProjectMembers,
} from '@/lib/work/queries/projects'
import { getShareLinks } from '@/lib/work/queries/share-links'
import { getPricingItems, getPricingTotals } from '@/lib/work/queries/pricing'
import type { MilestoneStatus } from '@/lib/work/types/enums'
import { PricingPanel } from '@/components/work/domain/pricing-panel'
import { PaymentPlanForm } from '@/components/work/domain/payment-plan-form'
import { PaymentPlanComparison } from '@/components/work/domain/payment-plan-comparison'
import { PaymentPlanChangeRequests } from '@/components/work/domain/payment-plan-change-requests'
import { WorkTimelineAdmin } from '@/components/work/domain/work-timeline-admin'
import { TimelineComparison } from '@/components/work/domain/timeline-comparison'
import { WorkTimeline } from '@/components/work/domain/work-timeline'
import { StartProjectForm } from './start-project-form'
import { VerifyPaymentForm } from './verify-payment-form'
import { getAgreement } from '@/lib/work/queries/agreements'
import { SendAgreementForm } from '@/components/work/domain/agreement-panel'
import { ProjectPeople } from '@/components/work/data/project-people'
import { ArchiveForm } from './archive-form'
import { CreatedToast } from './created-toast'
import { ShareLinksPanel } from './share-links-panel'
import { DeploymentForm } from './deployment-form'
import { EditProjectForm } from './edit-form'
import { RecordPaymentForm } from './record-payment-form'

export const metadata = { title: 'รายละเอียดโปรเจกต์' }

/**
 * Milestones a finance-staff member may record an out-of-band payment
 * against. PAID and CANCELLED are excluded for the obvious reason — the
 * server refuses them again anyway (recordManualPayment), because a button
 * that is merely absent is not a rule.
 */
const PAYABLE_MILESTONE_STATUSES: MilestoneStatus[] = ['PENDING', 'INVOICED', 'OVERDUE']

/**
 * Admin project detail.
 *
 * The `[id]` segment is the project UUID. `requireProjectAccess()` resolves it
 * under the caller's session, so an id belonging to another organization is
 * answered with notFound() — never a 403, which would confirm the project
 * exists and turn URL guessing into an enumeration oracle.
 */
export default async function AdminProjectDetailPage(
  props: PageProps<'/work/admin/projects/[id]'>,
) {
  const { id } = await props.params
  const { created } = await props.searchParams

  const access = await requireProjectAccess(id)
  const project = await getProjectById(id)

  // requireProjectAccess already proved the row is visible; a null here means
  // it was deleted between the two reads.
  if (!project) notFound()

  // getAccessContext() is memoised per request (see lib/work/auth/permissions.ts),
  // so this is not a second membership query — requireProjectAccess() already
  // ran it. Archiving is manager-only, one level stricter than the
  // project:write capability the rest of this page's edit form checks.
  const context = await getAccessContext()
  const canArchive =
    context?.kind === 'staff' && (context.role === 'super_admin' || context.role === 'admin')

  const [
    features,
    payments,
    deployments,
    members,
    shareLinks,
    pricingItems,
    pricingTotals,
    agreement,
    planComparison,
    planChangeRequests,
    workMilestones,
    timelineComparison,
    assignableMembers,
  ] = await Promise.all([
    getProjectFeatures(id),
    getProjectPaymentSummary(id),
    getDeployments({ projectId: id, limit: 5 }),
    getProjectMembers(id),
    getShareLinks(id),
    getPricingItems(id),
    getPricingTotals(id),
    getAgreement(id),
    getPaymentPlanComparison(id),
    getPaymentPlanChangeRequests(id),
    getWorkMilestones(id),
    getTimelineComparison(id),
    getAssignableMembers(access.organizationId),
  ])

  // WORK progress, derived from work milestones — deliberately NOT payment
  // progress and NOT projects.progress (a staff-set number). All three are
  // separate figures and are shown separately (docs/PROJECT_TIMELINE.md §12).
  const workProgress = computeWorkProgress(workMilestones)

  // Client-submitted bank transfers waiting on a staff member to confirm the
  // money actually arrived (docs/PAYMENT_PLAN.md §6). PENDING + provider
  // 'manual' is exactly what submitManualPaymentProof creates.
  const pendingManualPayments = payments.payments.filter(
    (p) => p.status === 'PENDING' && p.provider === 'manual',
  )

  const paymentProgress =
    payments.total > 0 ? Math.min(100, Math.round((payments.paid / payments.total) * 100)) : 0

  return (
    <>
      {created === '1' && <CreatedToast />}

      {/* Section navigation for this project lives in the sidebar now
          (ProjectNav), so the heading carries only identity, state and the
          two real actions — not a row of links wrapping into the badges. */}
      <PageHeading
        eyebrow={project.projectCode}
        title={project.name}
        description={project.description ?? project.clientName}
        action={
          <div className="project-header-actions">
            {project.archivedAt && (
              <Status tone="orange">จัดเก็บแล้วเมื่อ {formatDate(project.archivedAt)}</Status>
            )}
            <Status tone={projectStatusTone(project.status)}>
              {PROJECT_STATUS_LABELS[project.status]}
            </Status>
            {/* The ฿250 gate is already cleared (a settled start payment is
                the only thing that reaches READY_TO_START) — this is the
                human decision to actually begin. */}
            {access.canManageFinance && project.status === 'READY_TO_START' && (
              <StartProjectForm projectId={project.id} />
            )}
            {canArchive && <ArchiveForm projectId={project.id} archived={!!project.archivedAt} />}
          </div>
        }
      />

      <section className="client-main">
        <Panel className="project-hero">
          {/* Same three strings as the PageHeading above — the code, the name
              and the status badge — were being rendered again here. The
              heading owns the identity; this card owns the numbers. */}
          <PanelHead
            title="ภาพรวมโปรเจกต์"
            description="ยอดเงินและความคืบหน้าของงาน"
            action={<Code2 className="panel-symbol" size={21} />}
          />
          <div className="big-progress">
            <div>
              <span>ความคืบหน้าโปรเจกต์</span>
              <strong>{project.progress}%</strong>
            </div>
            <div className="progress">
              <span style={{ width: `${project.progress}%` }} />
            </div>
            <small>กำหนดส่งมอบ {formatDate(project.expectedDelivery)}</small>
          </div>
          <div className="hero-details">
            <div>
              <span>มูลค่าโปรเจกต์</span>
              <strong>{formatMoney(project.totalAmount, project.currency)}</strong>
            </div>
            <div>
              <span>ชำระแล้ว</span>
              <strong className="green-text">
                {formatMoney(payments.paid, payments.currency)}
              </strong>
            </div>
            <div>
              <span>คงเหลือ</span>
              <strong className="orange-text">
                {formatMoney(payments.remaining, payments.currency)}
              </strong>
            </div>
          </div>
        </Panel>

        <Panel className="timeline-panel">
          <PanelHead title="ขอบเขตงาน" description="สิ่งที่ตกลงว่าจะส่งมอบ" />
          <Timeline items={features} />
        </Panel>
      </section>

      {/* Work and payment side by side but visually separate (§13). They
          measure different things and are allowed to disagree — a project can
          be 60% built and 40% paid. */}
      <section className="progress-split">
        <Panel className="projects-panel">
          <PanelHead title="ความคืบหน้างาน" description="คำนวณจากไมล์สโตนงานที่ปิดแล้ว" />
          <div className="progress-split-body">
            <strong>{workProgress.percent}%</strong>
            <ProgressBar value={workProgress.percent} />
            <small className="muted">
              {workProgress.completed} จาก {workProgress.total} ไมล์สโตน
            </small>
            <div className="progress-split-next">
              <span>ไมล์สโตนถัดไป</span>
              <strong>{workProgress.next?.title ?? '—'}</strong>
              <small className="muted">
                {workProgress.next?.dueDate ? `ครบกำหนด ${formatDate(workProgress.next.dueDate)}` : 'ไม่ได้กำหนดวัน'}
              </small>
            </div>
          </div>
        </Panel>

        <Panel className="projects-panel">
          <PanelHead title="ความคืบหน้าการชำระเงิน" description="คำนวณจากยอดที่ชำระแล้ว" />
          <div className="progress-split-body">
            <strong>{paymentProgress}%</strong>
            <ProgressBar value={paymentProgress} />
            <small className="muted">
              {formatMoney(payments.paid, payments.currency)} จาก {formatMoney(payments.total, payments.currency)}
            </small>
            <div className="progress-split-next">
              <span>งวดชำระถัดไป</span>
              <strong>
                {payments.nextDue ? formatMoney(payments.nextDue.amount, payments.currency) : '—'}
              </strong>
              <small className="muted">
                {payments.nextDue?.dueDate ? `ครบกำหนด ${formatDate(payments.nextDue.dueDate)}` : 'ไม่มีงวดค้างชำระ'}
              </small>
            </div>
          </div>
        </Panel>
      </section>

      <TimelineComparison comparison={timelineComparison} />

      {access.canManage ? (
        <WorkTimelineAdmin
          projectId={project.id}
          milestones={workMilestones}
          members={assignableMembers}
          paymentMilestones={toPaymentMilestoneOptions(payments.milestones)}
          currency={project.currency}
        />
      ) : (
        <Panel className="projects-panel">
          <PanelHead title="ไทม์ไลน์งาน" description="ลำดับการทำงานจริงของโปรเจกต์" />
          <WorkTimeline milestones={workMilestones} currency={project.currency} />
        </Panel>
      )}

      <section className="bottom-grid">
        <Panel className="ownership">
          <PanelHead title="การส่งมอบ" description="เงื่อนไขที่ตกลงกับลูกค้า" />
          <div className="ownership-rows">
            <div>
              <span>ลูกค้า</span>
              <strong>{project.clientName}</strong>
            </div>
            <div>
              <span>ความเป็นเจ้าของซอร์สโค้ด</span>
              <strong>{SOURCE_OWNERSHIP_LABELS[project.sourceCodeOwnership]}</strong>
            </div>
            <div>
              <span>วิธีส่งมอบ</span>
              <strong>{DELIVERY_METHOD_LABELS[project.deliveryMethod]}</strong>
            </div>
            <div>
              <span>เริ่มงาน</span>
              <strong>{formatDate(project.startDate)}</strong>
            </div>
            <div>
              <span>ดูแลรักษา</span>
              <strong>{project.maintenanceEnabled ? 'เปิดใช้งาน' : 'ไม่เปิดใช้งาน'}</strong>
            </div>
          </div>
        </Panel>

        <Panel className="projects-panel">
          <PanelHead
            title="ไมล์สโตน"
            description={
              payments.plan
                ? `แผนเวอร์ชัน ${payments.plan.version} · ${PAYMENT_PLAN_STATUS_LABELS[payments.plan.status]}`
                : 'งวดการชำระเงินของโปรเจกต์นี้'
            }
          />
          {payments.plan && (
            <div className="payment-overview">
              <div>
                <span>มูลค่าโปรเจกต์</span>
                <strong>{formatMoney(payments.total, payments.currency)}</strong>
              </div>
              <div>
                <span>ชำระแล้ว</span>
                <strong className="green-text">{formatMoney(payments.paid, payments.currency)}</strong>
              </div>
              <div>
                <span>คงเหลือ</span>
                <strong className="orange-text">{formatMoney(payments.remaining, payments.currency)}</strong>
              </div>
              <div>
                <span>ความคืบหน้าการชำระเงิน</span>
                <strong>{paymentProgress}%</strong>
                <ProgressBar value={paymentProgress} />
              </div>
              <div>
                <span>งวดเริ่มต้น (฿250)</span>
                <strong className={payments.startPaymentMet ? 'green-text' : 'orange-text'}>
                  {payments.startMilestone
                    ? payments.startPaymentMet
                      ? 'ชำระแล้ว — เริ่มงานได้'
                      : `รอชำระ ${formatMoney(payments.startMilestone.amount, payments.currency)}`
                    : 'ยังไม่ได้กำหนด'}
                </strong>
              </div>
            </div>
          )}
          {payments.milestones.length === 0 ? (
            <p className="muted empty-inline">ยังไม่ได้กำหนดแผนการชำระเงิน</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>งวด</th>
                    <th>จำนวน</th>
                    <th>ครบกำหนด</th>
                    <th>สถานะ</th>
                    {access.canManageFinance && <th />}
                  </tr>
                </thead>
                <tbody>
                  {payments.milestones.map((milestone) => (
                    <tr key={milestone.id}>
                      <td>
                        <strong>
                          {milestone.sequence}. {milestone.name}
                        </strong>
                        {milestone.isStartPayment && (
                          <>
                            {' '}
                            <Status tone="violet">งวดเริ่มต้น</Status>
                          </>
                        )}
                      </td>
                      <td>{formatMoney(milestone.amount, milestone.currency)}</td>
                      <td className="muted">{formatDate(milestone.dueDate)}</td>
                      <td>
                        <Status tone={milestoneStatusTone(milestone.status)}>
                          {MILESTONE_STATUS_LABELS[milestone.status]}
                        </Status>
                      </td>
                      {access.canManageFinance && (
                        <td className="row-actions">
                          {PAYABLE_MILESTONE_STATUSES.includes(milestone.status) && (
                            <RecordPaymentForm
                              projectId={project.id}
                              milestoneId={milestone.id}
                              milestoneName={milestone.name}
                              defaultAmountBaht={(milestone.amount / 100).toFixed(2)}
                            />
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </section>

      <ProjectPeople project={project} members={members} />

      <Panel className="projects-panel">
        <PanelHead title="การเผยแพร่ล่าสุด" description="ลิงก์ตัวอย่างและเวอร์ชันที่เผยแพร่" />
        {deployments.length === 0 ? (
          <p className="muted empty-inline">ยังไม่มีการเผยแพร่</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>สภาพแวดล้อม</th>
                  <th>เวอร์ชัน</th>
                  <th>ลิงก์</th>
                  <th>เผยแพร่เมื่อ</th>
                </tr>
              </thead>
              <tbody>
                {deployments.map((deployment) => (
                  <tr key={deployment.id}>
                    <td>{DEPLOYMENT_ENVIRONMENT_LABELS[deployment.environment]}</td>
                    <td className="muted">{deployment.version ?? '—'}</td>
                    <td>
                      {deployment.url ? (
                        <a
                          className="text-btn"
                          href={deployment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          เปิด <ExternalLink size={13} />
                        </a>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td className="muted">{formatDateTime(deployment.deployedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* docs/PAYMENT_PLAN.md §1 — the client's own proposal alongside what
          the agency actually plans, never merged into one. */}
      <PaymentPlanComparison comparison={planComparison} />

      <PaymentPlanChangeRequests
        projectId={project.id}
        requests={planChangeRequests}
        canManageFinance={access.canManageFinance}
      />

      {/* Client-declared bank transfers awaiting a human check. Nothing here
          is PAID yet — pressing Verify is what makes it so. */}
      {access.canManageFinance && pendingManualPayments.length > 0 && (
        <Panel className="projects-panel">
          <PanelHead
            title="รอตรวจสอบการโอนเงิน"
            description="ลูกค้าแจ้งโอนแล้ว ทีมงานต้องตรวจสอบยอดเงินเข้าบัญชีก่อนยืนยัน"
          />
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>งวด</th>
                  <th>จำนวน</th>
                  <th>อ้างอิง</th>
                  <th>แจ้งเมื่อ</th>
                  <th>สถานะ</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {pendingManualPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{payment.milestoneName ?? '—'}</td>
                    <td>
                      <strong>{formatMoney(payment.amount, payment.currency)}</strong>
                    </td>
                    <td className="muted">{payment.reference ?? '—'}</td>
                    <td className="muted">{formatDateTime(payment.createdAt)}</td>
                    <td>
                      <Status tone={paymentStatusTone(payment.status)}>
                        {PAYMENT_STATUS_LABELS[payment.status]}
                      </Status>
                    </td>
                    <td className="row-actions">
                      <VerifyPaymentForm paymentId={payment.id} reference={payment.reference} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* Visible to every staff member who can read this project (accountant
          and developer included) — only the add/remove controls inside
          depend on canManageFinance, matching pricing_insert_finance /
          pricing_delete_finance in migration 0007. */}
      <PricingPanel
        projectId={project.id}
        items={pricingItems}
        totals={pricingTotals}
        canManageFinance={access.canManageFinance}
      />

      {/* Offered whenever there is something real to split, and NOT only
          once: plans are versioned (migration 0034), so this drafts a new
          version that supersedes the live one. `createPaymentPlan` is what
          refuses the case that actually matters — replacing a plan the
          client accepted AND already paid against. */}
      {access.canManageFinance && project.totalAmount > 0 && (
        <PaymentPlanForm
          projectId={project.id}
          totalAmount={project.totalAmount}
          currency={project.currency}
          existingPlan={payments.plan ? { status: payments.plan.status, version: payments.plan.version } : null}
        />
      )}

      {access.canManageFinance && (
        <SendAgreementForm
          projectId={project.id}
          agreement={agreement}
          defaultBody={
            `ใบเสนอราคาสำหรับ ${project.name} (${project.projectCode})\n\n` +
            pricingItems
              .map(
                (item) =>
                  `${item.kind === 'DISCOUNT' ? 'ส่วนลด' : 'รายการ'}: ${item.name} x${item.quantity} — ${formatMoney(item.amount, project.currency)}`,
              )
              .join('\n') +
            `\n\nยอดรวมสุทธิ: ${formatMoney(pricingTotals.grandTotal, project.currency)}`
          }
        />
      )}

      {/* Editing controls render only for staff who may actually write. An
          accountant sees the project and its money, and no way to change it —
          matching what RLS would allow if they tried anyway. */}
      {access.canManage && (
        <>
          <Panel>
            <PanelHead title="แก้ไขโปรเจกต์" description="บันทึกลงฐานข้อมูลทันที" />
            <EditProjectForm project={project} />
          </Panel>

          <Panel>
            <PanelHead
              title="บันทึกการเผยแพร่"
              description="กรอก URL จริงของงานที่เผยแพร่แล้ว"
            />
            <DeploymentForm projectId={project.id} />
          </Panel>

          <ShareLinksPanel projectId={project.id} links={shareLinks} />
        </>
      )}
    </>
  )
}
