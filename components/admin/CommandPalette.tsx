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
  { label: 'แดชบอร์ด', icon: LayoutDashboard, href: '/admin' },
  { label: 'พอร์ตโฟลิโอ', icon: Briefcase, href: '/portfolio/admin' },
  { label: 'คอนเทนต์', icon: FileText, href: '/admin/content' },
  { label: 'โปรเจกต์', icon: FolderOpen, href: '/admin/projects' },
  { label: 'พรีวิวหน้าเว็บ', icon: Eye, href: '/admin/preview' },
  { label: 'ธุรกิจ', icon: Briefcase, href: '/admin/business' },
  { label: 'การชำระเงิน Stripe', icon: CreditCard, href: '/admin/stripe' },
  { label: 'โอเพนซอร์ส', icon: Github, href: '/admin/open-source' },
  { label: 'ไฟล์ดิจิทัล', icon: HardDrive, href: '/admin/assets' },
  { label: 'พื้นที่จัดเก็บ', icon: Server, href: '/admin/storage' },
  { label: 'ฐานข้อมูล', icon: Database, href: '/admin/database' },
  { label: 'วิเคราะห์ข้อมูล', icon: BarChart3, href: '/admin/analytics' },
  { label: 'ศูนย์ AI', icon: Brain, href: '/admin/ai' },
  { label: 'ซับโดเมน', icon: Globe, href: '/admin/subdomains' },
  { label: 'มอนิเตอร์', icon: Monitor, href: '/admin/monitoring' },
  { label: 'บันทึกระบบ', icon: ScrollText, href: '/admin/logs' },
  { label: 'ความปลอดภัย', icon: Shield, href: '/admin/security' },
  { label: 'ผู้ดูแล', icon: Users, href: '/admin/users' },
  { label: 'ตั้งค่า', icon: Settings, href: '/admin/settings' },
]

const actionCommands = [
  { label: 'เขียนบทความใหม่', icon: FileText, href: '/admin/content', description: 'เขียนและเผยแพร่' },
  { label: 'เพิ่มโปรเจกต์พอร์ตโฟลิโอ', icon: Package, href: '/portfolio/admin', description: 'อัปเดตหน้าเว็บ' },
  { label: 'รัน Query ฐานข้อมูล', icon: Database, href: '/admin/database', description: 'สำรวจฐานข้อมูล' },
  { label: 'ดู GitHub Repos', icon: Github, href: '/admin/open-source', description: 'ฮับโอเพนซอร์ส' },
  { label: 'ตรวจสถานะระบบ', icon: Monitor, href: '/admin/monitoring', description: 'สุขภาพบริการ' },
  { label: 'จัดการ API Keys', icon: Settings, href: '/admin/settings', description: 'ตั้งค่า API keys' },
  { label: 'เหตุการณ์ความปลอดภัย', icon: Shield, href: '/admin/security', description: 'ตรวจบันทึกระบบ' },
  { label: 'ดู Analytics', icon: BarChart3, href: '/admin/analytics', description: 'ทราฟฟิกและสถิติ' },
  { label: 'เครื่องมือ AI', icon: Brain, href: '/admin/ai', description: 'ศูนย์ควบคุม AI' },
  { label: 'Deploy / Monitor', icon: Rocket, href: '/admin/monitoring', description: 'สถานะ Vercel' },
  { label: 'จัดการซับโดเมน', icon: Globe, href: '/admin/subdomains', description: 'ตั้งค่าโดเมน' },
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
      title="แถบคำสั่ง"
      description="ค้นหาหน้า คอนเทนต์ หรือเรียกใช้คำสั่งลัด"
    >
      <CommandInput
        placeholder="ค้นหาหน้า ผู้ดูแล โปรเจกต์ หรือข้อความ..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList className="max-h-[420px]">
        {isEmpty && (
          <CommandEmpty>
            <p className="py-2 text-sm text-[#A1A1AA]">ไม่พบผลลัพธ์</p>
          </CommandEmpty>
        )}

        {searching && (
          <div className="px-4 py-3 text-[12px] text-[#52525b]">กำลังค้นหา...</div>
        )}

        {hasResults && (
          <>
            <CommandGroup heading="ผลการค้นหา">
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
          <CommandGroup heading="ไปยังหน้า">
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
          <CommandGroup heading="คำสั่งลัด">
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
            พิมพ์เพื่อค้นหาหน้า ผู้ดูแล โปรเจกต์ ข้อความ และบันทึกระบบ
          </p>
        </div>
      )}
    </CommandDialog>
  )
}
