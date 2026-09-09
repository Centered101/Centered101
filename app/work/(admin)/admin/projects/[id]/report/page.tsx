import { notFound } from 'next/navigation'

import { Panel, PageHeading, PanelHead } from '@/components/work/data/panel'
import { Status } from '@/components/work/data/status'
import { requireProjectAccess } from '@/lib/work/auth/permissions'
import {
  MAINTENANCE_STATUS_LABELS,
  PROJECT_STATUS_LABELS,
  formatDate,
  formatDateTime,
  formatMinutes,
  formatMoney,
  maintenanceStatusTone,
  projectStatusTone,
} from '@/lib/work/format'
import { getProjectReport } from '@/lib/work/queries/reports'
import type { MaintenanceStatus } from '@/lib/work/types/enums'

export const metadata = { title: 'สรุปโปรเจกต์' }

/**
 * The project summary report (Phase 9).
 *
 * Composed entirely from queries the other phases already own — nothing here
 * recomputes a total. Every figure is RLS-scoped through those queries, so
 * this page grants no visibility that its viewer does not already have
 * elsewhere, and there is no privileged read anywhere in it.
 *
 * THE THREE PROGRESS FIGURES ARE SHOWN SEPARATELY AND NEVER BLENDED. Work 60%
 * beside payment 50% beside delivery 40% is an ordinary, valid state; a single
 * averaged "project percent" would conceal precisely the mismatch a summary
 * exists to surface.
 */
export default async function AdminProjectReportPage(
  props: PageProps<'/work/admin/projects/[id]/report'>,
) {
  const { id } = await props.params
  await requireProjectAccess(id)

  const report = await getProjectReport(id)
  if (!report) notFound()

  const { project, payment, work, delivery, publishing, changeRequests, maintenance } = report

  return (
    <>
      <PageHeading
        eyebrow={project.projectCode}
        title="สรุปโปรเจกต์"
        description={project.clientName ?? undefined}
        action={
          <Status tone={projectStatusTone(project.status)}>
            {PROJECT_STATUS_LABELS[project.status]}
          </Status>
        }
      />

      <Panel className="projects-panel">
        <PanelHead
          title="ความคืบหน้า"
          description="สามตัวเลขนี้เป็นคนละเรื่องกัน และไม่ถูกนำมารวมเป็นตัวเลขเดียว"
        />
        <div className="report-metrics">
          <Metric label="งาน" percent={work.percent} detail={`${work.completed}/${work.total} ไมล์สโตน`} />
          <Metric
            label="การชำระเงิน"
            percent={payment.percent}
            detail={`${formatMoney(payment.paid, payment.currency)} จาก ${formatMoney(payment.total, payment.currency)}`}
          />
          <Metric
            label="การส่งมอบ"
            percent={delivery.percent}
            detail={`${delivery.delivered}/${delivery.total - delivery.waived} รายการ`}
          />
        </div>
        {work.awaitingReview > 0 && (
          <p className="muted">รอลูกค้าตรวจรับ {work.awaitingReview} รายการ</p>
        )}
      </Panel>

      <Panel className="projects-panel">
        <PanelHead title="การเงิน" description="ยอดตามแผนการชำระเงินที่ตกลงไว้" />
        <div className="ownership-rows">
          <Row label="ยอดรวม" value={formatMoney(payment.total, payment.currency)} />
          <Row label="ชำระแล้ว" value={formatMoney(payment.paid, payment.currency)} />
          <Row label="คงเหลือ" value={formatMoney(payment.remaining, payment.currency)} />
          <Row
            label="มูลค่าคำขอเปลี่ยนแปลงที่อนุมัติ"
            value={formatMoney(changeRequests.approvedValue, payment.currency)}
          />
        </div>
        {/* Approved change value is reported beside the plan, never added into
            it: the payment plan is what the client accepted, and a report must
            not quietly restate it. */}
        <p className="muted">
          มูลค่าคำขอเปลี่ยนแปลงแสดงแยกจากแผนการชำระเงิน ไม่ได้ถูกรวมเข้าไปในยอดตามแผน
        </p>
      </Panel>

      <Panel className="projects-panel">
        <PanelHead title="ส่งมอบและเผยแพร่" description="สถานะการส่งมอบและการขึ้นระบบจริง" />
        <div className="ownership-rows">
          <Row
            label="ส่งมอบครบแล้ว"
            value={delivery.isComplete ? 'ครบทุกรายการ' : `ค้างอยู่ ${delivery.outstanding} รายการ`}
          />
          <Row label="วันที่ส่งมอบ" value={formatDate(delivery.handedOverOn)} />
          <Row label="เผยแพร่แล้ว" value={publishing.isPublished ? 'ใช่' : 'ยังไม่เผยแพร่'} />
          <Row label="เผยแพร่เมื่อ" value={formatDateTime(publishing.publishedAt)} />
          <Row label="Production URL" value={publishing.productionUrl ?? '—'} />
          <Row label="ไฟล์ซอร์สโค้ด" value={publishing.hasSourcePackage ? 'แนบแล้ว' : 'ยังไม่แนบ'} />
        </div>
      </Panel>

      <Panel className="projects-panel">
        <PanelHead title="คำขอเปลี่ยนแปลง" description="สรุปตามสถานะ" />
        <div className="ownership-rows">
          <Row label="ทั้งหมด" value={String(changeRequests.total)} />
          <Row label="กำลังดำเนินการ" value={String(changeRequests.open)} />
          <Row label="อนุมัติแล้ว" value={String(changeRequests.approved)} />
          <Row label="ปฏิเสธ" value={String(changeRequests.rejected)} />
        </div>
      </Panel>

      <Panel className="projects-panel">
        <PanelHead title="การดูแลรักษา" description="แผนที่เรียกเก็บ และงานที่ทำจริง" />
        {maintenance.hasPlan ? (
          <div className="ownership-rows">
            <Row
              label="สถานะแผน"
              value={
                <Status tone={maintenanceStatusTone(maintenance.status as MaintenanceStatus)}>
                  {MAINTENANCE_STATUS_LABELS[maintenance.status as MaintenanceStatus]}
                </Status>
              }
            />
            <Row
              label="ราคา"
              value={formatMoney(maintenance.priceAmount ?? 0, payment.currency)}
            />
            <Row label="จำนวนงานที่บันทึก" value={String(maintenance.recordCount)} />
            <Row label="เวลารวม" value={formatMinutes(maintenance.minutesLogged)} />
          </div>
        ) : (
          <p className="muted empty-inline">โปรเจกต์นี้ยังไม่มีแผนดูแลรักษา</p>
        )}
      </Panel>
    </>
  )
}

function Metric({
  label,
  percent,
  detail,
}: {
  label: string
  percent: number
  detail: string
}) {
  return (
    <div className="report-metric">
      <span className="muted">{label}</span>
      <strong>{percent}%</strong>
      <span className="muted">{detail}</span>
      <div className="report-bar" role="presentation">
        <span style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}
