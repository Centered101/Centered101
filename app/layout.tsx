import type { Metadata, Viewport } from 'next'
import { Geist_Mono, Kanit } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AosProvider } from '@/components/aos-provider'
import { LanguageProvider } from '@/components/language-provider'
import { PageInteractionGuard } from '@/components/page-interaction-guard'
import { Toaster } from '@/components/ui/sonner'
import 'aos/dist/aos.css'
import './globals.css'

const kanit = Kanit({
  subsets: ['latin', 'thai'],
  variable: '--font-kanit',
  weight: ['300', '400', '500', '600', '700', '800', '900'],
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
})

export const metadata: Metadata = {
  title: 'Centered101 | Personal Digital Ecosystem',
  description: 'The digital operating system for Centered101: portfolio, open source, business, knowledge base, system dashboard, labs, games, APIs, and experiments.',
  keywords: ['Centered101', 'digital ecosystem', 'portfolio', 'open source', 'developer tools', 'personal operating system'],
  authors: [{ name: 'Centered101' }],
  openGraph: {
    title: 'Centered101 | Personal Digital Ecosystem',
    description: 'Portfolio, open source, business, knowledge base, dashboard, labs, games, APIs, and experiments in one place.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Centered101 | Personal Digital Ecosystem',
    description: 'The digital operating system for everything Centered101 builds.',
  },
}

export const viewport: Viewport = {
  themeColor: '#05070b',
  width: 'device-width',
  initialScale: 1,
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
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"
        />
      </head>
      <body
        className="font-sans antialiased bg-background text-foreground min-h-screen"
        suppressHydrationWarning
      >
        <LanguageProvider>
          <PageInteractionGuard />
          <AosProvider>{children}</AosProvider>
        </LanguageProvider>
        <Toaster richColors closeButton position="top-right" />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
