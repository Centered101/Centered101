import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
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
  title: 'centered101 | Software Developer',
  description: 'Full-stack developer passionate about building elegant, performant applications. Explore my projects, skills, and experience.',
  keywords: ['developer', 'software engineer', 'full-stack', 'portfolio', 'GitHub', 'centered101'],
  authors: [{ name: 'centered101' }],
  openGraph: {
    title: 'centered101 | Software Developer',
    description: 'Full-stack developer passionate about building elegant, performant applications.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'centered101 | Software Developer',
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
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} bg-background`}>
      <body className="font-sans antialiased bg-background text-foreground min-h-screen">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
