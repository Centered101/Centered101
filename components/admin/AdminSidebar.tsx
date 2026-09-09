'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useAdminApi } from '@/lib/hooks/useAdminApi'
import {
  BarChart3,
  Brain,
  Briefcase,
  ChevronDown,
  ChevronRight,
  Database,
  ExternalLink,
  Globe,
  HardDrive,
  LayoutDashboard,
  Monitor,
  ScrollText,
  Server,
  Settings,
  ShoppingBag,
  Shield,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { rememberAdminWorkspace, sortAdminWorkspaces } from '@/lib/admin-switcher'
import type { AdminAuthInfo } from '@/components/admin/AdminAuthProvider'

type NavChild = { href: string; label: string; icon: React.ElementType }
type NavItem = { href: string; label: string; icon: React.ElementType; exact?: boolean; children?: NavChild[] }
type NavGroup = { label: string; items: NavItem[] }
type SwitcherItem = {
  label: string
  description: string
  href: string
  subdomain?: string
  subdomainHref?: string
  icon: React.ElementType
  image: string
  accent: string
}

const navGroups: NavGroup[] = [
  {
    label: 'ภาพรวม',
    items: [
      { href: '/admin', label: 'แดชบอร์ด', icon: LayoutDashboard, exact: true },
    ],
  },
  {
    label: 'โครงสร้างระบบ',
    items: [
      { href: '/admin/assets', label: 'ไฟล์ดิจิทัล', icon: HardDrive },
      { href: '/admin/storage', label: 'พื้นที่จัดเก็บ', icon: Server },
      { href: '/admin/database', label: 'ฐานข้อมูล', icon: Database },
      { href: '/admin/subdomains', label: 'ซับโดเมน', icon: Globe },
    ],
  },
  {
    label: 'อัจฉริยะ',
    items: [
      { href: '/admin/analytics', label: 'วิเคราะห์ข้อมูล', icon: BarChart3 },
      { href: '/admin/ai', label: 'ศูนย์ AI', icon: Brain },
    ],
  },
  {
    label: 'ปฏิบัติการ',
    items: [
      { href: '/admin/monitoring', label: 'มอนิเตอร์', icon: Monitor },
      { href: '/admin/logs', label: 'บันทึกระบบ', icon: ScrollText },
      { href: '/admin/security', label: 'ความปลอดภัย', icon: Shield },
    ],
  },
  {
    label: 'ระบบ',
    items: [
      { href: '/admin/users', label: 'ผู้ดูแล', icon: Users },
      { href: '/admin/settings', label: 'ตั้งค่า', icon: Settings },
    ],
  },
]

const TOTAL_STORAGE_GB = 35
const APP_SUBDOMAINS = ['admin', 'portfolio', 'shop']
const switcherItems: SwitcherItem[] = [
  {
    label: 'แดชบอร์ด Admin',
    description: 'ภาพรวมระบบหลัก',
    href: '/admin',
    subdomain: 'admin',
    subdomainHref: '/',
    icon: LayoutDashboard,
    image: '/admin/favicon.png',
    accent: '#409EFE',
  },
  {
    label: 'Portfolio Admin',
    description: 'จัดการพอร์ตโฟลิโอ',
    href: '/portfolio/admin',
    subdomain: 'portfolio',
    subdomainHref: '/admin',
    icon: Briefcase,
    image: '/branding/favicon.png',
    accent: '#22C55E',
  },
  {
    label: 'Shop Admin',
    description: 'จัดการร้านค้า',
    href: '/shop/admin',
    subdomain: 'shop',
    subdomainHref: '/admin',
    icon: ShoppingBag,
    image: '/shop/favicon.png',
    accent: '#F59E0B',
  },
]

type AssetsData = { storageByBucket: { usedGB: number }[] }

type Props = {
  authInfo: AdminAuthInfo | null
  authMode: 'token' | 'github'
  adminUsername: string
  onNavClick?: () => void
}

export function AdminSidebar({ authInfo, authMode, adminUsername, onNavClick }: Props) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { data: assetsData } = useAdminApi<AssetsData>('/api/admin/assets')
  const usedStorageGB = (assetsData?.storageByBucket ?? []).reduce((s, b) => s + b.usedGB, 0)
  const [switcherOpen, setSwitcherOpen] = React.useState(false)
  const [orderedSwitcherItems, setOrderedSwitcherItems] = React.useState(() =>
    typeof window !== 'undefined' ? sortAdminWorkspaces(switcherItems) : switcherItems
  )
  const [hostInfo] = React.useState<{ protocol: string; hostname: string; port: string } | null>(() =>
    typeof window !== 'undefined'
      ? { protocol: window.location.protocol, hostname: window.location.hostname, port: window.location.port }
      : null
  )

  const [compact, setCompact] = React.useState(() =>
    typeof window !== 'undefined' && localStorage.getItem('admin_compact_sidebar') === 'true'
  )
  const [accent, setAccent] = React.useState(() =>
    typeof window !== 'undefined'
      ? (localStorage.getItem('admin_accent_color') || '#409EFE')
      : '#409EFE'
  )

  function isChildActive(childHref: string) {
    const [childPath, childQuery] = childHref.split('?')
    if (childQuery) {
      const childParams = new URLSearchParams(childQuery)
      const tab = childParams.get('tab')
      return pathname === childPath && searchParams.get('tab') === tab
    }
    return pathname.startsWith(childPath)
  }

  // Track which expandable items are open; auto-open when a child path is active
  const [expanded, setExpanded] = React.useState<Set<string>>(() => {
    const initial = new Set<string>()
    for (const group of navGroups) {
      for (const item of group.items) {
        if (item.children?.some((c) => {
          const [cp, cq] = c.href.split('?')
          if (cq) {
            const cp2 = new URLSearchParams(cq)
            return pathname === cp && typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('tab') === cp2.get('tab')
          }
          return pathname.startsWith(cp)
        })) {
          initial.add(item.href)
        }
      }
    }
    return initial
  })

  function toggleExpanded(href: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(href)) next.delete(href)
      else next.add(href)
      return next
    })
  }

  React.useEffect(() => {
    function onAppearance(e: Event) {
      const detail = (e as CustomEvent).detail as { compact_sidebar: boolean; accent_color: string }
      setCompact(detail.compact_sidebar)
      setAccent(detail.accent_color)
    }
    window.addEventListener('admin-appearance-change', onAppearance)
    return () => window.removeEventListener('admin-appearance-change', onAppearance)
  }, [])


  function accentBg(opacity: number) {
    const r = parseInt(accent.slice(1, 3), 16)
    const g = parseInt(accent.slice(3, 5), 16)
    const b = parseInt(accent.slice(5, 7), 16)
    return `rgba(${r},${g},${b},${opacity})`
  }

  function appHref(item: SwitcherItem) {
    if (!hostInfo) return item.href
    if (!item.subdomain) return item.href

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

  return (
    <aside className={cn(
      'flex h-full flex-col border-r border-[#27272A] bg-[#09090B] transition-all',
      compact ? 'w-16' : 'w-60'
    )}>
      {/* App selector */}
      <div className="relative flex h-14 items-center border-b border-[#27272A] px-3">
        <button
          type="button"
          onClick={() => {
            setOrderedSwitcherItems(sortAdminWorkspaces(switcherItems))
            setSwitcherOpen((v) => !v)
          }}
          className="flex h-10 w-full items-center gap-2.5 rounded-xl px-2 text-left transition-colors hover:bg-[#18181B]"
        >
          <div className="size-8 shrink-0 overflow-hidden rounded-xl">
            <Image src="/admin/favicon.png" alt="Centered101" width={32} height={32} className="size-full object-cover" />
          </div>
          {!compact && (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-[#FAFAFA]">Centered101</p>
                <p className="truncate text-[10px] text-[#52525b]">แพลตฟอร์มระบบ</p>
              </div>
              <ChevronDown className={cn('size-3.5 shrink-0 text-[#52525b] transition-transform', switcherOpen && 'rotate-180')} />
            </>
          )}
        </button>

        {switcherOpen && !compact && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setSwitcherOpen(false)} />
            <div className="absolute left-3 right-3 top-[3.25rem] z-40 overflow-hidden rounded-xl border border-[#27272A] bg-[#18181B] shadow-2xl shadow-black/60">
              <div className="relative overflow-hidden border-b border-[#27272A] px-3 py-2.5">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#409EFE]/60 to-transparent" />
                <p className="text-[11px] font-semibold text-[#FAFAFA]">เลือกหน้า Admin</p>
                <p className="mt-0.5 text-[10px] text-[#52525b]">แสดงเฉพาะ workspace ที่มีหน้าจัดการจริง</p>
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
                        onNavClick?.()
                      }}
                      className={cn(
                        'group relative flex h-12 items-center gap-2.5 rounded-lg px-2.5 transition-colors',
                        active
                          ? 'bg-[#09090B]'
                          : 'hover:bg-[#09090B]'
                      )}
                    >
                      <span
                        className="relative grid size-8 shrink-0 place-items-center overflow-hidden rounded-lg border bg-[#09090B]"
                        style={{ borderColor: active ? `${item.accent}66` : '#27272A' }}
                      >
                        <Image
                          src={item.image}
                          alt={item.label}
                          width={32}
                          height={32}
                          className="size-full object-cover"
                        />
                        <span
                          className="absolute bottom-0 right-0 grid size-3.5 place-items-center rounded border border-[#09090B] bg-[#18181B]"
                        >
                          <Icon className="size-2.5" style={{ color: item.accent }} />
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-semibold text-[#FAFAFA]">{item.label}</span>
                        <span className="block truncate text-[10px] text-[#52525b]">{item.description}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        {active && <span className="size-1.5 rounded-full" style={{ backgroundColor: item.accent }} />}
                        <ExternalLink className="size-3 text-[#3f3f46] group-hover:text-[#A1A1AA]" />
                      </span>
                    </a>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!compact && (
              <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-[#3f3f46]">
                {group.label}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon
                const hasChildren = !!item.children?.length
                const isOpen = expanded.has(item.href)
                const childActive = item.children?.some((c) => isChildActive(c.href)) ?? false
                const isActive = item.exact
                  ? pathname === item.href
                  : !hasChildren && pathname.startsWith(item.href)
                const parentHighlight = hasChildren && (pathname === item.href || childActive)

                return (
                  <div key={item.href}>
                    {hasChildren ? (
                      <button
                        type="button"
                        onClick={() => { toggleExpanded(item.href); if (!compact) return; }}
                        title={compact ? item.label : undefined}
                        className={cn(
                          'flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium transition-colors',
                          compact && 'justify-center px-0',
                          parentHighlight
                            ? 'text-[#FAFAFA]'
                            : 'text-[#A1A1AA] hover:bg-[#18181B] hover:text-[#FAFAFA]',
                        )}
                        style={parentHighlight ? { backgroundColor: accentBg(0.08) } : undefined}
                      >
                        <Icon
                          className="size-4 shrink-0"
                          style={{ color: parentHighlight ? accent : '#52525b' }}
                        />
                        {!compact && (
                          <>
                            <span className="flex-1 text-left" style={{ color: parentHighlight ? accent : undefined }}>
                              {item.label}
                            </span>
                            {isOpen
                              ? <ChevronDown className="size-3 shrink-0 text-[#52525b]" />
                              : <ChevronRight className="size-3 shrink-0 text-[#52525b]" />
                            }
                          </>
                        )}
                      </button>
                    ) : (
                      <Link
                        href={item.href}
                        onClick={onNavClick}
                        title={compact ? item.label : undefined}
                        className={cn(
                          'flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium transition-colors',
                          compact && 'justify-center px-0',
                          !isActive && 'text-[#A1A1AA] hover:bg-[#18181B] hover:text-[#FAFAFA]'
                        )}
                        style={isActive ? { backgroundColor: accentBg(0.1), color: accent } : undefined}
                      >
                        <Icon
                          className="size-4 shrink-0"
                          style={{ color: isActive ? accent : '#52525b' }}
                        />
                        {!compact && item.label}
                      </Link>
                    )}

                    {/* Sub-items */}
                    {hasChildren && isOpen && !compact && (
                      <div className="mt-1 space-y-1 pl-3">
                        <div className="space-y-1 border-l border-[#27272A] pl-2.5">
                          {item.children!.map((child) => {
                            const ChildIcon = child.icon
                            const childIsActive = isChildActive(child.href)
                            return (
                              <Link
                                key={child.href}
                                href={child.href}
                                onClick={onNavClick}
                                className={cn(
                                  'flex h-8 items-center gap-2 rounded-md px-2 text-[12px] font-medium transition-colors',
                                  childIsActive
                                    ? 'text-[#FAFAFA]'
                                    : 'text-[#71717A] hover:bg-[#18181B] hover:text-[#A1A1AA]'
                                )}
                                style={childIsActive ? { backgroundColor: accentBg(0.1), color: accent } : undefined}
                              >
                                <ChildIcon
                                  className="size-3.5 shrink-0"
                                  style={{ color: childIsActive ? accent : '#52525b' }}
                                />
                                {child.label}
                              </Link>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Storage usage */}
      {!compact && (
        <div className="border-t border-[#27272A] px-4 py-3">
          {(() => {
            const pct = Math.round((usedStorageGB / TOTAL_STORAGE_GB) * 100)
            return (
              <>
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="text-[11px] text-[#52525b]">พื้นที่จัดเก็บ</p>
                  <p className="text-[11px] font-medium text-[#A1A1AA]">
                    {usedStorageGB.toFixed(1)} / {TOTAL_STORAGE_GB} GB
                  </p>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[#27272A]">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: pct >= 80 ? '#EF4444' : pct >= 60 ? '#F59E0B' : accent,
                    }}
                  />
                </div>
                <p className="mt-1 text-[10px] text-[#3f3f46]">ใช้แล้ว {pct}%</p>
              </>
            )
          })()}
        </div>
      )}

      {/* Profile */}
      <div className="border-t border-[#27272A] px-3 py-3">
        <div className={cn(
          'flex items-center rounded-lg border border-[#27272A] bg-[#18181B] py-2.5',
          compact ? 'justify-center px-2' : 'gap-2.5 px-3'
        )}>
          {authInfo?.avatarUrl ? (
            <Image
              src={authInfo.avatarUrl}
              alt={authInfo.displayName || 'Admin'}
              width={28}
              height={28}
              title={compact ? (authInfo.displayName || authInfo.githubUsername || adminUsername) : undefined}
              className="size-7 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div
              title={compact ? (authInfo?.displayName || authInfo?.githubUsername || adminUsername) : undefined}
              className="grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold"
              style={{ backgroundColor: accentBg(0.15), color: accent }}
            >
              {(authInfo?.displayName || authInfo?.githubUsername || adminUsername || 'A')[0].toUpperCase()}
            </div>
          )}
          {!compact && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-medium text-[#FAFAFA]">
                {authInfo?.displayName || authInfo?.githubUsername || adminUsername}
              </p>
              <div className="mt-0.5 flex flex-wrap gap-1">
                {authInfo?.roles?.slice(0, 1).map((role) => (
                  <span
                    key={role}
                    className="rounded px-1.5 py-px text-[9px] font-semibold"
                    style={{ color: accent, backgroundColor: accentBg(0.1), border: `1px solid ${accentBg(0.2)}` }}
                  >
                    {role}
                  </span>
                ))}
                <span className="text-[9px] text-[#3f3f46]">
                  {authMode === 'github' ? 'GitHub OAuth' : 'รหัสผ่าน'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
