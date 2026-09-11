import { SearchX, ShieldAlert } from 'lucide-react'

import { WorkLink } from '@/components/work/layout/work-link'
import { StateShell } from './state-shell'

/**
 * The two states that link back into the app — separated from
 * states/index.tsx because `WorkLink` is a SERVER-COMPONENT-ONLY export (it
 * `await`s `isWorkSubdomain()`, which reaches `next/headers`).
 *
 * index.tsx is imported by `app/work/error.tsx`, which Next.js requires to be
 * a Client Component (error boundaries have no other option). A module that
 * imports WorkLink can't be reached from there — Turbopack refuses to bundle
 * `next/headers`/`server-only` for the browser regardless of whether the
 * client entry point actually calls the export that needs them. So these two
 * stay in their own file, imported directly by the two Server Component pages
 * that use them (app/work/forbidden, app/work/not-found) rather than through
 * the shared barrel.
 */

/*
 * The "go back" link below points at /work, not /. These states render
 * inside the workspace, and on the apex domain "/" is the marketing site —
 * so the escape hatch used to throw people out of the app they were trying
 * to use. /work resolves to the right place on both the apex and the work
 * subdomain, and routes by role from there.
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
        <WorkLink className="outline" href="/work">
          กลับสู่พื้นที่ทำงาน
        </WorkLink>
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
        <WorkLink className="outline" href="/work">
          กลับสู่พื้นที่ทำงาน
        </WorkLink>
      }
    />
  )
}
