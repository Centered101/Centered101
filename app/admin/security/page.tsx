'use client'

import { usePageTitle } from '@/lib/hooks/use-page-title'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Ban, CheckCircle2, Copy, ShieldCheck, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { UserAvatar } from '@/components/admin/UserAvatar'
import { AdminLoading, AdminError, AdminEmpty } from '@/components/admin/AdminStates'
import { AdminPageContainer, AdminPageHeader } from '@/components/admin/AdminPage'
import { useAdminApi } from '@/lib/hooks/useAdminApi'
import { useAdminAuth } from '@/components/admin/AdminAuthProvider'
import { useAdminRealtime } from '@/lib/hooks/useAdminRealtime'

type AdminUser = {
  id: string
  email: string | null
  github_username: string | null
  display_name: string | null
  avatar_url: string | null
  status: string
  is_locked: boolean
  last_login_at: string | null
  roles: string[]
}

type Session = {
  id: string
  admin_user_id: string | null
  provider: string
  ip_address: string | null
  last_seen_at: string
  expires_at: string | null
}

type SecurityEvent = {
  id: string
  severity: string
  event_type: string
  message: string | null
  ip_address: string | null
  resolved: boolean
  created_at: string
}

type LoginLog = {
  id: string
  provider: string
  email: string | null
  github_username: string | null
  outcome: string
  ip_address: string | null
  created_at: string
}

type SecurityData = {
  adminUsers: AdminUser[]
  sessions: Session[]
  securityEvents: SecurityEvent[]
  loginLogs: LoginLog[]
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function SecurityPage() {
  usePageTitle('Security')
  const router = useRouter()
  const { getAdminHeaders } = useAdminAuth()
  const { data, loading, error, refetch } = useAdminApi<SecurityData>('/api/admin/security')
  const [copied, setCopied] = useState<string | null>(null)
  const [actingId, setActingId] = useState<string | null>(null)
  useAdminRealtime(['admin_security_events', 'admin_login_logs'], refetch)

  if (loading) return <AdminLoading message="Loading security data..." />
  if (error) return <AdminError error={error} onRetry={refetch} />

  const { adminUsers, sessions, securityEvents, loginLogs } = data!

  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  async function revokeSession(id: string) {
    setActingId(id)
    try {
      const res = await fetch('/api/admin/security?action=revoke_session', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAdminHeaders() },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Session revoked')
      refetch()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setActingId(null)
    }
  }

  async function resolveEvent(id: string) {
    setActingId(id)
    try {
      const res = await fetch('/api/admin/security?action=resolve_event', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAdminHeaders() },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Event marked as resolved')
      refetch()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setActingId(null)
    }
  }

  return (
    <AdminPageContainer>
      <AdminPageHeader title="Security & Access" description="Admin users, sessions, and security events from Supabase" />

      {/* Admin users */}
      <div className="rounded-xl border border-[#27272A] bg-[#18181B]">
        <div className="flex items-center justify-between border-b border-[#27272A] px-5 py-4">
          <h2 className="text-sm font-semibold text-[#FAFAFA]">Admin Users ({adminUsers.length})</h2>
          <button
            onClick={() => router.push('/admin/users')}
            className="rounded-lg bg-[#409EFE] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#60aeff]"
          >
            Manage Users
          </button>
        </div>
        {adminUsers.length === 0 ? (
          <AdminEmpty title="No admin users" description="Admin accounts will appear here after first login" />
        ) : (
          <div className="divide-y divide-[#27272A]/50">
            {adminUsers.map((user) => (
              <div key={user.id} className="flex flex-wrap items-center gap-4 px-5 py-4 hover:bg-[#27272A]/20">
                <UserAvatar avatarUrl={user.avatar_url} name={user.display_name || user.github_username || user.email || 'A'} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-[#FAFAFA]">
                      {user.display_name || user.github_username || user.email}
                    </span>
                    {user.roles.map((r) => (
                      <StatusBadge key={r} status={r} />
                    ))}
                    <StatusBadge status={user.is_locked ? 'locked' : user.status} />
                  </div>
                  <p className="text-[11px] text-[#52525b]">{user.email || user.github_username || '—'}</p>
                </div>
                <div className="text-right text-[11px]">
                  <p className="text-[#A1A1AA]">
                    {sessions.filter((s) => s.admin_user_id === user.id).length} active session(s)
                  </p>
                  <p className="text-[#3f3f46]">
                    {user.last_login_at ? `Last login ${timeAgo(user.last_login_at)}` : 'Never logged in'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active sessions + security events */}
      <div className="grid gap-4 xl:grid-cols-2">
        {/* Sessions */}
        <div className="rounded-xl border border-[#27272A] bg-[#18181B]">
          <div className="border-b border-[#27272A] px-5 py-4">
            <h2 className="text-sm font-semibold text-[#FAFAFA]">Active Sessions ({sessions.length})</h2>
          </div>
          {sessions.length === 0 ? (
            <AdminEmpty title="No active sessions" />
          ) : (
            <div className="divide-y divide-[#27272A]/50">
              {sessions.map((s) => (
                <div key={s.id} className="flex items-center gap-3 px-5 py-3 hover:bg-[#27272A]/20">
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium text-[#FAFAFA] capitalize">{s.provider}</p>
                    <p className="font-mono text-[10px] text-[#52525b]">{s.ip_address || 'unknown IP'}</p>
                  </div>
                  <div className="text-right text-[11px]">
                    <p className="text-[#A1A1AA]">Active {timeAgo(s.last_seen_at)}</p>
                    {s.expires_at && (
                      <p className="text-[#3f3f46]">
                        Expires {new Date(s.expires_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => revokeSession(s.id)}
                    disabled={actingId === s.id}
                    title="Revoke session"
                    className="grid size-7 shrink-0 place-items-center rounded-lg border border-[#27272A] bg-[#09090B] text-[#52525b] hover:border-[#EF4444]/30 hover:text-[#EF4444] disabled:opacity-40"
                  >
                    <Ban className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Security events */}
        <div className="rounded-xl border border-[#27272A] bg-[#18181B]">
          <div className="border-b border-[#27272A] px-5 py-4">
            <h2 className="text-sm font-semibold text-[#FAFAFA]">Security Events</h2>
          </div>
          {securityEvents.length === 0 ? (
            <AdminEmpty title="No security events" description="Suspicious activity will appear here" />
          ) : (
            <div className="divide-y divide-[#27272A]/50">
              {securityEvents.map((evt) => (
                <div key={evt.id} className="flex items-center gap-3 px-5 py-3 hover:bg-[#27272A]/20">
                  {evt.resolved ? (
                    <CheckCircle2 className="size-4 shrink-0 text-[#22C55E]" />
                  ) : (
                    <XCircle className="size-4 shrink-0 text-[#EF4444]" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[12px] font-medium text-[#FAFAFA]">{evt.event_type}</p>
                      <span className={`rounded px-1.5 py-px text-[9px] font-semibold uppercase ${
                        evt.severity === 'critical' ? 'bg-[#EF4444]/15 text-[#EF4444]'
                        : evt.severity === 'high' ? 'bg-[#F59E0B]/15 text-[#F59E0B]'
                        : 'bg-[#27272A] text-[#52525b]'
                      }`}>{evt.severity}</span>
                    </div>
                    {evt.message && <p className="truncate text-[11px] text-[#52525b]">{evt.message}</p>}
                  </div>
                  <span className="shrink-0 text-[11px] text-[#3f3f46]">
                    {timeAgo(evt.created_at)}
                  </span>
                  {!evt.resolved && (
                    <button
                      onClick={() => resolveEvent(evt.id)}
                      disabled={actingId === evt.id}
                      title="Mark as resolved"
                      className="grid size-7 shrink-0 place-items-center rounded-lg border border-[#27272A] bg-[#09090B] text-[#52525b] hover:border-[#22C55E]/30 hover:text-[#22C55E] disabled:opacity-40"
                    >
                      <ShieldCheck className="size-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Login history */}
      <div className="rounded-xl border border-[#27272A] bg-[#18181B]">
        <div className="border-b border-[#27272A] px-5 py-4">
          <h2 className="text-sm font-semibold text-[#FAFAFA]">Login History</h2>
        </div>
        {loginLogs.length === 0 ? (
          <AdminEmpty title="No login history" description="Login attempts will appear here" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-[#27272A] text-[10px] font-semibold uppercase tracking-widest text-[#3f3f46]">
                  <th className="px-5 py-3">Identity</th>
                  <th className="px-4 py-3">Provider</th>
                  <th className="px-4 py-3">Outcome</th>
                  <th className="px-4 py-3">IP</th>
                  <th className="px-4 py-3">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272A]/50">
                {loginLogs.map((log) => (
                  <tr key={log.id} className="transition-colors hover:bg-[#27272A]/20">
                    <td className="px-5 py-3 text-[12px] text-[#A1A1AA]">
                      {log.github_username || log.email || 'unknown'}
                    </td>
                    <td className="px-4 py-3 text-[12px] capitalize text-[#52525b]">{log.provider}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[12px] font-semibold capitalize ${
                          log.outcome === 'success' ? 'text-[#22C55E]' : log.outcome === 'blocked' ? 'text-[#F59E0B]' : 'text-[#EF4444]'
                        }`}
                      >
                        {log.outcome}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-[#3f3f46]">
                      <button
                        onClick={() => log.ip_address && copyText(log.ip_address, log.id)}
                        className="flex items-center gap-1 hover:text-[#A1A1AA]"
                      >
                        {log.ip_address || '—'}
                        {log.ip_address && (
                          copied === log.id
                            ? <CheckCircle2 className="size-3 text-[#22C55E]" />
                            : <Copy className="size-3 opacity-50" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-[#3f3f46]">
                      {timeAgo(log.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminPageContainer>
  )
}
