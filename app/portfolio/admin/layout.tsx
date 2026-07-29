import type { Metadata, Viewport } from 'next'
import { Suspense } from 'react'
import { AdminAuthProvider } from '@/components/admin/AdminAuthProvider'
import { PortfolioAdminShell } from '@/components/admin/portfolio/PortfolioAdminShell'

export const metadata: Metadata = {
  title: {
    template: '%s — Portfolio Admin',
    default: 'Portfolio Admin',
  },
  description: 'Centered101 portfolio admin',
  robots: { index: false, follow: false },
  icons: {
    icon: [
      { url: '/admin/favicon.svg', type: 'image/svg+xml' },
      { url: '/admin/favicon.png', type: 'image/png' },
    ],
    shortcut: '/admin/favicon.ico',
  },
}

export const viewport: Viewport = {
  themeColor: '#09090B',
  width: 'device-width',
  initialScale: 1,
}

export default function PortfolioAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthProvider>
      <Suspense fallback={<PortfolioAdminFallback />}>
        <PortfolioAdminShell>{children}</PortfolioAdminShell>
      </Suspense>
    </AdminAuthProvider>
  )
}

function PortfolioAdminFallback() {
  return (
    <div className="portfolio-classic-theme portfolio-admin-theme grid min-h-screen place-items-center bg-background text-foreground">
      <div className="absolute inset-0 grid-pattern opacity-60" />
      <div className="relative rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
        กำลังโหลด Portfolio Admin...
      </div>
    </div>
  )
}
