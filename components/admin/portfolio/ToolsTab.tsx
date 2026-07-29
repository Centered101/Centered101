'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  Brush,
  Check,
  Cloud,
  Code2,
  Database,
  Gamepad2,
  Layers,
  MonitorCog,
  Pencil,
  Plus,
  Save,
  TerminalSquare,
  Trash2,
  Wrench,
  X,
} from 'lucide-react'
import { AdminLoading, AdminError, AdminEmpty } from '@/components/admin/AdminStates'
import { AdminPageSection } from '@/components/admin/AdminPage'
import { useAdminApi } from '@/lib/hooks/useAdminApi'
import { useAdminAuth } from '@/components/admin/AdminAuthProvider'
import { useAdminRealtime } from '@/lib/hooks/useAdminRealtime'
import { cn } from '@/lib/utils'
import { parseIconValue, buildIconValue, iconUrl, ICON_VARIANTS, type IconVariant } from '@/components/the-svg-icon'

type Tool = { id: string; name: string; category: string; icon: string | null; sort_order: number }
type ToolDraft = Omit<Tool, 'id'>

const BLANK: ToolDraft = { name: '', category: 'Tools', icon: '', sort_order: 0 }

const TOOL_CATEGORIES = ['Language', 'Library', 'Editor', 'Design', 'Gaming', 'Software', 'Cloud', 'Database'] as const

const CATEGORY_META: Record<string, { label: string; description: string; accent: string; icon: React.ElementType }> = {
  Language: { label: 'ภาษา', description: 'ภาษาเขียนโค้ดหลัก', accent: '#409EFE', icon: Code2 },
  Library: { label: 'ไลบรารี', description: 'เครื่องมือช่วยพัฒนา UI/logic', accent: '#8B5CF6', icon: Layers },
  Editor: { label: 'Editor', description: 'เครื่องมือเขียนงานประจำ', accent: '#64748B', icon: MonitorCog },
  Design: { label: 'ดีไซน์', description: 'งานออกแบบและสื่อ', accent: '#F43F5E', icon: Brush },
  Gaming: { label: 'เกมและเอนจิน', description: 'เครื่องมือสายเกม/ทดลอง', accent: '#22C55E', icon: Gamepad2 },
  Software: { label: 'ซอฟต์แวร์', description: 'แอปและยูทิลิตี้ที่ใช้', accent: '#F97316', icon: Wrench },
  Cloud: { label: 'คลาวด์', description: 'โฮสติ้งและแพลตฟอร์ม', accent: '#06B6D4', icon: Cloud },
  Database: { label: 'ฐานข้อมูล', description: 'ฐานข้อมูลและ backend data', accent: '#10B981', icon: Database },
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
    <span className={cn('grid size-9 shrink-0 place-items-center rounded-lg border border-[#dfe3e8] bg-white', className)}>
      {slug ? (
        <img
          key={tool.icon ?? ''}
          src={iconUrl(slug, variant)}
          alt={tool.name}
          className="size-5"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      ) : (
        <Wrench className="size-4 text-[#94a3b8]" />
      )}
    </span>
  )
}

function ToolForm({
  initial,
  onSave,
  onCancel,
  saving,
  categories = [],
}: {
  initial: ToolDraft
  onSave: (v: ToolDraft) => void
  onCancel: () => void
  saving: boolean
  categories?: string[]
}) {
  const [v, setV] = useState(initial)
  const { slug, variant } = parseIconValue(v.icon)
  const setIcon = (nextSlug: string, nextVariant: IconVariant) =>
    setV({ ...v, icon: buildIconValue(nextSlug, nextVariant) })
  const categoryOptions = Array.from(new Set([...TOOL_CATEGORIES, ...categories, v.category].filter(Boolean)))

  return (
    <div className="rounded-xl border border-[#dfe3e8] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5e7eb] px-4 py-3">
        <div>
          <p className="text-sm font-black text-[#09090b]">{initial.name ? 'แก้ไขเครื่องมือ' : 'เพิ่มเครื่องมือใหม่'}</p>
          <p className="mt-0.5 text-xs text-[#647084]">กำหนดชื่อ หมวดหมู่ และไอคอนที่จะแสดงบนหน้า portfolio</p>
        </div>
        <ToolIcon tool={{ name: v.name || 'Preview', icon: v.icon }} className="size-11 rounded-xl" />
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-xs font-bold text-[#647084]">ชื่อเครื่องมือ *</span>
            <input
              value={v.name}
              onChange={(e) => setV({ ...v, name: e.target.value })}
              placeholder="TypeScript"
              className="h-10 w-full rounded-lg border border-[#dfe3e8] bg-white px-3 text-sm font-semibold text-[#09090b] outline-none transition focus:border-[#409EFE] focus:ring-4 focus:ring-[#409EFE]/10"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-bold text-[#647084]">หมวดหมู่</span>
            <input
              list="tool-category-options"
              value={v.category}
              onChange={(e) => setV({ ...v, category: e.target.value })}
              placeholder="Library"
              className="h-10 w-full rounded-lg border border-[#dfe3e8] bg-white px-3 text-sm font-semibold text-[#09090b] outline-none transition focus:border-[#409EFE] focus:ring-4 focus:ring-[#409EFE]/10"
            />
            <datalist id="tool-category-options">
              {categoryOptions.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
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

          <label className="space-y-1.5">
            <span className="text-xs font-bold text-[#647084]">ลำดับ</span>
            <input
              type="number"
              value={v.sort_order}
              onChange={(e) => setV({ ...v, sort_order: Number(e.target.value) })}
              className="h-10 w-full rounded-lg border border-[#dfe3e8] bg-white px-3 text-sm font-semibold text-[#09090b] outline-none transition focus:border-[#409EFE] focus:ring-4 focus:ring-[#409EFE]/10"
            />
          </label>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-bold text-[#647084]">รูปแบบไอคอน</p>
          <div className="grid grid-cols-2 gap-2">
            {ICON_VARIANTS.map((opt) => {
              const selected = variant === opt
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setIcon(slug ?? '', opt)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition',
                    selected
                      ? 'border-[#409EFE] bg-[#409EFE]/10 text-[#409EFE] ring-2 ring-[#409EFE]/15'
                      : 'border-[#dfe3e8] bg-white text-[#647084] hover:border-[#409EFE]/40',
                  )}
                >
                  <span className="grid size-9 place-items-center rounded-lg border border-[#dfe3e8] bg-white">
                    {slug ? (
                      <img
                        key={`${slug}-${opt}`}
                        src={iconUrl(slug, opt)}
                        alt=""
                        className="size-5"
                        onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden' }}
                      />
                    ) : (
                      <span className="text-[10px]">-</span>
                    )}
                  </span>
                  <span className="text-xs font-bold capitalize">{opt}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-2 border-t border-[#e5e7eb] px-4 py-3">
        <button
          onClick={onCancel}
          className="flex h-9 items-center gap-1.5 rounded-lg border border-[#dfe3e8] bg-white px-3 text-xs font-bold text-[#647084] transition hover:border-[#94a3b8] hover:text-[#09090b]"
        >
          <X className="size-3.5" /> ยกเลิก
        </button>
        <button
          onClick={() => onSave(v)}
          disabled={saving || !v.name.trim()}
          className="flex h-9 items-center gap-1.5 rounded-lg bg-[#409EFE] px-3 text-xs font-bold text-white transition hover:bg-[#60aeff] disabled:opacity-50"
        >
          <Save className="size-3.5" /> บันทึก
        </button>
      </div>
    </div>
  )
}

function CategoryCard({
  category,
  items,
  editing,
  onEdit,
  onDelete,
}: {
  category: string
  items: Tool[]
  editing: string | null
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}) {
  const meta = getCategoryMeta(category)
  const Icon = meta.icon

  return (
    <div className="rounded-xl border border-[#dfe3e8] bg-white">
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

      <div className="flex flex-wrap gap-2 p-4">
        {items.map((tool) => (
          <div
            key={tool.id}
            className={cn(
              'group flex min-h-11 items-center gap-2 rounded-xl border bg-[#fbfdff] px-2.5 py-1.5 transition',
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
                onClick={() => onEdit(tool.id)}
                className="grid size-8 place-items-center rounded-lg border border-[#dfe3e8] bg-white text-[#647084] transition hover:border-[#409EFE]/40 hover:text-[#409EFE]"
                title="แก้ไข"
              >
                <Pencil className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(tool.id)}
                className="grid size-8 place-items-center rounded-lg border border-[#dfe3e8] bg-white text-[#647084] transition hover:border-[#ef4444]/40 hover:text-[#ef4444]"
                title="ลบ"
              >
                <Trash2 className="size-3.5" />
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
  const [saving, setSaving] = useState(false)

  const tools = data?.tools ?? []
  const grouped = useMemo(() => {
    const map = tools.reduce<Record<string, Tool[]>>((acc, tool) => {
      ;(acc[tool.category] ??= []).push(tool)
      return acc
    }, {})
    // Preserve the original admin ordering: the API already sorts tools by
    // sort_order, and the first item in each category decides the category flow.
    return Object.entries(map)
  }, [tools])
  const usedCategories = grouped.map(([category]) => category)
  const editingTool = tools.find((tool) => tool.id === editing) ?? null
  const topCategory = grouped.reduce<{ name: string; count: number } | null>((best, [name, items]) => {
    if (!best || items.length > best.count) return { name, count: items.length }
    return best
  }, null)

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
      refetch()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
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
              <p className="mt-0.5 text-xs text-[#647084]">คลิกแก้ไขบน chip เพื่อเปลี่ยนชื่อ หมวด และไอคอน</p>
            </div>
            {!adding && (
              <button
                onClick={() => {
                  setEditing(null)
                  setAdding(true)
                }}
                className="flex h-9 items-center gap-1.5 rounded-lg bg-[#409EFE] px-3 text-xs font-bold text-white transition hover:bg-[#60aeff]"
              >
                <Plus className="size-3.5" /> เพิ่มเครื่องมือ
              </button>
            )}
          </div>

          {adding && (
            <ToolForm
              initial={BLANK}
              onSave={save}
              onCancel={() => setAdding(false)}
              saving={saving}
              categories={usedCategories}
            />
          )}

          {editingTool && (
            <ToolForm
              key={editingTool.id}
              initial={{
                name: editingTool.name,
                category: editingTool.category,
                icon: editingTool.icon,
                sort_order: editingTool.sort_order,
              }}
              onSave={(value) => save({ ...value, id: editingTool.id })}
              onCancel={() => setEditing(null)}
              saving={saving}
              categories={usedCategories}
            />
          )}

          {tools.length === 0 && !adding ? (
            <AdminEmpty title="ยังไม่มีเครื่องมือ" description="เพิ่มสกิลหรือเครื่องมือแรก" />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {grouped.map(([category, items]) => (
                <CategoryCard
                  key={category}
                  category={category}
                  items={items}
                  editing={editing}
                  onEdit={(id) => {
                    setAdding(false)
                    setEditing((current) => (current === id ? null : id))
                  }}
                  onDelete={del}
                />
              ))}
            </div>
          )}
        </div>
      </AdminPageSection>
    </div>
  )
}
