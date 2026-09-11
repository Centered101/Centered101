import { Panel, PageHeading, PanelHead, ProgressBar } from '@/components/work/data/panel'
import { StatCard } from '@/components/work/data/stat-card'
import { requireProjectAccess } from '@/lib/work/auth/permissions'
import { formatDate } from '@/lib/work/format'
import {
  computeWorkProgress,
  getTimelineComparison,
  getWorkMilestones,
} from '@/lib/work/queries/work-milestones'
import { getProjectById } from '@/lib/work/queries/projects'
import { WorkTimeline } from '@/components/work/domain/work-timeline'
import { WorkMilestoneReview } from '@/components/work/domain/work-milestone-review'
import { TimelineComparison } from '@/components/work/domain/timeline-comparison'
import { CalendarClock, ClipboardCheck, ListChecks } from 'lucide-react'

import { TimelineChangeRequestForm } from './change-request-form'

export const metadata = { title: 'ไทม์ไลน์' }

/**
 * The client's view of the project EXECUTION timeline.
 *
 * Read-only except for one thing: approving or rejecting a milestone that is
 * actually waiting on them. There is no control here for dates, order,
 * status or assignment — and RLS grants clients no UPDATE policy on
 * `project_work_milestones` at all, so the absence of a control is backed by
 * the database refusing the write regardless (migration 0035).
 *
 * Work progress here is derived from work milestones. It is NOT payment
 * progress (the Payments tab) and NOT `projects.progress` (the staff-set
 * delivery number on the overview) — three separate figures, deliberately.
 */
export default async function PortalTimelinePage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  await requireProjectAccess(id)

  const [milestones, comparison, project] = await Promise.all([
    getWorkMilestones(id),
    getTimelineComparison(id),
    getProjectById(id),
  ])

  const progress = computeWorkProgress(milestones)

  return (
    <>
      <PageHeading
        eyebrow="โปรเจกต์"
        title="ไทม์ไลน์"
        description="ความคืบหน้าการทำงานของโปรเจกต์นี้"
      />

      <section className="stats-grid client-stats">
        <StatCard
          label="ความคืบหน้างาน"
          value={`${progress.percent}%`}
          icon={ListChecks}
          href="#work-progress"
        />
        <StatCard
          label="ไมล์สโตนที่เสร็จแล้ว"
          value={`${progress.completed}/${progress.total}`}
          icon={ClipboardCheck}
          tone="green"
          href="#work-timeline"
        />
        <StatCard
          label="ไมล์สโตนถัดไป"
          value={progress.next?.title ?? 'ไม่มี'}
          icon={CalendarClock}
          tone="violet"
          href="#work-timeline"
        />
        <StatCard
          label="กำหนดส่งมอบ"
          value={formatDate(project?.expectedDelivery ?? null)}
          icon={CalendarClock}
          tone="orange"
          href="#work-timeline"
        />
      </section>

      {progress.awaitingReview.length > 0 && (
        <p className="checkout-notice">
          มีงาน {progress.awaitingReview.length} รายการรอให้คุณตรวจรับ — ดูปุ่มอนุมัติในรายการด้านล่าง
        </p>
      )}

      <Panel className="projects-panel" id="work-progress">
        <PanelHead title="ความคืบหน้างาน" description="คำนวณจากไมล์สโตนงานที่ปิดแล้ว (แยกจากการชำระเงิน)" />
        <div className="payment-progress-row">
          <strong>{progress.percent}%</strong>
          <ProgressBar value={progress.percent} />
          <small className="muted">
            เสร็จแล้ว {progress.completed} จาก {progress.total} ไมล์สโตน
          </small>
        </div>
      </Panel>

      <Panel className="projects-panel" id="work-timeline">
        <PanelHead title="ไทม์ไลน์งาน" description="ลำดับการทำงานและสถานะปัจจุบัน" />
        <WorkTimeline
          milestones={milestones}
          currency={project?.currency ?? 'THB'}
          emptyMessage="ทีมงานยังไม่ได้กำหนดไทม์ไลน์งาน"
          actions={(milestone) => <WorkMilestoneReview milestone={milestone} />}
        />
      </Panel>

      <TimelineComparison comparison={comparison} />

      <TimelineChangeRequestForm projectId={id} />
    </>
  )
}
