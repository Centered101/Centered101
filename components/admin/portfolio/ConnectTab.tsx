'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ArrowDown, ArrowUp, Check, ExternalLink, Loader2, Mail, Pencil, Plus, Trash2, X } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { AdminPageHeader } from '@/components/admin/AdminPage'
import { AdminEmpty, AdminError, AdminLoading } from '@/components/admin/AdminStates'
import { useAdminAuth } from '@/components/admin/AdminAuthProvider'
import { useAdminApi } from '@/lib/hooks/useAdminApi'
import { useAdminRealtime } from '@/lib/hooks/useAdminRealtime'
import { TheSvgIcon, parseIconValue, buildIconValue, ICON_VARIANTS, type IconVariant } from '@/components/the-svg-icon'

type SocialLink = {
  id: string
  name: string
  label: string
  href: string
  icon: string | null
  is_active: boolean
  sort_order: number
}

type ContactMessage = {
  id: string
  name: string
  email: string
  message: string
  created_at: string
  is_read: boolean
  source?: string | null
}

type DraftLink = Omit<SocialLink, 'id'>

const BLANK_LINK: DraftLink = {
  name: '',
  label: '',
  href: '',
  icon: '',
  is_active: true,
  sort_order: 0,
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

function LinkEditor({
  initial,
  saving,
  onCancel,
  onSave,
}: {
  initial: DraftLink
  saving: boolean
  onCancel: () => void
  onSave: (value: DraftLink) => void
}) {
  const [value, setValue] = useState(initial)
  const parsedIcon = parseIconValue(value.icon)

  function update<K extends keyof DraftLink>(key: K, next: DraftLink[K]) {
    setValue((current) => ({ ...current, [key]: next }))
  }

  return (
    <div className="rounded-lg border border-border bg-background p-4 shadow-sm">
      <div className="grid items-end gap-3 lg:grid-cols-12">
        <label className="space-y-1.5 lg:col-span-3">
          <span className="text-[11px] font-semibold text-muted-foreground">ชื่อระบบ</span>
          <input
            value={value.name}
            onChange={(event) => update('name', event.target.value)}
            placeholder="github"
            className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm font-semibold text-foreground outline-none transition focus:border-accent"
          />
        </label>
        <label className="space-y-1.5 lg:col-span-3">
          <span className="text-[11px] font-semibold text-muted-foreground">ชื่อที่แสดง</span>
          <input
            value={value.label}
            onChange={(event) => update('label', event.target.value)}
            placeholder="GitHub"
            className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm font-semibold text-foreground outline-none transition focus:border-accent"
          />
        </label>
        <label className="space-y-1.5 lg:col-span-6">
          <span className="text-[11px] font-semibold text-muted-foreground">ลิงก์</span>
          <input
            value={value.href}
            onChange={(event) => update('href', event.target.value)}
            placeholder="https://github.com/centered101"
            className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm font-semibold text-foreground outline-none transition focus:border-accent"
          />
        </label>
        <label className="space-y-1.5 lg:col-span-7">
          <span className="text-[11px] font-semibold text-muted-foreground">ไอคอน thesvg</span>
          <div className="flex items-center gap-2">
            <TheSvgIcon
              label={value.label || value.name || 'link'}
              slug={value.icon}
              className="size-10 shrink-0 rounded-md border border-border bg-card"
            />
            <input
              value={parsedIcon.slug ?? ''}
              onChange={(event) => update('icon', buildIconValue(event.target.value, parsedIcon.variant))}
              placeholder="github, x, linkedin"
              className="h-10 min-w-0 flex-1 rounded-md border border-border bg-card px-3 text-sm font-semibold text-foreground outline-none transition focus:border-accent"
            />
          </div>
        </label>
        <label className="space-y-1.5 lg:col-span-2">
          <span className="text-[11px] font-semibold text-muted-foreground">รูปแบบ</span>
          <select
            value={parsedIcon.variant}
            onChange={(event) => update('icon', buildIconValue(parsedIcon.slug ?? '', event.target.value as IconVariant))}
            className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm font-semibold text-foreground outline-none transition focus:border-accent"
          >
            {ICON_VARIANTS.map((variant) => (
              <option key={variant} value={variant}>
                {variant}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-2 lg:col-span-3">
          <button
            type="button"
            onClick={() => onSave(value)}
            disabled={saving || !value.href.trim()}
            className="flex h-10 flex-1 items-center justify-center gap-2 rounded-md border border-accent bg-accent px-4 text-sm font-bold text-accent-foreground transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Check className="size-4" />
            บันทึก
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="grid size-10 place-items-center rounded-md border border-border bg-card text-muted-foreground transition hover:border-accent/40 hover:text-accent"
            aria-label="ยกเลิก"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export function ConnectTab() {
  const { getAdminHeaders, refreshAdminHeaders } = useAdminAuth()
  const {
    data: linksData,
    loading: linksLoading,
    error: linksError,
    refetch: refetchLinks,
  } = useAdminApi<{ links: SocialLink[] }>('/api/admin/portfolio/social')
  const { data: messagesData, loading: messagesLoading } = useAdminApi<{ messages: ContactMessage[] }>('/api/admin/contacts')

  useAdminRealtime(['social_links'], refetchLinks)

  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savingOrder, setSavingOrder] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [orderedLinks, setOrderedLinks] = useState<SocialLink[]>([])
  const [orderDirty, setOrderDirty] = useState(false)

  const serverLinks = linksData?.links
  const links = serverLinks ?? []
  const activeLinks = orderedLinks.filter((link) => link.is_active)
  const messages = messagesData?.messages ?? []

  useEffect(() => {
    if (!orderDirty) setOrderedLinks(serverLinks ?? [])
  }, [serverLinks, orderDirty])

  async function adminFetch(input: RequestInfo | URL, init: RequestInit = {}) {
    let response = await fetch(input, {
      ...init,
      headers: { ...getAdminHeaders(), ...(init.headers || {}) },
    })

    if (response.status === 401) {
      const freshHeaders = await refreshAdminHeaders()
      if (freshHeaders) {
        response = await fetch(input, {
          ...init,
          headers: { ...freshHeaders, ...(init.headers || {}) },
        })
      }
    }

    return response
  }

  async function saveLink(payload: DraftLink & { id?: string }) {
    setSaving(true)
    try {
      const nextSortOrder = payload.id
        ? payload.sort_order
        : orderedLinks.reduce((max, link) => Math.max(max, link.sort_order), -1) + 100
      const response = await adminFetch('/api/admin/portfolio/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, sort_order: nextSortOrder }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'บันทึกลิงก์ไม่สำเร็จ')
      if (result.link) {
        setOrderedLinks((current) => {
          if (payload.id) {
            return current.map((link) => (link.id === payload.id ? { ...result.link, sort_order: link.sort_order } : link))
          }
          return [...current, result.link]
        })
      }
      toast.success(payload.id ? 'อัปเดตช่องทางติดต่อแล้ว' : 'เพิ่มช่องทางติดต่อแล้ว')
      setAdding(false)
      setEditingId(null)
      refetchLinks()
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setSaving(false)
    }
  }

  function moveLink(index: number, direction: -1 | 1) {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= orderedLinks.length) return

    setOrderedLinks((current) => {
      const next = [...current]
      const moving = next[index]
      next[index] = next[targetIndex]
      next[targetIndex] = moving
      return next
    })
    setOrderDirty(true)
  }

  async function saveOrder() {
    setSavingOrder(true)
    try {
      const response = await adminFetch('/api/admin/portfolio/social', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order: orderedLinks.map((link, index) => ({ id: link.id, sort_order: (index + 1) * 100 })),
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'บันทึกลำดับไม่สำเร็จ')
      if (Array.isArray(result.links)) setOrderedLinks(result.links)
      await refetchLinks()
      setOrderDirty(false)
      toast.success('บันทึกลำดับแล้ว')
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setSavingOrder(false)
    }
  }

  function discardOrder() {
    setOrderedLinks(links)
    setOrderDirty(false)
  }

  async function toggleLink(id: string, isActive: boolean) {
    setTogglingId(id)
    const response = await adminFetch('/api/admin/portfolio/social', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active: isActive }),
    })
    if (!response.ok) toast.error((await response.json()).error || 'เปลี่ยนสถานะไม่สำเร็จ')
    else {
      setOrderedLinks((current) => current.map((link) => (link.id === id ? { ...link, is_active: isActive } : link)))
      refetchLinks()
    }
    setTogglingId(null)
  }

  async function deleteLink(id: string) {
    if (!confirm('ลบช่องทางติดต่อนี้ใช่ไหม?')) return
    const response = await adminFetch(`/api/admin/portfolio/social?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
    if (!response.ok) toast.error((await response.json()).error || 'ลบไม่สำเร็จ')
    else {
      toast.success('ลบช่องทางติดต่อแล้ว')
      setOrderedLinks((current) => current.filter((link) => link.id !== id))
      if (editingId === id) setEditingId(null)
      refetchLinks()
    }
  }

  if (linksLoading) return <AdminLoading message="กำลังโหลดช่องทางติดต่อ..." />
  if (linksError) return <AdminError error={linksError} onRetry={refetchLinks} />

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="ช่องทางติดต่อ"
        description="จัดการลิงก์ที่แสดงบนหน้า portfolio และดูภาพรวมข้อความล่าสุด"
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold text-muted-foreground">ลิงก์ทั้งหมด</p>
          <p className="mt-3 text-2xl font-black text-foreground">{links.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold text-muted-foreground">กำลังแสดงบนเว็บ</p>
          <p className="mt-3 text-2xl font-black text-accent">{activeLinks.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold text-muted-foreground">ข้อความล่าสุด</p>
          <p className="mt-3 truncate text-2xl font-black text-foreground">{messages[0]?.name ?? '-'}</p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <section className="rounded-lg border border-border bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <h2 className="text-sm font-black text-foreground">ลิงก์ติดต่อบนหน้า Portfolio</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">เรียงตามลำดับ และเปิด/ปิดการแสดงผลได้ทันที</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {orderDirty && (
                <>
                  <button
                    type="button"
                    onClick={discardOrder}
                    disabled={savingOrder}
                    className="flex h-9 items-center rounded-md border border-border bg-background px-3 text-xs font-bold text-muted-foreground transition hover:border-accent/40 hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    ยกเลิกการจัด
                  </button>
                  <button
                    type="button"
                    onClick={saveOrder}
                    disabled={savingOrder}
                    className="flex h-9 items-center gap-2 rounded-md border border-accent bg-accent px-3 text-xs font-bold text-accent-foreground transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {savingOrder ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                    บันทึกลำดับ
                  </button>
                </>
              )}
              {!adding && (
                <button
                  type="button"
                  onClick={() => setAdding(true)}
                  className="flex h-9 items-center gap-2 rounded-md border border-accent bg-accent px-3 text-xs font-bold text-accent-foreground transition hover:bg-accent/90"
                >
                  <Plus className="size-4" />
                  เพิ่มลิงก์
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3 p-5">
            {adding && <LinkEditor initial={BLANK_LINK} saving={saving} onCancel={() => setAdding(false)} onSave={saveLink} />}

            {orderedLinks.length === 0 && !adding ? (
              <AdminEmpty title="ยังไม่มีช่องทางติดต่อ" description="เพิ่มลิงก์แรกเพื่อแสดงในหน้า portfolio" />
            ) : (
              orderedLinks.map((link, index) =>
                editingId === link.id ? (
                  <LinkEditor
                    key={link.id}
                    initial={{
                      name: link.name,
                      label: link.label,
                      href: link.href,
                      icon: link.icon,
                      is_active: link.is_active,
                      sort_order: link.sort_order,
                    }}
                    saving={saving}
                    onCancel={() => setEditingId(null)}
                    onSave={(value) => saveLink({ ...value, id: link.id })}
                  />
                ) : (
                  <div
                    key={link.id}
                    className="group flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 transition hover:border-accent/35 hover:bg-secondary/50"
                  >
                    <TheSvgIcon
                      label={link.label || link.name}
                      slug={link.icon}
                      className="size-10 shrink-0 rounded-md border border-border bg-card"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md border border-border bg-card px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                          #{index + 1}
                        </span>
                        <p className="truncate text-sm font-black text-foreground">{link.label || link.name || 'Untitled'}</p>
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{link.href}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveLink(index, -1)}
                          disabled={index === 0}
                          className="grid size-8 place-items-center rounded-md border border-border bg-card text-muted-foreground transition hover:border-accent/40 hover:text-accent disabled:cursor-not-allowed disabled:opacity-35"
                          aria-label="เลื่อนขึ้น"
                        >
                          <ArrowUp className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveLink(index, 1)}
                          disabled={index === orderedLinks.length - 1}
                          className="grid size-8 place-items-center rounded-md border border-border bg-card text-muted-foreground transition hover:border-accent/40 hover:text-accent disabled:cursor-not-allowed disabled:opacity-35"
                          aria-label="เลื่อนลง"
                        >
                          <ArrowDown className="size-3.5" />
                        </button>
                      </div>
                      <Switch
                        checked={link.is_active}
                        disabled={togglingId === link.id}
                        onCheckedChange={(checked) => toggleLink(link.id, checked)}
                      />
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="grid size-8 place-items-center rounded-md border border-border bg-card text-muted-foreground transition hover:border-accent/40 hover:text-accent"
                        aria-label="เปิดลิงก์"
                      >
                        <ExternalLink className="size-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={() => setEditingId(link.id)}
                        className="grid size-8 place-items-center rounded-md border border-border bg-card text-muted-foreground transition hover:border-accent/40 hover:text-accent"
                        aria-label="แก้ไข"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteLink(link.id)}
                        className="grid size-8 place-items-center rounded-md border border-border bg-card text-muted-foreground transition hover:border-destructive/30 hover:text-destructive"
                        aria-label="ลบ"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                )
              )
            )}
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-lg border border-border bg-card shadow-sm">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-sm font-black text-foreground">ตัวอย่างบนหน้าเว็บ</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">แสดงเฉพาะลิงก์ที่เปิดใช้งาน</p>
            </div>
            <div className="space-y-4 p-5">
              {activeLinks.length === 0 ? (
                <p className="text-sm text-muted-foreground">ยังไม่มีลิงก์ที่เปิดใช้งาน</p>
              ) : (
                activeLinks.map((link) => (
                  <a
                    key={link.id}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-4 text-muted-foreground transition-all hover:text-foreground"
                  >
                    <TheSvgIcon
                      label={link.name || link.label}
                      slug={link.icon}
                      className="size-12 shrink-0 border-0 bg-secondary/80 transition-all group-hover:scale-105 group-hover:bg-accent/20"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-foreground">{link.name || link.label}</p>
                      <p className="truncate text-sm font-semibold text-muted-foreground">{link.label || link.name}</p>
                    </div>
                  </a>
                ))
              )}
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card shadow-sm">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-sm font-black text-foreground">ข้อความล่าสุด</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">อ่านละเอียดที่หน้า คนติดต่อมา</p>
            </div>
            {messagesLoading ? (
              <div className="p-5 text-sm text-muted-foreground">กำลังโหลดข้อความ...</div>
            ) : messages.length === 0 ? (
              <div className="p-5 text-sm text-muted-foreground">ยังไม่มีข้อความ</div>
            ) : (
              <div className="divide-y divide-border">
                {messages.slice(0, 5).map((message) => (
                  <div key={message.id} className="flex gap-3 px-5 py-4">
                    <span className="mt-1 grid size-8 shrink-0 place-items-center rounded-full bg-secondary">
                      <Mail className="size-4 text-accent" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-black text-foreground">{message.name}</p>
                        {!message.is_read && <span className="size-2 rounded-full bg-accent" />}
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{message.email}</p>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{message.message}</p>
                      <p className="mt-2 text-[11px] text-muted-foreground">{formatDate(message.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}
