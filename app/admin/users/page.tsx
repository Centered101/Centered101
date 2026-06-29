'use client'

import { usePageTitle } from '@/lib/hooks/use-page-title'
import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Search, UserPlus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { AdminLoading, AdminError, AdminEmpty } from '@/components/admin/AdminStates'
import { AdminPagination } from '@/components/admin/AdminPagination'
import { ConfirmModal } from '@/components/admin/ConfirmModal'
import { UserAvatar } from '@/components/admin/UserAvatar'
import { useAdminApi, useAdminMutation } from '@/lib/hooks/useAdminApi'
import { useAdminAuth } from '@/components/admin/AdminAuthProvider'
import { useAdminRealtime } from '@/lib/hooks/useAdminRealtime'
import { AdminPageContainer, AdminPageHeader } from '@/components/admin/AdminPage'

type AdminUser = {
  id: string
  email: string | null
  github_username: string | null
  display_name: string | null
  avatar_url: string | null
  status: string
  is_locked: boolean
  roles: string[]
  last_login_at: string | null
  created_at: string
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

const ROLES = ['owner', 'administrator', 'developer', 'editor', 'moderator', 'support', 'member', 'guest'] as const

export default function UsersPage() {
  usePageTitle('Users')
  const { getAdminHeaders } = useAdminAuth()
  const { data, loading, error, refetch } = useAdminApi<{ users: AdminUser[] }>('/api/admin/users')
  const { mutate: patchUser } = useAdminMutation<{ status: string }>('/api/admin/users', 'PATCH')

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10
  useAdminRealtime(['admin_users'], refetch)
  const [suspendTarget, setSuspendTarget] = useState<AdminUser | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [inviteForm, setInviteForm] = useState({ github_username: '', email: '', display_name: '', role: 'member' })

  if (loading) return <AdminLoading message="Loading users..." />
  if (error) return <AdminError error={error} onRetry={refetch} />

  const users = data?.users ?? []
  const filtered = users.filter(
    (u) =>
      (u.display_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (u.github_username ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (u.email ?? '').toLowerCase().includes(search.toLowerCase())
  )
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  async function handleSuspend(user: AdminUser) {
    const newStatus = user.status === 'suspended' ? 'active' : 'suspended'
    try {
      await patchUser({ status: newStatus }, { id: user.id })
      toast.success(newStatus === 'suspended' ? `Suspended ${user.display_name || user.github_username}` : `Reinstated ${user.display_name || user.github_username}`)
      setSuspendTarget(null)
      refetch()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const displayName = (u: AdminUser) => u.display_name || u.github_username || u.email || 'Unknown'

  async function handleInvite() {
    if (!inviteForm.github_username.trim() && !inviteForm.email.trim()) {
      toast.error('Enter a GitHub username or email')
      return
    }
    setInviting(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAdminHeaders() },
        body: JSON.stringify(inviteForm),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to invite user')
      toast.success(`Invited ${inviteForm.github_username || inviteForm.email}`)
      setInviteOpen(false)
      setInviteForm({ github_username: '', email: '', display_name: '', role: 'member' })
      refetch()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setInviting(false)
    }
  }

  return (
    <AdminPageContainer>
      <AdminPageHeader title="Admin Users" description={`${users.length} accounts from Supabase`}>
        <Button
          size="sm"
          className="h-8 gap-1.5 bg-[#409EFE] text-xs font-semibold text-white hover:bg-[#60aeff]"
          onClick={() => setInviteOpen(true)}
        >
          <UserPlus className="size-3.5" />
          Invite User
        </Button>
      </AdminPageHeader>

      <div className="rounded-xl border border-[#27272A] bg-[#18181B]">
        <div className="flex flex-wrap items-center gap-3 border-b border-[#27272A] px-5 py-3.5">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 size-3 -translate-y-1/2 text-[#3f3f46]" />
            <Input
              placeholder="Search by name, username, or email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="h-8 border-[#27272A] bg-[#09090B] pl-8 text-xs text-[#FAFAFA] placeholder:text-[#3f3f46] focus-visible:ring-[#409EFE]/30"
            />
          </div>
          <span className="rounded border border-[#27272A] bg-[#09090B] px-2 py-1 text-[11px] text-[#52525b]">
            {filtered.length} results
          </span>
        </div>

        {filtered.length === 0 ? (
          <AdminEmpty title="No users found" description="Admin accounts appear here after first login" />
        ) : (
          <div className="divide-y divide-[#27272A]/50">
            {paged.map((user) => (
              <div key={user.id} className="flex flex-wrap items-center gap-4 px-5 py-4 hover:bg-[#27272A]/20">
                <UserAvatar avatarUrl={user.avatar_url} githubUsername={user.github_username} name={displayName(user)} />

                {/* Identity */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-[#FAFAFA]">{displayName(user)}</span>
                    {user.roles.map((r) => <StatusBadge key={r} status={r} />)}
                    <StatusBadge status={user.is_locked ? 'locked' : user.status} />
                  </div>
                  <p className="text-[11px] text-[#52525b]">
                    {user.email || user.github_username || '—'}
                  </p>
                </div>

                {/* Last login */}
                <div className="shrink-0 text-right text-[11px]">
                  <p className="text-[#A1A1AA]">
                    {user.last_login_at ? `Last login ${timeAgo(user.last_login_at)}` : 'Never logged in'}
                  </p>
                  <p className="text-[#3f3f46]">
                    Joined {new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSuspendTarget(user)}
                    className={`h-7 border-[#27272A] bg-transparent px-2.5 text-[11px] ${
                      user.status === 'suspended'
                        ? 'text-[#22C55E] hover:bg-[#22C55E]/10 hover:text-[#22C55E]'
                        : 'text-[#52525b] hover:border-[#EF4444]/30 hover:text-[#EF4444]'
                    }`}
                  >
                    {user.status === 'suspended' ? 'Reinstate' : 'Suspend'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        <AdminPagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>

      {/* Invite modal */}
      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-[#27272A] bg-[#18181B] p-6 shadow-2xl shadow-black/60">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#FAFAFA]">Invite Admin User</h2>
              <button
                type="button"
                onClick={() => setInviteOpen(false)}
                className="grid size-7 place-items-center rounded-lg text-[#52525b] hover:bg-[#27272A] hover:text-[#FAFAFA]"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-[#A1A1AA]">GitHub Username</label>
                <Input
                  placeholder="e.g. octocat"
                  value={inviteForm.github_username}
                  onChange={(e) => setInviteForm((f) => ({ ...f, github_username: e.target.value }))}
                  className="h-8 border-[#27272A] bg-[#09090B] text-xs text-[#FAFAFA] placeholder:text-[#3f3f46] focus-visible:ring-[#409EFE]/30"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-[#A1A1AA]">Email <span className="text-[#3f3f46]">(optional)</span></label>
                <Input
                  type="email"
                  placeholder="user@example.com"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
                  className="h-8 border-[#27272A] bg-[#09090B] text-xs text-[#FAFAFA] placeholder:text-[#3f3f46] focus-visible:ring-[#409EFE]/30"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-[#A1A1AA]">Display Name <span className="text-[#3f3f46]">(optional)</span></label>
                <Input
                  placeholder="Full name"
                  value={inviteForm.display_name}
                  onChange={(e) => setInviteForm((f) => ({ ...f, display_name: e.target.value }))}
                  className="h-8 border-[#27272A] bg-[#09090B] text-xs text-[#FAFAFA] placeholder:text-[#3f3f46] focus-visible:ring-[#409EFE]/30"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-[#A1A1AA]">Role</label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm((f) => ({ ...f, role: e.target.value }))}
                  className="h-8 w-full rounded-md border border-[#27272A] bg-[#09090B] px-2.5 text-xs text-[#FAFAFA] focus:outline-none focus:ring-1 focus:ring-[#409EFE]/30"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>

            <p className="mt-4 text-[10px] text-[#3f3f46]">
              The user will be pre-authorized. They gain access after signing in with their GitHub account.
            </p>

            <div className="mt-5 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInviteOpen(false)}
                className="h-8 flex-1 border-[#27272A] bg-transparent text-xs text-[#A1A1AA] hover:bg-[#27272A]"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleInvite}
                disabled={inviting}
                className="h-8 flex-1 gap-1.5 bg-[#409EFE] text-xs font-semibold text-white hover:bg-[#60aeff] disabled:opacity-60"
              >
                {inviting ? <Loader2 className="size-3.5 animate-spin" /> : <UserPlus className="size-3.5" />}
                {inviting ? 'Inviting...' : 'Invite'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!suspendTarget}
        onOpenChange={(open) => !open && setSuspendTarget(null)}
        title={
          suspendTarget
            ? suspendTarget.status === 'suspended'
              ? `Reinstate ${displayName(suspendTarget)}?`
              : `Suspend ${displayName(suspendTarget)}?`
            : ''
        }
        description={
          suspendTarget?.status === 'suspended'
            ? 'This user will regain admin access.'
            : 'This user will lose admin access until reinstated.'
        }
        confirmLabel={suspendTarget?.status === 'suspended' ? 'Reinstate' : 'Suspend'}
        destructive={suspendTarget?.status !== 'suspended'}
        onConfirm={() => suspendTarget && handleSuspend(suspendTarget)}
      />
    </AdminPageContainer>
  )
}
