'use client'

import Link from 'next/link'

import { LEGAL } from '@/lib/work/legal'
import { useWorkHref } from './work-link-context'

/**
 * Workspace footer.
 *
 * Client Component, no state of its own — it renders the same markup for
 * everyone, signed in or not, so it can sit inside the app shell and on the
 * login screen without a second variant.
 *
 * USES `useWorkHref`, NOT `WorkLink`. `WorkLink` awaits `isWorkSubdomain()`
 * (`next/headers`), which makes it Server-Component-only — fine for a normal
 * page, but this footer is also rendered by `app/work/error.tsx`, a required
 * Client Component (error boundaries can't be Server Components) with no
 * server-rendered parent to source that answer from. `useWorkHref` reads the
 * same flag from context instead (see work-link-context.tsx), and falls back
 * to the unstripped `/work`-prefixed href — still a working link, via
 * proxy.ts's redirect — when rendered with no `WorkLinkProvider` above it, as
 * on that error boundary.
 *
 * The year is computed per render rather than hardcoded. A copyright line that
 * silently goes stale is a small thing, but it is the kind of small thing a
 * client notices on a page about who is accountable for their data.
 */
export function Footer() {
  return (
    <footer className="work-footer">
      <p className="work-footer-brand">
        © {new Date().getFullYear()} {LEGAL.entityName}
      </p>
      <nav className="work-footer-links">
        <Link href={useWorkHref('/work/about')}>เกี่ยวกับ</Link>
        <Link href={useWorkHref('/work/privacy-policy')}>นโยบายความเป็นส่วนตัว</Link>
        <Link href={useWorkHref('/work/terms-of-service')}>ข้อกำหนดการใช้งาน</Link>
        <a href={`mailto:${LEGAL.contactEmail}`}>ติดต่อเรา</a>
      </nav>
    </footer>
  )
}
