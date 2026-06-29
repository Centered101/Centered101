'use client'

import { usePageTitle } from '@/lib/hooks/use-page-title'
import { useState } from 'react'
import { CheckCircle2, Mail, MailOpen, Trash2 } from 'lucide-react'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { AdminLoading, AdminError, AdminEmpty } from '@/components/admin/AdminStates'
import { useAdminApi, useAdminMutation } from '@/lib/hooks/useAdminApi'
import { useAdminRealtime } from '@/lib/hooks/useAdminRealtime'
import { AdminPageContainer, AdminPageHeader } from '@/components/admin/AdminPage'
import { AdminPagination } from '@/components/admin/AdminPagination'

type ContactMessage = {
  id: string
  name: string
  email: string
  subject: string | null
  message: string
  status: string
  is_read: boolean
  created_at: string
}

type ContactsData = {
  messages: ContactMessage[]
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

export default function BusinessPage() {
  usePageTitle('Business')
  const { data, loading, error, refetch } = useAdminApi<ContactsData>('/api/admin/contacts')
  const { mutate: patchMsg } = useAdminMutation<{ id: string; is_read?: boolean; status?: string }>('/api/admin/contacts', 'PATCH')
  const { mutate: deleteMsg } = useAdminMutation<void>('/api/admin/contacts', 'DELETE')
  const [selected, setSelected] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 15
  useAdminRealtime(['contact_messages'], refetch)

  if (loading) return <AdminLoading message="Loading messages..." />
  if (error) return <AdminError error={error} onRetry={refetch} />

  const messages = data?.messages ?? []
  const unread = messages.filter((m) => !m.is_read).length
  const filtered =
    filter === 'unread' ? messages.filter((m) => !m.is_read) :
    filter === 'read' ? messages.filter((m) => m.is_read) :
    messages
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  async function markRead(id: string) {
    await patchMsg({ id, is_read: true })
    refetch()
  }

  async function handleDelete(id: string) {
    const url = new URL('/api/admin/contacts', window.location.origin)
    url.searchParams.set('id', id)
    await fetch(url.toString(), {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    })
    if (selected === id) setSelected(null)
    refetch()
  }

  const selectedMsg = messages.find((m) => m.id === selected)

  return (
    <AdminPageContainer>
      <AdminPageHeader
        title="Contact Messages"
        description={`Inbox from contact_messages · ${messages.length} total · ${unread} unread`}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total', value: messages.length, color: 'text-[#FAFAFA]' },
          { label: 'Unread', value: unread, color: unread > 0 ? 'text-[#409EFE]' : 'text-[#52525b]' },
          { label: 'Read', value: messages.filter((m) => m.is_read).length, color: 'text-[#22C55E]' },
          { label: 'Archived', value: messages.filter((m) => m.status === 'archived').length, color: 'text-[#52525b]' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-[#27272A] bg-[#18181B] px-4 py-3">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="mt-0.5 text-[11px] text-[#52525b]">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
        {/* Message list */}
        <div className="rounded-xl border border-[#27272A] bg-[#18181B]">
          <div className="flex items-center justify-between border-b border-[#27272A] px-4 py-3.5">
            <h2 className="text-sm font-semibold text-[#FAFAFA]">Messages</h2>
            <div className="flex gap-1">
              {(['all', 'unread', 'read'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => { setFilter(f); setPage(1) }}
                  className={`rounded px-2 py-1 text-[10px] font-medium capitalize transition-colors ${
                    filter === f ? 'bg-[#409EFE]/10 text-[#409EFE]' : 'text-[#52525b] hover:text-[#A1A1AA]'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          {filtered.length === 0 ? (
            <AdminEmpty title="No messages" description="Contact form submissions will appear here" />
          ) : (
            <div className="divide-y divide-[#27272A]/50">
              {paged.map((msg) => (
                <button
                  key={msg.id}
                  onClick={() => {
                    setSelected(msg.id)
                    if (!msg.is_read) markRead(msg.id)
                  }}
                  className={`w-full px-4 py-3 text-left transition-colors hover:bg-[#27272A]/30 ${
                    selected === msg.id ? 'bg-[#27272A]/40' : ''
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`mt-1 size-1.5 shrink-0 rounded-full ${msg.is_read ? 'bg-transparent' : 'bg-[#409EFE]'}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-1">
                        <p className={`text-[12px] font-semibold truncate ${msg.is_read ? 'text-[#A1A1AA]' : 'text-[#FAFAFA]'}`}>
                          {msg.name}
                        </p>
                        <span className="shrink-0 text-[10px] text-[#3f3f46]">{timeAgo(msg.created_at)}</span>
                      </div>
                      {msg.subject && (
                        <p className="mt-0.5 truncate text-[11px] text-[#52525b]">{msg.subject}</p>
                      )}
                      <p className="mt-0.5 line-clamp-1 text-[11px] text-[#3f3f46]">{msg.message}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
          <AdminPagination
            page={page}
            total={filtered.length}
            pageSize={PAGE_SIZE}
            onChange={setPage}
            className="border-t border-[#27272A] px-4 py-3"
          />
        </div>

        {/* Message detail */}
        <div className="rounded-xl border border-[#27272A] bg-[#18181B]">
          {selectedMsg ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#27272A] px-5 py-4">
                <div>
                  <p className="font-semibold text-[#FAFAFA]">{selectedMsg.name}</p>
                  <p className="flex items-center gap-1 text-[12px] text-[#52525b]">
                    <Mail className="size-3" />
                    {selectedMsg.email}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={selectedMsg.status} />
                  <span className="text-[11px] text-[#3f3f46]">{timeAgo(selectedMsg.created_at)}</span>
                  <button
                    onClick={() => handleDelete(selectedMsg.id)}
                    className="grid size-7 place-items-center rounded-lg border border-[#27272A] bg-[#09090B] text-[#52525b] hover:text-[#EF4444]"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              </div>
              <div className="p-5">
                {selectedMsg.subject && (
                  <p className="mb-3 font-semibold text-[#FAFAFA]">{selectedMsg.subject}</p>
                )}
                <p className="text-[13px] leading-relaxed text-[#A1A1AA] whitespace-pre-wrap">
                  {selectedMsg.message}
                </p>
              </div>
            </>
          ) : (
            <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-2">
              <MailOpen className="size-8 text-[#27272A]" />
              <p className="text-[13px] text-[#3f3f46]">Select a message to read it</p>
            </div>
          )}
        </div>
      </div>
    </AdminPageContainer>
  )
}
