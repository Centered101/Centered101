'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { CheckCheck } from 'lucide-react'

import { SubmitButton, useActionToast } from '@/components/work/forms'
import { formatRelative } from '@/lib/work/format'
import type { NotificationItem } from '@/lib/work/queries/notifications'
import {
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/work/services/notifications'
import type { NotificationActionState } from '@/lib/work/services/notifications'

/**
 * The signed-in user's own notifications.
 *
 * Renders through the SAME `ACTIVITY_ACTIONS` titles the activity feed uses,
 * resolved server-side in the query — so a notification and its matching
 * activity entry can never describe the same event differently.
 *
 * Nothing here filters by recipient: `notifications_select_own` already did
 * that in the database, and a filter in the component would only be a second
 * answer that could drift from the real one.
 */
export function NotificationList({
  items,
  portal = 'admin',
}: {
  items: NotificationItem[]
  /** Which side's routes the entries link to. */
  portal?: 'admin' | 'portal'
}) {
  const [state, formAction] = useActionState<NotificationActionState, FormData>(
    markAllNotificationsRead,
    {},
  )
  useActionToast(state)

  if (items.length === 0) {
    return <p className="muted empty-inline">ยังไม่มีการแจ้งเตือน</p>
  }

  const unread = items.filter((item) => item.readAt === null).length

  return (
    <div className="notification-list">
      {unread > 0 && (
        <form action={formAction} className="notification-actions">
          <SubmitButton variant="outline" pendingLabel="กำลังอัปเดต...">
            <CheckCheck size={14} /> อ่านทั้งหมด ({unread})
          </SubmitButton>
        </form>
      )}

      <ul>
        {items.map((item) => (
          <NotificationRow key={item.id} item={item} portal={portal} />
        ))}
      </ul>
    </div>
  )
}

function NotificationRow({
  item,
  portal,
}: {
  item: NotificationItem
  portal: 'admin' | 'portal'
}) {
  const [state, formAction] = useActionState<NotificationActionState, FormData>(
    markNotificationRead,
    {},
  )
  useActionToast(state)

  const href = item.projectId
    ? portal === 'admin'
      ? `/work/admin/projects/${item.projectId}`
      : `/work/portal/projects/${item.projectId}`
    : null

  return (
    <li className={item.readAt === null ? 'unread' : undefined}>
      <span className={`notification-dot tone-${item.tone}`} aria-hidden />

      <div className="notification-body">
        <strong>{item.title}</strong>
        <small className="muted">
          {item.projectName && <>{item.projectName} · </>}
          {item.actorName && <>{item.actorName} · </>}
          {formatRelative(item.createdAt)}
        </small>
      </div>

      <div className="notification-row-actions">
        {href && (
          <Link className="text-btn" href={href}>
            เปิด
          </Link>
        )}
        {item.readAt === null && (
          <form action={formAction} className="inline-form">
            <input type="hidden" name="notificationId" value={item.id} />
            <SubmitButton variant="outline" pendingLabel="...">
              อ่านแล้ว
            </SubmitButton>
          </form>
        )}
      </div>
    </li>
  )
}
