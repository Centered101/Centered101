import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AosProvider } from '@/components/aos-provider'
import { LanguageProvider } from '@/components/language-provider'
import 'aos/dist/aos.css'
import './globals.css'

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
})

export const metadata: Metadata = {
  title: 'Centered101 | Software Developer',
  description: 'Full-stack developer passionate about building elegant, performant applications. Explore my projects, skills, and experience.',
  keywords: ['developer', 'software engineer', 'full-stack', 'portfolio', 'GitHub', 'Centered101'],
  authors: [{ name: 'Centered101' }],
  openGraph: {
    title: 'Centered101 | Software Developer',
    description: 'Full-stack developer passionate about building elegant, performant applications.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Centered101 | Software Developer',
    description: 'Full-stack developer passionate about building elegant, performant applications.',
  },
}

export const viewport: Viewport = {
  themeColor: '#050505',
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
      className={`${geistSans.variable} ${geistMono.variable} bg-background`}
      suppressHydrationWarning
    >
      <body
        className="font-sans antialiased bg-background text-foreground min-h-screen"
        suppressHydrationWarning
      >
        <LanguageProvider>
          <AosProvider>{children}</AosProvider>
        </LanguageProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
