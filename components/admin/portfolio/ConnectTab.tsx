'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ArrowDown, ArrowUp, Check, ExternalLink, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AdminPageHeader } from '@/components/admin/AdminPage'
import { AdminEmpty, AdminError, AdminLoading } from '@/components/admin/AdminStates'
import { useAdminAuth } from '@/components/admin/AdminAuthProvider'
import { useAdminApi } from '@/lib/hooks/useAdminApi'
import { useAdminRealtime } from '@/lib/hooks/useAdminRealtime'
import { TheSvgIcon, parseIconValue, buildIconValue, ICON_VARIANTS, type IconVariant } from '@/components/the-svg-icon'
import { cn } from '@/lib/utils'

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

const ICON_VARIANT_LABELS: Record<IconVariant, string> = {
  default: 'Default',
  mono: 'Mono',
  light: 'Light',
  dark: 'Dark',
  wordmark: 'Wordmark',
  'wm-light': 'WM Light',
  'wm-dark': 'WM Dark',
}

function LinkIconVariantButton({
  slug,
  label,
  option,
  selected,
  onSelect,
}: {
  slug: string | null
  label: string
  option: IconVariant
  selected: boolean
  onSelect: () => void
}) {
  const needsDarkPreview = option === 'dark' || option === 'wordmark' || option === 'wm-dark'

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!slug}
      className={cn(
        'flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-45',
        selected
          ? 'border-[#409EFE] bg-[#409EFE]/10 text-[#409EFE] ring-2 ring-[#409EFE]/15'
          : 'border-[#dfe3e8] bg-white text-[#647084] hover:border-[#409EFE]/40',
      )}
    >
      <TheSvgIcon
        label={label || 'link'}
        slug={slug ? buildIconValue(slug, option) : ''}
        className={cn(
          'size-9 rounded-lg !border-[#dfe3e8] [&_img]:size-5',
          needsDarkPreview ? '!bg-[#09090b]' : '!bg-white',
        )}
      />
      <span className="text-xs font-bold">{ICON_VARIANT_LABELS[option]}</span>
    </button>
  )
}

function LinkEditor({
  initial,
  saving,
  onCancel,
  onSave,
  onDelete,
}: {
  initial: DraftLink
  saving: boolean
  onCancel: () => void
  onSave: (value: DraftLink) => void
  onDelete?: () => void
}) {
  const [value, setValue] = useState(initial)
  const parsedIcon = parseIconValue(value.icon)

  function update<K extends keyof DraftLink>(key: K, next: DraftLink[K]) {
    setValue((current) => ({ ...current, [key]: next }))
  }

  return (
    <div className="flex min-h-[calc(90vh-6.5rem)] flex-col justify-between gap-4 py-1">
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-xl border border-[#dfe3e8] bg-[#fbfdff] p-3">
          <TheSvgIcon
            label={value.label || value.name || 'link'}
            slug={value.icon}
            className="size-12 shrink-0 rounded-xl border border-[#dfe3e8] bg-white"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-[#09090b]">{value.label || value.name || 'Preview ลิงก์'}</p>
            <p className="mt-0.5 truncate text-xs font-semibold text-[#647084]">{value.href || 'ใส่ลิงก์ที่ต้องการแสดงบนหน้า portfolio'}</p>
          </div>
        </div>

        <div className="grid items-start gap-4 lg:grid-cols-[1fr_320px]">
          <div className="grid content-start gap-3 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-xs font-bold text-[#647084]">ชื่อระบบ</span>
              <input
                value={value.name}
                onChange={(event) => update('name', event.target.value)}
                placeholder="github"
                className="h-10 w-full rounded-lg border border-[#dfe3e8] bg-white px-3 text-sm font-semibold text-[#09090b] outline-none transition focus:border-[#409EFE] focus:ring-4 focus:ring-[#409EFE]/10"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-bold text-[#647084]">ชื่อที่แสดง</span>
              <input
                value={value.label}
                onChange={(event) => update('label', event.target.value)}
                placeholder="GitHub"
                className="h-10 w-full rounded-lg border border-[#dfe3e8] bg-white px-3 text-sm font-semibold text-[#09090b] outline-none transition focus:border-[#409EFE] focus:ring-4 focus:ring-[#409EFE]/10"
              />
            </label>
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-xs font-bold text-[#647084]">ลิงก์</span>
              <input
                value={value.href}
                onChange={(event) => update('href', event.target.value)}
                placeholder="https://github.com/centered101"
                className="h-10 w-full rounded-lg border border-[#dfe3e8] bg-white px-3 text-sm font-semibold text-[#09090b] outline-none transition focus:border-[#409EFE] focus:ring-4 focus:ring-[#409EFE]/10"
              />
            </label>
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-xs font-bold text-[#647084]">Slug ไอคอน thesvg</span>
              <div className="flex items-center gap-2">
                <TheSvgIcon
                  label={value.label || value.name || 'link'}
                  slug={value.icon}
                  className="size-10 shrink-0 rounded-md !border-[#dfe3e8] !bg-white"
                />
            <input
              value={parsedIcon.slug ?? ''}
              onChange={(event) => update('icon', buildIconValue(event.target.value, parsedIcon.variant))}
              placeholder="github, x, linkedin"
                  className="h-10 min-w-0 flex-1 rounded-lg border border-[#dfe3e8] bg-white px-3 text-sm font-semibold text-[#09090b] outline-none transition focus:border-[#409EFE] focus:ring-4 focus:ring-[#409EFE]/10"
            />
              </div>
            </label>
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-bold text-[#647084]">รูปแบบไอคอน</span>
            <div className="grid gap-2 sm:grid-cols-2">
              {ICON_VARIANTS.map((variant) => (
                <LinkIconVariantButton
                  key={variant}
                  slug={parsedIcon.slug}
                  label={value.label || value.name || 'link'}
                  option={variant}
                  selected={parsedIcon.variant === variant}
                  onSelect={() => update('icon', buildIconValue(parsedIcon.slug ?? '', variant))}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e5e7eb] pt-3">
        <div>
          {onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              className="flex h-9 items-center gap-1.5 rounded-md border border-[#fecaca] bg-[#fff7f7] px-3 text-xs font-bold text-[#ef4444] transition hover:border-[#ef4444]/40 hover:bg-[#fee2e2]"
            >
              <Trash2 className="size-3.5" /> ลบลิงก์
            </button>
          ) : null}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex h-9 items-center gap-1.5 rounded-md border border-[#dfe3e8] bg-white px-3 text-xs font-bold text-[#647084] transition hover:border-[#409EFE]/40 hover:text-[#409EFE]"
          >
            <X className="size-3.5" /> ยกเลิก
          </button>
          <button
            type="button"
            onClick={() => onSave(value)}
            disabled={saving || !value.href.trim()}
            className="flex h-9 items-center gap-1.5 rounded-md border border-[#409EFE] bg-[#409EFE] px-4 text-xs font-bold text-white transition hover:bg-[#60aeff] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Check className="size-4" />
            บันทึก
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
  const { data: messagesData } = useAdminApi<{ messages: ContactMessage[] }>('/api/admin/contacts')

  useAdminRealtime(['social_links'], refetchLinks)

  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingOrder, setSavingOrder] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [orderedLinks, setOrderedLinks] = useState<SocialLink[]>([])
  const [orderDirty, setOrderDirty] = useState(false)

  const serverLinks = linksData?.links
  const links = serverLinks ?? []
  const activeLinks = orderedLinks.filter((link) => link.is_active)
  const messages = messagesData?.messages ?? []
  const editingLink = editingId ? orderedLinks.find((link) => link.id === editingId) : null

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
      setModalOpen(false)
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
      setModalOpen(false)
      setAdding(false)
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
              <button
                type="button"
                onClick={() => {
                  setEditingId(null)
                  setAdding(true)
                  setModalOpen(true)
                }}
                className="flex h-9 items-center gap-2 rounded-md border border-accent bg-accent px-3 text-xs font-bold text-accent-foreground transition hover:bg-accent/90"
              >
                <Plus className="size-4" />
                เพิ่มลิงก์
              </button>
            </div>
          </div>

          <div className="space-y-3 p-5">
            {orderedLinks.length === 0 ? (
              <AdminEmpty title="ยังไม่มีช่องทางติดต่อ" description="เพิ่มลิงก์แรกเพื่อแสดงในหน้า portfolio" />
            ) : (
              orderedLinks.map((link, index) => (
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
                        onClick={() => {
                          setAdding(false)
                          setEditingId(link.id)
                          setModalOpen(true)
                        }}
                        className="grid size-8 place-items-center rounded-md border border-border bg-card text-muted-foreground transition hover:border-accent/40 hover:text-accent"
                        aria-label="แก้ไข"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                    </div>
                  </div>
              ))
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
        </aside>
      </div>

      <Dialog
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open)
          if (!open) {
            setAdding(false)
            setEditingId(null)
          }
        }}
      >
        <DialogContent
          aria-describedby={undefined}
          className="flex h-[90vh] max-h-[90vh] flex-col overflow-hidden !border-[#dfe3e8] !bg-white !p-6 !text-[#090c13] shadow-[0_24px_80px_-48px_rgba(64,158,254,0.65)] sm:max-w-3xl [&_label]:!text-[#647084] [&_input]:!border-[#dfe3e8] [&_input]:!bg-white [&_input]:!text-[#090c13] [&_input::placeholder]:!text-[#9aa2ad] [&_select]:!border-[#dfe3e8] [&_select]:!bg-white [&_select]:!text-[#090c13]"
        >
          <DialogHeader>
            <DialogTitle className="!text-[#090c13]">
              {editingLink ? 'แก้ไขลิงก์' : 'เพิ่มลิงก์ใหม่'}
            </DialogTitle>
          </DialogHeader>
          <LinkEditor
            key={editingLink?.id ?? (adding ? 'adding' : 'blank')}
            initial={
              editingLink
                ? {
                    name: editingLink.name,
                    label: editingLink.label,
                    href: editingLink.href,
                    icon: editingLink.icon,
                    is_active: editingLink.is_active,
                    sort_order: editingLink.sort_order,
                  }
                : BLANK_LINK
            }
            saving={saving}
            onCancel={() => {
              setModalOpen(false)
              setAdding(false)
              setEditingId(null)
            }}
            onSave={(value) => saveLink(editingLink ? { ...value, id: editingLink.id } : value)}
            onDelete={editingLink ? () => deleteLink(editingLink.id) : undefined}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
