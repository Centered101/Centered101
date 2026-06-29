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
  { id: 'general', label: 'General', icon: Globe },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'integrations', label: 'Integrations', icon: Code2 },
  { id: 'danger', label: 'Danger Zone', icon: AlertTriangle },
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
              <span>{saved ? 'Saved' : 'Save'}</span>
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
    <PanelWrap title="Integrations" description="External services connected via environment variables">
      <div className="divide-y divide-[#27272A]/60">
        {loading ? (
          <p className="py-4 text-xs text-[#52525b]">Checking connections...</p>
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
                  {int.connected ? 'Connected' : 'Not configured'}
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
  usePageTitle('Settings')
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
    session_timeout: '24 hours',
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
        session_timeout: (sec.session_timeout as string) ?? '24 hours',
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
      toast.success('Settings saved')
      setTimeout(() => setSaved(false), 2500)
      refetch()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function saveProfile() {
    if (!authInfo?.adminUserId) { toast.error('No admin user ID'); return }
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
      toast.success('Profile updated')
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
      toast.success(`${label} completed`)
      refetch()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setDangerLoading(null)
    }
  }

  if (loading) return <AdminLoading message="Loading settings..." />
  if (error) return <AdminError error={error} onRetry={refetch} />

  const notifLabels: Record<keyof typeof notifs, string> = {
    deploy_success: 'Successful deployments',
    deploy_fail: 'Failed deployments',
    security_alerts: 'Security alerts',
    storage_warnings: 'Storage warnings',
    github_stars: 'New GitHub stars',
    weekly_digest: 'Weekly analytics digest',
  }

  return (
    <AdminPageContainer>
      <AdminPageHeader
        title="Settings"
        description="Configure your ecosystem platform — saved to Supabase"
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
              title="General"
              description="Site and platform settings"
              onSave={() =>
                save({
                  site_name: general.site_name,
                  site_url: general.site_url,
                  timezone: general.timezone,
                  maintenance_mode: general.maintenance_mode,
                })
              }
              saving={saving}
              saved={saved}
            >
              <div className="divide-y divide-[#27272A]/60">
                <SectionRow label="Site Name" description="Public name shown in browser tabs">
                  <Input
                    value={general.site_name}
                    onChange={(e) => setGeneral((p) => ({ ...p, site_name: e.target.value }))}
                    className="h-9 w-56 border-[#27272A] bg-[#09090B] text-sm text-[#FAFAFA] focus-visible:ring-[#409EFE]/30"
                  />
                </SectionRow>
                <SectionRow label="Site URL" description="Primary domain for the platform">
                  <Input
                    value={general.site_url}
                    onChange={(e) => setGeneral((p) => ({ ...p, site_url: e.target.value }))}
                    className="h-9 w-56 border-[#27272A] bg-[#09090B] text-sm text-[#FAFAFA] focus-visible:ring-[#409EFE]/30"
                  />
                </SectionRow>
                <SectionRow label="Timezone" description="Used for analytics and scheduling">
                  <Input
                    value={general.timezone}
                    onChange={(e) => setGeneral((p) => ({ ...p, timezone: e.target.value }))}
                    className="h-9 w-56 border-[#27272A] bg-[#09090B] text-sm text-[#FAFAFA] focus-visible:ring-[#409EFE]/30"
                  />
                </SectionRow>
                <SectionRow label="Maintenance Mode" description="Show a maintenance banner to visitors">
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
              title="Profile"
              description="Updates your admin_users record directly"
              onSave={saveProfile}
              saving={saving}
              saved={saved}
            >
              <div className="divide-y divide-[#27272A]/60">
                <SectionRow label="Display Name">
                  <Input
                    value={profile.display_name}
                    onChange={(e) => setProfile((p) => ({ ...p, display_name: e.target.value }))}
                    className="h-9 w-56 border-[#27272A] bg-[#09090B] text-sm text-[#FAFAFA] focus-visible:ring-[#409EFE]/30"
                  />
                </SectionRow>
                <SectionRow label="Email" description="Used for notifications and auth">
                  <Input
                    value={profile.email}
                    onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                    type="email"
                    className="h-9 w-56 border-[#27272A] bg-[#09090B] text-sm text-[#FAFAFA] focus-visible:ring-[#409EFE]/30"
                  />
                </SectionRow>
                <SectionRow label="GitHub Username">
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
              title="Appearance"
              description="Visual theme and density"
              onSave={() => save({ appearance })}
              saving={saving}
              saved={saved}
            >
              <div className="divide-y divide-[#27272A]/60">
                <SectionRow label="Accent Color" description="Admin interface accent color">
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
                <SectionRow label="Compact Sidebar" description="Reduce sidebar to icon-only view">
                  <Switch
                    checked={appearance.compact_sidebar}
                    onCheckedChange={(v) => setAppearance((p) => ({ ...p, compact_sidebar: v }))}
                  />
                </SectionRow>
                <SectionRow label="Reduced Motion" description="Disable transition animations">
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
              title="Notifications"
              description="Choose what triggers alerts — saved to system_settings"
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
              title="Security"
              description="Auth and session management"
              onSave={() => save({ security })}
              saving={saving}
              saved={saved}
            >
              <div className="divide-y divide-[#27272A]/60">
                <SectionRow label="Session Timeout" description="Auto-logout after inactivity">
                  <Input
                    value={security.session_timeout}
                    onChange={(e) => setSecurity((p) => ({ ...p, session_timeout: e.target.value }))}
                    className="h-9 w-40 border-[#27272A] bg-[#09090B] text-sm text-[#FAFAFA] focus-visible:ring-[#409EFE]/30"
                  />
                </SectionRow>
                <SectionRow label="GitHub OAuth" description="Allow GitHub login for admins">
                  <Switch
                    checked={security.github_oauth}
                    onCheckedChange={(v) => setSecurity((p) => ({ ...p, github_oauth: v }))}
                  />
                </SectionRow>
                <SectionRow label="IP Allowlist" description="Restrict admin access by IP">
                  <Switch
                    checked={security.ip_allowlist}
                    onCheckedChange={(v) => setSecurity((p) => ({ ...p, ip_allowlist: v }))}
                  />
                </SectionRow>
                <SectionRow label="Force HTTPS" description="Redirect all HTTP to HTTPS">
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
                <h2 className="text-sm font-semibold text-[#EF4444]">Danger Zone</h2>
                <p className="mt-0.5 text-[12px] text-[#52525b]">Irreversible actions — proceed with caution</p>
              </div>
              <div className="divide-y divide-[#27272A]/60 px-5">
                {[
                  {
                    action: 'revoke_all_sessions',
                    label: 'Revoke All Sessions',
                    description: 'Sign out all active admin sessions immediately',
                    icon: Shield,
                  },
                  {
                    action: 'clear_audit_logs',
                    label: 'Clear Old Audit Logs',
                    description: 'Delete audit log entries older than 30 days',
                    icon: Trash2,
                  },
                  {
                    action: 'reset_settings',
                    label: 'Reset All Settings',
                    description: 'Wipe every row in system_settings — defaults will reload',
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
