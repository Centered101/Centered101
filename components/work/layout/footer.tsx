import Link from 'next/link'

import { LEGAL } from '@/lib/work/legal'

/**
 * Workspace footer.
 *
 * Server Component with no state — it renders the same markup for everyone,
 * signed in or not, so it can sit inside the app shell and on the login screen
 * without a second variant.
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
        <Link href="/work/privacy-policy">นโยบายความเป็นส่วนตัว</Link>
        <Link href="/work/terms-of-service">ข้อกำหนดการใช้งาน</Link>
        <a href={`mailto:${LEGAL.contactEmail}`}>ติดต่อเรา</a>
      </nav>
    </footer>
  )
}
