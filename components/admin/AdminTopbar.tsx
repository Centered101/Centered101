'use client'

import { useState } from 'react'
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
  '/admin': ['Dashboard'],
  '/admin/portfolio': ['Portfolio', 'Manager'],
  '/admin/content': ['Content', 'Manager'],
  '/admin/projects': ['Projects', 'Center'],
  '/admin/business': ['Business', 'Center'],
  '/admin/stripe': ['Payments', 'Stripe'],
  '/admin/open-source': ['Open Source', 'Hub'],
  '/admin/assets': ['Digital', 'Assets'],
  '/admin/database': ['Database', 'Explorer'],
  '/admin/analytics': ['Analytics', 'Center'],
  '/admin/ai': ['AI', 'Control Center'],
  '/admin/ai/memory/new': ['AI', 'New Memory'],
  '/admin/ai/memory': ['AI', 'Memory'],
  '/admin/storage': ['Storage', 'Manager'],
  '/admin/subdomains': ['Subdomain', 'Manager'],
  '/admin/monitoring': ['System', 'Monitoring'],
  '/admin/logs': ['Audit', 'Logs'],
  '/admin/security': ['Security', '& Access'],
  '/admin/users': ['Users', '& Access'],
  '/admin/settings': ['Settings'],
}

type Props = {
  onMenuOpen?: () => void
  onCommandOpen?: () => void
  onAIToggle?: () => void
  aiOpen?: boolean
}

export function AdminTopbar({ onMenuOpen, onCommandOpen, onAIToggle, aiOpen }: Props) {
  const pathname = usePathname()
  const { authInfo, logout } = useAdminAuth()
  const [profileOpen, setProfileOpen] = useState(false)

  // Try exact match first, then dynamic patterns for agent memory sub-routes
  function resolveCrumbs(path: string): string[] {
    if (breadcrumbs[path]) return breadcrumbs[path]
    if (path.startsWith('/admin/ai/memory/')) {
      if (path.endsWith('/edit')) return ['AI', 'Memory', 'Edit']
      return ['AI', 'Memory', 'Detail']
    }
    return ['Dashboard']
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
          aria-label="Open navigation"
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
          aria-label="Open command palette"
        >
          <Search className="size-3" />
          <span>Search...</span>
          <kbd className="ml-1 rounded border border-[#3f3f46] bg-[#27272A] px-1.5 py-0.5 text-[10px] font-mono text-[#52525b]">
            ⌘K
          </kbd>
        </button>

        {/* Mobile search button */}
        <button
          type="button"
          onClick={onCommandOpen}
          className="grid size-8 place-items-center rounded-lg border border-[#27272A] bg-[#18181B] text-[#52525b] transition-colors hover:border-[#3f3f46] hover:text-[#A1A1AA] md:hidden"
          aria-label="Search"
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
          aria-label="Toggle AI assistant"
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
          <a href="/" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-3" />
            <span className="hidden sm:inline">View site</span>
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
                alt={authInfo.displayName || 'Admin'}
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
              {authInfo?.displayName || authInfo?.githubUsername || 'Admin'}
            </span>
            <ChevronDown className="size-3 text-[#3f3f46]" />
          </button>

          {profileOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setProfileOpen(false)} />
              <div className="absolute right-0 top-10 z-40 min-w-52 overflow-hidden rounded-xl border border-[#27272A] bg-[#18181B] py-1 shadow-2xl shadow-black/60">
                <div className="border-b border-[#27272A] px-3 py-2.5">
                  <p className="text-xs font-semibold text-[#FAFAFA]">
                    {authInfo?.displayName || 'Admin'}
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
                    Profile settings
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
                    Sign out
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
