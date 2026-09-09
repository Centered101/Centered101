import { notFound } from 'next/navigation'
import { Download, GitBranch, ShieldCheck } from 'lucide-react'

import { Panel, PageHeading, PanelHead } from '@/components/work/data/panel'
import { LockedState } from '@/components/work/states'
import { requireProjectAccess } from '@/lib/work/auth/permissions'
import {
  DELIVERY_METHOD_LABELS,
  MILESTONE_STATUS_LABELS,
  SOURCE_OWNERSHIP_LABELS,
  formatDate,
} from '@/lib/work/format'
import { getProjectPaymentSummary } from '@/lib/work/queries/payments'
import { getProjectById } from '@/lib/work/queries/projects'
import { getProjectPublishing } from '@/lib/work/queries/publishing'
import { isResourceUnlocked } from '@/lib/work/queries/unlock'

export const metadata = { title: 'ซอร์สโค้ด' }

/**
 * Source code ownership and handover terms.
 *
 * Phase 6 gave this page the repository it previously had nowhere to read
 * from (`project_publishing`, migration 0040), so it now shows the AGREED
 * TERMS *and* the actual handover: where the code lives, which version was
 * delivered, and a download for the package itself.
 *
 * Everything below the unlock check is rendered only when the gate says yes,
 * but rendering is not the control. The download link goes to
 * /work/api/source-code/[projectId]/download, which re-checks project access
 * AND re-reads the unlock rules on every request — so a link copied out of
 * this page, or typed from scratch, is worth nothing to anyone who has not
 * paid. The page hiding a button has never been what stops anybody.
 *
 * Gated by `isResourceUnlocked(id, 'source_code')` — a real milestone-paid
 * check now (lib/work/queries/unlock.ts), not the "fully paid" approximation
 * this page used before the milestone unlock_rules existed to ask precisely.
 * A plan can unlock source code on a milestone short of the final one; this
 * now reflects that instead of always waiting for `remaining === 0`.
 */
export default async function PortalSourceCodePage(
  props: PageProps<'/work/portal/projects/[id]/source-code'>,
) {
  const { id } = await props.params
  await requireProjectAccess(id)

  const project = await getProjectById(id)
  if (!project) notFound()

  const [payments, unlocked, publishing] = await Promise.all([
    getProjectPaymentSummary(id),
    isResourceUnlocked(id, 'source_code'),
    getProjectPublishing(id),
  ])

  return (
    <>
      <PageHeading
        eyebrow="โปรเจกต์"
        title="ซอร์สโค้ด"
        description="สิทธิ์เข้าถึงซอร์สโค้ดและเงื่อนไขการส่งมอบ"
      />

      <Panel className="ownership">
        <PanelHead
          title="เงื่อนไขที่ตกลงไว้"
          description="ตามที่ระบุในโปรเจกต์"
          action={<ShieldCheck className="panel-symbol" size={21} />}
        />
        <div className="ownership-rows">
          <div>
            <span>ความเป็นเจ้าของซอร์สโค้ด</span>
            <strong>{SOURCE_OWNERSHIP_LABELS[project.sourceCodeOwnership]}</strong>
          </div>
          <div>
            <span>วิธีส่งมอบ</span>
            <strong>{DELIVERY_METHOD_LABELS[project.deliveryMethod]}</strong>
          </div>
          <div>
            <span>สถานะการปลดล็อก</span>
            <strong className={unlocked ? 'green-text' : 'orange-text'}>
              {unlocked ? 'ปลดล็อกแล้ว' : 'ยังไม่ปลดล็อก'}
            </strong>
          </div>
          {payments.nextDue && (
            <div>
              <span>งวดถัดไป</span>
              <strong>
                {payments.nextDue.name} · {MILESTONE_STATUS_LABELS[payments.nextDue.status]} ·{' '}
                {formatDate(payments.nextDue.dueDate)}
              </strong>
            </div>
          )}
        </div>
      </Panel>

      {unlocked ? (
        <Panel className="ownership">
          <PanelHead
            title="การส่งมอบ"
            description="ที่อยู่ของโค้ดและไฟล์ที่ส่งมอบ"
            action={<GitBranch className="panel-symbol" size={21} />}
          />
          <div className="ownership-rows">
            <div>
              <span>Repository</span>
              <strong>
                {publishing.repositoryUrl ? (
                  <a href={publishing.repositoryUrl} target="_blank" rel="noreferrer noopener">
                    {publishing.repositoryUrl}
                  </a>
                ) : (
                  'ยังไม่ระบุ'
                )}
              </strong>
            </div>
            <div>
              <span>Branch</span>
              <strong>{publishing.repositoryBranch ?? '—'}</strong>
            </div>
            <div>
              <span>Commit</span>
              <strong>{publishing.repositoryCommitSha ?? '—'}</strong>
            </div>
            <div>
              <span>เวอร์ชันที่ส่งมอบ</span>
              <strong>{publishing.deliveryVersion ?? '—'}</strong>
            </div>
          </div>

          {publishing.repositoryNotes && <p className="muted">{publishing.repositoryNotes}</p>}

          {publishing.sourceDocumentId ? (
            <div className="form-actions">
              <a className="primary" href={`/work/api/source-code/${id}/download`}>
                <Download size={14} /> ดาวน์โหลดซอร์สโค้ด
              </a>
            </div>
          ) : (
            <p className="muted empty-inline">
              ทีมงานยังไม่ได้แนบไฟล์ซอร์สโค้ดสำหรับโปรเจกต์นี้
            </p>
          )}
        </Panel>
      ) : (
        <LockedState
          title="ยังไม่ปลดล็อกการส่งมอบซอร์สโค้ด"
          description="การส่งมอบซอร์สโค้ดจะดำเนินการหลังชำระงวดที่กำหนดไว้ตามแผนการชำระเงิน กรุณาติดต่อทีมงานหากมีข้อสงสัย"
        />
      )}
    </>
  )
}
