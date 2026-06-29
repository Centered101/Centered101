'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react'
import { AdminLoading, AdminError, AdminEmpty } from '@/components/admin/AdminStates'
import { AdminPageSection } from '@/components/admin/AdminPage'
import { useAdminApi } from '@/lib/hooks/useAdminApi'
import { useAdminAuth } from '@/components/admin/AdminAuthProvider'
import { useAdminRealtime } from '@/lib/hooks/useAdminRealtime'
import { cn } from '@/lib/utils'
import { parseIconValue, buildIconValue, iconUrl, ICON_VARIANTS, type IconVariant } from '@/components/the-svg-icon'

type Tool = { id: string; name: string; category: string; icon: string | null; sort_order: number }

const BLANK: Omit<Tool, 'id'> = { name: '', category: 'Tools', icon: '', sort_order: 0 }

// Canonical categories (mirrors the public API's allowed set).
const TOOL_CATEGORIES = ['Language', 'Library', 'Editor', 'Design', 'Gaming', 'Software', 'Cloud', 'Database'] as const

function ToolForm({
  initial,
  onSave,
  onCancel,
  saving,
  categories = [],
}: {
  initial: typeof BLANK
  onSave: (v: typeof BLANK) => void
  onCancel: () => void
  saving: boolean
  categories?: string[]
}) {
  const [v, setV] = useState(initial)
  const { slug, variant } = parseIconValue(v.icon)
  const setIcon = (nextSlug: string, nextVariant: IconVariant) =>
    setV({ ...v, icon: buildIconValue(nextSlug, nextVariant) })
  // Suggestions = canonical groups + categories already in use. The field still
  // accepts any free-typed value so new categories can be added on the fly.
  const categoryOptions = Array.from(
    new Set([...TOOL_CATEGORIES, ...categories, v.category].filter(Boolean)),
  )
  return (
    <div className="flex flex-wrap items-end gap-2 rounded-lg border border-[#27272A] bg-[#18181B] p-3">
      <div className="flex flex-col gap-1">
        <label className="text-[10px] text-[#52525b]">Name *</label>
        <input
          value={v.name}
          onChange={(e) => setV({ ...v, name: e.target.value })}
          placeholder="TypeScript"
          className="h-7 w-36 rounded border border-[#27272A] bg-[#09090B] px-2 text-xs text-[#FAFAFA] outline-none focus:border-[#409EFE]"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[10px] text-[#52525b]">Category</label>
        <input
          list="tool-category-options"
          value={v.category}
          onChange={(e) => setV({ ...v, category: e.target.value })}
          placeholder="Library"
          className="h-7 w-32 rounded border border-[#27272A] bg-[#09090B] px-2 text-xs text-[#FAFAFA] outline-none focus:border-[#409EFE]"
        />
        <datalist id="tool-category-options">
          {categoryOptions.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[10px] text-[#52525b]">Icon slug</label>
        <input
          value={slug ?? ''}
          onChange={(e) => setIcon(e.target.value, variant)}
          placeholder="typescript"
          className="h-7 w-40 rounded border border-[#27272A] bg-[#09090B] px-2 text-xs text-[#FAFAFA] outline-none focus:border-[#409EFE]"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[10px] text-[#52525b]">Variant</label>
        <div className="flex gap-1.5">
          {ICON_VARIANTS.map((opt) => {
            const selected = variant === opt
            return (
              <button
                key={opt}
                type="button"
                onClick={() => setIcon(slug ?? '', opt)}
                title={opt}
                className={cn(
                  'flex w-12 flex-col items-center gap-1 rounded-lg border p-1 transition-colors',
                  selected
                    ? 'border-[#409EFE] ring-2 ring-[#409EFE]/40'
                    : 'border-[#27272A] hover:border-[#3f3f46]',
                )}
              >
                {/* Preview on the real portfolio surface (always a light theme)
                    so a variant that would vanish on the live site looks empty here too. */}
                <span className="grid h-8 w-full place-items-center rounded-md bg-white">
                  {slug ? (
                    <img
                      key={`${slug}-${opt}`}
                      src={iconUrl(slug, opt)}
                      alt=""
                      className="size-5"
                      onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden' }}
                    />
                  ) : (
                    <span className="text-[9px] text-[#3f3f46]">—</span>
                  )}
                </span>
                <span className={cn('text-[9px] capitalize', selected ? 'text-[#409EFE]' : 'text-[#52525b]')}>
                  {opt}
                </span>
              </button>
            )
          })}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[10px] text-[#52525b]">Order</label>
        <input
          type="number"
          value={v.sort_order}
          onChange={(e) => setV({ ...v, sort_order: Number(e.target.value) })}
          className="h-7 w-16 rounded border border-[#27272A] bg-[#09090B] px-2 text-xs text-[#FAFAFA] outline-none focus:border-[#409EFE]"
        />
      </div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onSave(v)}
          disabled={saving || !v.name.trim()}
          className="flex h-7 items-center gap-1 rounded border border-[#22C55E]/30 bg-[#22C55E]/10 px-2.5 text-[11px] text-[#22C55E] disabled:opacity-40"
        >
          <Check className="size-3" /> Save
        </button>
        <button
          onClick={onCancel}
          className="flex h-7 items-center gap-1 rounded border border-[#27272A] px-2.5 text-[11px] text-[#52525b] hover:text-[#FAFAFA]"
        >
          <X className="size-3" /> Cancel
        </button>
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
  const grouped = tools.reduce<Record<string, Tool[]>>((acc, t) => {
    ;(acc[t.category] ??= []).push(t)
    return acc
  }, {})
  const usedCategories = Object.keys(grouped)
  const editingTool = tools.find((t) => t.id === editing) ?? null

  async function save(payload: typeof BLANK & { id?: string }) {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/portfolio/tools', {
        method: 'POST',
        headers: { ...getAdminHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success(payload.id ? 'Tool updated' : 'Tool added')
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
    if (!confirm('Delete this tool?')) return
    const res = await fetch(`/api/admin/portfolio/tools?id=${id}`, {
      method: 'DELETE',
      headers: getAdminHeaders(),
    })
    if (!res.ok) toast.error((await res.json()).error)
    else { toast.success('Deleted'); refetch() }
  }

  if (loading) return <AdminLoading message="Loading tools..." />
  if (error) return <AdminError error={error} onRetry={refetch} />

  return (
    <div className="space-y-6 p-6">
      <AdminPageSection
        title="Skills & Tools"
        description={`${tools.length} items across ${Object.keys(grouped).length} categories`}
      >
        <div className="space-y-4">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[#3f3f46]">{cat}</p>
              <div className="flex flex-wrap gap-2">
                {items.map((t) => (
                  <div
                    key={t.id}
                    className={cn(
                      'group flex items-center gap-1.5 rounded-lg border px-3 py-1.5 transition-colors',
                      editing === t.id
                        ? 'border-[#409EFE] bg-[#409EFE]/10'
                        : 'border-[#27272A] bg-[#18181B]',
                    )}
                  >
                    {(() => {
                      const { slug, variant } = parseIconValue(t.icon)
                      return slug ? (
                        <img
                          key={t.icon ?? ''}
                          src={iconUrl(slug, variant)}
                          alt={t.name}
                          className="size-3.5"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      ) : null
                    })()}
                    <span className="text-xs text-[#A1A1AA]">{t.name}</span>
                    <button onClick={() => setEditing(editing === t.id ? null : t.id)} className="ml-1 hidden text-[#3f3f46] hover:text-[#FAFAFA] group-hover:block">
                      <Pencil className="size-3" />
                    </button>
                    <button onClick={() => del(t.id)} className="hidden text-[#3f3f46] hover:text-[#EF4444] group-hover:block">
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Edit form lifted out of the badge row into its own panel */}
              {editingTool && editingTool.category === cat && (
                <div className="mt-3">
                  <ToolForm
                    key={editingTool.id}
                    initial={{ name: editingTool.name, category: editingTool.category, icon: editingTool.icon, sort_order: editingTool.sort_order }}
                    onSave={(v) => save({ ...v, id: editingTool.id })}
                    onCancel={() => setEditing(null)}
                    saving={saving}
                    categories={usedCategories}
                  />
                </div>
              )}
            </div>
          ))}

          {tools.length === 0 && !adding && (
            <AdminEmpty title="No tools yet" description="Add your first skill or tool" />
          )}

          {adding && (
            <ToolForm
              initial={BLANK}
              onSave={save}
              onCancel={() => setAdding(false)}
              saving={saving}
              categories={usedCategories}
            />
          )}

          {!adding && (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 rounded-lg border border-dashed border-[#27272A] px-4 py-2 text-xs text-[#52525b] transition-colors hover:border-[#409EFE]/50 hover:text-[#409EFE]"
            >
              <Plus className="size-3.5" /> Add tool
            </button>
          )}
        </div>
      </AdminPageSection>
    </div>
  )
}
