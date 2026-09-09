import type { Metadata, Viewport } from 'next'
import { Geist_Mono, Kanit } from 'next/font/google'
import { AosProvider } from '@/components/aos-provider'
import { LanguageProvider } from '@/components/language-provider'
import { PageInteractionGuard } from '@/components/page-interaction-guard'
import { TouchHoverProvider } from '@/components/portfolio/touch-hover-provider'
import { Toaster } from '@/components/ui/sonner'
import 'aos/dist/aos.css'
import '../globals.css'

/**
 * centered101.com — the marketing site, portfolio, shop and admin.
 *
 * Everything this subtree needs (Tailwind, AOS, Kanit/Geist Mono, the
 * portfolio providers) lives HERE rather than in app/layout.tsx, so that
 * /work — which is Tailwind-free and renders in Noto Sans Thai — does not
 * preload 11 unused font files (~137 KB) or load globals.css + AOS ahead of
 * its own first paint. The (site) group keeps every URL unchanged.
 */

const kanit = Kanit({
  subsets: ['latin', 'thai'],
  variable: '--font-kanit',
  weight: ['400', '500', '600', '700', '900'],
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
})

export const metadata: Metadata = {
  title: 'Centered101 | Digital Ecosystem',
  description: 'Centered101 hub for portfolio, admin, shop, projects, services, and connected subdomains.',
  keywords: ['Centered101', 'portfolio', 'subdomains', 'projects', 'developer', 'GitHub', 'Supabase', 'Next.js'],
  authors: [{ name: 'Centered101' }],
  openGraph: {
    title: 'Centered101 | Digital Ecosystem',
    description: 'Hub for portfolio, admin, shop, projects, services, and connected subdomains.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Centered101 | Digital Ecosystem',
    description: 'Hub for portfolio, admin, shop, projects, services, and connected subdomains.',
  },
}

export const viewport: Viewport = {
  themeColor: '#05070b',
  colorScheme: 'dark',
}

export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div
      className={`${kanit.variable} ${geistMono.variable} font-sans antialiased bg-background text-foreground min-h-screen min-h-dvh`}
    >
      <LanguageProvider>
        <PageInteractionGuard />
        <TouchHoverProvider />
        <AosProvider>{children}</AosProvider>
      </LanguageProvider>
      <Toaster richColors={false} closeButton={false} position="top-right" />
    </div>
  )
}
