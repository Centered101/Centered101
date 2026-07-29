'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  BookOpen,
  Briefcase,
  Clock,
  ChevronDown,
  FileText,
  Github,
  Inbox,
  ImageIcon,
  Layers,
  LayoutDashboard,
  Loader2,
  LogOut,
  MessageCircle,
  ExternalLink,
  ShieldCheck,
  ShoppingBag,
  Wrench,
} from 'lucide-react'
import { useAdminAuth } from '@/components/admin/AdminAuthProvider'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'คนติดต่อมา', href: '/portfolio/admin', tab: 'overview', icon: Inbox },
  { label: 'โปรเจกต์เด่น', href: '/portfolio/admin?tab=projects', tab: 'projects', icon: Layers },
  { label: 'เวลาเขียนโค้ด', href: '/portfolio/admin?tab=coding', tab: 'coding', icon: Clock },
  { label: 'สกิลและเครื่องมือ', href: '/portfolio/admin?tab=tools', tab: 'tools', icon: Wrench },
  { label: 'เส้นทางการเรียนรู้', href: '/portfolio/admin?tab=story', tab: 'story', icon: BookOpen },
  { label: 'เรซูเม่', href: '/portfolio/admin?tab=resume', tab: 'resume', icon: FileText },
  { label: 'หน้าเว็บ', href: '/portfolio/admin?tab=appearance', tab: 'appearance', icon: ImageIcon },
  { label: 'ช่องทางติดต่อ', href: '/portfolio/admin?tab=connect', tab: 'connect', icon: MessageCircle },
]

type SwitcherItem = {
  label: string
  description: string
  href: string
  subdomain?: string
  subdomainHref?: string
  image: string
  accent: string
  icon: React.ElementType
}

const APP_SUBDOMAINS = ['admin', 'portfolio', 'shop']
const switcherItems: SwitcherItem[] = [
  {
    label: 'แดชบอร์ด Admin',
    description: 'ภาพรวมระบบหลัก',
    href: '/admin',
    subdomain: 'admin',
    subdomainHref: '/',
    image: '/admin/favicon.png',
    accent: '#409EFE',
    icon: LayoutDashboard,
  },
  {
    label: 'Portfolio Admin',
    description: 'จัดการพอร์ตโฟลิโอ',
    href: '/portfolio/admin',
    subdomain: 'portfolio',
    subdomainHref: '/admin',
    image: '/branding/favicon.png',
    accent: '#22C55E',
    icon: Briefcase,
  },
  {
    label: 'Shop Admin',
    description: 'จัดการร้านค้า',
    href: '/shop/admin',
    subdomain: 'shop',
    subdomainHref: '/admin',
    image: '/shop/favicon.png',
    accent: '#F59E0B',
    icon: ShoppingBag,
  },
]

export function PortfolioAdminShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isBooting, isLoading, authInfo, loginWithGitHub, logout } = useAdminAuth()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('tab') || 'overview'
  const [isMounted, setIsMounted] = React.useState(false)
  const [switcherOpen, setSwitcherOpen] = React.useState(false)
  const [hostInfo, setHostInfo] = React.useState<{ protocol: string; hostname: string; port: string } | null>(null)

  React.useEffect(() => {
    setIsMounted(true)
    const { protocol, hostname, port } = window.location
    setHostInfo({ protocol, hostname, port })
  }, [])

  function appHref(item: SwitcherItem) {
    if (!hostInfo || !item.subdomain) return item.href

    const { protocol, hostname, port } = hostInfo
    const parts = hostname.split('.')
    if (parts.length > 1 && APP_SUBDOMAINS.includes(parts[0])) {
      const root = parts.slice(1).join('.')
      return `${protocol}//${item.subdomain}.${root}${port ? `:${port}` : ''}${item.subdomainHref ?? item.href}`
    }
    return item.href
  }

  function isSwitcherActive(item: SwitcherItem) {
    if (item.href === '/admin') return pathname === '/admin'
    return pathname.startsWith(item.href)
  }

  if (!isMounted || isBooting) {
    return (
      <div className="portfolio-classic-theme portfolio-admin-theme grid min-h-screen place-items-center bg-background text-foreground">
        <div className="absolute inset-0 grid-pattern opacity-60" />
        <div className="relative flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
          <Loader2 className="size-4 animate-spin text-accent" />
          กำลังตรวจสอบสิทธิ์
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="portfolio-classic-theme portfolio-admin-theme relative grid min-h-screen place-items-center overflow-hidden bg-background px-4 text-foreground">
        <div className="absolute inset-0 grid-pattern opacity-65" />
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-accent/10 to-transparent" />
        <div className="relative w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-[0_24px_80px_-48px_rgba(64,158,254,0.65)]">
          <div className="mx-auto mb-5 grid size-16 place-items-center overflow-hidden rounded-2xl border border-border bg-secondary">
            <Image src="/admin/favicon.png" alt="Centered101" width={52} height={52} className="size-13 object-cover" />
          </div>
          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">Portfolio Admin</p>
            <h1 className="mt-2 text-xl font-bold text-foreground">เข้าสู่ระบบจัดการพอร์ตโฟลิโอ</h1>
            <p className="mt-2 text-sm text-muted-foreground">พื้นที่แก้ไขโปรเจกต์ สกิล เรซูเม่ และข้อมูลหน้า portfolio</p>
          </div>
          <button
            type="button"
            onClick={() => loginWithGitHub('/portfolio/admin')}
            disabled={isLoading}
            className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-md border border-foreground bg-foreground px-4 text-sm font-semibold text-background transition hover:bg-foreground/90 disabled:opacity-60"
          >
            {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Github className="size-4" />}
            เข้าสู่ระบบด้วย GitHub
          </button>
          <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
            <ShieldCheck className="size-3.5 text-accent" />
            เฉพาะบัญชีที่ได้รับสิทธิ์ admin
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="portfolio-classic-theme portfolio-admin-theme h-screen overflow-hidden bg-background text-foreground">
      <div className="fixed inset-0 -z-10 grid-pattern opacity-65" />
      <div className="flex h-full">
        <aside className="hidden h-full w-60 shrink-0 flex-col border-r border-border bg-card/88 backdrop-blur-xl lg:flex">
          <div className="relative flex h-14 items-center border-b border-border px-3">
            <button
              type="button"
              onClick={() => setSwitcherOpen((v) => !v)}
              className="flex h-10 w-full items-center gap-2.5 rounded-xl px-2 text-left transition hover:bg-secondary"
            >
              <span className="size-8 shrink-0 overflow-hidden rounded-xl border border-border bg-secondary">
                <Image src="/branding/favicon.png" alt="Portfolio Admin" width={32} height={32} className="size-full object-cover" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-black text-foreground">Portfolio Admin</span>
                <span className="block truncate text-[10px] text-muted-foreground">จัดการหน้า portfolio</span>
              </span>
              <ChevronDown className={cn('size-3.5 shrink-0 text-muted-foreground transition-transform', switcherOpen && 'rotate-180')} />
            </button>

            {switcherOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setSwitcherOpen(false)} />
                <div className="absolute left-3 right-3 top-[3.25rem] z-40 overflow-hidden rounded-xl border border-border bg-card shadow-2xl shadow-black/15">
                  <div className="relative overflow-hidden border-b border-border px-3 py-2.5">
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" />
                    <p className="text-[11px] font-bold text-foreground">เลือกหน้า Admin</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">แสดงเฉพาะ workspace ที่มีหน้าจัดการจริง</p>
                  </div>
                  <div className="p-1.5">
                    {switcherItems.map((item) => {
                      const Icon = item.icon
                      const active = isSwitcherActive(item)
                      return (
                        <a
                          key={item.label}
                          href={appHref(item)}
                          onClick={() => setSwitcherOpen(false)}
                          className={cn(
                            'group relative flex h-12 items-center gap-2.5 rounded-lg px-2.5 transition-colors',
                            active ? 'bg-secondary' : 'hover:bg-secondary'
                          )}
                        >
                          <span
                            className="relative grid size-8 shrink-0 place-items-center overflow-hidden rounded-lg border bg-background"
                            style={{ borderColor: active ? `${item.accent}66` : undefined }}
                          >
                            <Image src={item.image} alt={item.label} width={32} height={32} className="size-full object-cover" />
                            <span className="absolute bottom-0 right-0 grid size-3.5 place-items-center rounded border border-background bg-card">
                              <Icon className="size-2.5" style={{ color: item.accent }} />
                            </span>
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[12px] font-bold text-foreground">{item.label}</span>
                            <span className="block truncate text-[10px] text-muted-foreground">{item.description}</span>
                          </span>
                          <span className="flex shrink-0 items-center gap-1.5">
                            {active && <span className="size-1.5 rounded-full" style={{ backgroundColor: item.accent }} />}
                            <ExternalLink className="size-3 text-muted-foreground opacity-60 group-hover:opacity-100" />
                          </span>
                        </a>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
            <div>
              <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Portfolio</p>
              <div className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const active = activeTab === item.tab
                  return (
                    <Link
                      key={item.tab}
                      href={item.href}
                      className={cn(
                        'flex h-9 items-center gap-2.5 rounded-md px-2.5 text-[13px] font-semibold transition',
                        active
                          ? 'bg-secondary text-accent shadow-[inset_2px_0_0_var(--accent)]'
                          : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>

          </nav>

          <div className="border-t border-border p-3">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background/70 px-2.5 py-2">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-[11px] font-black text-accent">
                {(authInfo?.displayName || authInfo?.githubUsername || 'A')[0].toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-bold text-foreground">
                  {authInfo?.displayName || authInfo?.githubUsername || 'Admin'}
                </span>
                <span className="block truncate text-[10px] text-muted-foreground">GitHub OAuth</span>
              </span>
              <button
                type="button"
                onClick={logout}
                className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition hover:bg-secondary hover:text-accent"
                aria-label="ออกจากระบบ"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1 overflow-hidden">
          <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-border bg-background/88 px-4 backdrop-blur-xl">
            <nav className="flex min-w-0 items-center gap-1.5 text-sm">
              <span className="hidden text-muted-foreground sm:inline">Centered101</span>
              <span className="text-muted-foreground">/</span>
              <span className="font-bold text-foreground">Portfolio Admin</span>
            </nav>
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            >
              <ExternalLink className="size-3" />
              ดูหน้าเว็บ
            </a>
          </header>
          <main className="h-[calc(100vh-3.5rem)] overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
