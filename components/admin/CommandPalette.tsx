'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  BarChart3,
  Brain,
  Briefcase,
  CreditCard,
  Database,
  Eye,
  FileText,
  FolderOpen,
  Github,
  Globe,
  HardDrive,
  LayoutDashboard,
  Mail,
  Monitor,
  Package,
  Rocket,
  ScrollText,
  Server,
  Settings,
  Shield,
  Users,
} from 'lucide-react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'
import { useAdminAuth } from '@/components/admin/AdminAuthProvider'

const navCommands = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/admin' },
  { label: 'Portfolio', icon: Briefcase, href: '/admin/portfolio' },
  { label: 'Content', icon: FileText, href: '/admin/content' },
  { label: 'Projects', icon: FolderOpen, href: '/admin/projects' },
  { label: 'Live Preview', icon: Eye, href: '/admin/preview' },
  { label: 'Business', icon: Briefcase, href: '/admin/business' },
  { label: 'Payments (Stripe)', icon: CreditCard, href: '/admin/stripe' },
  { label: 'Open Source', icon: Github, href: '/admin/open-source' },
  { label: 'Assets', icon: HardDrive, href: '/admin/assets' },
  { label: 'Storage', icon: Server, href: '/admin/storage' },
  { label: 'Database', icon: Database, href: '/admin/database' },
  { label: 'Analytics', icon: BarChart3, href: '/admin/analytics' },
  { label: 'AI Center', icon: Brain, href: '/admin/ai' },
  { label: 'Subdomains', icon: Globe, href: '/admin/subdomains' },
  { label: 'Monitoring', icon: Monitor, href: '/admin/monitoring' },
  { label: 'Audit Logs', icon: ScrollText, href: '/admin/logs' },
  { label: 'Security', icon: Shield, href: '/admin/security' },
  { label: 'Users', icon: Users, href: '/admin/users' },
  { label: 'Settings', icon: Settings, href: '/admin/settings' },
]

const actionCommands = [
  { label: 'New Blog Post', icon: FileText, href: '/admin/content', description: 'Write & publish' },
  { label: 'Add Portfolio Project', icon: Package, href: '/admin/portfolio', description: 'Update portfolio' },
  { label: 'Run Database Query', icon: Database, href: '/admin/database', description: 'DB explorer' },
  { label: 'View GitHub Repos', icon: Github, href: '/admin/open-source', description: 'Open source hub' },
  { label: 'Check System Status', icon: Monitor, href: '/admin/monitoring', description: 'Service health' },
  { label: 'Manage API Keys', icon: Settings, href: '/admin/settings', description: 'Settings → API keys' },
  { label: 'Security Events', icon: Shield, href: '/admin/security', description: 'Review audit log' },
  { label: 'View Analytics', icon: BarChart3, href: '/admin/analytics', description: 'Traffic & stats' },
  { label: 'AI Tools', icon: Brain, href: '/admin/ai', description: 'AI control center' },
  { label: 'Deploy / Monitor', icon: Rocket, href: '/admin/monitoring', description: 'Vercel deployment' },
  { label: 'Subdomain Manager', icon: Globe, href: '/admin/subdomains', description: 'Domain config' },
]

const RESULT_ICONS = {
  user: Users,
  project: FolderOpen,
  message: Mail,
  log: ScrollText,
} as const

type SearchResult = {
  id: string
  type: keyof typeof RESULT_ICONS
  title: string
  description: string
  href: string
}

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
}

function match(text: string, q: string) {
  return text.toLowerCase().includes(q.toLowerCase())
}

export function CommandPalette({ open, onOpenChange }: Props) {
  const router = useRouter()
  const { getAdminHeaders } = useAdminAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onOpenChange])

  useEffect(() => {
    if (!open) {
      setQuery('')
      setResults([])
    }
  }, [open])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.length < 2) {
      setResults([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(query)}`, {
          headers: getAdminHeaders(),
        })
        if (res.ok) {
          const json = await res.json()
          setResults(json.results ?? [])
        }
      } finally {
        setSearching(false)
      }
    }, 300)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  function navigate(href: string) {
    router.push(href)
    onOpenChange(false)
  }

  const filteredNav = query
    ? navCommands.filter((c) => match(c.label, query))
    : navCommands

  const filteredActions = query
    ? actionCommands.filter((c) => match(c.label, query) || match(c.description, query))
    : actionCommands

  const hasResults = results.length > 0
  const hasNav = filteredNav.length > 0
  const hasActions = filteredActions.length > 0
  const isEmpty = !hasResults && !hasNav && !hasActions && !searching

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      shouldFilter={false}
      title="Command Palette"
      description="Search pages, content, or run an action"
    >
      <CommandInput
        placeholder="Search pages, users, projects, messages..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList className="max-h-[420px]">
        {isEmpty && (
          <CommandEmpty>
            <p className="py-2 text-sm text-[#A1A1AA]">No results found.</p>
          </CommandEmpty>
        )}

        {searching && (
          <div className="px-4 py-3 text-[12px] text-[#52525b]">Searching…</div>
        )}

        {hasResults && (
          <>
            <CommandGroup heading="Content Search">
              {results.map((item) => {
                const Icon = RESULT_ICONS[item.type] ?? FolderOpen
                return (
                  <CommandItem key={item.id} onSelect={() => navigate(item.href)}>
                    <Icon className="mr-2.5 size-4 text-[#22C55E]" />
                    <div className="flex flex-1 items-baseline justify-between gap-4">
                      <span>{item.title}</span>
                      <span className="text-xs text-[#52525b]">{item.description}</span>
                    </div>
                    <span className="ml-2 rounded border border-[#27272A] bg-[#09090B] px-1.5 py-px text-[9px] font-semibold uppercase text-[#3f3f46]">
                      {item.type}
                    </span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
            {(hasNav || hasActions) && <CommandSeparator />}
          </>
        )}

        {hasNav && (
          <CommandGroup heading="Navigate">
            {filteredNav.map((item) => {
              const Icon = item.icon
              return (
                <CommandItem key={item.href} onSelect={() => navigate(item.href)}>
                  <Icon className="mr-2.5 size-4 text-[#409EFE]" />
                  <span>{item.label}</span>
                </CommandItem>
              )
            })}
          </CommandGroup>
        )}

        {hasNav && hasActions && <CommandSeparator />}

        {hasActions && (
          <CommandGroup heading="Quick Actions">
            {filteredActions.map((item) => {
              const Icon = item.icon
              return (
                <CommandItem key={`${item.href}-${item.label}`} onSelect={() => navigate(item.href)}>
                  <Icon className="mr-2.5 size-4 text-[#A1A1AA]" />
                  <div className="flex flex-1 items-baseline justify-between gap-4">
                    <span>{item.label}</span>
                    <span className="text-xs text-[#52525b]">{item.description}</span>
                  </div>
                </CommandItem>
              )
            })}
          </CommandGroup>
        )}
      </CommandList>

      {!query && (
        <div className="border-t border-[#27272A] px-4 py-2">
          <p className="text-[10px] text-[#3f3f46]">
            Type to search across pages, users, projects, messages, and logs
          </p>
        </div>
      )}
    </CommandDialog>
  )
}
