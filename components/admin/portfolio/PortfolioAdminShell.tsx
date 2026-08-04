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
  Menu,
  MessageCircle,
  ExternalLink,
  ShieldCheck,
  ShoppingBag,
  Wrench,
  X,
} from 'lucide-react'
import { useAdminAuth } from '@/components/admin/AdminAuthProvider'
import { cn } from '@/lib/utils'
import { rememberAdminWorkspace, sortAdminWorkspaces } from '@/lib/admin-switcher'

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
  const [bootTimedOut, setBootTimedOut] = React.useState(false)
  const [switcherOpen, setSwitcherOpen] = React.useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false)
  const [orderedSwitcherItems, setOrderedSwitcherItems] = React.useState(switcherItems)
  const [hostInfo, setHostInfo] = React.useState<{ protocol: string; hostname: string; port: string } | null>(null)

  React.useEffect(() => {
    setIsMounted(true)
    const { protocol, hostname, port } = window.location
    setHostInfo({ protocol, hostname, port })
  }, [])

  React.useEffect(() => {
    setOrderedSwitcherItems(sortAdminWorkspaces(switcherItems))
    setMobileSidebarOpen(false)
  }, [pathname])

  React.useEffect(() => {
    setMobileSidebarOpen(false)
  }, [activeTab])

  React.useEffect(() => {
    if (!isBooting) {
      setBootTimedOut(false)
      return
    }
    const timer = window.setTimeout(() => setBootTimedOut(true), 2200)
    return () => window.clearTimeout(timer)
  }, [isBooting])

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

  function portfolioSiteHref() {
    if (!hostInfo) return '/'

    const { protocol, hostname, port } = hostInfo
    const parts = hostname.split('.')
    if (parts.length > 1 && APP_SUBDOMAINS.includes(parts[0])) {
      const root = parts.slice(1).join('.')
      return `${protocol}//portfolio.${root}${port ? `:${port}` : ''}/`
    }

    return '/'
  }

  const adminRoleLabel = authInfo?.roles?.[0] || 'Portfolio Admin'
  const isOwner = Boolean(authInfo?.roles?.includes('owner'))
  const publicPortfolioHref = portfolioSiteHref()
  const activeNavItem = navItems.find((item) => item.tab === activeTab) ?? navItems[0]

  if (!isMounted || (isBooting && !bootTimedOut)) {
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

  if (!isOwner) {
    return (
      <div className="portfolio-classic-theme portfolio-admin-theme relative grid min-h-screen place-items-center overflow-hidden bg-background px-4 text-foreground">
        <div className="absolute inset-0 grid-pattern opacity-65" />
        <div className="relative w-full max-w-sm rounded-lg border border-border bg-card p-6 text-center shadow-[0_24px_80px_-48px_rgba(64,158,254,0.65)]">
          <div className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl border border-[#fecaca] bg-[#fff7f7] text-[#ef4444]">
            <ShieldCheck className="size-7" />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">Owner Only</p>
          <h1 className="mt-2 text-xl font-bold text-foreground">ไม่มีสิทธิ์แก้ไข Portfolio Admin</h1>
          <p className="mt-2 text-sm text-muted-foreground">หน้านี้เปิดให้เฉพาะบัญชี owner เท่านั้น</p>
          <button
            type="button"
            onClick={logout}
            className="mt-6 flex h-10 w-full items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-semibold text-muted-foreground transition hover:border-accent/40 hover:text-accent"
          >
            ออกจากระบบ
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="portfolio-classic-theme portfolio-admin-theme h-dvh overflow-hidden bg-background text-foreground">
      <div className="fixed inset-0 -z-10 grid-pattern opacity-65" />
      <div className="flex h-full">
        <aside className="hidden h-full w-60 shrink-0 flex-col border-r border-border bg-card/88 backdrop-blur-xl lg:flex">
          <div className="relative flex h-14 items-center border-b border-border px-3">
            <button
              type="button"
              onClick={() => {
                setOrderedSwitcherItems(sortAdminWorkspaces(switcherItems))
                setSwitcherOpen((v) => !v)
              }}
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
                    {orderedSwitcherItems.map((item) => {
                      const Icon = item.icon
                      const active = isSwitcherActive(item)
                      return (
                        <a
                          key={item.label}
                          href={appHref(item)}
                          onClick={() => {
                            rememberAdminWorkspace(item.href)
                            setSwitcherOpen(false)
                          }}
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
              <span className="size-8 shrink-0 overflow-hidden rounded-full border border-border bg-secondary">
                <Image
                  src={authInfo?.avatarUrl || '/admin/favicon.png'}
                  alt={authInfo?.displayName || authInfo?.githubUsername || 'Admin'}
                  width={32}
                  height={32}
                  className="size-full object-cover"
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-bold text-foreground">
                  {authInfo?.displayName || authInfo?.githubUsername || 'Admin'}
                </span>
                <span className="block truncate text-[10px] text-muted-foreground">{adminRoleLabel}</span>
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

        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-40 lg:hidden" aria-hidden="true">
            <button
              type="button"
              className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
              onClick={() => setMobileSidebarOpen(false)}
              aria-label="ปิดเมนู"
            />
          </div>
        )}

        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-50 flex w-[min(18.5rem,86vw)] flex-col border-r border-border bg-card/96 shadow-2xl shadow-black/25 backdrop-blur-xl transition-transform duration-300 ease-out lg:hidden',
            mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
          aria-hidden={!mobileSidebarOpen}
        >
          <div className="flex h-14 items-center justify-between border-b border-border px-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="size-9 shrink-0 overflow-hidden rounded-xl border border-border bg-secondary">
                <Image src="/branding/favicon.png" alt="Portfolio Admin" width={36} height={36} className="size-full object-cover" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-black text-foreground">Portfolio Admin</span>
                <span className="block truncate text-[11px] text-muted-foreground">จัดการหน้า portfolio</span>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-background text-muted-foreground transition hover:border-accent/35 hover:text-accent"
              aria-label="ปิดเมนู"
            >
              <X className="size-4" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Portfolio</p>
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const active = activeTab === item.tab
                return (
                  <Link
                    key={item.tab}
                    href={item.href}
                    onClick={() => setMobileSidebarOpen(false)}
                    className={cn(
                      'flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition',
                      active
                        ? 'bg-secondary text-accent shadow-[inset_3px_0_0_var(--accent)]'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                )
              })}
            </div>

            <div className="mt-6 border-t border-border pt-4">
              <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Workspace</p>
              <div className="space-y-1">
                {orderedSwitcherItems.map((item) => {
                  const Icon = item.icon
                  const active = isSwitcherActive(item)
                  return (
                    <a
                      key={item.label}
                      href={appHref(item)}
                      onClick={() => {
                        rememberAdminWorkspace(item.href)
                        setMobileSidebarOpen(false)
                      }}
                      className={cn(
                        'flex h-12 items-center gap-2.5 rounded-xl px-3 transition',
                        active ? 'bg-secondary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
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
                        <span className="block truncate text-xs font-bold text-foreground">{item.label}</span>
                        <span className="block truncate text-[10px] text-muted-foreground">{item.description}</span>
                      </span>
                    </a>
                  )
                })}
              </div>
            </div>
          </nav>

          <div className="border-t border-border p-3">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-background/70 px-2.5 py-2">
              <span className="size-9 shrink-0 overflow-hidden rounded-full border border-border bg-secondary">
                <Image
                  src={authInfo?.avatarUrl || '/admin/favicon.png'}
                  alt={authInfo?.displayName || authInfo?.githubUsername || 'Admin'}
                  width={36}
                  height={36}
                  className="size-full object-cover"
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-bold text-foreground">
                  {authInfo?.displayName || authInfo?.githubUsername || 'Admin'}
                </span>
                <span className="block truncate text-[10px] text-muted-foreground">{adminRoleLabel}</span>
              </span>
              <button
                type="button"
                onClick={logout}
                className="grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-accent"
                aria-label="ออกจากระบบ"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1 overflow-hidden">
          <header className="sticky top-0 z-20 border-b border-border bg-background/88 backdrop-blur-xl">
            <div className="flex min-h-14 items-center justify-between gap-3 px-3 py-2 sm:px-4">
              <nav className="flex min-w-0 items-center gap-2 text-xs sm:text-sm">
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(true)}
                  className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition hover:border-accent/35 hover:text-accent lg:hidden"
                  aria-label="เปิดเมนู"
                  aria-expanded={mobileSidebarOpen}
                >
                  <Menu className="size-4" />
                </button>
                <a
                  href={publicPortfolioHref}
                  className="hidden text-muted-foreground transition hover:text-foreground sm:inline"
                  title={publicPortfolioHref}
                >
                  Centered101
                </a>
                <span className="hidden text-muted-foreground sm:inline">/</span>
                <Link href="/portfolio/admin" className="hidden text-muted-foreground transition hover:text-foreground sm:inline">
                  Portfolio Admin
                </Link>
                <span className="hidden text-muted-foreground sm:inline">/</span>
                <Link href={activeNavItem.href} className="truncate font-bold text-foreground transition hover:text-accent">
                  {activeNavItem.label}
                </Link>
              </nav>
              <a
                href={publicPortfolioHref}
                target="_blank"
                rel="noopener noreferrer"
                title={publicPortfolioHref}
                className="grid size-8 shrink-0 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition hover:bg-secondary hover:text-foreground sm:flex sm:w-auto sm:px-3 sm:text-xs sm:font-semibold"
              >
                <ExternalLink className="size-3.5 sm:size-3" />
                <span className="hidden sm:inline">ดูหน้าเว็บ</span>
              </a>
            </div>
          </header>
          <main className="h-[calc(100dvh-3.5rem)] overflow-y-auto px-2 py-3 sm:px-5 sm:py-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
