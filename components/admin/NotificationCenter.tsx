'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, CheckCheck, ChevronRight, Rocket, Shield, Star, TriangleAlert, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient as createBrowserClient } from '@/lib/supabase/client'
import { useAdminAuth } from '@/components/admin/AdminAuthProvider'

type NotificationItem = {
  id: string
  type: string
  title: string
  message: string | null
  read: boolean
  resource: string | null
  resource_id: string | null
  created_at: string
}

const TYPE_ICON = {
  deploy: Rocket,
  warning: TriangleAlert,
  security: Shield,
  info: Star,
}

const TYPE_COLOR = {
  deploy: 'text-[#22C55E]',
  warning: 'text-[#F59E0B]',
  security: 'text-[#EF4444]',
  info: 'text-[#409EFE]',
}

// Maps a notification's `resource` to the admin page it belongs to.
const RESOURCE_HREF: Record<string, string> = {
  portfolio_projects: '/portfolio/admin?tab=projects',
  blog_posts: '/admin/content',
  contact_messages: '/admin/business',
  digital_assets: '/admin/assets',
  storage: '/admin/storage',
  security_events: '/admin/security',
  user_sessions: '/admin/security',
  subdomains: '/admin/subdomains',
  admin_users: '/admin/users',
  system_settings: '/admin/settings',
  audit_logs: '/admin/logs',
}

function resourceHref(item: NotificationItem): string | null {
  if (!item.resource) return null
  return RESOURCE_HREF[item.resource] ?? null
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'เมื่อสักครู่'
  if (mins < 60) return `${mins} นาทีที่แล้ว`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} ชั่วโมงที่แล้ว`
  return `${Math.floor(hrs / 24)} วันที่แล้ว`
}

function notificationTitle(title: string) {
  const projectUpdated = title.match(/^Project updated:\s*(.+)$/)
  if (projectUpdated) return `อัปเดตโปรเจกต์: ${projectUpdated[1]}`

  const projectCreated = title.match(/^New project created:\s*(.+)$/)
  if (projectCreated) return `เพิ่มโปรเจกต์ใหม่: ${projectCreated[1]}`

  if (title === 'Project deleted') return 'ลบโปรเจกต์แล้ว'
  return title
}

export function NotificationCenter() {
  const { getAdminHeaders, authMode } = useAdminAuth()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<NotificationItem[]>([])
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/notifications', { headers: getAdminHeaders() })
      if (!res.ok) return
      const data = await res.json()
      setItems(data.notifications ?? [])
    } catch {
      // silently ignore network errors
    }
  }, [getAdminHeaders])

  // Initial load + Realtime or polling
  useEffect(() => {
    fetchNotifications()

    if (authMode === 'github') {
      // Supabase Realtime — INSERT events push directly to UI
      const supabase = createBrowserClient()
      const channel = supabase
        .channel('admin-notifications')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications' },
          (payload) => {
            setItems((prev) => [payload.new as NotificationItem, ...prev].slice(0, 50))
          }
        )
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    } else {
      // Password auth — no Supabase session, poll every 15s
      pollRef.current = setInterval(fetchNotifications, 60_000)
      return () => {
        if (pollRef.current) clearInterval(pollRef.current)
      }
    }
  }, [authMode, fetchNotifications])

  async function markAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })))
    await fetch('/api/admin/notifications', {
      method: 'PATCH',
      headers: { ...getAdminHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    })
  }

  async function markRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    await fetch('/api/admin/notifications', {
      method: 'PATCH',
      headers: { ...getAdminHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [id] }),
    }).catch(() => {})
  }

  function openNotification(item: NotificationItem) {
    if (!item.read) markRead(item.id)
    const href = resourceHref(item)
    if (href) {
      setOpen(false)
      router.push(href)
    }
  }

  async function dismiss(id: string) {
    setItems((prev) => prev.filter((n) => n.id !== id))
    await fetch(`/api/admin/notifications?id=${id}`, {
      method: 'DELETE',
      headers: getAdminHeaders(),
    })
  }

  const unread = items.filter((n) => !n.read).length

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'relative grid size-8 place-items-center rounded-lg border border-[#27272A] bg-[#18181B] text-[#A1A1AA] transition-colors hover:border-[#3f3f46] hover:text-[#FAFAFA]',
          open && 'border-[#409EFE]/30 bg-[#409EFE]/5 text-[#409EFE]'
        )}
        aria-label={`การแจ้งเตือน${unread > 0 ? ` (${unread} รายการยังไม่อ่าน)` : ''}`}
      >
        <Bell className="size-3.5" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-[#409EFE] text-[9px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-40 w-[min(calc(100vw-1rem),22rem)] overflow-hidden rounded-xl border border-[#27272A] bg-[#18181B] shadow-2xl shadow-black/60">
            <div className="flex items-center justify-between border-b border-[#27272A] px-4 py-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-[#FAFAFA]">การแจ้งเตือน</h3>
                {unread > 0 && (
                  <span className="rounded-md bg-[#409EFE]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[#409EFE]">
                    ใหม่ {unread}
                  </span>
                )}
              </div>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-[11px] text-[#52525b] transition-colors hover:text-[#A1A1AA]"
                >
                  <CheckCheck className="size-3" />
                  อ่านทั้งหมด
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {items.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Bell className="mx-auto mb-2 size-6 text-[#3f3f46]" />
                  <p className="text-xs text-[#52525b]">ยังไม่มีการแจ้งเตือน</p>
                  <p className="mt-0.5 text-[10px] text-[#3f3f46]">
                    {authMode === 'github' ? 'Realtime ทำงานอยู่' : 'ตรวจทุก 60 วินาที'}
                  </p>
                </div>
              ) : (
                items.map((item) => {
                  const Icon = TYPE_ICON[item.type as keyof typeof TYPE_ICON] ?? Bell
                  const color = TYPE_COLOR[item.type as keyof typeof TYPE_COLOR] ?? 'text-[#A1A1AA]'
                  const href = resourceHref(item)
                  return (
                    <div
                      key={item.id}
                      role={href ? 'button' : undefined}
                      tabIndex={href ? 0 : undefined}
                      onClick={() => openNotification(item)}
                      onKeyDown={(e) => {
                        if (href && (e.key === 'Enter' || e.key === ' ')) {
                          e.preventDefault()
                          openNotification(item)
                        }
                      }}
                      className={cn(
                        'group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-[#27272A]/30',
                        href && 'cursor-pointer',
                        !item.read && 'bg-[#409EFE]/[0.03]'
                      )}
                    >
                      <Icon className={cn('mt-0.5 size-4 shrink-0', color)} />
                      <div className="min-w-0 flex-1">
                        <p className={cn('text-xs font-medium', item.read ? 'text-[#A1A1AA]' : 'text-[#FAFAFA]')}>
                          {notificationTitle(item.title)}
                        </p>
                        {item.message && (
                          <p className="mt-0.5 text-[11px] text-[#52525b]">{item.message}</p>
                        )}
                        <div className="mt-0.5 flex items-center gap-1">
                          <p className="text-[10px] text-[#3f3f46]">{timeAgo(item.created_at)}</p>
                          {href && (
                            <span className="flex items-center gap-0.5 text-[10px] text-[#3f3f46] opacity-0 transition-opacity group-hover:opacity-100">
                              · ดู
                              <ChevronRight className="size-2.5" />
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          dismiss(item.id)
                        }}
                        className="mt-0.5 shrink-0 text-[#3f3f46] transition-colors hover:text-[#A1A1AA]"
                        aria-label="ปิดการแจ้งเตือน"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  )
                })
              )}
            </div>

            <div className="flex items-center justify-between border-t border-[#27272A] px-4 py-2.5">
              <span className="flex items-center gap-1 text-[10px] text-[#3f3f46]">
                <span
                  className={cn(
                    'inline-block size-1.5 rounded-full',
                    authMode === 'github' ? 'bg-[#22C55E]' : 'bg-[#F59E0B]'
                  )}
                />
                {authMode === 'github' ? 'Realtime' : 'ตรวจทุก 60 วินาที'}
              </span>
              <button
                type="button"
                onClick={fetchNotifications}
                className="text-[11px] text-[#52525b] transition-colors hover:text-[#409EFE]"
              >
                รีเฟรช
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
