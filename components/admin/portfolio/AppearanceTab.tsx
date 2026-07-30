'use client'

import { useEffect, useState } from 'react'
import { ImagePlus, Loader2, RotateCcw, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AdminError, AdminLoading } from '@/components/admin/AdminStates'
import { useAdminApi } from '@/lib/hooks/useAdminApi'
import { useAdminAuth } from '@/components/admin/AdminAuthProvider'

type SettingsData = { settings: Record<string, unknown> }

const DEFAULTS = {
  hero_image_url: '/porfilio/images/bg-avatar-hero.png',
  hero_image_x: 160,
  hero_image_y: -12,
  hero_image_width: 50,
  hero_image_max_width: 760,
  hero_image_opacity: 95,
}

const NUMBER_FIELDS = [
  { key: 'hero_image_x', label: 'ระยะจากขอบขวา', min: -160, max: 360, step: 4, suffix: 'px' },
  { key: 'hero_image_y', label: 'ขยับขึ้น-ลง', min: -120, max: 160, step: 4, suffix: 'px' },
  { key: 'hero_image_width', label: 'ความกว้างบนจอ', min: 32, max: 64, step: 1, suffix: 'vw' },
  { key: 'hero_image_max_width', label: 'ความกว้างสูงสุด', min: 520, max: 980, step: 20, suffix: 'px' },
  { key: 'hero_image_opacity', label: 'ความทึบ', min: 40, max: 100, step: 5, suffix: '%' },
] as const

export function AppearanceTab() {
  const { data, loading, error, refetch } = useAdminApi<SettingsData>('/api/admin/settings')
  const { getAdminHeaders, refreshAdminHeaders } = useAdminAuth()
  const [form, setForm] = useState(DEFAULTS)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [draggingHero, setDraggingHero] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!data?.settings) return
    setForm({
      hero_image_url: typeof data.settings.hero_image_url === 'string'
        ? data.settings.hero_image_url
        : DEFAULTS.hero_image_url,
      hero_image_x: Number(data.settings.hero_image_x ?? DEFAULTS.hero_image_x),
      hero_image_y: Number(data.settings.hero_image_y ?? DEFAULTS.hero_image_y),
      hero_image_width: Number(data.settings.hero_image_width ?? DEFAULTS.hero_image_width),
      hero_image_max_width: Number(data.settings.hero_image_max_width ?? DEFAULTS.hero_image_max_width),
      hero_image_opacity: Number(data.settings.hero_image_opacity ?? DEFAULTS.hero_image_opacity),
    })
  }, [data])

  async function adminFetch(input: RequestInfo | URL, init: RequestInit = {}) {
    let response = await fetch(input, { ...init, headers: { ...getAdminHeaders(), ...(init.headers || {}) } })
    if (response.status === 401) {
      const freshHeaders = await refreshAdminHeaders()
      if (freshHeaders) response = await fetch(input, { ...init, headers: { ...freshHeaders, ...(init.headers || {}) } })
    }
    return response
  }

  async function uploadHeroImage(file: File) {
    if (!file.type.startsWith('image/')) {
      setMessage('กรุณาวางไฟล์รูปภาพเท่านั้น')
      return
    }
    setUploading(true)
    setMessage('')
    try {
      const body = new FormData()
      body.append('file', file)
      body.append('bucket', 'portfolio')
      body.append('alt_text', 'Portfolio hero image')
      const response = await adminFetch('/api/admin/assets/upload', { method: 'POST', body })
      const json = await response.json()
      if (!response.ok) throw new Error(json.error || 'อัปโหลดรูปไม่สำเร็จ')
      const url = json.asset?.public_url
      if (!url) throw new Error('ไม่พบ URL ของรูปที่อัปโหลด')
      setForm((current) => ({ ...current, hero_image_url: url }))
      setMessage('อัปโหลดแล้ว กดบันทึกเพื่อใช้รูปนี้บนหน้าเว็บ')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'อัปโหลดรูปไม่สำเร็จ')
    } finally {
      setUploading(false)
    }
  }

  function handleHeroDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDraggingHero(false)
    const file = event.dataTransfer.files?.[0]
    if (file) uploadHeroImage(file)
  }

  function isPublicBucketHeroUrl(value: string) {
    return value.includes('/storage/v1/object/public/public/')
      || value.includes('/storage/v1/object/public/portfolio/portfolio/hero/')
      || value.includes('/storage/v1/object/public/portfolio/hero/')
  }

  async function resetToDefaults() {
    setResetting(true)
    setMessage('')
    const previousUrl = form.hero_image_url
    try {
      if (previousUrl && previousUrl !== DEFAULTS.hero_image_url && isPublicBucketHeroUrl(previousUrl)) {
        const response = await adminFetch(`/api/admin/assets?public_url=${encodeURIComponent(previousUrl)}`, {
          method: 'DELETE',
        })
        const json = await response.json()
        if (!response.ok) throw new Error(json.error || 'ลบรูปเก่าไม่สำเร็จ')
        setMessage('ลบรูปเก่าออกจาก bucket public แล้ว กดบันทึกเพื่อใช้ค่าเริ่มต้น')
      } else {
        setMessage('กลับไปใช้ค่าเริ่มต้นแล้ว กดบันทึกเพื่อยืนยัน')
      }
      setForm(DEFAULTS)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'รีเซตค่าเริ่มต้นไม่สำเร็จ')
    } finally {
      setResetting(false)
    }
  }

  async function save() {
    setSaving(true)
    setMessage('')
    try {
      const response = await adminFetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await response.json()
      if (!response.ok) throw new Error(json.error || 'บันทึกไม่สำเร็จ')
      setMessage('บันทึกการตั้งค่าหน้าเว็บแล้ว')
      refetch()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <AdminLoading message="กำลังโหลดการตั้งค่าหน้าเว็บ..." />
  if (error) return <AdminError error={error} onRetry={refetch} />

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
      <section className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-black text-foreground">รูป Hero หน้าแรก</h2>
          <p className="mt-1 text-xs text-muted-foreground">เปลี่ยนรูปและเลื่อนตำแหน่งรูปด้านขวาบนหน้า portfolio</p>
        </div>

        <div className="space-y-5 p-5">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-muted-foreground">URL รูป Hero</label>
            <Input
              value={form.hero_image_url}
              onChange={(event) => setForm((current) => ({ ...current, hero_image_url: event.target.value }))}
              placeholder="/porfilio/images/bg-avatar-hero.png"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 text-xs font-bold text-muted-foreground transition hover:border-accent/40 hover:text-accent">
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
              อัปโหลดรูปใหม่
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) uploadHeroImage(file)
                  event.currentTarget.value = ''
                }}
              />
            </label>
            <Button
              type="button"
              variant="outline"
              className="h-9"
              disabled={resetting || uploading || saving}
              onClick={resetToDefaults}
            >
              {resetting ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
              {resetting ? 'กำลังรีเซต...' : 'ค่าเริ่มต้น'}
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {NUMBER_FIELDS.map((field) => {
              const value = form[field.key]
              return (
                <label key={field.key} className="rounded-lg border border-border bg-background p-4">
                  <span className="flex items-center justify-between gap-3 text-xs font-bold text-muted-foreground">
                    {field.label}
                    <span className="font-mono text-foreground">{value}{field.suffix}</span>
                  </span>
                  <input
                    type="range"
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    value={value}
                    onChange={(event) => setForm((current) => ({ ...current, [field.key]: Number(event.target.value) }))}
                    className="mt-3 w-full accent-[#409EFE]"
                  />
                </label>
              )
            })}
          </div>

          {message && (
            <p className="rounded-md border border-border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground">
              {message}
            </p>
          )}

          <Button onClick={save} disabled={saving || uploading} className="h-10 bg-[#409EFE] text-white hover:bg-[#60aeff]">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            บันทึกหน้าเว็บ
          </Button>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-black text-foreground">ตัวอย่าง</h2>
          <p className="mt-1 text-xs text-muted-foreground">พรีวิวตำแหน่งรูปแบบย่อ</p>
        </div>
        <div
          className={`relative h-[360px] overflow-hidden bg-white transition ${
            draggingHero ? 'ring-2 ring-[#409EFE] ring-offset-0' : ''
          }`}
          onDragEnter={(event) => {
            event.preventDefault()
            setDraggingHero(true)
          }}
          onDragOver={(event) => {
            event.preventDefault()
            setDraggingHero(true)
          }}
          onDragLeave={(event) => {
            if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
            setDraggingHero(false)
          }}
          onDrop={handleHeroDrop}
        >
          <div className="absolute inset-0 grid-pattern opacity-70" />
          <div className={`pointer-events-none absolute inset-3 z-30 grid place-items-center rounded-xl border border-dashed border-[#409EFE] bg-[#f6fbff]/85 text-center transition ${
            draggingHero ? 'opacity-100' : 'opacity-0'
          }`}>
            <div>
              <ImagePlus className="mx-auto size-6 text-[#409EFE]" />
              <p className="mt-2 text-sm font-black text-[#09090b]">วางรูปเพื่ออัปโหลด</p>
              <p className="mt-1 text-xs font-semibold text-[#647084]">รูปนี้จะถูกใช้เป็น Hero บนหน้า portfolio</p>
            </div>
          </div>
          <div className="absolute left-6 top-18 z-10 max-w-62">
            <p className="text-2xl font-black text-[#090c13]">CENTERED101</p>
            <p className="mt-3 text-sm font-semibold text-[#747b86]">Learning to build cool things with code</p>
            <div className="mt-8 h-9 rounded-md bg-[#f6f7f9]" />
          </div>
          {form.hero_image_url ? (
            <img
              src={form.hero_image_url}
              alt=""
              className="pointer-events-none absolute bottom-0 right-0 h-[80%] object-contain object-right-bottom"
              style={{
                right: `${form.hero_image_x / 4}px`,
                transform: `translateY(${-form.hero_image_y / 4}px)`,
                width: `${form.hero_image_width}%`,
                maxWidth: `${form.hero_image_max_width / 2}px`,
                opacity: form.hero_image_opacity / 100,
              }}
            />
          ) : null}
        </div>
      </section>
    </div>
  )
}
