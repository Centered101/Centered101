import Link from 'next/link'
import { AlertCircle, FolderKanban, LockKeyhole, SearchX, ShieldAlert } from 'lucide-react'
import type { ElementType, ReactNode } from 'react'

import { Panel } from '@/components/work/data/panel'

/**
 * Shared non-happy-path states (brief Phase 29: never leave a blank screen).
 * All of them reuse `.panel` so they sit in the existing design rather than
 * introducing a second visual language.
 */
function StateShell({
  icon: Icon,
  tone = 'blue',
  title,
  description,
  action,
}: {
  icon: ElementType
  tone?: string
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <Panel className="state-panel">
      <div className={`stat-icon icon-${tone}`}>
        <Icon size={18} />
      </div>
      <h2>{title}</h2>
      {description && <p className="muted">{description}</p>}
      {action}
    </Panel>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <StateShell icon={FolderKanban} title={title} description={description} action={action} />
  )
}

export function ErrorState({
  title = 'เกิดข้อผิดพลาด',
  description = 'ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง',
  action,
}: {
  title?: string
  description?: string
  action?: ReactNode
}) {
  return (
    <StateShell
      icon={AlertCircle}
      tone="red"
      title={title}
      description={description}
      action={action}
    />
  )
}

/*
 * The "go back" links below point at /work, not /. These states render inside
 * the workspace, and on the apex domain "/" is the marketing site — so the
 * escape hatch used to throw people out of the app they were trying to use.
 * /work resolves to the right place on both the apex and the work subdomain,
 * and routes by role from there.
 */
export function UnauthorizedState({
  description = 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้',
}: {
  description?: string
}) {
  return (
    <StateShell
      icon={ShieldAlert}
      tone="orange"
      title="ไม่มีสิทธิ์เข้าถึง"
      description={description}
      action={
        <Link className="outline" href="/work">
          กลับสู่พื้นที่ทำงาน
        </Link>
      }
    />
  )
}

export function NotFoundState({
  description = 'ไม่พบหน้าที่คุณต้องการ',
}: {
  description?: string
}) {
  return (
    <StateShell
      icon={SearchX}
      tone="violet"
      title="ไม่พบหน้านี้"
      description={description}
      action={
        <Link className="outline" href="/work">
          กลับสู่พื้นที่ทำงาน
        </Link>
      }
    />
  )
}

/**
 * Shown where a resource exists but the client has not unlocked it yet.
 *
 * Presentation only. The resource must already be withheld server-side before
 * this renders — see docs/ARCHITECTURE.md §7. Never use this as the gate.
 */
export function LockedState({
  title = 'ยังไม่ปลดล็อก',
  description,
}: {
  title?: string
  description?: string
}) {
  return <StateShell icon={LockKeyhole} tone="orange" title={title} description={description} />
}

/*
 * PanelSkeleton and StatsSkeleton lived here, rendered by the loading.tsx
 * files of /work, (admin) and (portal). All three are gone: the shimmering
 * grey blocks were more conspicuous than the wait they covered. Without a
 * loading boundary the router simply holds the current screen until the next
 * one is ready, which reads as a pause rather than as a different page.
 *
 * If a wait ever needs covering again, cover THAT ONE with a <Suspense>
 * around the slow part, rather than replacing the whole route.
 */
