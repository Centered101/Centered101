'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  ArrowDown,
  ArrowUp,
  Brush,
  Check,
  ChevronDown,
  Cloud,
  Code2,
  Database,
  Gamepad2,
  Layers,
  Loader2,
  MonitorCog,
  Pencil,
  Plus,
  Save,
  TerminalSquare,
  Trash2,
  Wrench,
  X,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AdminLoading, AdminError, AdminEmpty } from '@/components/admin/AdminStates'
import { AdminPageSection } from '@/components/admin/AdminPage'
import { useAdminApi } from '@/lib/hooks/useAdminApi'
import { useAdminAuth } from '@/components/admin/AdminAuthProvider'
import { useAdminRealtime } from '@/lib/hooks/useAdminRealtime'
import { cn } from '@/lib/utils'
import { TheSvgIcon, parseIconValue, buildIconValue, iconUrl, ICON_VARIANTS, type IconVariant } from '@/components/the-svg-icon'
import {
  comparePortfolioToolGroups,
  getPortfolioToolGroup,
  PORTFOLIO_TOOL_PRIMARY_GROUPS,
} from '@/lib/portfolio/tool-groups'

type Tool = { id: string; name: string; category: string; icon: string | null; sort_order: number }
type ToolDraft = Omit<Tool, 'id'>

const BLANK: ToolDraft = { name: '', category: '', icon: '', sort_order: 0 }

const TOOL_CATEGORIES = PORTFOLIO_TOOL_PRIMARY_GROUPS

const CATEGORY_META: Record<string, { label: string; description: string; accent: string; icon: React.ElementType }> = {
  Language: { label: 'ภาษา', description: 'ภาษาเขียนโค้ดหลัก', accent: '#409EFE', icon: Code2 },
  Library: { label: 'ไลบรารี', description: 'เครื่องมือช่วยพัฒนา UI/logic', accent: '#8B5CF6', icon: Layers },
  Editor: { label: 'Editor', description: 'เครื่องมือเขียนงานประจำ', accent: '#64748B', icon: MonitorCog },
  Design: { label: 'ดีไซน์', description: 'งานออกแบบและสื่อ', accent: '#F43F5E', icon: Brush },
  Gaming: { label: 'เกมและเอนจิน', description: 'เครื่องมือสายเกม/ทดลอง', accent: '#22C55E', icon: Gamepad2 },
  Software: { label: 'ซอฟต์แวร์', description: 'แอปและยูทิลิตี้ที่ใช้', accent: '#F97316', icon: Wrench },
  Cloud: { label: 'คลาวด์', description: 'โฮสติ้งและแพลตฟอร์ม', accent: '#06B6D4', icon: Cloud },
  Database: { label: 'ฐานข้อมูล', description: 'ฐานข้อมูลและ backend data', accent: '#10B981', icon: Database },
  AI: { label: 'AI', description: 'โมเดลและเครื่องมือ AI', accent: '#8B5CF6', icon: MonitorCog },
  Frontend: { label: 'Frontend', description: 'เครื่องมือฝั่งหน้าเว็บ', accent: '#409EFE', icon: Layers },
  Backend: { label: 'Backend', description: 'เครื่องมือฝั่งระบบ', accent: '#22C55E', icon: TerminalSquare },
  Tools: { label: 'อื่น ๆ', description: 'เครื่องมือทั่วไป', accent: '#64748B', icon: Wrench },
}

function getCategoryMeta(category: string) {
  return CATEGORY_META[category] ?? {
    label: category,
    description: 'หมวดหมู่ที่กำหนดเอง',
    accent: '#409EFE',
    icon: Wrench,
  }
}

function ToolIcon({ tool, className }: { tool: Pick<Tool, 'name' | 'icon'>; className?: string }) {
  const { slug, variant } = parseIconValue(tool.icon)
  return (
    <TheSvgIcon
      label={tool.name}
      slug={slug}
      variant={variant}
      className={cn('size-9 rounded-lg !border-[#dfe3e8] !bg-white [&_img]:size-5', className)}
    />
  )
}

function IconVariantOption({
  slug,
  label,
  option,
  selected,
  onSelect,
  onSupported,
}: {
  slug: string
  label: string
  option: IconVariant
  selected: boolean
  onSelect: () => void
  onSupported: (option: IconVariant) => void
}) {
  const [unsupported, setUnsupported] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const needsDarkPreview = option === 'dark' || option === 'wordmark' || option === 'wm-dark'
  const labelMap: Record<IconVariant, string> = {
    default: 'Default',
    mono: 'Mono',
    light: 'Light',
    dark: 'Dark',
    wordmark: 'Wordmark',
    'wm-light': 'WM Light',
    'wm-dark': 'WM Dark',
  }

  useEffect(() => {
    let cancelled = false
    setUnsupported(false)
    setLoaded(false)

    async function checkVariant() {
      try {
        const currentRes = await fetch(iconUrl(slug, option), { cache: 'force-cache' })
        if (!currentRes.ok) {
          if (!cancelled) setUnsupported(true)
          return
        }

        if (option === 'default') return

        const [currentSvg, defaultSvg] = await Promise.all([
          currentRes.text(),
          fetch(iconUrl(slug, 'default'), { cache: 'force-cache' }).then((res) => (res.ok ? res.text() : '')),
        ])
        const normalize = (text: string) => text.replace(/\s+/g, '').replace(/id="[^"]+"/g, '')
        if (defaultSvg && normalize(currentSvg) === normalize(defaultSvg)) {
          if (!cancelled) setUnsupported(true)
        }
      } catch {
        // If fetch is blocked by the browser/CORS, the image load/error handlers
        // below still decide whether this variant can be shown.
      }
    }

    checkVariant()

    return () => {
      cancelled = true
    }
  }, [slug, option])

  if (unsupported) return null

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition',
        !loaded && 'hidden',
        selected
          ? 'border-[#409EFE] bg-[#409EFE]/10 text-[#409EFE] ring-2 ring-[#409EFE]/15'
          : 'border-[#dfe3e8] bg-white text-[#647084] hover:border-[#409EFE]/40',
      )}
    >
      <span
        className={cn(
          'grid size-9 place-items-center rounded-lg border',
          needsDarkPreview
            ? 'border-[#27272a] bg-[#09090b]'
            : 'border-[#dfe3e8] bg-white',
        )}
      >
        <img
          key={`${slug}-${option}`}
          src={iconUrl(slug, option)}
          alt=""
          className="size-5"
          onLoad={() => {
            setLoaded(true)
            onSupported(option)
          }}
          onError={() => setUnsupported(true)}
        />
      </span>
      <span className="text-xs font-bold">{labelMap[option] ?? label}</span>
    </button>
  )
}

function ToolForm({
  initial,
  onSave,
  onCancel,
  onDelete,
  saving,
  categories = [],
}: {
  initial: ToolDraft
  onSave: (v: ToolDraft) => void
  onCancel: () => void
  onDelete?: () => void
  saving: boolean
  categories?: string[]
}) {
  const [v, setV] = useState(initial)
  const [categoryOpen, setCategoryOpen] = useState(false)
  const { slug, variant } = parseIconValue(v.icon)
  const [supportedVariants, setSupportedVariants] = useState<IconVariant[]>([])
  const setIcon = (nextSlug: string, nextVariant: IconVariant) =>
    setV({ ...v, icon: buildIconValue(nextSlug, nextVariant) })
  const categoryOptions = Array.from(new Set([...TOOL_CATEGORIES, ...categories, v.category].filter(Boolean)))
  const filteredCategoryOptions = categoryOptions.filter((category) =>
    category.toLowerCase().includes(v.category.trim().toLowerCase()),
  )

  useEffect(() => {
    setSupportedVariants([])
  }, [slug])

  useEffect(() => {
    if (!slug || supportedVariants.length === 0 || supportedVariants.includes(variant)) return
    setIcon(slug, supportedVariants[0])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, variant, supportedVariants])

  function markVariantSupported(option: IconVariant) {
    setSupportedVariants((current) => (current.includes(option) ? current : [...current, option]))
  }
  const previewIcon = slug
    ? buildIconValue(slug, supportedVariants.includes(variant) ? variant : (supportedVariants[0] ?? variant))
    : v.icon

  return (
    <div className="flex min-h-[calc(90vh-6.5rem)] flex-col justify-between gap-4 py-1">
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-xl border border-[#dfe3e8] bg-[#fbfdff] p-3">
          <ToolIcon tool={{ name: v.name || 'Preview', icon: previewIcon }} className="size-12 rounded-xl" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-[#09090b]">{v.name || 'Preview เครื่องมือ'}</p>
            <p className="text-xs font-semibold text-[#647084]">
              {v.category || getPortfolioToolGroup({ name: v.name })} · จัดลำดับจากปุ่มขึ้น/ลงในรายการ
            </p>
          </div>
        </div>

        <div className="grid items-start gap-4 lg:grid-cols-[1fr_320px]">
          <div className="grid content-start gap-3 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-xs font-bold text-[#647084]">ชื่อเครื่องมือ *</span>
              <input
                value={v.name}
                onChange={(e) => setV({ ...v, name: e.target.value })}
                placeholder="TypeScript"
                className="h-10 w-full rounded-lg border border-[#dfe3e8] bg-white px-3 text-sm font-semibold text-[#09090b] outline-none transition focus:border-[#409EFE] focus:ring-4 focus:ring-[#409EFE]/10"
              />
            </label>

            <label className="relative space-y-1.5">
              <span className="text-xs font-bold text-[#647084]">หมวดหมู่</span>
              <div className="relative">
                <input
                  value={v.category}
                  onFocus={() => setCategoryOpen(true)}
                  onBlur={() => window.setTimeout(() => setCategoryOpen(false), 120)}
                  onChange={(e) => {
                    setV({ ...v, category: e.target.value })
                    setCategoryOpen(true)
                  }}
                  placeholder="เลือกหรือพิมพ์หมวดหมู่"
                  className="h-10 w-full rounded-lg border border-[#dfe3e8] bg-white px-3 pr-10 text-sm font-semibold text-[#09090b] outline-none transition placeholder:text-[#94a3b8] focus:border-[#409EFE] focus:ring-4 focus:ring-[#409EFE]/10"
                />
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setCategoryOpen((open) => !open)}
                  className="absolute inset-y-0 right-0 grid w-10 place-items-center text-[#647084] transition hover:text-[#409EFE]"
                  aria-label="เปิดรายการหมวดหมู่"
                >
                  <ChevronDown className={cn('size-4 transition-transform', categoryOpen && 'rotate-180')} />
                </button>
              </div>
              {categoryOpen ? (
                <div className="absolute left-0 right-0 top-[4.35rem] z-50 overflow-hidden rounded-lg border border-[#dfe3e8] bg-white p-1 shadow-[0_18px_48px_-28px_rgba(15,23,42,0.35)]">
                  <div className="max-h-56 overflow-y-auto">
                    {(filteredCategoryOptions.length ? filteredCategoryOptions : categoryOptions).map((category) => {
                      const active = category === v.category
                      return (
                        <button
                          key={category}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setV({ ...v, category })
                            setCategoryOpen(false)
                          }}
                          className={cn(
                            'flex h-9 w-full items-center justify-between rounded-md px-3 text-left text-sm font-bold transition',
                            active
                              ? 'bg-[#409EFE]/10 text-[#409EFE]'
                              : 'text-[#475569] hover:bg-[#f1f7ff] hover:text-[#09090b]',
                          )}
                        >
                          <span>{category}</span>
                          {active ? <span className="size-1.5 rounded-full bg-[#409EFE]" /> : null}
                        </button>
                      )
                    })}
                    {v.category.trim() && !categoryOptions.includes(v.category.trim()) ? (
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setCategoryOpen(false)}
                        className="mt-1 flex h-9 w-full items-center rounded-md border border-dashed border-[#bae0ff] bg-[#f6fbff] px-3 text-left text-sm font-bold text-[#409EFE]"
                      >
                        ใช้หมวดใหม่ “{v.category.trim()}”
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </label>

            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-xs font-bold text-[#647084]">Slug ไอคอน thesvg</span>
              <input
                value={slug ?? ''}
                onChange={(e) => setIcon(e.target.value, variant)}
                placeholder="typescript"
                className="h-10 w-full rounded-lg border border-[#dfe3e8] bg-white px-3 text-sm font-semibold text-[#09090b] outline-none transition focus:border-[#409EFE] focus:ring-4 focus:ring-[#409EFE]/10"
              />
            </label>
          </div>

          <div className="min-h-[13.5rem] space-y-2">
            <p className="text-xs font-bold text-[#647084]">รูปแบบไอคอน</p>
            <div className="grid min-h-[11.5rem] content-start grid-cols-2 gap-2">
              {ICON_VARIANTS.map((opt) => {
                const selected = variant === opt
                return (
                  slug ? (
                    <IconVariantOption
                      key={opt}
                      slug={slug}
                      label={opt}
                      option={opt}
                      selected={selected}
                      onSelect={() => setIcon(slug, opt)}
                      onSupported={markVariantSupported}
                    />
                  ) : null
                )
              })}
              {!slug ? (
                <div className="col-span-2 rounded-lg border border-dashed border-[#dfe3e8] bg-[#fbfdff] px-3 py-4 text-center text-xs font-semibold text-[#94a3b8]">
                  ใส่ slug ไอคอนก่อนเพื่อดูรูปแบบที่รองรับ
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e5e7eb] pt-4">
        <div>
          {onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-[#fecaca] bg-white px-3 text-xs font-bold text-[#ef4444] transition hover:bg-[#fef2f2]"
            >
              <Trash2 className="size-3.5" /> ลบเครื่องมือ
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-[#dfe3e8] bg-white px-3 text-xs font-bold text-[#647084] transition hover:border-[#94a3b8] hover:text-[#09090b]"
          >
            <X className="size-3.5" /> ยกเลิก
          </button>
          <button
            type="button"
            onClick={() => onSave(v)}
            disabled={saving || !v.name.trim()}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-[#409EFE] px-3 text-xs font-bold text-white transition hover:bg-[#60aeff] disabled:opacity-50"
          >
            <Save className="size-3.5" /> บันทึก
          </button>
        </div>
      </div>
    </div>
  )
}

function CategoryCard({
  category,
  items,
  editing,
  movingId,
  onEdit,
  onMove,
}: {
  category: string
  items: Tool[]
  editing: string | null
  movingId: string | null
  onEdit: (id: string) => void
  onMove: (id: string, direction: -1 | 1) => void
}) {
  const meta = getCategoryMeta(category)
  const Icon = meta.icon

  return (
    <div className="flex min-h-[16.5rem] flex-col rounded-xl border border-[#dfe3e8] bg-white">
      <div className="flex items-start gap-3 border-b border-[#eef1f4] px-4 py-3">
        <span
          className="grid size-10 shrink-0 place-items-center rounded-xl border"
          style={{ borderColor: `${meta.accent}33`, backgroundColor: `${meta.accent}12`, color: meta.accent }}
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-black text-[#09090b]">{meta.label}</h3>
            <span className="rounded-md border border-[#dfe3e8] bg-[#f8fafc] px-2 py-0.5 text-[10px] font-bold text-[#647084]">
              {items.length} รายการ
            </span>
          </div>
          <p className="mt-0.5 text-xs text-[#647084]">{meta.description}</p>
        </div>
      </div>

      <div className="grid flex-1 content-start gap-2 p-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((tool, index) => (
          <div
            key={tool.id}
            className={cn(
              'group flex min-h-11 min-w-0 items-center gap-2 rounded-xl border bg-[#fbfdff] px-2.5 py-1.5 transition',
              editing === tool.id ? 'border-[#409EFE] bg-[#409EFE]/10 ring-2 ring-[#409EFE]/15' : 'border-[#dfe3e8] hover:border-[#409EFE]/40',
            )}
          >
            <ToolIcon tool={tool} />
            <div className="min-w-0">
              <p className="truncate text-xs font-black text-[#09090b]">{tool.name}</p>
              <p className="text-[10px] font-semibold text-[#94a3b8]">ลำดับ {tool.sort_order}</p>
            </div>
            <div className="ml-1 flex items-center gap-1 opacity-100 sm:opacity-0 sm:transition group-hover:opacity-100">
              <button
                type="button"
                onClick={() => onMove(tool.id, -1)}
                disabled={index === 0 || movingId === tool.id}
                className="grid size-8 place-items-center rounded-lg border border-[#dfe3e8] bg-white text-[#647084] transition hover:border-[#409EFE]/40 hover:text-[#409EFE] disabled:cursor-not-allowed disabled:opacity-35"
                title="เลื่อนขึ้น"
              >
                <ArrowUp className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onMove(tool.id, 1)}
                disabled={index === items.length - 1 || movingId === tool.id}
                className="grid size-8 place-items-center rounded-lg border border-[#dfe3e8] bg-white text-[#647084] transition hover:border-[#409EFE]/40 hover:text-[#409EFE] disabled:cursor-not-allowed disabled:opacity-35"
                title="เลื่อนลง"
              >
                <ArrowDown className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onEdit(tool.id)}
                className="grid size-8 place-items-center rounded-lg border border-[#dfe3e8] bg-white text-[#647084] transition hover:border-[#409EFE]/40 hover:text-[#409EFE]"
                title="แก้ไข"
              >
                <Pencil className="size-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ToolsTab() {
  const { getAdminHeaders } = useAdminAuth()
  const { data, loading, error, refetch } = useAdminApi<{ tools: Tool[] }>('/api/admin/portfolio/tools')
  useAdminRealtime(['portfolio_tools'], refetch)

  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [movingId, setMovingId] = useState<string | null>(null)
  const [orderedTools, setOrderedTools] = useState<Tool[]>([])
  const [orderDirty, setOrderDirty] = useState(false)
  const [savingOrder, setSavingOrder] = useState(false)

  const tools = useMemo(() => data?.tools ?? [], [data?.tools])
  const grouped = useMemo(() => {
    const map = orderedTools.reduce<Record<string, Tool[]>>((acc, tool) => {
      const category = getPortfolioToolGroup(tool)
      ;(acc[category] ??= []).push(tool)
      return acc
    }, {})
    return Object.entries(map).sort(([a], [b]) => comparePortfolioToolGroups(a, b))
  }, [orderedTools])
  const usedCategories = Array.from(new Set([...grouped.map(([category]) => category), ...orderedTools.map((tool) => tool.category)]))
  const editingTool = orderedTools.find((tool) => tool.id === editing) ?? null
  const topCategory = grouped.reduce<{ name: string; count: number } | null>((best, [name, items]) => {
    if (!best || items.length > best.count) return { name, count: items.length }
    return best
  }, null)

  useEffect(() => {
    if (!orderDirty) setOrderedTools(tools)
  }, [data?.tools, orderDirty, tools])

  async function save(payload: ToolDraft & { id?: string }) {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/portfolio/tools', {
        method: 'POST',
        headers: { ...getAdminHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'บันทึกเครื่องมือไม่สำเร็จ')
      toast.success(payload.id ? 'อัปเดตเครื่องมือแล้ว' : 'เพิ่มเครื่องมือแล้ว')
      setAdding(false)
      setEditing(null)
      setModalOpen(false)
      refetch()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  function moveTool(id: string, direction: -1 | 1) {
    setOrderedTools((current) => {
      const tool = current.find((item) => item.id === id)
      if (!tool) return current

      const group = getPortfolioToolGroup(tool)
      const groupItems = current.filter((item) => getPortfolioToolGroup(item) === group)
      const groupIndex = groupItems.findIndex((item) => item.id === id)
      const targetGroupItem = groupItems[groupIndex + direction]
      if (!targetGroupItem) return current

      const index = current.findIndex((item) => item.id === id)
      const targetIndex = current.findIndex((item) => item.id === targetGroupItem.id)
      const next = [...current]
      next[index] = current[targetIndex]
      next[targetIndex] = current[index]
      return next.map((item, orderIndex) => ({ ...item, sort_order: (orderIndex + 1) * 100 }))
    })
    setOrderDirty(true)
  }

  async function saveOrder() {
    setSavingOrder(true)
    try {
      const res = await fetch('/api/admin/portfolio/tools', {
        method: 'PATCH',
        headers: { ...getAdminHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order: orderedTools.map((tool, orderIndex) => ({ id: tool.id, sort_order: (orderIndex + 1) * 100 })),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'บันทึกลำดับไม่สำเร็จ')
      if (Array.isArray(json.tools)) setOrderedTools(json.tools)
      await refetch()
      setOrderDirty(false)
      toast.success('บันทึกลำดับเครื่องมือแล้ว')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSavingOrder(false)
    }
  }

  function discardOrder() {
    setOrderedTools(tools)
    setOrderDirty(false)
  }

  async function del(id: string) {
    if (!confirm('ลบเครื่องมือนี้ใช่ไหม?')) return
    const res = await fetch(`/api/admin/portfolio/tools?id=${id}`, {
      method: 'DELETE',
      headers: getAdminHeaders(),
    })
    const json = await res.json()
    if (!res.ok) toast.error(json.error || 'ลบไม่สำเร็จ')
    else {
      toast.success('ลบแล้ว')
      if (editing === id) {
        setEditing(null)
        setModalOpen(false)
      }
      refetch()
    }
  }

  if (loading) return <AdminLoading message="กำลังโหลดสกิลและเครื่องมือ..." />
  if (error) return <AdminError error={error} onRetry={refetch} />

  return (
    <div className="space-y-6 p-6">
      <AdminPageSection
        title="สกิลและเครื่องมือ"
        description={`${tools.length} รายการ · ${grouped.length} หมวดหมู่ · แสดงผลบนหน้า portfolio`}
      >
        <div className="space-y-5">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-[#dfe3e8] bg-white p-4">
              <p className="text-xs font-bold text-[#647084]">เครื่องมือทั้งหมด</p>
              <p className="mt-2 text-2xl font-black text-[#09090b]">{tools.length}</p>
            </div>
            <div className="rounded-xl border border-[#dfe3e8] bg-white p-4">
              <p className="text-xs font-bold text-[#647084]">หมวดหมู่</p>
              <p className="mt-2 text-2xl font-black text-[#09090b]">{grouped.length}</p>
            </div>
            <div className="rounded-xl border border-[#dfe3e8] bg-white p-4">
              <p className="text-xs font-bold text-[#647084]">หมวดที่เยอะสุด</p>
              <p className="mt-2 truncate text-xl font-black text-[#09090b]">{topCategory?.name ?? '-'}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#dfe3e8] bg-[#fbfdff] px-4 py-3">
            <div>
              <p className="text-sm font-black text-[#09090b]">จัดการรายการที่แสดงบนหน้าเว็บ</p>
              <p className="mt-0.5 text-xs text-[#647084]">จัดลำดับจากปุ่มขึ้น/ลง แล้วค่อยกดบันทึกลำดับ</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {orderDirty ? (
                <>
                  <button
                    type="button"
                    onClick={discardOrder}
                    disabled={savingOrder}
                    className="flex h-9 min-w-28 items-center justify-center rounded-lg border border-[#dfe3e8] bg-white px-3 text-xs font-bold text-[#647084] transition hover:border-[#409EFE]/40 hover:text-[#409EFE] disabled:opacity-50"
                  >
                    ยกเลิกการจัด
                  </button>
                  <button
                    type="button"
                    onClick={saveOrder}
                    disabled={savingOrder}
                    className="flex h-9 min-w-28 items-center justify-center gap-1.5 rounded-lg bg-[#409EFE] px-3 text-xs font-bold text-white transition hover:bg-[#60aeff] disabled:opacity-50"
                  >
                    {savingOrder ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                    บันทึกลำดับ
                  </button>
                </>
              ) : null}
              {!adding && (
              <button
                onClick={() => {
                  setEditing(null)
                  setAdding(true)
                  setModalOpen(true)
                }}
                className="flex h-9 min-w-28 items-center justify-center gap-1.5 rounded-lg bg-[#409EFE] px-3 text-xs font-bold text-white transition hover:bg-[#60aeff]"
              >
                <Plus className="size-3.5" /> เพิ่มเครื่องมือ
              </button>
              )}
            </div>
          </div>

          {orderedTools.length === 0 && !adding ? (
            <AdminEmpty title="ยังไม่มีเครื่องมือ" description="เพิ่มสกิลหรือเครื่องมือแรก" />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {grouped.map(([category, items]) => (
                <CategoryCard
                  key={category}
                  category={category}
                  items={items}
                  editing={editing}
                  movingId={movingId}
                  onEdit={(id) => {
                    setAdding(false)
                    setEditing(id)
                    setModalOpen(true)
                  }}
                  onMove={moveTool}
                />
              ))}
            </div>
          )}
        </div>
      </AdminPageSection>

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
          className="h-[90vh] max-h-[90vh] overflow-y-auto !border-[#dfe3e8] !bg-white !text-[#090c13] shadow-[0_24px_80px_-48px_rgba(64,158,254,0.65)] sm:max-w-3xl [&_label]:!text-[#647084] [&_input]:!border-[#dfe3e8] [&_input]:!bg-white [&_input]:!text-[#090c13] [&_input::placeholder]:!text-[#9aa2ad]"
        >
          <DialogHeader>
            <DialogTitle className="!text-[#090c13]">
              {editingTool ? 'แก้ไขเครื่องมือ' : 'เพิ่มเครื่องมือใหม่'}
            </DialogTitle>
          </DialogHeader>
          <ToolForm
            key={editingTool?.id ?? (adding ? 'adding' : 'blank')}
            initial={
              editingTool
                ? {
                    name: editingTool.name,
                    category: editingTool.category,
                    icon: editingTool.icon,
                    sort_order: editingTool.sort_order,
                  }
                : BLANK
            }
            onSave={(value) => save(editingTool ? { ...value, id: editingTool.id } : value)}
            onDelete={editingTool ? () => del(editingTool.id) : undefined}
            onCancel={() => {
              setModalOpen(false)
              setAdding(false)
              setEditing(null)
            }}
            saving={saving}
            categories={usedCategories}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
