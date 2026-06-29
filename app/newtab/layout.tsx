import type { Metadata } from 'next'
import { JetBrains_Mono, Orbitron, Rajdhani } from 'next/font/google'
import localFont from 'next/font/local'
import { AdminAuthProvider } from '@/components/admin/AdminAuthProvider'

const ntMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--nt-mono',
  display: 'swap',
})

const ntDisplay = Orbitron({
  subsets: ['latin'],
  weight: ['400', '600', '800'],
  variable: '--nt-display',
  display: 'swap',
})

const ntSans = Rajdhani({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--nt-sans',
  display: 'swap',
  preload: false,
})

const ntCyberpunk = localFont({
  src: './fonts/Ethnocentric-Regular.otf',
  variable: '--nt-cyberpunk',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'SearchHub :: Centered101',
  description: 'Personal new tab dashboard',
  robots: { index: false, follow: false },
}

export default function NewTabLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${ntMono.variable} ${ntDisplay.variable} ${ntSans.variable} ${ntCyberpunk.variable}`}
      style={{ fontFamily: 'var(--nt-mono, monospace)' }}
    >
      <AdminAuthProvider>{children}</AdminAuthProvider>
    </div>
  )
}
