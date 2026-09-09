import type { Metadata, Viewport } from 'next'
import { Kanit } from 'next/font/google'
import localFont from 'next/font/local'

import { WorkToaster } from '@/components/work/work-toaster'
import { APP_NAME, APP_TAGLINE } from '@/lib/work/branding'

import './work.css'

/**
 * Centered101's Work — the client project & billing workspace, mounted at /work and
 * served as work.centered101.com (see proxy.ts).
 *
 * This is a NESTED layout: the root app/layout.tsx already renders <html> and
 * <body>, so this one only scopes styling, fonts and metadata for the subtree.
 *
 * work.css is imported here rather than globally, so none of the workspace's
 * ~1800 lines of styling reaches the rest of centered101.com.
 */

/**
 * Kanit — the same face centered101.com loads in app/(site)/layout.tsx,
 * requested with the identical subsets/weights so the two never drift apart.
 * Not the host's own instance: the root layout deliberately loads no fonts at
 * all (see its comment) so /work isn't paying for the marketing site's fonts
 * or vice versa, so this is /work's own copy, scoped to this subtree via
 * `.work-root`.
 *
 * The workspace's stylesheet was originally built against Noto Sans Thai,
 * loaded here as --font-thai. Noto Sans Thai's Latin/numeral glyphs read as
 * plain next to Kanit on the rest of the site — English project names, emails
 * and stat-card numbers all go through them just as often as Thai text does
 * in this workspace, so it wasn't only a Thai-rendering choice. Switched to
 * match the main site instead of drifting the workspace toward a second
 * typeface. (This is unrelated to the D20 audit incident work.css documents
 * near `.work-root ::selection` — that was Kanit reached by an unloaded
 * 'Bai Jamjuree' falling through, plus a stray forced font-weight: 600. This
 * is Kanit loaded on purpose, at its own weights, nothing forced.)
 */
const kanitFont = Kanit({
  subsets: ['latin', 'thai'],
  variable: '--font-kanit',
  weight: ['400', '500', '600', '700', '900'],
  display: 'swap',
})

/**
 * Sansation — the workspace's own wordmark face, requested by the user
 * (fonts.google.com/share?selection.family=Sansation), used ONLY for the
 * "Centered101's Work" title itself (`.brand` in work.css, both places it
 * renders: the sidebar and the signed-out screens' AuthBrand). Everything
 * else — nav labels, body copy, the tagline under the name — stays on Kanit;
 * this is a wordmark treatment, not a second body face for the workspace.
 * No `900`: Sansation ships 300/400/700, and `.brand`'s existing
 * `font-weight: 750` already rounds to the nearest available face (700) the
 * same way it does for Kanit elsewhere in this file — nothing new there.
 *
 * SELF-HOSTED, not `next/font/google`. Google Fonts only serves Sansation as
 * a legacy `.ttf` (it is a `v1` family, no `woff2`), and `next/font/google`
 * cannot self-host that — it emitted a `--font-sansation` variable pointing
 * at a bare `"Sansation"` family with NO `@font-face` behind it, so the
 * wordmark silently fell through to `var(--font-kanit)` and looked unchanged.
 * The three .ttf files in ./fonts are Google's own, checked in beside this
 * layout the same way app/(site)/newtab does with Ethnocentric.
 */
const sansationFont = localFont({
  variable: '--font-sansation',
  display: 'swap',
  src: [
    { path: './fonts/Sansation-Light.ttf', weight: '300', style: 'normal' },
    { path: './fonts/Sansation-Regular.ttf', weight: '400', style: 'normal' },
    { path: './fonts/Sansation-Bold.ttf', weight: '700', style: 'normal' },
  ],
})

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} — ${APP_TAGLINE}`,
    template: `%s — ${APP_NAME}`,
  },
  description:
    'พื้นที่ทำงานสำหรับจัดการโปรเจกต์ลูกค้า การชำระเงิน การส่งมอบ การเผยแพร่ และการดูแลรักษา',
  // The workspace has its own mark, separate from the marketing site's.
  icons: { icon: '/work/favicon.ico', apple: '/work/favicon.png' },
  // A private client workspace has no reason to be indexed.
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#409EFE',
  // The root layout's own viewport already sets this, but a nested layout's
  // viewport export is not guaranteed to inherit fields Next.js does not see
  // as declared here — and this one specifically matters for /work: without
  // it, `env(safe-area-inset-bottom)` (used by the mobile sidebar, work.css)
  // resolves to 0, so the account card at its foot goes back to sitting
  // right under iOS Safari's floating compact address bar with nothing
  // pushing it clear.
  viewportFit: 'cover',
}

export default function WorkLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`work-root ${kanitFont.variable} ${sansationFont.variable}`}>
      {children}
      {/* The site-wide Toaster lives in app/(site)/layout.tsx and is styled with
          Tailwind, which /work no longer loads — so the workspace brings its own. */}
      <WorkToaster />
    </div>
  )
}
