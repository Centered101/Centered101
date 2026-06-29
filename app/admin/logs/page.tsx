'use client'

import { usePageTitle } from '@/lib/hooks/use-page-title'
import { useState } from 'react'
import { RefreshCw, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AdminLoading, AdminError, AdminEmpty } from '@/components/admin/AdminStates'
import { AdminPageContainer, AdminPageHeader } from '@/components/admin/AdminPage'
import { AdminPagination } from '@/components/admin/AdminPagination'
import { useAdminApi } from '@/lib/hooks/useAdminApi'
import { useAdminRealtime } from '@/lib/hooks/useAdminRealtime'

type LogEntry = {
  id: string
  actor_user_id: string | null
  action: string
  resource: string | null
  resource_id: string | null
  outcome: string
  ip_address: string | null
  metadata: Record<string, unknown> | null
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

const PAGE_SIZE = 25

export default function LogsPage() {
  usePageTitle('Audit Logs')
  const { data, loading, error, refetch } = useAdminApi<{ logs: LogEntry[] }>('/api/admin/logs')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  useAdminRealtime(['admin_audit_log'], refetch)

  if (loading) return <AdminLoading message="Loading audit logs..." />
  if (error) return <AdminError error={error} onRetry={refetch} />

  const logs = data?.logs ?? []
  const filtered = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      (l.resource ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (l.resource_id ?? '').toLowerCase().includes(search.toLowerCase())
  )
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <AdminPageContainer>
      <AdminPageHeader title="Audit Logs" description={`${logs.length} entries`}>
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 border-surface-300 bg-transparent text-xs text-foreground-muted hover:text-foreground-light"
          onClick={refetch}
        >
          <RefreshCw className="size-3.5" />
          Refresh
        </Button>
      </AdminPageHeader>

      <div className="rounded-xl border border-surface-300 bg-surface-100">
        <div className="flex flex-wrap items-center gap-3 border-b border-surface-300 px-5 py-3.5">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 size-3 -translate-y-1/2 text-foreground-faint" />
            <Input
              placeholder="Filter by action, resource, or id..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="h-8 border-surface-300 bg-dash-canvas pl-8 text-xs text-foreground-light placeholder:text-foreground-faint focus-visible:ring-[#409EFE]/30"
            />
          </div>
          <span className="rounded border border-surface-300 bg-dash-canvas px-2 py-1 text-[11px] text-foreground-muted">
            {filtered.length} entries
          </span>
        </div>

        {filtered.length === 0 ? (
          <AdminEmpty title="No log entries" description="Admin actions will appear here after they occur" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-surface-300 text-[10px] font-semibold uppercase tracking-widest text-foreground-faint">
                  <th className="px-5 py-3">Action</th>
                  <th className="px-4 py-3">Resource</th>
                  <th className="px-4 py-3">Outcome</th>
                  <th className="px-4 py-3">IP</th>
                  <th className="px-4 py-3">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-300/50">
                {paged.map((log) => (
                  <tr key={log.id} className="transition-colors hover:bg-surface-200/50">
                    <td className="px-5 py-3">
                      <span className="rounded border border-surface-300 bg-dash-canvas px-2 py-0.5 font-mono text-[11px] text-foreground-light">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-[#22C55E]">
                      {log.resource
                        ? `${log.resource}${log.resource_id ? ` / ${log.resource_id.slice(0, 8)}` : ''}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[12px] font-semibold capitalize ${
                        log.outcome === 'failed' ? 'text-[#EF4444]'
                        : log.outcome === 'blocked' ? 'text-[#F59E0B]'
                        : 'text-[#22C55E]'
                      }`}>
                        {log.outcome}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-foreground-faint">
                      {log.ip_address || '—'}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-foreground-faint">
                      {timeAgo(log.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <AdminPagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>
    </AdminPageContainer>
  )
}
