import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'

/**
 * The shell every route in the app shares — and deliberately nothing more.
 *
 * Two very different products live under this file: centered101.com (dark,
 * Tailwind, Kanit) and /work (light, hand-written CSS, Noto Sans Thai). Fonts,
 * globals.css, AOS and the portfolio providers therefore sit in
 * app/(site)/layout.tsx, and the workspace's in app/work/layout.tsx. Anything
 * added here is paid for by both — on mobile it was 13 preloaded font files and
 * a 230 KB stylesheet ahead of the workspace's first paint.
 */

export const metadata: Metadata = {
  title: 'Centered101',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
        {process.env.NEXT_PUBLIC_VERCEL_ANALYTICS_ENABLED === 'true' && <Analytics />}
      </body>
    </html>
  )
}
