'use client'

import { usePageTitle } from '@/lib/hooks/use-page-title'
import { useEffect, useState } from 'react'
import { AlertTriangle, Bell, CheckCircle2, Code2, Globe, Loader2, Palette, Save, Shield, Trash2, User } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { AdminLoading, AdminError } from '@/components/admin/AdminStates'
import { AdminPageContainer, AdminPageHeader } from '@/components/admin/AdminPage'
import { useAdminApi, useAdminMutation } from '@/lib/hooks/useAdminApi'
import { useAdminAuth } from '@/components/admin/AdminAuthProvider'

const TABS = [
  { id: 'general', label: 'ทั่วไป', icon: Globe },
  { id: 'profile', label: 'โปรไฟล์', icon: User },
  { id: 'appearance', label: 'หน้าตา', icon: Palette },
  { id: 'notifications', label: 'แจ้งเตือน', icon: Bell },
  { id: 'security', label: 'ความปลอดภัย', icon: Shield },
  { id: 'integrations', label: 'การเชื่อมต่อ', icon: Code2 },
  { id: 'danger', label: 'โซนอันตราย', icon: AlertTriangle },
] as const

type Tab = (typeof TABS)[number]['id']

type SettingsData = {
  settings: Record<string, unknown>
}

function SectionRow({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 py-4">
      <div className="max-w-xs">
        <p className="text-sm font-medium text-foreground-light">{label}</p>
        {description && <p className="mt-0.5 text-[12px] text-foreground-muted">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function PanelWrap({
  title,
  description,
  onSave,
  saving,
  saved,
  children,
}: {
  title: string
  description: string
  onSave?: () => void
  saving?: boolean
  saved?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center justify-between border-b border-surface-300 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground-light">{title}</h2>
          <p className="mt-0.5 text-[12px] text-foreground-muted">{description}</p>
        </div>
        {onSave && (
          <Button
            onClick={onSave}
            disabled={saving}
            className="h-8 gap-1.5 text-xs text-white disabled:opacity-60"
            style={{ backgroundColor: 'var(--admin-accent)', border: 'none' }}
          >
            <span className="flex items-center gap-1.5">
              {saving
                ? <Loader2 className="size-3 animate-spin" />
                : saved
                  ? <CheckCircle2 className="size-3" />
                  : <Save className="size-3" />}
              <span>{saved ? 'บันทึกแล้ว' : 'บันทึก'}</span>
            </span>
          </Button>
        )}
      </div>
      <div className="px-5">{children}</div>
    </div>
  )
}

type Integration = { name: string; description: string; connected: boolean; hint: string }

function IntegrationsPanel() {
  const { data, loading } = useAdminApi<{ integrations: Integration[] }>('/api/admin/settings/integrations')
  const integrations = data?.integrations ?? []

  return (
    <PanelWrap title="การเชื่อมต่อ" description="บริการภายนอกที่ตรวจจาก environment variables">
      <div className="divide-y divide-[#27272A]/60">
        {loading ? (
          <p className="py-4 text-xs text-[#52525b]">กำลังตรวจการเชื่อมต่อ...</p>
        ) : (
          integrations.map((int) => (
            <SectionRow key={int.name} label={int.name} description={int.description}>
              <div className="flex items-center gap-2">
                {!int.connected && (
                  <span className="font-mono text-[10px] text-[#3f3f46]">{int.hint}</span>
                )}
                <span
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    int.connected
                      ? 'border border-[#22C55E]/20 bg-[#22C55E]/10 text-[#22C55E]'
                      : 'border border-[#27272A] bg-[#09090B] text-[#52525b]'
                  }`}
                >
                  {int.connected ? 'เชื่อมต่อแล้ว' : 'ยังไม่ได้ตั้งค่า'}
                </span>
              </div>
            </SectionRow>
          ))
        )}
      </div>
    </PanelWrap>
  )
}

export default function SettingsPage() {
  usePageTitle('ตั้งค่า')
  const { authInfo, getAdminHeaders } = useAdminAuth()
  const { data, loading, error, refetch } = useAdminApi<SettingsData>('/api/admin/settings')
  const { mutate: patchSettings } = useAdminMutation<Record<string, unknown>>('/api/admin/settings', 'PATCH')
  const [tab, setTab] = useState<Tab>('general')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [dangerLoading, setDangerLoading] = useState<string | null>(null)

  // Local editable state derived from DB settings
  const [general, setGeneral] = useState({
    site_name: 'Centered101',
    site_url: 'https://centered101.com',
    timezone: 'Asia/Bangkok',
    maintenance_mode: false,
    homepage_target: 'portfolio',
    homepage_custom_path: '/',
  })
  const [notifs, setNotifs] = useState({
    deploy_success: true,
    deploy_fail: true,
    security_alerts: true,
    storage_warnings: false,
    github_stars: false,
    weekly_digest: true,
  })
  const [appearance, setAppearance] = useState({
    accent_color: '#409EFE',
    compact_sidebar: false,
    reduced_motion: false,
  })
  const [profile, setProfile] = useState({
    display_name: authInfo?.displayName || '',
    email: authInfo?.email || '',
    github_username: authInfo?.githubUsername || '',
  })
  const [security, setSecurity] = useState({
    session_timeout: '6 hours',
    github_oauth: true,
    ip_allowlist: false,
    force_https: true,
  })

  // Apply appearance to DOM + localStorage whenever values change
  useEffect(() => {
    localStorage.setItem('admin_compact_sidebar', String(appearance.compact_sidebar))
    localStorage.setItem('admin_reduced_motion', String(appearance.reduced_motion))
    localStorage.setItem('admin_accent_color', appearance.accent_color)
    document.documentElement.style.setProperty('--admin-accent', appearance.accent_color)
    document.documentElement.classList.toggle('reduce-motion', appearance.reduced_motion)
    window.dispatchEvent(new CustomEvent('admin-appearance-change', { detail: appearance }))
  }, [appearance.compact_sidebar, appearance.reduced_motion, appearance.accent_color])

  // Hydrate from DB once loaded
  useEffect(() => {
    if (!data) return
    const s = data.settings
    setGeneral({
      site_name: (s.site_name as string) ?? 'Centered101',
      site_url: (s.site_url as string) ?? 'https://centered101.com',
      timezone: (s.timezone as string) ?? 'Asia/Bangkok',
      maintenance_mode: (s.maintenance_mode as boolean) ?? false,
      homepage_target: (s.homepage_target as string) ?? 'portfolio',
      homepage_custom_path: (s.homepage_custom_path as string) ?? '/',
    })
    const n = s.notifications as Record<string, boolean> | undefined
    if (n) {
      setNotifs({
        deploy_success: n.deploy_success ?? true,
        deploy_fail: n.deploy_fail ?? true,
        security_alerts: n.security_alerts ?? true,
        storage_warnings: n.storage_warnings ?? false,
        github_stars: n.github_stars ?? false,
        weekly_digest: n.weekly_digest ?? true,
      })
    }
    const a = s.appearance as Record<string, unknown> | undefined
    if (a) {
      setAppearance({
        accent_color: (a.accent_color as string) ?? '#409EFE',
        compact_sidebar: (a.compact_sidebar as boolean) ?? false,
        reduced_motion: (a.reduced_motion as boolean) ?? false,
      })
    }
    // Profile is hydrated from authInfo (admin_users), not system_settings
    const sec = s.security as Record<string, unknown> | undefined
    if (sec) {
      setSecurity({
        session_timeout: (sec.session_timeout as string) ?? '6 hours',
        github_oauth: (sec.github_oauth as boolean) ?? true,
        ip_allowlist: (sec.ip_allowlist as boolean) ?? false,
        force_https: (sec.force_https as boolean) ?? true,
      })
    }
  }, [data])

  async function save(payload: Record<string, unknown>) {
    setSaving(true)
    setSaved(false)
    try {
      await patchSettings(payload)
      setSaved(true)
      toast.success('บันทึกการตั้งค่าแล้ว')
      setTimeout(() => setSaved(false), 2500)
      refetch()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function saveProfile() {
    if (!authInfo?.adminUserId) { toast.error('ไม่พบ ID ผู้ดูแล'); return }
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch(`/api/admin/users?id=${authInfo.adminUserId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAdminHeaders() },
        body: JSON.stringify({
          display_name: profile.display_name || null,
          email: profile.email || null,
          github_username: profile.github_username || null,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setSaved(true)
      toast.success('อัปเดตโปรไฟล์แล้ว')
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function dangerAction(action: string, label: string) {
    setDangerLoading(action)
    try {
      const res = await fetch('/api/admin/settings/danger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAdminHeaders() },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success(`ทำรายการ ${label} เสร็จแล้ว`)
      refetch()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setDangerLoading(null)
    }
  }

  if (loading) return <AdminLoading message="กำลังโหลดการตั้งค่า..." />
  if (error) return <AdminError error={error} onRetry={refetch} />

  const notifLabels: Record<keyof typeof notifs, string> = {
    deploy_success: 'Deploy สำเร็จ',
    deploy_fail: 'Deploy ไม่สำเร็จ',
    security_alerts: 'แจ้งเตือนความปลอดภัย',
    storage_warnings: 'เตือนพื้นที่จัดเก็บ',
    github_stars: 'ดาว GitHub ใหม่',
    weekly_digest: 'สรุปรายสัปดาห์',
  }

  return (
    <AdminPageContainer>
      <AdminPageHeader
        title="ตั้งค่า"
        description="ตั้งค่าระบบหลักของแพลตฟอร์ม บันทึกไว้ใน Supabase"
      />

      <div className="flex gap-5 max-xl:flex-col">
        {/* Tab list */}
        <div className="shrink-0 xl:w-48">
          <nav className="flex flex-wrap gap-1 xl:flex-col">
            {TABS.map((t) => {
              const Icon = t.icon
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
                    t.id === 'danger'
                      ? tab === t.id
                        ? 'bg-[#EF4444]/10 text-[#EF4444]'
                        : 'text-[#EF4444]/60 hover:bg-[#EF4444]/10 hover:text-[#EF4444]'
                      : tab === t.id
                        ? 'bg-[#409EFE]/10 text-[#409EFE]'
                        : 'text-[#A1A1AA] hover:bg-[#18181B] hover:text-[#FAFAFA]'
                  }`}
                >
                  <Icon className="size-4 shrink-0" />
                  {t.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Tab panels */}
        <div className="min-w-0 flex-1 rounded-xl border border-surface-300 bg-surface-100">
          {tab === 'general' && (
            <PanelWrap
              title="ทั่วไป"
              description="ตั้งค่าเว็บไซต์และแพลตฟอร์ม"
              onSave={() =>
                save({
                  site_name: general.site_name,
                  site_url: general.site_url,
                  timezone: general.timezone,
                  maintenance_mode: general.maintenance_mode,
                  homepage_target: general.homepage_target,
                  homepage_custom_path: general.homepage_custom_path,
                })
              }
              saving={saving}
              saved={saved}
            >
              <div className="divide-y divide-[#27272A]/60">
                <SectionRow label="ชื่อเว็บไซต์" description="ชื่อสาธารณะที่แสดงบนแท็บเบราว์เซอร์">
                  <Input
                    value={general.site_name}
                    onChange={(e) => setGeneral((p) => ({ ...p, site_name: e.target.value }))}
                    className="h-9 w-56 border-[#27272A] bg-[#09090B] text-sm text-[#FAFAFA] focus-visible:ring-[#409EFE]/30"
                  />
                </SectionRow>
                <SectionRow label="URL เว็บไซต์" description="โดเมนหลักของแพลตฟอร์ม">
                  <Input
                    value={general.site_url}
                    onChange={(e) => setGeneral((p) => ({ ...p, site_url: e.target.value }))}
                    className="h-9 w-56 border-[#27272A] bg-[#09090B] text-sm text-[#FAFAFA] focus-visible:ring-[#409EFE]/30"
                  />
                </SectionRow>
                <SectionRow label="โซนเวลา" description="ใช้กับสถิติและการจัดเวลา">
                  <Input
                    value={general.timezone}
                    onChange={(e) => setGeneral((p) => ({ ...p, timezone: e.target.value }))}
                    className="h-9 w-56 border-[#27272A] bg-[#09090B] text-sm text-[#FAFAFA] focus-visible:ring-[#409EFE]/30"
                  />
                </SectionRow>
                <SectionRow label="หน้าแรกของเว็บ" description="กำหนดว่า centered101.com/ จะ redirect ไปส่วนไหน">
                  <select
                    value={general.homepage_target}
                    onChange={(e) => setGeneral((p) => ({ ...p, homepage_target: e.target.value }))}
                    className="h-9 w-56 rounded-md border border-[#27272A] bg-[#09090B] px-3 text-sm text-[#FAFAFA] focus:outline-none focus:ring-2 focus:ring-[#409EFE]/30"
                  >
                    <option value="hub">Hub / รายการ public subdomain</option>
                    <option value="portfolio">Portfolio - portfolio.centered101.com</option>
                    <option value="shop">Shop - shop.centered101.com</option>
                    <option value="dashboard">System Dashboard</option>
                    <option value="newtab">NewTab - newtab.centered101.com</option>
                    <option value="custom">Path กำหนดเอง</option>
                  </select>
                </SectionRow>
                {general.homepage_target === 'custom' && (
                  <SectionRow label="Path หน้าแรกแบบกำหนดเอง" description="ต้องขึ้นต้นด้วย / และไม่สามารถชี้ไปหน้า admin">
                    <Input
                      value={general.homepage_custom_path}
                      onChange={(e) => setGeneral((p) => ({ ...p, homepage_custom_path: e.target.value }))}
                      className="h-9 w-56 border-[#27272A] bg-[#09090B] text-sm text-[#FAFAFA] focus-visible:ring-[#409EFE]/30"
                    />
                  </SectionRow>
                )}
                <SectionRow label="โหมดปิดปรับปรุง" description="แสดงแถบแจ้งเตือนปิดปรับปรุงให้ผู้เข้าชม">
                  <Switch
                    checked={general.maintenance_mode}
                    onCheckedChange={(v) => setGeneral((p) => ({ ...p, maintenance_mode: v }))}
                  />
                </SectionRow>
              </div>
            </PanelWrap>
          )}

          {tab === 'profile' && (
            <PanelWrap
              title="โปรไฟล์"
              description="อัปเดตข้อมูลผู้ดูแลในตาราง admin_users"
              onSave={saveProfile}
              saving={saving}
              saved={saved}
            >
              <div className="divide-y divide-[#27272A]/60">
                <SectionRow label="ชื่อที่แสดง">
                  <Input
                    value={profile.display_name}
                    onChange={(e) => setProfile((p) => ({ ...p, display_name: e.target.value }))}
                    className="h-9 w-56 border-[#27272A] bg-[#09090B] text-sm text-[#FAFAFA] focus-visible:ring-[#409EFE]/30"
                  />
                </SectionRow>
                <SectionRow label="อีเมล" description="ใช้กับแจ้งเตือนและการยืนยันตัวตน">
                  <Input
                    value={profile.email}
                    onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                    type="email"
                    className="h-9 w-56 border-[#27272A] bg-[#09090B] text-sm text-[#FAFAFA] focus-visible:ring-[#409EFE]/30"
                  />
                </SectionRow>
                <SectionRow label="ชื่อผู้ใช้ GitHub">
                  <Input
                    value={profile.github_username}
                    onChange={(e) => setProfile((p) => ({ ...p, github_username: e.target.value }))}
                    className="h-9 w-56 border-[#27272A] bg-[#09090B] text-sm text-[#FAFAFA] focus-visible:ring-[#409EFE]/30"
                  />
                </SectionRow>
              </div>
            </PanelWrap>
          )}

          {tab === 'appearance' && (
            <PanelWrap
              title="หน้าตา"
              description="ธีม สี และความหนาแน่นของหน้าจัดการ"
              onSave={() => save({ appearance })}
              saving={saving}
              saved={saved}
            >
              <div className="divide-y divide-[#27272A]/60">
                <SectionRow label="สีหลัก" description="สี accent ของหน้าแอดมิน">
                  <div className="flex gap-2">
                    {['#409EFE', '#22C55E', '#8B5CF6', '#F59E0B'].map((color) => (
                      <button
                        key={color}
                        onClick={() => setAppearance((p) => ({ ...p, accent_color: color }))}
                        className={`size-8 rounded-full border-2 transition-all hover:scale-105 ${
                          appearance.accent_color === color ? 'scale-110 border-white' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                        aria-label={color}
                      />
                    ))}
                  </div>
                </SectionRow>
                <SectionRow label="Sidebar แบบกระชับ" description="ลด sidebar ให้เหลือมุมมองไอคอน">
                  <Switch
                    checked={appearance.compact_sidebar}
                    onCheckedChange={(v) => setAppearance((p) => ({ ...p, compact_sidebar: v }))}
                  />
                </SectionRow>
                <SectionRow label="ลดแอนิเมชัน" description="ปิด transition animation">
                  <Switch
                    checked={appearance.reduced_motion}
                    onCheckedChange={(v) => setAppearance((p) => ({ ...p, reduced_motion: v }))}
                  />
                </SectionRow>
              </div>
            </PanelWrap>
          )}

          {tab === 'notifications' && (
            <PanelWrap
              title="แจ้งเตือน"
              description="เลือกเหตุการณ์ที่จะส่งแจ้งเตือน บันทึกใน system_settings"
              onSave={() => save({ notifications: notifs })}
              saving={saving}
              saved={saved}
            >
              <div className="divide-y divide-[#27272A]/60">
                {(Object.keys(notifs) as (keyof typeof notifs)[]).map((key) => (
                  <SectionRow key={key} label={notifLabels[key]}>
                    <Switch
                      checked={notifs[key]}
                      onCheckedChange={(v) => setNotifs((p) => ({ ...p, [key]: v }))}
                    />
                  </SectionRow>
                ))}
              </div>
            </PanelWrap>
          )}

          {tab === 'security' && (
            <PanelWrap
              title="ความปลอดภัย"
              description="จัดการ auth และ session"
              onSave={() => save({ security })}
              saving={saving}
              saved={saved}
            >
              <div className="divide-y divide-[#27272A]/60">
                <SectionRow label="หมดเวลาเซสชัน" description="ออกจากระบบอัตโนมัติหลังไม่มีการใช้งาน">
                  <Input
                    value={security.session_timeout}
                    onChange={(e) => setSecurity((p) => ({ ...p, session_timeout: e.target.value }))}
                    className="h-9 w-40 border-[#27272A] bg-[#09090B] text-sm text-[#FAFAFA] focus-visible:ring-[#409EFE]/30"
                  />
                </SectionRow>
                <SectionRow label="GitHub OAuth" description="อนุญาตให้ผู้ดูแลเข้าสู่ระบบด้วย GitHub">
                  <Switch
                    checked={security.github_oauth}
                    onCheckedChange={(v) => setSecurity((p) => ({ ...p, github_oauth: v }))}
                  />
                </SectionRow>
                <SectionRow label="รายการ IP ที่อนุญาต" description="จำกัดการเข้าแอดมินตาม IP">
                  <Switch
                    checked={security.ip_allowlist}
                    onCheckedChange={(v) => setSecurity((p) => ({ ...p, ip_allowlist: v }))}
                  />
                </SectionRow>
                <SectionRow label="บังคับ HTTPS" description="เปลี่ยน HTTP ทั้งหมดไปเป็น HTTPS">
                  <Switch
                    checked={security.force_https}
                    onCheckedChange={(v) => setSecurity((p) => ({ ...p, force_https: v }))}
                  />
                </SectionRow>
              </div>
            </PanelWrap>
          )}

          {tab === 'integrations' && (
            <IntegrationsPanel />
          )}

          {tab === 'danger' && (
            <div>
              <div className="border-b border-[#EF4444]/20 px-5 py-4">
                <h2 className="text-sm font-semibold text-[#EF4444]">โซนอันตราย</h2>
                <p className="mt-0.5 text-[12px] text-[#52525b]">คำสั่งที่ย้อนกลับไม่ได้ โปรดตรวจให้ดีก่อนกด</p>
              </div>
              <div className="divide-y divide-[#27272A]/60 px-5">
                {[
                  {
                    action: 'revoke_all_sessions',
                    label: 'ยกเลิกทุกเซสชัน',
                    description: 'ออกจากระบบทุกเซสชันของผู้ดูแลทันที',
                    icon: Shield,
                  },
                  {
                    action: 'clear_audit_logs',
                    label: 'ลบบันทึกเก่า',
                    description: 'ลบบันทึกการทำงานที่เก่ากว่า 30 วัน',
                    icon: Trash2,
                  },
                  {
                    action: 'reset_settings',
                    label: 'รีเซ็ตการตั้งค่าทั้งหมด',
                    description: 'ล้างข้อมูลใน system_settings แล้วโหลดค่าเริ่มต้นใหม่',
                    icon: AlertTriangle,
                  },
                ].map(({ action, label, description, icon: Icon }) => (
                  <div key={action} className="flex flex-wrap items-start justify-between gap-4 py-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg border border-destructive/20 bg-destructive/10">
                        <Icon className="size-3.5 text-destructive" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground-light">{label}</p>
                        <p className="mt-0.5 text-[12px] text-foreground-muted">{description}</p>
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={dangerLoading === action}
                      onClick={() => dangerAction(action, label)}
                      className="h-8 text-xs disabled:opacity-50"
                    >
                      {dangerLoading === action
                        ? <Loader2 className="size-3 animate-spin" />
                        : label}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminPageContainer>
  )
}
