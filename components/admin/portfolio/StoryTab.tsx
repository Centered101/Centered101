'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  ArrowDown,
  ArrowUp,
  Award,
  BookOpen,
  Briefcase,
  Building2,
  Check,
  ChevronDown,
  Code,
  Github,
  Globe2,
  GraduationCap,
  Lightbulb,
  Pencil,
  Plus,
  Rocket,
  Terminal,
  Trash2,
  X,
  Zap,
} from 'lucide-react'
import { AdminLoading, AdminError, AdminEmpty } from '@/components/admin/AdminStates'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAdminApi } from '@/lib/hooks/useAdminApi'
import { useAdminAuth } from '@/components/admin/AdminAuthProvider'
import { useAdminRealtime } from '@/lib/hooks/useAdminRealtime'
import { cn } from '@/lib/utils'

type Entry = {
  id: string; year: string; title: string; title_th: string | null
  description: string | null; description_th: string | null
  type: string; icon: string | null; sort_order: number
}

const BLANK: Omit<Entry, 'id'> = {
  year: String(new Date().getFullYear()), title: '', title_th: '',
  description: '', description_th: '', type: 'achievement', icon: '', sort_order: 0,
}

const TYPE_COLORS: Record<string, string> = {
  achievement: '#22C55E', education: '#409EFE', work: '#A855F7',
  project: '#F59E0B', milestone: '#EC4899',
}

const TYPE_LABELS: Record<string, string> = {
  achievement: 'ความสำเร็จ',
  education: 'การเรียนรู้',
  work: 'งาน',
  project: 'โปรเจกต์',
  milestone: 'หมุดหมาย',
}

const STORY_ICONS = {
  award: Award,
  'book-open': BookOpen,
  book: BookOpen,
  briefcase: Briefcase,
  building: Building2,
  code: Code,
  github: Github,
  globe: Globe2,
  graduation: GraduationCap,
  lightbulb: Lightbulb,
  rocket: Rocket,
  terminal: Terminal,
  zap: Zap,
} as const

const ICON_EXAMPLES = ['award', 'building', 'rocket', 'globe', 'github', 'terminal', 'lightbulb', 'book-open'] as const

function sortStoryItems(items: Entry[]) {
  return [...items].sort((a, b) => a.sort_order - b.sort_order || Number(b.year) - Number(a.year))
}

function StoryIconPreview({ icon, type, className = 'size-3.5' }: { icon: string | null; type: string; className?: string }) {
  // Each branch renders one of a fixed set of already-declared icon
  // components directly, rather than selecting one through a function call
  // and rendering the result — the latter reads to the compiler as "a
  // component created during render" even though every branch here is
  // actually a stable, module-level component.
  if (icon && icon in STORY_ICONS) {
    const Icon = STORY_ICONS[icon as keyof typeof STORY_ICONS]
    return <Icon className={className} />
  }
  if (type === 'education') return <GraduationCap className={className} />
  if (type === 'achievement') return <Award className={className} />
  return <Briefcase className={className} />
}

function EntryForm({
  initial, onSave, onCancel, onDelete, saving,
}: { initial: typeof BLANK; onSave: (v: typeof BLANK) => void; onCancel: () => void; onDelete?: () => void; saving: boolean }) {
  const [v, setV] = useState(initial)
  const [typeOpen, setTypeOpen] = useState(false)
  const set = (k: keyof typeof BLANK) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setV({ ...v, [k]: e.target.value })
  const typeOptions = Object.keys(TYPE_COLORS)

  return (
    <div className="space-y-4 bg-white">
      <div className="mx-6 flex items-center gap-3 rounded-lg border border-[#dfe3e8] bg-[#fbfdff] p-3">
        <span
          className="grid size-11 shrink-0 place-items-center rounded-xl border"
          style={{ borderColor: `${TYPE_COLORS[v.type] ?? TYPE_COLORS.achievement}33`, backgroundColor: `${TYPE_COLORS[v.type] ?? TYPE_COLORS.achievement}12`, color: TYPE_COLORS[v.type] ?? TYPE_COLORS.achievement }}
        >
          <StoryIconPreview icon={v.icon} type={v.type} className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-[#09090b]">{v.title || 'Preview หมุดหมาย'}</p>
          <p className="text-xs font-semibold text-[#647084]">{v.year || 'ปี'} · {TYPE_LABELS[v.type] ?? v.type}</p>
        </div>
      </div>

      <div className="px-6">
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#647084]">หัวข้อ (EN) *</label>
              <input value={v.title} onChange={set('title')} placeholder="Started learning TypeScript"
                className="h-9 w-full rounded-md border border-[#dfe3e8] bg-white px-3 text-sm font-semibold text-[#09090b] outline-none focus:border-[#409EFE] focus:ring-1 focus:ring-[#409EFE]/30" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#647084]">หัวข้อ (TH)</label>
              <input value={v.title_th ?? ''} onChange={set('title_th')} placeholder="เริ่มเรียน TypeScript"
                className="h-9 w-full rounded-md border border-[#dfe3e8] bg-white px-3 text-sm font-semibold text-[#09090b] outline-none focus:border-[#409EFE] focus:ring-1 focus:ring-[#409EFE]/30" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#647084]">คำอธิบาย (EN)</label>
              <textarea value={v.description ?? ''} onChange={set('description')} rows={2} placeholder="Short description..."
                className="w-full resize-none rounded-md border border-[#dfe3e8] bg-white px-3 py-2 text-sm text-[#09090b] outline-none focus:border-[#409EFE] focus:ring-1 focus:ring-[#409EFE]/30" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#647084]">คำอธิบาย (TH)</label>
              <textarea value={v.description_th ?? ''} onChange={set('description_th')} rows={2} placeholder="คำอธิบาย..."
                className="w-full resize-none rounded-md border border-[#dfe3e8] bg-white px-3 py-2 text-sm text-[#09090b] outline-none focus:border-[#409EFE] focus:ring-1 focus:ring-[#409EFE]/30" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-[96px_1fr] lg:grid-cols-[96px_1fr_1.45fr]">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#647084]">ปี</label>
              <input value={v.year} onChange={set('year')} placeholder="2024"
                className="h-9 w-full rounded-md border border-[#dfe3e8] bg-white px-3 text-sm font-semibold text-[#09090b] outline-none focus:border-[#409EFE] focus:ring-1 focus:ring-[#409EFE]/30" />
            </div>
            <label className="relative space-y-1">
              <span className="text-xs font-bold text-[#647084]">ประเภท</span>
              <div className="relative">
                <input
                  value={TYPE_LABELS[v.type] ?? v.type}
                  readOnly
                  onFocus={() => setTypeOpen(true)}
                  onBlur={() => window.setTimeout(() => setTypeOpen(false), 120)}
                  placeholder="เลือกประเภท"
                  className="h-9 w-full cursor-pointer rounded-md border border-[#dfe3e8] bg-white px-3 pr-9 text-sm font-semibold text-[#09090b] outline-none transition placeholder:text-[#94a3b8] focus:border-[#409EFE] focus:ring-4 focus:ring-[#409EFE]/10"
                />
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setTypeOpen((open) => !open)}
                  className="absolute inset-y-0 right-0 grid w-9 place-items-center text-[#647084] transition hover:text-[#409EFE]"
                  aria-label="เปิดรายการประเภท"
                >
                  <ChevronDown className={cn('size-4 transition-transform', typeOpen && 'rotate-180')} />
                </button>
              </div>
              {typeOpen ? (
                <div className="absolute left-0 right-0 top-[3.9rem] z-50 overflow-hidden rounded-lg border border-[#dfe3e8] bg-white p-1 shadow-[0_18px_48px_-28px_rgba(15,23,42,0.35)]">
                  <div className="max-h-56 overflow-y-auto">
                    {typeOptions.map((type) => {
                      const active = type === v.type
                      return (
                        <button
                          key={type}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setV({ ...v, type })
                            setTypeOpen(false)
                          }}
                          className={cn(
                            'flex h-9 w-full items-center justify-between rounded-md px-3 text-left text-sm font-bold transition',
                            active
                              ? 'bg-[#409EFE]/10 text-[#409EFE]'
                              : 'text-[#475569] hover:bg-[#f1f7ff] hover:text-[#09090b]',
                          )}
                        >
                          <span>{TYPE_LABELS[type] ?? type}</span>
                          {active ? <span className="size-1.5 rounded-full bg-[#409EFE]" /> : null}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : null}
            </label>
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#647084]">ไอคอน</label>
              <div className="flex items-center gap-2">
                <span
                  className="grid size-9 shrink-0 place-items-center rounded-md border border-[#dfe3e8] bg-white"
                  style={{ color: TYPE_COLORS[v.type] ?? TYPE_COLORS.achievement }}
                >
                  <StoryIconPreview icon={v.icon} type={v.type} />
                </span>
                <input value={v.icon ?? ''} onChange={set('icon')} placeholder="rocket"
                  className="h-9 min-w-0 flex-1 rounded-md border border-[#dfe3e8] bg-white px-3 text-sm font-semibold text-[#09090b] outline-none focus:border-[#409EFE] focus:ring-1 focus:ring-[#409EFE]/30" />
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {ICON_EXAMPLES.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setV({ ...v, icon: name })}
                    className={`grid size-8 place-items-center rounded-md border transition hover:border-[#409EFE]/40 hover:bg-[#409EFE]/10 ${
                      v.icon === name ? 'border-[#409EFE] bg-[#409EFE]/10 text-[#409EFE]' : 'border-[#dfe3e8] bg-white text-[#647084]'
                    }`}
                    title={name}
                  >
                    <StoryIconPreview icon={name} type={v.type} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 z-10 mt-2 flex w-full flex-wrap items-center justify-between gap-2 border-t border-[#e5e7eb] bg-white px-6 py-3">
        <div>
          {onDelete ? (
            <button onClick={onDelete}
              className="flex h-9 items-center gap-1.5 rounded-md border border-[#fecaca] bg-[#fff7f7] px-3 text-xs font-bold text-[#ef4444] transition hover:border-[#ef4444]/40 hover:bg-[#fee2e2]">
              <Trash2 className="size-3.5" /> ลบหมุดหมาย
            </button>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onCancel}
            className="flex h-9 items-center gap-1.5 rounded-md border border-[#dfe3e8] bg-white px-3 text-xs font-bold text-[#647084] transition hover:border-[#409EFE]/40 hover:text-[#409EFE]">
            <X className="size-3.5" /> ยกเลิก
          </button>
          <button onClick={() => onSave(v)} disabled={saving || !v.title.trim()}
            className="flex h-9 items-center gap-1.5 rounded-md border border-[#409EFE] bg-[#409EFE] px-4 text-xs font-bold text-white transition hover:bg-[#60aeff] disabled:opacity-40">
            <Check className="size-3.5" /> บันทึก
          </button>
        </div>
      </div>
    </div>
  )
}

export function StoryTab() {
  const { getAdminHeaders } = useAdminAuth()
  const { data, loading, error, refetch } = useAdminApi<{ story: Entry[] }>('/api/admin/portfolio/story')
  useAdminRealtime(['learning_story'], refetch)

  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [orderedStory, setOrderedStory] = useState<Entry[]>([])
  const [orderDirty, setOrderDirty] = useState(false)
  const [savingOrder, setSavingOrder] = useState(false)

  const story = useMemo(() => data?.story ?? [], [data?.story])
  const sortedStory = orderDirty ? orderedStory : sortStoryItems(story)
  const newest = sortedStory[0]
  const typeCounts = sortedStory.reduce<Record<string, number>>((acc, item) => {
    acc[item.type] = (acc[item.type] ?? 0) + 1
    return acc
  }, {})
  const editingEntry = editing ? story.find((item) => item.id === editing) : null

  useEffect(() => {
    if (!orderDirty) void Promise.resolve().then(() => setOrderedStory(sortStoryItems(data?.story ?? [])))
  }, [data?.story, orderDirty])

  function openAdd() {
    setEditing(null)
    setAdding(true)
    setModalOpen(true)
  }

  function openEdit(entry: Entry) {
    setAdding(false)
    setEditing(entry.id)
    setModalOpen(true)
  }

  async function save(payload: typeof BLANK & { id?: string }) {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/portfolio/story', {
        method: 'POST',
        headers: { ...getAdminHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success(payload.id ? 'อัปเดตหมุดหมายแล้ว' : 'เพิ่มหมุดหมายแล้ว')
      setAdding(false)
      setEditing(null)
      setModalOpen(false)
      refetch()
    } catch (e) {
      toast.error((e as Error).message)
    } finally { setSaving(false) }
  }

  async function del(id: string) {
    if (!confirm('ลบรายการนี้ใช่ไหม?')) return
    const res = await fetch(`/api/admin/portfolio/story?id=${id}`, { method: 'DELETE', headers: getAdminHeaders() })
    if (!res.ok) toast.error((await res.json()).error)
    else {
      toast.success('ลบแล้ว')
      setModalOpen(false)
      setAdding(false)
      setEditing(null)
      refetch()
    }
  }

  function moveStory(index: number, direction: -1 | 1) {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= sortedStory.length) return
    const next = [...sortedStory]
    const item = next[index]
    const target = next[nextIndex]
    if (!item || !target) return
    next[index] = target
    next[nextIndex] = item
    setOrderedStory(next.map((entry, entryIndex) => ({ ...entry, sort_order: (entryIndex + 1) * 100 })))
    setOrderDirty(true)
  }

  async function saveOrder() {
    setSavingOrder(true)
    try {
      const res = await fetch('/api/admin/portfolio/story', {
        method: 'PATCH',
        headers: { ...getAdminHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: sortedStory.map((entry, index) => ({ id: entry.id, sort_order: (index + 1) * 100 })),
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('บันทึกลำดับหมุดหมายแล้ว')
      setOrderDirty(false)
      refetch()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSavingOrder(false)
    }
  }

  if (loading) return <AdminLoading message="กำลังโหลดเส้นทางการเรียนรู้..." />
  if (error) return <AdminError error={error} onRetry={refetch} />

  return (
    <div className="space-y-3 sm:space-y-6 sm:p-6">
      <div className="space-y-3 sm:space-y-5">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-[#dfe3e8] bg-white p-4">
              <p className="text-xs font-bold text-[#647084]">หมุดหมายทั้งหมด</p>
              <p className="mt-2 text-2xl font-black text-[#09090b]">{story.length}</p>
            </div>
            <div className="rounded-xl border border-[#dfe3e8] bg-white p-4">
              <p className="text-xs font-bold text-[#647084]">ปีล่าสุด</p>
              <p className="mt-2 text-2xl font-black text-[#09090b]">{newest?.year ?? '-'}</p>
            </div>
            <div className="rounded-xl border border-[#dfe3e8] bg-white p-4">
              <p className="text-xs font-bold text-[#647084]">ประเภท</p>
              <p className="mt-2 text-2xl font-black text-[#09090b]">{Object.keys(typeCounts).length}</p>
            </div>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-[#dfe3e8] bg-[#fbfdff] px-3 py-3 sm:px-4">
            <div className="min-w-0">
              <p className="text-sm font-black text-[#09090b]">จัดการ timeline หน้า portfolio</p>
              <p className="mt-0.5 truncate text-xs text-[#647084]">เพิ่ม แก้ไข และจัดรายละเอียดของหมุดหมายแต่ละปี</p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {orderDirty && (
                <>
                  <button
                    onClick={() => {
                      setOrderedStory(sortStoryItems(story))
                      setOrderDirty(false)
                    }}
                    className="flex h-9 min-w-28 items-center justify-center rounded-lg border border-[#dfe3e8] bg-white px-3 text-xs font-bold text-[#647084] transition hover:border-[#409EFE]/40 hover:text-[#409EFE]"
                  >
                    ยกเลิกการจัด
                  </button>
                  <button
                    onClick={saveOrder}
                    disabled={savingOrder}
                    className="flex h-9 min-w-28 items-center justify-center gap-1.5 rounded-lg bg-[#409EFE] px-3 text-xs font-bold text-white transition hover:bg-[#60aeff] disabled:opacity-50"
                  >
                    <Check className="size-3.5" /> บันทึกลำดับ
                  </button>
                </>
              )}
              <button
                onClick={openAdd}
                className="flex h-9 min-w-32 items-center justify-center gap-1.5 rounded-lg bg-[#409EFE] px-3 text-xs font-bold text-white transition hover:bg-[#60aeff]"
              >
                <Plus className="size-3.5" /> เพิ่มหมุดหมาย
              </button>
            </div>
          </div>

          {story.length === 0 && (
            <AdminEmpty title="ยังไม่มีรายการ" description="เพิ่มหมุดหมายแรกของเส้นทางการเรียนรู้" />
          )}

          {sortedStory.length > 0 && (
            <div className="relative overflow-hidden rounded-xl border border-[#dfe3e8] bg-white">
              <div className="border-b border-[#eef1f4] px-3 py-3 sm:px-5 sm:py-4">
                <h3 className="text-sm font-black text-[#09090b]">Timeline Preview</h3>
                <p className="mt-0.5 text-xs text-[#647084]">เรียงตามปีล่าสุดก่อน เหมือนมุมมองสำหรับจัดการ</p>
              </div>
              <div className="relative p-3 sm:p-5">
                <div className="absolute bottom-3 left-[1.65rem] top-3 w-px bg-gradient-to-b from-[#409EFE]/10 via-[#409EFE]/35 to-[#409EFE]/10 sm:bottom-5 sm:left-[2.05rem] sm:top-5" />
                <div className="space-y-3 sm:space-y-4">
          {sortedStory.map((e, index) => (
              <div key={e.id} className="group relative pl-8 sm:pl-10">
                <div
                  className="absolute left-0 top-4 z-10 flex size-7 shrink-0 items-center justify-center rounded-lg border bg-white text-xs sm:size-8 sm:rounded-xl sm:text-sm"
                  style={{ borderColor: `${TYPE_COLORS[e.type] ?? '#52525b'}33`, backgroundColor: `${TYPE_COLORS[e.type] ?? '#52525b'}12`, color: TYPE_COLORS[e.type] ?? '#52525b' }}
                >
                  <StoryIconPreview icon={e.icon} type={e.type} />
                </div>
                <div className="min-w-0 rounded-xl border border-[#dfe3e8] bg-[#fbfdff] p-3 transition-colors hover:border-[#409EFE]/35 sm:p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-black text-[#09090b]">{e.title}</span>
                        <span className="rounded-md px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: `${TYPE_COLORS[e.type] ?? '#52525b'}18`, color: TYPE_COLORS[e.type] ?? '#52525b' }}>
                          {TYPE_LABELS[e.type] ?? e.type}
                        </span>
                        <span className="font-mono text-xs font-black text-[#09090b]">{e.year}</span>
                      </div>
                      {e.title_th && <p className="mt-1 text-xs font-semibold text-[#647084]">{e.title_th}</p>}
                    </div>
                    <div className="ml-auto flex w-full shrink-0 flex-wrap items-center justify-end gap-1 sm:w-auto">
                      <button
                        onClick={() => moveStory(index, -1)}
                        disabled={index === 0}
                        className="grid size-8 place-items-center rounded-md border border-[#dfe3e8] bg-white text-[#647084] transition hover:border-[#409EFE]/40 hover:text-[#409EFE] disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        <ArrowUp className="size-3.5" />
                      </button>
                      <button
                        onClick={() => moveStory(index, 1)}
                        disabled={index === sortedStory.length - 1}
                        className="grid size-8 place-items-center rounded-md border border-[#dfe3e8] bg-white text-[#647084] transition hover:border-[#409EFE]/40 hover:text-[#409EFE] disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        <ArrowDown className="size-3.5" />
                      </button>
                      <button onClick={() => openEdit(e)} className="grid size-8 place-items-center rounded-md border border-[#dfe3e8] bg-white text-[#647084] transition hover:border-[#409EFE]/40 hover:text-[#409EFE]"><Pencil className="size-3.5" /></button>
                    </div>
                  </div>
                  {e.description && <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[#647084]">{e.description}</p>}
                  {e.description_th && <p className="mt-1 line-clamp-1 text-[11px] leading-relaxed text-[#94a3b8]">{e.description_th}</p>}
                </div>
              </div>
          ))}
                </div>
              </div>
            </div>
          )}
      </div>

      <Dialog
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open)
          if (!open) {
            setAdding(false)
            setEditing(null)
          }
        }}
      >
        <DialogContent
          aria-describedby={undefined}
          className="max-h-[90vh] overflow-y-auto !border-[#dfe3e8] !bg-white !p-0 !text-[#090c13] shadow-[0_24px_80px_-48px_rgba(64,158,254,0.65)] sm:max-w-3xl [&_label]:!text-[#647084] [&_input]:!border-[#dfe3e8] [&_input]:!bg-white [&_input]:!text-[#090c13] [&_input::placeholder]:!text-[#9aa2ad] [&_select]:!border-[#dfe3e8] [&_select]:!bg-white [&_select]:!text-[#090c13] [&_textarea]:!border-[#dfe3e8] [&_textarea]:!bg-white [&_textarea]:!text-[#090c13] [&_textarea::placeholder]:!text-[#9aa2ad]"
        >
          <DialogHeader className="sticky top-0 z-10 border-b border-[#e5e7eb] bg-white px-6 py-4">
            <DialogTitle className="text-center !text-[#090c13]">
              {editingEntry ? 'แก้ไขหมุดหมาย' : 'เพิ่มหมุดหมายใหม่'}
            </DialogTitle>
          </DialogHeader>
          <EntryForm
            key={editingEntry?.id ?? (adding ? 'adding' : 'blank')}
            initial={
              editingEntry
                ? {
                    year: editingEntry.year,
                    title: editingEntry.title,
                    title_th: editingEntry.title_th ?? '',
                    description: editingEntry.description ?? '',
                    description_th: editingEntry.description_th ?? '',
                    type: editingEntry.type,
                    icon: editingEntry.icon ?? '',
                    sort_order: editingEntry.sort_order,
                  }
                : BLANK
            }
            onSave={(value) => save(editingEntry ? { ...value, id: editingEntry.id } : value)}
            onDelete={editingEntry ? () => del(editingEntry.id) : undefined}
            onCancel={() => {
              setModalOpen(false)
              setAdding(false)
              setEditing(null)
            }}
            saving={saving}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
