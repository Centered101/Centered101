'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  Brain,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  LogOut,
  Menu,
  Search,
  User,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAdminAuth } from '@/components/admin/AdminAuthProvider'
import { NotificationCenter } from '@/components/admin/NotificationCenter'

const breadcrumbs: Record<string, string[]> = {
  '/admin': ['แดชบอร์ด'],
  '/admin/portfolio': ['พอร์ตโฟลิโอ', 'จัดการข้อมูล'],
  '/portfolio/admin': ['พอร์ตโฟลิโอ', 'Portfolio Admin'],
  '/admin/content': ['คอนเทนต์', 'จัดการบทความ'],
  '/admin/projects': ['โปรเจกต์', 'ศูนย์จัดการ'],
  '/admin/business': ['ธุรกิจ', 'ศูนย์ติดต่อ'],
  '/admin/stripe': ['การชำระเงิน', 'Stripe'],
  '/admin/open-source': ['โอเพนซอร์ส', 'ฮับ'],
  '/admin/assets': ['ไฟล์ดิจิทัล', 'สินทรัพย์'],
  '/admin/database': ['ฐานข้อมูล', 'สำรวจข้อมูล'],
  '/admin/analytics': ['วิเคราะห์ข้อมูล', 'ศูนย์สถิติ'],
  '/admin/ai': ['AI', 'ศูนย์ควบคุม'],
  '/admin/ai/memory/new': ['AI', 'เพิ่มความจำ'],
  '/admin/ai/memory': ['AI', 'ความจำ'],
  '/admin/storage': ['พื้นที่จัดเก็บ', 'จัดการไฟล์'],
  '/admin/subdomains': ['ซับโดเมน', 'จัดการโดเมน'],
  '/admin/monitoring': ['ระบบ', 'มอนิเตอร์'],
  '/admin/logs': ['Audit', 'บันทึกระบบ'],
  '/admin/security': ['ความปลอดภัย', 'สิทธิ์เข้าถึง'],
  '/admin/users': ['ผู้ดูแล', 'สิทธิ์เข้าถึง'],
  '/admin/settings': ['ตั้งค่า'],
}

type Props = {
  onMenuOpen?: () => void
  onCommandOpen?: () => void
  onAIToggle?: () => void
  aiOpen?: boolean
}

// Subdomains the proxy rewrites to a base path (see proxy.ts SUBDOMAIN_MAP).
// "View site" must jump to the root domain, not stay on the current subdomain.
const APP_SUBDOMAINS = ['admin', 'portfolio', 'shop', 'newtab']

function getMainSiteUrl(): string {
  if (typeof window === 'undefined') return '/'
  const { protocol, hostname, port } = window.location
  const parts = hostname.split('.')
  if (parts.length > 1 && APP_SUBDOMAINS.includes(parts[0])) {
    const root = parts.slice(1).join('.')
    return `${protocol}//${root}${port ? `:${port}` : ''}`
  }
  // Path-based access (e.g. localhost:3000/admin) — root is already the main site.
  return '/'
}

export function AdminTopbar({ onMenuOpen, onCommandOpen, onAIToggle, aiOpen }: Props) {
  const pathname = usePathname()
  const { authInfo, logout } = useAdminAuth()
  const [profileOpen, setProfileOpen] = useState(false)
  // Resolved after mount to avoid an SSR/client href hydration mismatch.
  const [siteUrl, setSiteUrl] = useState('/')
  useEffect(() => { setSiteUrl(getMainSiteUrl()) }, [])

  // Try exact match first, then dynamic patterns for agent memory sub-routes
  function resolveCrumbs(path: string): string[] {
    if (breadcrumbs[path]) return breadcrumbs[path]
    if (path.startsWith('/admin/ai/memory/')) {
      if (path.endsWith('/edit')) return ['AI', 'ความจำ', 'แก้ไข']
      return ['AI', 'ความจำ', 'รายละเอียด']
    }
    return ['แดชบอร์ด']
  }
  const crumbs = resolveCrumbs(pathname)

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-[#27272A] bg-[#09090B]/95 px-4 backdrop-blur-xl">
      {/* Left: hamburger + breadcrumb */}
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuOpen}
          className="grid size-8 shrink-0 place-items-center rounded-lg border border-[#27272A] text-[#52525b] transition-colors hover:border-[#3f3f46] hover:text-[#A1A1AA] lg:hidden"
          aria-label="เปิดเมนูนำทาง"
        >
          <Menu className="size-4" />
        </button>

        <nav className="flex items-center gap-1.5 text-sm">
          <span className="hidden text-[#52525b] sm:inline">Centered101</span>
          {crumbs.map((crumb, i) => (
            <span key={crumb} className="flex items-center gap-1.5">
              <ChevronRight className="size-3 text-[#3f3f46]" />
              <span className={i === crumbs.length - 1 ? 'font-medium text-[#FAFAFA]' : 'text-[#52525b]'}>
                {crumb}
              </span>
            </span>
          ))}
        </nav>
      </div>

      {/* Right: search, notifications, links, profile */}
      <div className="flex shrink-0 items-center gap-1.5">
        {/* Search / command palette trigger */}
        <button
          type="button"
          onClick={onCommandOpen}
          className="hidden h-8 items-center gap-2 rounded-lg border border-[#27272A] bg-[#18181B] px-3 text-xs text-[#52525b] transition-colors hover:border-[#3f3f46] hover:text-[#A1A1AA] md:flex"
          aria-label="เปิดแถบคำสั่ง"
        >
          <Search className="size-3" />
          <span>ค้นหา...</span>
          <kbd className="ml-1 rounded border border-[#3f3f46] bg-[#27272A] px-1.5 py-0.5 text-[10px] font-mono text-[#52525b]">
            ⌘K
          </kbd>
        </button>

        {/* Mobile search button */}
        <button
          type="button"
          onClick={onCommandOpen}
          className="grid size-8 place-items-center rounded-lg border border-[#27272A] bg-[#18181B] text-[#52525b] transition-colors hover:border-[#3f3f46] hover:text-[#A1A1AA] md:hidden"
          aria-label="ค้นหา"
        >
          <Search className="size-3.5" />
        </button>

        {/* AI sidebar toggle */}
        <button
          type="button"
          onClick={onAIToggle}
          className={cn(
            'grid size-8 place-items-center rounded-lg border border-[#27272A] bg-[#18181B] text-[#52525b] transition-colors hover:border-[#3f3f46] hover:text-[#A1A1AA]',
            aiOpen && 'border-[#22C55E]/30 bg-[#22C55E]/5 text-[#22C55E]'
          )}
          aria-label="เปิดปิดผู้ช่วย AI"
        >
          <Brain className="size-3.5" />
        </button>

        <NotificationCenter />

        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 border-[#27272A] bg-[#18181B] text-[11px] text-[#A1A1AA] hover:border-[#3f3f46] hover:bg-[#27272A] hover:text-[#FAFAFA]"
          asChild
        >
          <a href={siteUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-3" />
            <span className="hidden sm:inline">ดูเว็บไซต์</span>
          </a>
        </Button>

        {/* Profile dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen((v) => !v)}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-[#27272A] bg-[#18181B] px-2.5 text-xs text-[#A1A1AA] transition-colors hover:border-[#3f3f46] hover:text-[#FAFAFA]"
          >
            {authInfo?.avatarUrl ? (
              <Image
                src={authInfo.avatarUrl}
                alt={authInfo.displayName || 'ผู้ดูแล'}
                width={20}
                height={20}
                className="size-5 rounded-full object-cover"
              />
            ) : (
              <div className="grid size-5 place-items-center rounded-full bg-[#409EFE]/15 text-[9px] font-bold text-[#409EFE]">
                {(authInfo?.displayName || authInfo?.githubUsername || 'A')[0].toUpperCase()}
              </div>
            )}
            <span className="hidden max-w-24 truncate sm:inline">
              {authInfo?.displayName || authInfo?.githubUsername || 'ผู้ดูแล'}
            </span>
            <ChevronDown className="size-3 text-[#3f3f46]" />
          </button>

          {profileOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setProfileOpen(false)} />
              <div className="absolute right-0 top-10 z-40 min-w-52 overflow-hidden rounded-xl border border-[#27272A] bg-[#18181B] py-1 shadow-2xl shadow-black/60">
                <div className="border-b border-[#27272A] px-3 py-2.5">
                  <p className="text-xs font-semibold text-[#FAFAFA]">
                    {authInfo?.displayName || 'ผู้ดูแล'}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-[#52525b]">
                    {authInfo?.email || authInfo?.githubUsername || '—'}
                  </p>
                </div>
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false)
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-[#A1A1AA] transition-colors hover:bg-[#27272A] hover:text-[#FAFAFA]"
                  >
                    <User className="size-3.5" />
                    ตั้งค่าโปรไฟล์
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false)
                      logout()
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-[#EF4444]/80 transition-colors hover:bg-[#EF4444]/10 hover:text-[#EF4444]"
                  >
                    <LogOut className="size-3.5" />
                    ออกจากระบบ
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
