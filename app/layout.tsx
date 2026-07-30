import type { Metadata, Viewport } from 'next'
import { Geist_Mono, Kanit } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AosProvider } from '@/components/aos-provider'
import { LanguageProvider } from '@/components/language-provider'
import { PageInteractionGuard } from '@/components/page-interaction-guard'
import { TouchHoverProvider } from '@/components/portfolio/touch-hover-provider'
import { Toaster } from '@/components/ui/sonner'
import 'aos/dist/aos.css'
import './globals.css'

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
  title: 'Centered101 | Portfolio',
  description: 'Portfolio website for Centered101: selected projects, GitHub work, skills, coding time, learning story, and contact.',
  keywords: ['Centered101', 'portfolio', 'projects', 'developer', 'GitHub', 'Supabase', 'Next.js'],
  authors: [{ name: 'Centered101' }],
  openGraph: {
    title: 'Centered101 | Portfolio',
    description: 'Selected projects, GitHub work, skills, coding time, learning story, and contact.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Centered101 | Portfolio',
    description: 'Selected projects, GitHub work, skills, coding time, learning story, and contact.',
  },
}

export const viewport: Viewport = {
  themeColor: '#05070b',
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
    <html
      lang="en"
      className={`${kanit.variable} ${geistMono.variable} bg-background`}
      suppressHydrationWarning
    >
      <body
        className="font-sans antialiased bg-background text-foreground min-h-screen min-h-dvh"
        suppressHydrationWarning
      >
        <LanguageProvider>
          <PageInteractionGuard />
          <TouchHoverProvider />
          <AosProvider>{children}</AosProvider>
        </LanguageProvider>
        <Toaster richColors closeButton position="top-right" />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
