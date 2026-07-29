'use client'

import { useEffect, useState } from 'react'
import {
  Contact,
  Edit3,
  FolderOpen,
  ImageIcon,
  LayoutDashboard,
  MessageSquare,
  PanelRightOpen,
  Wrench,
  X,
} from 'lucide-react'

type AdminSessionResponse = {
  admin?: {
    displayName?: string | null
    githubUsername?: string | null
    permissions?: string[]
  }
}

const editLinks = [
  { href: '/portfolio/admin?tab=projects', label: 'โปรเจกต์', icon: FolderOpen },
  { href: '/portfolio/admin?tab=tools', label: 'สกิลและเครื่องมือ', icon: Wrench },
  { href: '/portfolio/admin?tab=story', label: 'เส้นทางการเรียนรู้', icon: PanelRightOpen },
  { href: '/portfolio/admin?tab=connect', label: 'ช่องทางติดต่อ', icon: Contact },
  { href: '/portfolio/admin?tab=appearance', label: 'หน้าเว็บ', icon: ImageIcon },
  { href: '/portfolio/admin', label: 'ข้อความติดต่อ', icon: MessageSquare },
]

export function AdminEditMode() {
  const [adminName, setAdminName] = useState('')
  const [open, setOpen] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    fetch('/api/admin/auth/session', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) return null
        return (await response.json()) as AdminSessionResponse
      })
      .then((data) => {
        if (cancelled || !data?.admin) return
        const permissions = data.admin.permissions || []
        const canEditPortfolio = permissions.some((permission) =>
          ['manage_portfolio', 'edit_portfolio', 'create_portfolio', 'view_portfolio', '*'].includes(permission)
        )
        if (!canEditPortfolio) return
        setAdminName(data.admin.displayName || data.admin.githubUsername || 'Admin')
        setReady(true)
      })
      .catch(() => {
        if (!cancelled) setReady(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (!ready) return null

  return (
    <div className="fixed bottom-[max(1.5rem,var(--safe-bottom))] left-[max(1.5rem,var(--safe-left))] z-[80]">
      {open ? (
        <div className="w-[min(22rem,calc(100vw-3rem))] overflow-hidden rounded-2xl border border-border bg-card/92 text-foreground shadow-[0_22px_80px_-38px_rgba(9,12,19,0.55)] backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <p className="text-sm font-black">โหมดแก้ไข Portfolio</p>
              <p className="mt-0.5 text-xs text-muted-foreground">เข้าสู่ระบบอยู่: {adminName}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid size-8 place-items-center rounded-lg border border-border bg-background/70 text-muted-foreground transition hover:border-accent/40 hover:text-accent"
              aria-label="ปิดโหมดแก้ไข"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="grid gap-2 p-3">
            <a
              href="/portfolio/admin"
              className="group flex items-center justify-between rounded-xl border border-accent/25 bg-accent/10 px-3 py-2.5 text-sm font-bold text-foreground transition hover:border-accent/45 hover:bg-accent/15"
            >
              <span className="flex items-center gap-2">
                <LayoutDashboard className="size-4 text-accent" />
                เปิด Portfolio Admin
              </span>
              <Edit3 className="size-4 text-muted-foreground transition group-hover:text-accent" />
            </a>

            <div className="grid grid-cols-2 gap-2">
              {editLinks.map((link) => {
                const Icon = link.icon
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    className="group flex min-h-12 items-center gap-2 rounded-xl border border-border bg-secondary/35 px-3 py-2 text-xs font-bold text-muted-foreground transition hover:border-accent/35 hover:bg-accent/10 hover:text-foreground"
                  >
                    <Icon className="size-4 shrink-0 transition group-hover:text-accent" />
                    <span className="min-w-0 truncate">{link.label}</span>
                  </a>
                )
              })}
            </div>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="mt-3 inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card/92 px-4 text-sm font-black text-foreground shadow-[0_18px_60px_-30px_rgba(64,158,254,0.7)] backdrop-blur-xl transition hover:border-accent/40 hover:text-accent"
      >
        <Edit3 className="size-4" />
        โหมดแก้ไข
      </button>
    </div>
  )
}
