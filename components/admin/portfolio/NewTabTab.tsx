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
    void Promise.resolve().then(() => {
      setForm(initial)
      setDirty(false)
    })
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
      toast.success('บันทึกการตั้งค่าแล้ว')
      setDirty(false)
      refetch()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <AdminLoading message="กำลังโหลดการตั้งค่า..." />
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
          <ExternalLink className="size-3.5" /> พรีวิว NewTab
        </a>
        {dirty && (
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg border border-[#409EFE]/30 bg-[#409EFE]/10 px-4 py-1.5 text-xs text-[#409EFE] transition-colors hover:bg-[#409EFE]/20 disabled:opacity-40"
          >
            <Save className="size-3.5" /> บันทึกการแก้ไข
          </button>
        )}
      </div>

      {/* Toggle settings */}
      <AdminPageSection title="การแสดงผล" description="ควบคุมสิ่งที่จะแสดงบนหน้า new tab">
        <div className="divide-y divide-[#27272A]/40">
          {[
            { key: 'newtab_enabled', label: 'เปิดใช้งาน NewTab', desc: 'ใช้หน้านี้แทน new tab ของ browser' },
            { key: 'newtab_show_clock', label: 'แสดงนาฬิกา', desc: 'แสดง widget เวลาและวันที่ขนาดใหญ่' },
            { key: 'newtab_show_weather', label: 'แสดงสภาพอากาศ', desc: 'แสดงสภาพอากาศปัจจุบัน' },
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
      <AdminPageSection title="เนื้อหา" description="ปรับข้อความและหน้าตาของหน้า new tab">
        <div className="space-y-4">
          {[
            { key: 'newtab_greeting', label: 'คำทักทาย', placeholder: 'สวัสดีตอนเช้า, Centered101' },
            { key: 'newtab_weather_city', label: 'เมืองสำหรับสภาพอากาศ', placeholder: 'Bangkok' },
            { key: 'newtab_bg_url', label: 'URL รูปพื้นหลัง', placeholder: 'https://...' },
            { key: 'newtab_accent_color', label: 'สีหลัก', placeholder: '#409EFE' },
            { key: 'newtab_font', label: 'ฟอนต์', placeholder: 'Inter, sans-serif' },
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
            <Save className="size-4" /> {saving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
          </button>
        </div>
      )}
    </div>
  )
}
