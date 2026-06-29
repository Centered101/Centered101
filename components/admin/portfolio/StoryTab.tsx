'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, X, Check, BookOpen } from 'lucide-react'
import { AdminLoading, AdminError, AdminEmpty } from '@/components/admin/AdminStates'
import { AdminPageSection } from '@/components/admin/AdminPage'
import { useAdminApi } from '@/lib/hooks/useAdminApi'
import { useAdminAuth } from '@/components/admin/AdminAuthProvider'
import { useAdminRealtime } from '@/lib/hooks/useAdminRealtime'

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

function EntryForm({
  initial, onSave, onCancel, saving,
}: { initial: typeof BLANK; onSave: (v: typeof BLANK) => void; onCancel: () => void; saving: boolean }) {
  const [v, setV] = useState(initial)
  const set = (k: keyof typeof BLANK) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setV({ ...v, [k]: e.target.value })

  return (
    <div className="rounded-xl border border-[#27272A] bg-[#18181B] p-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-[10px] text-[#52525b]">Title (EN) *</label>
          <input value={v.title} onChange={set('title')} placeholder="Started learning TypeScript"
            className="h-8 w-full rounded border border-[#27272A] bg-[#09090B] px-2 text-xs text-[#FAFAFA] outline-none focus:border-[#409EFE]" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-[#52525b]">Title (TH)</label>
          <input value={v.title_th ?? ''} onChange={set('title_th')} placeholder="เริ่มเรียน TypeScript"
            className="h-8 w-full rounded border border-[#27272A] bg-[#09090B] px-2 text-xs text-[#FAFAFA] outline-none focus:border-[#409EFE]" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-[10px] text-[#52525b]">Description (EN)</label>
          <textarea value={v.description ?? ''} onChange={set('description')} rows={2} placeholder="Short description..."
            className="w-full rounded border border-[#27272A] bg-[#09090B] px-2 py-1.5 text-xs text-[#FAFAFA] outline-none focus:border-[#409EFE] resize-none" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-[#52525b]">Description (TH)</label>
          <textarea value={v.description_th ?? ''} onChange={set('description_th')} rows={2} placeholder="คำอธิบาย..."
            className="w-full rounded border border-[#27272A] bg-[#09090B] px-2 py-1.5 text-xs text-[#FAFAFA] outline-none focus:border-[#409EFE] resize-none" />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="space-y-1">
          <label className="text-[10px] text-[#52525b]">Year</label>
          <input value={v.year} onChange={set('year')} placeholder="2024"
            className="h-7 w-20 rounded border border-[#27272A] bg-[#09090B] px-2 text-xs text-[#FAFAFA] outline-none focus:border-[#409EFE]" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-[#52525b]">Type</label>
          <select value={v.type} onChange={set('type')}
            className="h-7 rounded border border-[#27272A] bg-[#09090B] px-2 text-xs text-[#FAFAFA] outline-none focus:border-[#409EFE]">
            {Object.keys(TYPE_COLORS).map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-[#52525b]">Icon (emoji / name)</label>
          <input value={v.icon ?? ''} onChange={set('icon')} placeholder="🚀"
            className="h-7 w-24 rounded border border-[#27272A] bg-[#09090B] px-2 text-xs text-[#FAFAFA] outline-none focus:border-[#409EFE]" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-[#52525b]">Order</label>
          <input type="number" value={v.sort_order}
            onChange={(e) => setV({ ...v, sort_order: Number(e.target.value) })}
            className="h-7 w-16 rounded border border-[#27272A] bg-[#09090B] px-2 text-xs text-[#FAFAFA] outline-none focus:border-[#409EFE]" />
        </div>
        <div className="flex items-end gap-1.5">
          <button onClick={() => onSave(v)} disabled={saving || !v.title.trim()}
            className="flex h-7 items-center gap-1 rounded border border-[#22C55E]/30 bg-[#22C55E]/10 px-2.5 text-[11px] text-[#22C55E] disabled:opacity-40">
            <Check className="size-3" /> Save
          </button>
          <button onClick={onCancel}
            className="flex h-7 items-center gap-1 rounded border border-[#27272A] px-2.5 text-[11px] text-[#52525b] hover:text-[#FAFAFA]">
            <X className="size-3" /> Cancel
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
  const [saving, setSaving] = useState(false)

  const story = data?.story ?? []

  async function save(payload: typeof BLANK & { id?: string }) {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/portfolio/story', {
        method: 'POST',
        headers: { ...getAdminHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success(payload.id ? 'Entry updated' : 'Entry added')
      setAdding(false); setEditing(null); refetch()
    } catch (e) {
      toast.error((e as Error).message)
    } finally { setSaving(false) }
  }

  async function del(id: string) {
    if (!confirm('Delete this entry?')) return
    const res = await fetch(`/api/admin/portfolio/story?id=${id}`, { method: 'DELETE', headers: getAdminHeaders() })
    if (!res.ok) toast.error((await res.json()).error)
    else { toast.success('Deleted'); refetch() }
  }

  if (loading) return <AdminLoading message="Loading story..." />
  if (error) return <AdminError error={error} onRetry={refetch} />

  return (
    <div className="space-y-6 p-6">
      <AdminPageSection
        title="My Learning Story"
        description={`${story.length} milestones in your timeline`}
      >
        <div className="space-y-3">
          {story.length === 0 && !adding && (
            <AdminEmpty title="No story entries" description="Add your first learning milestone" />
          )}

          {story.map((e) =>
            editing === e.id ? (
              <EntryForm
                key={e.id}
                initial={{ year: e.year, title: e.title, title_th: e.title_th, description: e.description, description_th: e.description_th, type: e.type, icon: e.icon, sort_order: e.sort_order }}
                onSave={(v) => save({ ...v, id: e.id })}
                onCancel={() => setEditing(null)}
                saving={saving}
              />
            ) : (
              <div key={e.id} className="group flex items-start gap-3 rounded-xl border border-[#27272A] bg-[#18181B] px-4 py-3">
                <div
                  className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-sm"
                  style={{ backgroundColor: `${TYPE_COLORS[e.type] ?? '#52525b'}20`, color: TYPE_COLORS[e.type] ?? '#52525b' }}
                >
                  {e.icon || <BookOpen className="size-3.5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#FAFAFA]">{e.title}</span>
                    <span className="rounded px-1 py-px text-[9px]" style={{ backgroundColor: `${TYPE_COLORS[e.type] ?? '#52525b'}20`, color: TYPE_COLORS[e.type] ?? '#52525b' }}>
                      {e.type}
                    </span>
                  </div>
                  {e.title_th && <p className="text-[11px] text-[#52525b]">{e.title_th}</p>}
                  {e.description && <p className="mt-1 text-[11px] text-[#3f3f46] line-clamp-2">{e.description}</p>}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-[11px] font-mono text-[#3f3f46]">{e.year}</span>
                  <div className="hidden gap-1 group-hover:flex">
                    <button onClick={() => setEditing(e.id)} className="text-[#3f3f46] hover:text-[#FAFAFA]"><Pencil className="size-3.5" /></button>
                    <button onClick={() => del(e.id)} className="text-[#3f3f46] hover:text-[#EF4444]"><Trash2 className="size-3.5" /></button>
                  </div>
                </div>
              </div>
            )
          )}

          {adding && (
            <EntryForm initial={BLANK} onSave={save} onCancel={() => setAdding(false)} saving={saving} />
          )}

          {!adding && (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 rounded-lg border border-dashed border-[#27272A] px-4 py-2 text-xs text-[#52525b] transition-colors hover:border-[#409EFE]/50 hover:text-[#409EFE]"
            >
              <Plus className="size-3.5" /> Add milestone
            </button>
          )}
        </div>
      </AdminPageSection>
    </div>
  )
}
