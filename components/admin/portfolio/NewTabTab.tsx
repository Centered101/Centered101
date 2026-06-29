'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Save, ExternalLink } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { AdminLoading, AdminError } from '@/components/admin/AdminStates'
import { AdminPageSection } from '@/components/admin/AdminPage'
import { useAdminApi } from '@/lib/hooks/useAdminApi'
import { useAdminAuth } from '@/components/admin/AdminAuthProvider'

type SettingsData = { settings: Record<string, unknown> }

const KEYS = [
  'newtab_enabled',
  'newtab_greeting',
  'newtab_bg_url',
  'newtab_show_clock',
  'newtab_show_weather',
  'newtab_weather_city',
  'newtab_accent_color',
  'newtab_font',
]

export function NewTabTab() {
  const { getAdminHeaders } = useAdminAuth()
  const { data, loading, error, refetch } = useAdminApi<SettingsData>('/api/admin/settings')

  const [form, setForm] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (!data?.settings) return
    const initial: Record<string, string> = {}
    for (const k of KEYS) initial[k] = String(data.settings[k] ?? '')
    setForm(initial)
    setDirty(false)
  }, [data])

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
    setDirty(true)
  }

  async function save() {
    setSaving(true)
    try {
      const body: Record<string, string> = {}
      for (const k of KEYS) if (k in form) body[k] = form[k]
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { ...getAdminHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Settings saved')
      setDirty(false)
      refetch()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <AdminLoading message="Loading settings..." />
  if (error) return <AdminError error={error} onRetry={refetch} />

  return (
    <div className="space-y-6 p-6">
      {/* Preview link */}
      <div className="flex items-center justify-between">
        <a
          href="/newtab"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-lg border border-[#27272A] px-3 py-1.5 text-xs text-[#52525b] transition-colors hover:text-[#FAFAFA]"
        >
          <ExternalLink className="size-3.5" /> Preview NewTab
        </a>
        {dirty && (
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg border border-[#409EFE]/30 bg-[#409EFE]/10 px-4 py-1.5 text-xs text-[#409EFE] transition-colors hover:bg-[#409EFE]/20 disabled:opacity-40"
          >
            <Save className="size-3.5" /> Save changes
          </button>
        )}
      </div>

      {/* Toggle settings */}
      <AdminPageSection title="Display" description="Control what's shown on the new tab page">
        <div className="divide-y divide-[#27272A]/40">
          {[
            { key: 'newtab_enabled', label: 'Enable NewTab override', desc: 'Replace the browser new tab with this page' },
            { key: 'newtab_show_clock', label: 'Show clock', desc: 'Display a large time/date widget' },
            { key: 'newtab_show_weather', label: 'Show weather', desc: 'Display current weather conditions' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm text-[#FAFAFA]">{label}</p>
                <p className="text-[11px] text-[#52525b]">{desc}</p>
              </div>
              <Switch
                checked={form[key] === 'true'}
                onCheckedChange={(v) => set(key, v ? 'true' : 'false')}
              />
            </div>
          ))}
        </div>
      </AdminPageSection>

      {/* Text settings */}
      <AdminPageSection title="Content" description="Customize text and appearance">
        <div className="space-y-4">
          {[
            { key: 'newtab_greeting', label: 'Greeting', placeholder: 'Good morning, Centered101' },
            { key: 'newtab_weather_city', label: 'Weather city', placeholder: 'Bangkok' },
            { key: 'newtab_bg_url', label: 'Background image URL', placeholder: 'https://...' },
            { key: 'newtab_accent_color', label: 'Accent color', placeholder: '#409EFE' },
            { key: 'newtab_font', label: 'Font family', placeholder: 'Inter, sans-serif' },
          ].map(({ key, label, placeholder }) => (
            <div key={key} className="space-y-1">
              <label className="text-[11px] text-[#52525b]">{label}</label>
              <input
                value={form[key] ?? ''}
                onChange={(e) => set(key, e.target.value)}
                placeholder={placeholder}
                className="h-8 w-full max-w-md rounded border border-[#27272A] bg-[#09090B] px-3 text-xs text-[#FAFAFA] outline-none focus:border-[#409EFE]"
              />
            </div>
          ))}
        </div>
      </AdminPageSection>

      {/* Save footer */}
      {dirty && (
        <div className="flex justify-end">
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-[#409EFE] px-5 py-2 text-sm font-medium text-[#09090B] transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <Save className="size-4" /> {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      )}
    </div>
  )
}
