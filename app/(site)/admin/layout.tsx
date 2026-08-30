import type { Metadata, Viewport } from 'next'
import { AdminAuthProvider } from '@/components/admin/AdminAuthProvider'
import { AdminLayout } from '@/components/admin/AdminLayout'

export const metadata: Metadata = {
  title: {
    template: '%s — Centered101 Admin',
    default: 'Centered101 Admin',
  },
  description: 'Centered101 admin control center',
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

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthProvider>
      <AdminLayout>{children}</AdminLayout>
    </AdminAuthProvider>
  )
}
