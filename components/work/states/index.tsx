import { AlertCircle, FolderKanban, LockKeyhole } from 'lucide-react'
import type { ReactNode } from 'react'

import { StateShell } from './state-shell'

/**
 * Shared non-happy-path states (brief Phase 29: never leave a blank screen).
 *
 * CLIENT-SAFE ON PURPOSE: `app/work/error.tsx` (a required Client Component —
 * Next.js error boundaries have no other option) imports `ErrorState` from
 * here, which pulls this whole module into the browser bundle. `UnauthorizedState`
 * and `NotFoundState` need `WorkLink`, a Server-Component-only export (it
 * `await`s `next/headers`) — importing that here would break error.tsx's
 * build the same way it did before this file was split. Those two states live
 * in `./linked`, imported directly by the two Server Component pages that use
 * them. Do not add a WorkLink-dependent export to this file.
 */

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
