import { notFound } from 'next/navigation'

import { Panel, PageHeading, PanelHead } from '@/components/work/data/panel'
import { Status } from '@/components/work/data/status'
import { requireAdmin } from '@/lib/work/auth/permissions'
import {
  DELIVERY_ITEM_LABELS,
  PROJECT_ASSET_KIND_LABELS,
  PROJECT_ASSET_REVIEW_STATUS_LABELS,
  PROJECT_STATUS_LABELS,
  PROJECT_TYPE_LABELS,
  assetReviewStatusTone,
  formatDate,
  formatMoney,
  projectStatusTone,
} from '@/lib/work/format'
import { getPricingItems, getPricingTotals } from '@/lib/work/queries/pricing'
import {
  getProjectById,
  getProjectFeatures,
  getProjectIntake,
  getProjectMembers,
} from '@/lib/work/queries/projects'
import { getProjectAssets } from '@/lib/work/queries/assets'
import { AssetThumbnail } from '@/components/work/domain/asset-thumbnail'
import { ReviewActions } from './review-actions'
import { AssetReviewForm } from './asset-review-form'

export const metadata = { title: 'ตรวจสอบคำขอโปรเจกต์' }

/**
 * Project Review (docs/ADMIN_PROJECT_LIFECYCLE.md §3) — the complete client
 * submission, read-only, plus the three decisions: APPROVE FOR QUOTATION /
 * NEEDS MORE INFORMATION / REJECTED.
 *
 * `requireAdmin()` only — reading a submission is not a mutation, and every
 * decision button below re-authorizes independently via its own action
 * (`approveForQuotation` / `requestMoreInformation` / `rejectProject`)
 * (`requireCapability('project:write')`), the same belt-and-braces shape
 * every mutation in this codebase follows.
 */
export default async function AdminProjectReviewPage(props: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await props.params

  const project = await getProjectById(id)
  if (!project) notFound()

  const [features, members, pricingItems, pricingTotals, intake, assets] = await Promise.all([
    getProjectFeatures(id),
    getProjectMembers(id),
    getPricingItems(id),
    getPricingTotals(id),
    getProjectIntake(id),
    getProjectAssets(id),
  ])

  return (
    <>
      <PageHeading
        eyebrow="ตรวจสอบคำขอโปรเจกต์"
        title={project.name}
        description={project.projectCode}
        action={
          <Status tone={projectStatusTone(project.status)}>
            {PROJECT_STATUS_LABELS[project.status]}
          </Status>
        }
      />

      <Panel className="ownership">
        <PanelHead title="ภาพรวมโปรเจกต์" />
        <div className="ownership-rows">
          <div>
            <span>ลูกค้า</span>
            <strong>{project.clientName}</strong>
          </div>
          <div>
            <span>ประเภทโปรเจกต์</span>
            <strong>{PROJECT_TYPE_LABELS[project.type] ?? project.type}</strong>
          </div>
          <div>
            <span>ส่งคำขอเมื่อ</span>
            <strong>{formatDate(project.updatedAt)}</strong>
          </div>
          <div>
            <span>กำหนดส่งมอบที่ต้องการ</span>
            <strong>{formatDate(project.expectedDelivery)}</strong>
          </div>
        </div>
        {project.description && (
          <p className="muted" style={{ marginTop: 12 }}>
            {project.description}
          </p>
        )}
      </Panel>

      <Panel className="projects-panel">
        <PanelHead title="ขอบเขตงานที่ลูกค้าระบุ" description={`${features.length} รายการ`} />
        {features.length === 0 ? (
          <p className="muted empty-inline">ลูกค้ายังไม่ได้ระบุขอบเขตงาน</p>
        ) : (
          <ul className="scope-list">
            {features.map((feature) => (
              <li key={feature.id}>
                <strong>{feature.name}</strong>
                {feature.description && <p className="muted">{feature.description}</p>}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel className="projects-panel">
        <PanelHead
          title="งบประมาณที่ลูกค้าเสนอ"
          description="รายการราคาที่ลูกค้ากรอกไว้ตอนสร้างโปรเจกต์ (ถ้ามี) — ยังไม่ใช่ใบเสนอราคาอย่างเป็นทางการ"
        />
        {pricingItems.length === 0 ? (
          <p className="muted empty-inline">ลูกค้ายังไม่ได้ระบุงบประมาณ</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>รายการ</th>
                  <th>จำนวน</th>
                  <th>ราคาต่อหน่วย</th>
                  <th>รวม</th>
                </tr>
              </thead>
              <tbody>
                {pricingItems.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.quantity}</td>
                    <td>{formatMoney(item.unitAmount, pricingTotals.currency)}</td>
                    <td>{formatMoney(item.amount, pricingTotals.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {intake && (
        <Panel className="ownership">
          <PanelHead title="ความต้องการของลูกค้า (Requirements)" />
          <div className="ownership-rows">
            <div>
              <span>เป้าหมาย</span>
              <strong>{intake.requirements.goals ?? '—'}</strong>
            </div>
            <div>
              <span>กลุ่มเป้าหมาย</span>
              <strong>{intake.requirements.targetAudience ?? '—'}</strong>
            </div>
            <div>
              <span>ฟีเจอร์ที่ต้องการ</span>
              <strong>{intake.requirements.requiredFeatures.join(', ') || '—'}</strong>
            </div>
            <div>
              <span>หน้าที่ต้องการ</span>
              <strong>{intake.requirements.requiredPages.join(', ') || '—'}</strong>
            </div>
            <div>
              <span>เทคโนโลยี</span>
              <strong>{intake.requirements.technology.join(', ') || '—'}</strong>
            </div>
            <div>
              <span>เว็บไซต์อ้างอิง</span>
              <strong>{intake.requirements.referenceLinks.join(', ') || '—'}</strong>
            </div>
            <div>
              <span>สไตล์การออกแบบ</span>
              <strong>{intake.requirements.designPreferences ?? '—'}</strong>
            </div>
            <div>
              <span>สีแบรนด์</span>
              <strong>{intake.requirements.brandColors.join(', ') || '—'}</strong>
            </div>
            <div>
              <span>ฟอนต์</span>
              <strong>{intake.requirements.fonts.join(', ') || '—'}</strong>
            </div>
            <div>
              <span>ความพร้อมของเนื้อหา</span>
              <strong>{intake.requirements.contentAvailability ?? '—'}</strong>
            </div>
            <div>
              <span>ความต้องการเกี่ยวกับโดเมน</span>
              <strong>{intake.requirements.domainRequirements ?? '—'}</strong>
            </div>
          </div>
          {intake.requirements.notes && (
            <p className="muted" style={{ marginTop: 12 }}>
              บันทึกเพิ่มเติม: {intake.requirements.notes}
            </p>
          )}
        </Panel>
      )}

      {intake && (
        <Panel className="ownership">
          <PanelHead title="กำหนดเวลาและงบประมาณที่ลูกค้าเสนอ" />
          <div className="ownership-rows">
            <div>
              <span>วันที่ต้องการเริ่มงาน</span>
              <strong>{formatDate(intake.requestedStartDate)}</strong>
            </div>
            <div>
              <span>วันที่ต้องการส่งมอบ (ลูกค้าขอ)</span>
              <strong>{formatDate(intake.requestedDeadline)}</strong>
            </div>
            <div>
              <span>กำหนดส่งมอบที่ทีมงานเสนอ</span>
              <strong>{formatDate(intake.proposedDeadline)}</strong>
            </div>
            <div>
              <span>วันเปิดตัวสำคัญ / ระยะเวลา / ความสำคัญ</span>
              <strong>
                {formatDate(intake.importantLaunchDate)} · {intake.requestedDuration ?? '—'} ·{' '}
                {intake.requestedPriority ?? 'NORMAL'}
              </strong>
            </div>
            <div>
              <span>งบประมาณที่เสนอ</span>
              <strong>
                {intake.requestedBudgetMin !== null || intake.requestedBudgetMax !== null
                  ? `${formatMoney(intake.requestedBudgetMin, intake.requestedCurrency)} – ${formatMoney(intake.requestedBudgetMax, intake.requestedCurrency)}`
                  : '—'}
                {intake.requestedBudgetPreferred !== null &&
                  ` (ต้องการ ${formatMoney(intake.requestedBudgetPreferred, intake.requestedCurrency)})`}
              </strong>
            </div>
            <div>
              <span>ยืนยันข้อมูลเมื่อ</span>
              <strong>{formatDate(intake.intakeConfirmedAt)}</strong>
            </div>
          </div>
        </Panel>
      )}

      {intake?.requestedPaymentPlan && (
        <Panel className="projects-panel">
          <PanelHead
            title="แผนการชำระเงินที่ลูกค้าเสนอ"
            description="ข้อเสนอเบื้องต้นของลูกค้า — ไม่ใช่แผนการชำระเงินจริง จนกว่าทีมงานจะสร้างและลูกค้ายืนยัน"
          />
          {intake.requestedPaymentPlan.type === 'CUSTOM' ? (
            <p className="muted">
              ลูกค้าขอกำหนดเอง / พูดคุยกับทีมงาน: {intake.requestedPaymentPlan.notes ?? '—'}
            </p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>งวด</th>
                    <th>สัดส่วน</th>
                    <th>ครบกำหนด</th>
                  </tr>
                </thead>
                <tbody>
                  {intake.requestedPaymentPlan.milestones.map((m, index) => (
                    <tr key={index}>
                      <td>{m.name}</td>
                      <td>{(m.percentageBp / 100).toFixed(0)}%</td>
                      <td className="muted">{formatDate(m.dueDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {intake && intake.requestedDelivery.length + intake.requestedDeliveryCustom.length > 0 && (
        <Panel className="ownership">
          <PanelHead title="สิ่งที่ลูกค้าต้องการให้ส่งมอบ" />
          <p>
            {[
              ...intake.requestedDelivery.map((key) => DELIVERY_ITEM_LABELS[key] ?? key),
              ...intake.requestedDeliveryCustom,
            ].join(', ')}
          </p>
        </Panel>
      )}

      <Panel className="projects-panel">
        <PanelHead title="ไฟล์แบรนด์และไฟล์อ้างอิง" description={`${assets.length} ไฟล์`} />
        {assets.length === 0 ? (
          <p className="muted empty-inline">ลูกค้ายังไม่ได้แนบไฟล์</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th />
                  <th>ประเภท</th>
                  <th>ชื่อ</th>
                  <th>สถานะ</th>
                  <th>ตรวจสอบ</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => (
                  <tr key={asset.id}>
                    <td>
                      <AssetThumbnail asset={asset} />
                    </td>
                    <td>{PROJECT_ASSET_KIND_LABELS[asset.kind] ?? asset.kind}</td>
                    <td>
                      {asset.hasFile ? (
                        <a href={`/work/api/assets/${asset.id}/download`} target="_blank" rel="noreferrer">
                          {asset.name}
                        </a>
                      ) : (
                        <a href={asset.externalUrl ?? '#'} target="_blank" rel="noreferrer">
                          {asset.name}
                        </a>
                      )}
                    </td>
                    <td>
                      <Status tone={assetReviewStatusTone(asset.reviewStatus)}>
                        {PROJECT_ASSET_REVIEW_STATUS_LABELS[asset.reviewStatus]}
                      </Status>
                    </td>
                    <td>
                      <AssetReviewForm projectId={id} assetId={asset.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel className="ownership">
        <PanelHead title="สมาชิกโปรเจกต์" description={`${members.length} คน`} />
        <div className="ownership-rows">
          {members.map((member) => (
            <div key={member.profileId}>
              <span>{member.fullName ?? member.email}</span>
              <strong>{member.role}</strong>
            </div>
          ))}
        </div>
      </Panel>

      <Panel>
        <PanelHead title="การตัดสินใจ" description="เลือกผลการตรวจสอบคำขอนี้" />
        <ReviewActions projectId={id} currentStatus={project.status} />
      </Panel>
    </>
  )
}
