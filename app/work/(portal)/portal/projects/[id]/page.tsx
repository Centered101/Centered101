import { notFound } from 'next/navigation'
import { Clock3, Code2, ShieldCheck } from 'lucide-react'

import { Panel, PageHeading, PanelHead } from '@/components/work/data/panel'
import { WorkLink } from '@/components/work/layout/work-link'
import { Status } from '@/components/work/data/status'
import { Timeline } from '@/components/work/data/timeline'
import { requireProjectAccess } from '@/lib/work/auth/permissions'
import {
  DELIVERY_METHOD_LABELS,
  MILESTONE_STATUS_LABELS,
  PROJECT_STATUS_LABELS,
  SOURCE_OWNERSHIP_LABELS,
  formatDate,
  formatMoney,
  projectStatusTone,
} from '@/lib/work/format'
import { getProjectPaymentSummary } from '@/lib/work/queries/payments'
import {
  getProjectById,
  getProjectFeatures,
  getProjectMembers,
} from '@/lib/work/queries/projects'
import { getPricingItems, getPricingTotals } from '@/lib/work/queries/pricing'
import { getLatestInformationRequest } from '@/lib/work/queries/activity'
import { computeWorkProgress, getWorkMilestones } from '@/lib/work/queries/work-milestones'
import { WorkTimeline } from '@/components/work/domain/work-timeline'
import { PricingPanel } from '@/components/work/domain/pricing-panel'
import { getAgreement } from '@/lib/work/queries/agreements'
import { AgreementConfirmPanel } from '@/components/work/domain/agreement-panel'
import { ProjectPeople } from '@/components/work/data/project-people'
import { NeedsInformationBanner } from './needs-information-banner'
import { SubmitProjectForm } from './submit-project-form'

export const metadata = { title: 'โปรเจกต์' }

/**
 * Project overview in the client portal.
 *
 * `requireProjectAccess()` runs before anything is read, and the read itself
 * runs under the caller's session. Client A passing Client B's UUID gets
 * notFound() — the id being guessable is fine precisely because the database,
 * not this component, is the boundary (docs/ARCHITECTURE.md §7).
 */
export default async function PortalProjectPage(
  props: PageProps<'/work/portal/projects/[id]'>,
) {
  const { id } = await props.params
  const access = await requireProjectAccess(id)

  const project = await getProjectById(id)
  if (!project) notFound()

  const [
    features,
    payments,
    members,
    pricingItems,
    pricingTotals,
    agreement,
    workMilestones,
    infoRequestNote,
  ] = await Promise.all([
      getProjectFeatures(id),
      getProjectPaymentSummary(id),
      getProjectMembers(id),
      getPricingItems(id),
      getPricingTotals(id),
      getAgreement(id),
      getWorkMilestones(id),
      project.status === 'NEEDS_INFORMATION' ? getLatestInformationRequest(id) : Promise.resolve(null),
    ])

  const workProgress = computeWorkProgress(workMilestones)

  return (
    <>
      <PageHeading
        eyebrow={project.projectCode}
        title={project.name}
        description={project.description ?? project.clientName}
        action={
          <Status tone={projectStatusTone(project.status)}>
            {PROJECT_STATUS_LABELS[project.status]}
          </Status>
        }
      />

      {project.status === 'DRAFT' && access.isProjectOwner && <SubmitProjectForm projectId={project.id} />}
      {project.status === 'NEEDS_INFORMATION' && access.isProjectOwner && (
        <NeedsInformationBanner projectId={project.id} note={infoRequestNote} />
      )}

      <section className="client-main">
        <Panel className="project-hero">
          {/* The code, the name and the status badge are already in the
              PageHeading a few pixels above. Repeating all three here put the
              same strings on screen twice, one card apart; what this card is
              for is the numbers underneath. */}
          <PanelHead
            title="ภาพรวมโปรเจกต์"
            description={`กำหนดส่งมอบ ${formatDate(project.expectedDelivery)}`}
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
            <small>{PROJECT_STATUS_LABELS[project.status]}</small>
          </div>
          <div className="hero-details">
            <div>
              <span>มูลค่าโปรเจกต์</span>
              <strong>{formatMoney(payments.total, payments.currency)}</strong>
            </div>
            <div>
              <span>ชำระแล้ว</span>
              <strong>{formatMoney(payments.paid, payments.currency)}</strong>
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

      {/* A summary of the EXECUTION timeline, with the full view (and the
          review controls) on its own tab. Work progress is derived from work
          milestones and is a different figure from payment progress above —
          both are shown, neither is reconciled into the other. */}
      <Panel className="projects-panel">
        <PanelHead
          title="ไทม์ไลน์งาน"
          description={`ความคืบหน้างาน ${workProgress.percent}% (${workProgress.completed}/${workProgress.total} ไมล์สโตน)`}
          action={
            <WorkLink className="text-btn" href={`/work/portal/projects/${id}/timeline`}>
              ดูไทม์ไลน์ทั้งหมด
            </WorkLink>
          }
        />
        {workProgress.awaitingReview.length > 0 && (
          <p className="checkout-notice">
            มีงาน {workProgress.awaitingReview.length} รายการรอให้คุณตรวจรับ
          </p>
        )}
        <WorkTimeline
          milestones={workMilestones}
          currency={project.currency}
          emptyMessage="ทีมงานยังไม่ได้กำหนดไทม์ไลน์งาน"
        />
      </Panel>

      <ProjectPeople project={project} members={members} />

      {/*
        A client sees the same itemised breakdown a staff member does —
        `pricing_select` (migration 0007) carries no staff-only restriction,
        this is exactly what the portal is for. `canManageFinance` here is
        `access.canManagePricing` — true for a self-serve project's OWNER
        (the one deliberate widening migration 0025 makes, RLS-backed by
        `pricing_insert_owner`/`_update_owner`/`_delete_owner`), false for
        every other client-side role including client_owner/client_member,
        matching the RLS policies underneath exactly.
      */}
      <PricingPanel
        projectId={project.id}
        items={pricingItems}
        totals={pricingTotals}
        canManageFinance={access.canManagePricing}
      />

      {agreement?.currentVersion && <AgreementConfirmPanel projectId={project.id} agreement={agreement} />}

      <section className="bottom-grid">
        <Panel className="ownership">
          <PanelHead
            title="ความเป็นเจ้าของและสิทธิ์เข้าถึง"
            description="ข้อมูลการส่งมอบที่ชัดเจน"
            action={<ShieldCheck className="panel-symbol" size={21} />}
          />
          <div className="ownership-rows">
            <div>
              <span>เจ้าของโปรเจกต์</span>
              <strong>{project.clientName}</strong>
            </div>
            <div>
              <span>ความเป็นเจ้าของซอร์สโค้ด</span>
              <strong>{SOURCE_OWNERSHIP_LABELS[project.sourceCodeOwnership]}</strong>
            </div>
            <div>
              <span>โฮสติ้ง</span>
              <strong>{DELIVERY_METHOD_LABELS[project.deliveryMethod]}</strong>
            </div>
            <div>
              <span>เริ่มงาน</span>
              <strong>{formatDate(project.startDate)}</strong>
            </div>
          </div>
        </Panel>

        <Panel className="next-payment">
          <PanelHead title="การชำระเงินถัดไป" description="ยอดที่ต้องชำระเพื่อดำเนินการต่อ" />
          {payments.nextDue ? (
            <>
              <div className="maintenance-price">
                <strong>
                  {formatMoney(payments.nextDue.amount, payments.nextDue.currency)}
                </strong>
                <span>{payments.nextDue.name}</span>
              </div>
              <div className="next-billing">
                <Clock3 size={15} />
                <span>
                  ครบกำหนด <strong>{formatDate(payments.nextDue.dueDate)}</strong> ·{' '}
                  {MILESTONE_STATUS_LABELS[payments.nextDue.status]}
                </span>
              </div>
            </>
          ) : (
            <p className="muted empty-inline">ไม่มียอดค้างชำระ</p>
          )}
        </Panel>
      </section>
    </>
  )
}
