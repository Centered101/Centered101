import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'

import { formatDate } from '@/lib/work/format'
import { Footer } from './footer'

/**
 * Chrome shared by the privacy policy and the terms.
 *
 * These two routes are PUBLIC — someone must be able to read what they are
 * agreeing to before they have an account, and a signed-out visitor sent here
 * from the login screen has no session to render a sidebar for. So they live
 * outside the app shell and bring their own frame.
 *
 * `updated` is a plain ISO date rather than a formatted string, so the two
 * pages cannot drift into different date formats.
 */
export function LegalShell({
  title,
  intro,
  updated,
  children,
}: {
  title: string
  intro: string
  /** ISO date, e.g. "2026-08-29" */
  updated: string
  children: ReactNode
}) {
  return (
    <div className="legal-page">
      <Link className="legal-back" href="/work">
        <ArrowLeft size={15} />
        กลับสู่พื้นที่ทำงาน
      </Link>

      <article className="panel legal-panel">
        <header className="legal-head">
          <h1>{title}</h1>
          <p className="muted">{intro}</p>
          <p className="legal-updated">ปรับปรุงล่าสุด {formatDate(updated)}</p>
        </header>

        <div className="legal-body">{children}</div>
      </article>

      <Footer />
    </div>
  )
}

/** One numbered section of a legal document. */
export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="legal-section">
      <h2>{title}</h2>
      {children}
    </section>
  )
}
