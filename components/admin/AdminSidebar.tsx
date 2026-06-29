'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useAdminApi } from '@/lib/hooks/useAdminApi'
import {
  BarChart3,
  BookOpen,
  Brain,
  Briefcase,
  ChevronDown,
  ChevronRight,
  Clock,
  CreditCard,
  Database,
  Eye,
  FileText,
  Globe,
  HardDrive,
  Inbox,
  Layers,
  LayoutDashboard,
  MessageCircle,
  Monitor,
  ScrollText,
  Server,
  Settings,
  Shield,
  ShoppingBag,
  Users,
  Wrench,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AdminAuthInfo } from '@/components/admin/AdminAuthProvider'

type NavChild = { href: string; label: string; icon: React.ElementType }
type NavItem = { href: string; label: string; icon: React.ElementType; exact?: boolean; children?: NavChild[] }
type NavGroup = { label: string; items: NavItem[] }

const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    ],
  },
  {
    label: 'Portfolio',
    items: [
      {
        href: '/admin/portfolio',
        label: 'Portfolio',
        icon: Briefcase,
        children: [
          { href: '/admin/preview', label: 'Live Preview', icon: Eye },
          { href: '/admin/portfolio?tab=projects', label: 'Featured Projects', icon: Layers },
          { href: '/admin/portfolio?tab=coding', label: 'Coding Time', icon: Clock },
          { href: '/admin/portfolio?tab=tools', label: 'Skills & Tools', icon: Wrench },
          { href: '/admin/portfolio?tab=story', label: 'My Learning Story', icon: BookOpen },
          { href: '/admin/portfolio?tab=resume', label: 'Resume', icon: FileText },
          { href: '/admin/portfolio?tab=connect', label: 'Get in Touch', icon: MessageCircle },
        ],
      },
    ],
  },
  {
    label: 'Shop',
    items: [
      { href: '/shop/admin', label: 'Shop Admin', icon: ShoppingBag },
      { href: '/admin/stripe', label: 'Payments', icon: CreditCard },
      { href: '/admin/business', label: 'Business', icon: Inbox },
    ],
  },
  {
    label: 'NewTab',
    items: [
      { href: '/admin/wakatime', label: 'WakaTime', icon: Clock },
    ],
  },
  {
    label: 'Infrastructure',
    items: [
      { href: '/admin/assets', label: 'Assets', icon: HardDrive },
      { href: '/admin/storage', label: 'Storage', icon: Server },
      { href: '/admin/database', label: 'Database', icon: Database },
      { href: '/admin/subdomains', label: 'Subdomains', icon: Globe },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
      { href: '/admin/ai', label: 'AI Center', icon: Brain },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/admin/monitoring', label: 'Monitoring', icon: Monitor },
      { href: '/admin/logs', label: 'Audit Logs', icon: ScrollText },
      { href: '/admin/security', label: 'Security', icon: Shield },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/admin/users', label: 'Users', icon: Users },
      { href: '/admin/settings', label: 'Settings', icon: Settings },
    ],
  },
]

const TOTAL_STORAGE_GB = 35

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

  return (
    <aside className={cn(
      'flex h-full flex-col border-r border-[#27272A] bg-[#09090B] transition-all',
      compact ? 'w-16' : 'w-60'
    )}>
      {/* Project selector */}
      <div className="border-b border-[#27272A] px-4 py-3.5">
        <button
          type="button"
          className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-[#18181B]"
        >
          <div className="size-7 shrink-0 overflow-hidden rounded-lg">
            <Image src="/admin/favicon.png" alt="Centered101" width={28} height={28} className="size-full object-cover" />
          </div>
          {!compact && (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-[#FAFAFA]">Centered101</p>
                <p className="text-[10px] text-[#52525b]">Ecosystem Platform</p>
              </div>
              <ChevronDown className="size-3.5 shrink-0 text-[#52525b]" />
            </>
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-4">
            {!compact && (
              <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-[#3f3f46]">
                {group.label}
              </p>
            )}
            <div className="space-y-px">
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
                          'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors',
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
                          'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors',
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
                      <div className="mt-0.5 space-y-px pl-3">
                        <div className="border-l border-[#27272A] pl-2.5 space-y-px">
                          {item.children!.map((child) => {
                            const ChildIcon = child.icon
                            const childIsActive = isChildActive(child.href)
                            return (
                              <Link
                                key={child.href}
                                href={child.href}
                                onClick={onNavClick}
                                className={cn(
                                  'flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px] font-medium transition-colors',
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
                  <p className="text-[11px] text-[#52525b]">Storage</p>
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
                <p className="mt-1 text-[10px] text-[#3f3f46]">{pct}% used</p>
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
                {(authInfo?.roles || ['owner']).slice(0, 1).map((role) => (
                  <span
                    key={role}
                    className="rounded px-1.5 py-px text-[9px] font-semibold"
                    style={{ color: accent, backgroundColor: accentBg(0.1), border: `1px solid ${accentBg(0.2)}` }}
                  >
                    {role}
                  </span>
                ))}
                <span className="text-[9px] text-[#3f3f46]">
                  {authMode === 'github' ? 'GitHub OAuth' : 'password'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
