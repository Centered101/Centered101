import type { Metadata, Viewport } from 'next'
import { Noto_Sans_Thai } from 'next/font/google'

import './work.css'

/**
 * flowstate — the client project & billing workspace, mounted at /work and
 * served as work.centered101.com (see proxy.ts).
 *
 * This is a NESTED layout: the root app/layout.tsx already renders <html> and
 * <body>, so this one only scopes styling, fonts and metadata for the subtree.
 *
 * work.css is imported here rather than globally, so none of flowstate's
 * ~1800 lines of styling reaches the rest of centered101.com.
 */

/**
 * The host app loads Kanit and exposes --font-kanit; flowstate's stylesheet
 * was built against --font-thai (Noto Sans Thai). Rather than restyle the
 * workspace around a different typeface, the font it was designed with is
 * loaded here — scoped to /work, so it costs nothing on the rest of the site.
 */
const thaiFont = Noto_Sans_Thai({
  subsets: ['thai', 'latin'],
  variable: '--font-thai',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'flowstate — ระบบจัดการลูกค้าสำหรับเอเจนซี',
    template: '%s — flowstate',
  },
  description:
    'พื้นที่ทำงานสำหรับจัดการโปรเจกต์ลูกค้า การชำระเงิน การส่งมอบ การเผยแพร่ และการดูแลรักษา',
  // A private client workspace has no reason to be indexed.
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: '#409EFE',
}

export default function WorkLayout({ children }: { children: React.ReactNode }) {
  return <div className={`work-root ${thaiFont.variable}`}>{children}</div>
}
