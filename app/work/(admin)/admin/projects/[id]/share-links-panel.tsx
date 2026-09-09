'use client'

import { useActionState } from 'react'

import { Panel, PanelHead } from '@/components/work/data/panel'
import { EmptyState } from '@/components/work/states'
import { SubmitButton, useActionToast } from '@/components/work/forms'
import { formatDateTime } from '@/lib/work/format'
import {
  createShareLink,
  revokeShareLink,
  type ShareLinkActionState,
} from '@/lib/work/services/share-links'
import type { ShareLinkListItem } from '@/lib/work/queries/share-links'

/**
 * Share links for one project.
 *
 * The raw URL is shown exactly once, right after creation — `createShareLink`
 * never returns it again on a later render, and the table below only ever
 * shows metadata (label, expiry, view count), never the link itself. Losing
 * the copy box below means issuing a new link, not "finding it again".
 */
export function ShareLinksPanel({ projectId, links }: { projectId: string; links: ShareLinkListItem[] }) {
  const [createState, createAction] = useActionState<ShareLinkActionState, FormData>(createShareLink, {})
  useActionToast(createState)

  return (
    <Panel className="projects-panel">
      <PanelHead title="ลิงก์แชร์" description="แชร์ตัวอย่างโปรเจกต์ให้บุคคลภายนอกโดยไม่ต้องเข้าสู่ระบบ" />

      <form action={createAction} className="work-form">
        <input type="hidden" name="projectId" value={projectId} />

        <label>
          <span>อายุลิงก์</span>
          <select name="expiresInDays" defaultValue="30">
            <option value="7">7 วัน</option>
            <option value="30">30 วัน</option>
            <option value="90">90 วัน</option>
          </select>
        </label>

        <label>
          <span>จำกัดจำนวนการเปิดดู (ไม่บังคับ)</span>
          <input name="maxViews" type="number" min={1} placeholder="ไม่จำกัด" />
        </label>

        <label className="full">
          <span>บันทึกช่วยจำ (ไม่บังคับ)</span>
          <input name="label" placeholder="เช่น ส่งให้ผู้บริหารลูกค้า" maxLength={100} />
        </label>

        <div className="form-actions">
          <SubmitButton pendingLabel="กำลังสร้าง...">สร้างลิงก์แชร์</SubmitButton>
        </div>
      </form>

      {createState.shareUrl && (
        <div className="share-link-created">
          <span>ลิงก์ของคุณ (แสดงครั้งนี้ครั้งเดียว) —</span>
          <code>{createState.shareUrl}</code>
        </div>
      )}

      {links.length === 0 ? (
        <EmptyState title="ยังไม่มีลิงก์แชร์" description="สร้างลิงก์ด้านบนเพื่อแชร์ตัวอย่างโปรเจกต์นี้" />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>บันทึก</th>
                <th>หมดอายุ</th>
                <th>เปิดดู</th>
                <th>สถานะ</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {links.map((link) => (
                <ShareLinkRow key={link.id} projectId={projectId} link={link} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  )
}

function ShareLinkRow({ projectId, link }: { projectId: string; link: ShareLinkListItem }) {
  const [state, formAction] = useActionState<ShareLinkActionState, FormData>(revokeShareLink, {})
  useActionToast(state)

  const isRevoked = link.status === 'revoked'
  const STATUS_LABELS: Record<ShareLinkListItem['status'], string> = {
    active: 'ใช้งานได้',
    expired: 'หมดอายุ',
    exhausted: 'ครบจำนวนที่กำหนด',
    revoked: 'ยกเลิกแล้ว',
  }
  const statusLabel = STATUS_LABELS[link.status]

  return (
    <tr>
      <td>{link.label ?? '—'}</td>
      <td>{formatDateTime(link.expiresAt)}</td>
      <td>
        {link.viewCount}
        {link.maxViews !== null ? ` / ${link.maxViews}` : ''}
      </td>
      <td>{statusLabel}</td>
      <td>
        {!isRevoked && (
          <form action={formAction}>
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="shareLinkId" value={link.id} />
            <SubmitButton variant="outline" pendingLabel="กำลังยกเลิก...">
              ยกเลิกลิงก์
            </SubmitButton>
          </form>
        )}
      </td>
    </tr>
  )
}
