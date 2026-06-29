'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, X, Check, ExternalLink, Mail } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { AdminLoading, AdminError, AdminEmpty } from '@/components/admin/AdminStates'
import { AdminPageSection } from '@/components/admin/AdminPage'
import { useAdminApi } from '@/lib/hooks/useAdminApi'
import { useAdminAuth } from '@/components/admin/AdminAuthProvider'
import { useAdminRealtime } from '@/lib/hooks/useAdminRealtime'
import { TheSvgIcon, parseIconValue, buildIconValue, ICON_VARIANTS, type IconVariant } from '@/components/the-svg-icon'

type Link = { id: string; name: string; label: string; href: string; icon: string | null; is_active: boolean; sort_order: number }
type Message = { id: string; name: string; email: string; message: string; created_at: string; is_read: boolean; source?: string | null }

const BLANK: Omit<Link, 'id'> = { name: '', label: '', href: '', icon: '', is_active: true, sort_order: 0 }

function LinkForm({ initial, onSave, onCancel, saving }: {
  initial: typeof BLANK; onSave: (v: typeof BLANK) => void; onCancel: () => void; saving: boolean
}) {
  const [v, setV] = useState(initial)
  return (
    <div className="flex flex-wrap items-end gap-2 rounded-xl border border-[#27272A] bg-[#18181B] p-3">
      {[
        { key: 'name', label: 'Name', placeholder: 'github', w: 'w-28' },
        { key: 'label', label: 'Label', placeholder: 'GitHub', w: 'w-28' },
        { key: 'href', label: 'URL *', placeholder: 'https://github.com/...', w: 'w-52' },
      ].map(({ key, label, placeholder, w }) => (
        <div key={key} className="flex flex-col gap-1">
          <span className="text-[10px] text-[#52525b]">{label}</span>
          <input
            value={(v as unknown as Record<string, string>)[key] ?? ''}
            onChange={(e) => setV({ ...v, [key]: e.target.value })}
            placeholder={placeholder}
            className={`h-7 ${w} rounded border border-[#27272A] bg-[#09090B] px-2 text-xs text-[#FAFAFA] outline-none focus:border-[#409EFE]`}
          />
        </div>
      ))}

      {(() => {
        const { slug, variant } = parseIconValue(v.icon)
        return (
          <>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-[#52525b]">Icon (thesvg slug)</span>
              <div className="flex items-center gap-1.5">
                <TheSvgIcon
                  label={v.label || v.name || '?'}
                  slug={v.icon}
                  className="size-7 shrink-0 rounded-md border border-[#27272A] bg-[#09090B]"
                />
                <input
                  value={slug ?? ''}
                  onChange={(e) => setV({ ...v, icon: buildIconValue(e.target.value, variant) })}
                  placeholder="github, x, linkedin"
                  className="h-7 w-32 rounded border border-[#27272A] bg-[#09090B] px-2 text-xs text-[#FAFAFA] outline-none focus:border-[#409EFE]"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-[#52525b]">Variant</span>
              <select
                value={variant}
                onChange={(e) => setV({ ...v, icon: buildIconValue(slug ?? '', e.target.value as IconVariant) })}
                className="h-7 w-28 rounded border border-[#27272A] bg-[#09090B] px-2 text-xs capitalize text-[#FAFAFA] outline-none focus:border-[#409EFE]"
              >
                {ICON_VARIANTS.map((vr) => (
                  <option key={vr} value={vr}>{vr}</option>
                ))}
              </select>
            </div>
          </>
        )
      })()}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-[#52525b]">Order</span>
        <input type="number" value={v.sort_order}
          onChange={(e) => setV({ ...v, sort_order: Number(e.target.value) })}
          className="h-7 w-16 rounded border border-[#27272A] bg-[#09090B] px-2 text-xs text-[#FAFAFA] outline-none focus:border-[#409EFE]" />
      </div>
      <div className="flex items-center gap-1.5">
        <button onClick={() => onSave(v)} disabled={saving || !v.href.trim()}
          className="flex h-7 items-center gap-1 rounded border border-[#22C55E]/30 bg-[#22C55E]/10 px-2.5 text-[11px] text-[#22C55E] disabled:opacity-40">
          <Check className="size-3" /> Save
        </button>
        <button onClick={onCancel}
          className="flex h-7 items-center gap-1 rounded border border-[#27272A] px-2.5 text-[11px] text-[#52525b] hover:text-[#FAFAFA]">
          <X className="size-3" /> Cancel
        </button>
      </div>
    </div>
  )
}

export function ConnectTab() {
  const { getAdminHeaders } = useAdminAuth()
  const { data: linksData, loading: linksLoading, error: linksError, refetch: refetchLinks } = useAdminApi<{ links: Link[] }>('/api/admin/portfolio/social')
  const { data: msgsData, loading: msgsLoading } = useAdminApi<{ messages: Message[] }>('/api/admin/contacts')
  useAdminRealtime(['social_links'], refetchLinks)

  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)

  const links = linksData?.links ?? []
  const messages = msgsData?.messages ?? []

  async function save(payload: typeof BLANK & { id?: string }) {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/portfolio/social', {
        method: 'POST',
        headers: { ...getAdminHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success(payload.id ? 'Link updated' : 'Link added')
      setAdding(false); setEditing(null); refetchLinks()
    } catch (e) {
      toast.error((e as Error).message)
    } finally { setSaving(false) }
  }

  async function toggleActive(id: string, is_active: boolean) {
    setToggling(id)
    const res = await fetch('/api/admin/portfolio/social', {
      method: 'PATCH',
      headers: { ...getAdminHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active }),
    })
    if (!res.ok) toast.error((await res.json()).error)
    else refetchLinks()
    setToggling(null)
  }

  async function del(id: string) {
    if (!confirm('Delete this link?')) return
    const res = await fetch(`/api/admin/portfolio/social?id=${id}`, { method: 'DELETE', headers: getAdminHeaders() })
    if (!res.ok) toast.error((await res.json()).error)
    else { toast.success('Deleted'); refetchLinks() }
  }

  if (linksLoading) return <AdminLoading message="Loading social links..." />
  if (linksError) return <AdminError error={linksError} onRetry={refetchLinks} />

  return (
    <div className="space-y-6 p-6">
      {/* Social Links */}
      <AdminPageSection title="Social Links" description={`${links.filter((l) => l.is_active).length} active · ${links.length} total`}>
        <div className="space-y-2">
          {links.length === 0 && !adding && (
            <AdminEmpty title="No social links" description="Add your first link" />
          )}

          {links.map((l) =>
            editing === l.id ? (
              <LinkForm
                key={l.id}
                initial={{ name: l.name, label: l.label, href: l.href, icon: l.icon, is_active: l.is_active, sort_order: l.sort_order }}
                onSave={(v) => save({ ...v, id: l.id })}
                onCancel={() => setEditing(null)}
                saving={saving}
              />
            ) : (
              <div key={l.id} className="group flex items-center gap-3 rounded-lg border border-[#27272A] bg-[#18181B] px-4 py-2.5">
                <TheSvgIcon label={l.name} slug={l.icon} className="size-8 shrink-0 rounded-md border-0 bg-transparent" />
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-[#FAFAFA]">{l.label || l.name}</span>
                  <p className="truncate text-[11px] text-[#52525b]">{l.href}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={l.is_active}
                    disabled={toggling === l.id}
                    onCheckedChange={(v) => toggleActive(l.id, v)}
                  />
                  <a href={l.href} target="_blank" rel="noopener noreferrer" className="text-[#3f3f46] hover:text-[#FAFAFA]">
                    <ExternalLink className="size-3.5" />
                  </a>
                  <div className="hidden gap-1 group-hover:flex">
                    <button onClick={() => setEditing(l.id)} className="text-[#3f3f46] hover:text-[#FAFAFA]"><Pencil className="size-3.5" /></button>
                    <button onClick={() => del(l.id)} className="text-[#3f3f46] hover:text-[#EF4444]"><Trash2 className="size-3.5" /></button>
                  </div>
                </div>
              </div>
            )
          )}

          {adding && (
            <LinkForm initial={BLANK} onSave={save} onCancel={() => setAdding(false)} saving={saving} />
          )}

          {!adding && (
            <button onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 rounded-lg border border-dashed border-[#27272A] px-4 py-2 text-xs text-[#52525b] transition-colors hover:border-[#409EFE]/50 hover:text-[#409EFE]">
              <Plus className="size-3.5" /> Add link
            </button>
          )}
        </div>
      </AdminPageSection>

      {/* Contact Messages */}
      <AdminPageSection title="Contact Messages" description={`${messages.length} message${messages.length !== 1 ? 's' : ''}`}>
        {msgsLoading ? (
          <div className="py-8 text-center text-sm text-[#52525b]">Loading messages...</div>
        ) : messages.length === 0 ? (
          <AdminEmpty title="No messages yet" description="Contact form submissions will appear here" />
        ) : (
          <div className="divide-y divide-[#27272A]/50">
            {messages.slice(0, 20).map((m) => (
              <div key={m.id} className="flex items-start gap-3 py-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#27272A]">
                  <Mail className="size-3.5 text-[#52525b]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-sm font-medium text-[#FAFAFA]">{m.name}</span>
                    <span className="text-[11px] text-[#52525b]">{m.email}</span>
                    {m.source && (
                      <span className="rounded bg-[#409EFE]/10 px-1.5 py-px text-[9px] font-medium text-[#409EFE]">
                        {m.source}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] text-[#3f3f46] line-clamp-2">{m.message}</p>
                </div>
                <span className="shrink-0 text-[10px] text-[#3f3f46]">
                  {new Date(m.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* LINE API placeholder */}
        <div className="mt-4 rounded-lg border border-dashed border-[#27272A] p-4">
          <p className="text-[11px] text-[#3f3f46]">LINE Notify integration — coming soon</p>
        </div>
      </AdminPageSection>
    </div>
  )
}
