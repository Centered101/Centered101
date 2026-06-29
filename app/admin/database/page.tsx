'use client'

import { usePageTitle } from '@/lib/hooks/use-page-title'
import { useState } from 'react'
import { toast } from 'sonner'
import { Database, Loader2, Play } from 'lucide-react'
import { AdminLoading, AdminError, AdminEmpty } from '@/components/admin/AdminStates'
import { AdminPageContainer, AdminPageHeader } from '@/components/admin/AdminPage'
import { useAdminAuth } from '@/components/admin/AdminAuthProvider'
import { useAdminApi } from '@/lib/hooks/useAdminApi'

type DBTable = {
  name: string
  category: string
  rows: number | null
  accessible: boolean
}

type DatabaseData = {
  tables: DBTable[]
}

const CATEGORY_COLORS: Record<string, string> = {
  portfolio: '#409EFE',
  content: '#22C55E',
  analytics: '#F59E0B',
  auth: '#8B5CF6',
  security: '#EF4444',
  github: '#A1A1AA',
  platform: '#60aeff',
}

export default function DatabasePage() {
  usePageTitle('Database')
  const { getAdminHeaders } = useAdminAuth()
  const { data, loading, error, refetch } = useAdminApi<DatabaseData>('/api/admin/database')
  const [query, setQuery] = useState('SELECT * FROM portfolio_projects LIMIT 10;')
  const [selected, setSelected] = useState<string | null>(null)
  const [queryResults, setQueryResults] = useState<Record<string, unknown>[] | null>(null)
  const [queryError, setQueryError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)

  if (loading) return <AdminLoading message="Querying table stats..." />
  if (error) return <AdminError error={error} onRetry={refetch} />

  const tables = data?.tables ?? []
  const accessibleTables = tables.filter((t) => t.accessible)
  const totalRows = accessibleTables.reduce((s, t) => s + (t.rows ?? 0), 0)
  const categories = Array.from(new Set(tables.map((t) => t.category)))

  const selectedTable = tables.find((t) => t.name === selected)

  async function runQuery() {
    const trimmed = query.trim().toLowerCase()
    if (!trimmed.startsWith('select')) {
      toast.error('Only SELECT queries are permitted')
      return
    }
    setRunning(true)
    setQueryError(null)
    setQueryResults(null)
    try {
      const match = trimmed.match(/from\s+(\w+)/)
      if (!match) { toast.error('Could not determine table name from query'); return }
      const tableName = match[1]
      const limitMatch = trimmed.match(/limit\s+(\d+)/)
      const limit = Math.min(limitMatch ? parseInt(limitMatch[1]) : 20, 100)
      const res = await fetch(
        `/api/admin/database?table=${encodeURIComponent(tableName)}&limit=${limit}`,
        { headers: getAdminHeaders() }
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)
      setQueryResults(json.rows ?? [])
      toast.success(`${json.rows?.length ?? 0} rows returned`)
    } catch (err) {
      setQueryError((err as Error).message)
      toast.error((err as Error).message)
    } finally {
      setRunning(false)
    }
  }

  return (
    <AdminPageContainer>
      <AdminPageHeader
        title="Database Explorer"
        description={`${accessibleTables.length} tables · ${totalRows.toLocaleString()} total rows from Supabase`}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { label: 'Tables', value: tables.length, color: 'text-[#409EFE]' },
          { label: 'Total Rows', value: totalRows.toLocaleString(), color: 'text-[#FAFAFA]' },
          { label: 'Categories', value: categories.length, color: 'text-[#F59E0B]' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-[#27272A] bg-[#18181B] px-4 py-3">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="mt-0.5 text-[11px] text-[#52525b]">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[280px_1fr]">
        {/* Table list */}
        <div className="rounded-xl border border-[#27272A] bg-[#18181B]">
          <div className="border-b border-[#27272A] px-4 py-3.5">
            <h2 className="text-sm font-semibold text-[#FAFAFA]">Tables</h2>
          </div>
          {tables.length === 0 ? (
            <AdminEmpty title="No tables found" />
          ) : (
            <div className="max-h-[400px] divide-y divide-[#27272A]/50 overflow-y-auto">
              {tables.map((table) => {
                const color = CATEGORY_COLORS[table.category] ?? '#A1A1AA'
                return (
                  <button
                    key={table.name}
                    onClick={() => {
                      setSelected(table.name)
                      setQuery(`SELECT * FROM ${table.name} LIMIT 10;`)
                    }}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[#27272A]/20 ${
                      selected === table.name ? 'bg-[#27272A]/40' : ''
                    }`}
                  >
                    <Database className="size-3.5 shrink-0 text-[#3f3f46]" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-medium text-[#FAFAFA]">{table.name}</p>
                      <p className="text-[10px] text-[#52525b]">
                        {table.accessible ? `${(table.rows ?? 0).toLocaleString()} rows` : 'no access'}
                      </p>
                    </div>
                    <span
                      className="shrink-0 rounded px-1.5 py-px text-[9px] font-semibold capitalize"
                      style={{
                        color,
                        backgroundColor: color + '18',
                        border: `1px solid ${color}30`,
                      }}
                    >
                      {table.category}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Query editor */}
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-[#27272A] bg-[#18181B]">
            <div className="flex items-center justify-between border-b border-[#27272A] px-5 py-3.5">
              <div>
                <h2 className="text-sm font-semibold text-[#FAFAFA]">Query Runner</h2>
                {selectedTable && (
                  <p className="mt-0.5 text-[11px] text-[#52525b]">
                    {selectedTable.name} · {(selectedTable.rows ?? 0).toLocaleString()} rows
                  </p>
                )}
              </div>
              <span className="rounded border border-[#F59E0B]/20 bg-[#F59E0B]/5 px-1.5 py-0.5 text-[9px] font-semibold text-[#F59E0B]">
                READ-ONLY
              </span>
            </div>
            <div className="p-5">
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                rows={5}
                className="w-full resize-none rounded-lg border border-[#27272A] bg-[#09090B] px-3 py-2.5 font-mono text-[13px] text-[#FAFAFA] placeholder:text-[#3f3f46] focus:border-[#409EFE]/40 focus:outline-none"
                spellCheck={false}
              />
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[11px] text-[#3f3f46]">Only SELECT queries · max 100 rows</span>
                <button
                  onClick={runQuery}
                  disabled={running}
                  className="flex items-center gap-1.5 rounded-lg bg-[#409EFE] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#60aeff] disabled:opacity-60"
                >
                  {running ? <Loader2 className="size-3 animate-spin" /> : <Play className="size-3" />}
                  Run
                </button>
              </div>

              {/* Results */}
              {queryError && (
                <div className="mt-3 rounded-lg border border-[#EF4444]/20 bg-[#EF4444]/5 px-3 py-2.5">
                  <p className="font-mono text-[11px] text-[#EF4444]">{queryError}</p>
                </div>
              )}
              {queryResults && queryResults.length === 0 && (
                <p className="mt-3 text-[11px] text-[#52525b]">Query returned 0 rows.</p>
              )}
              {queryResults && queryResults.length > 0 && (
                <div className="mt-3 overflow-x-auto rounded-lg border border-[#27272A]">
                  <table className="w-full text-left text-[11px]">
                    <thead>
                      <tr className="border-b border-[#27272A] bg-[#09090B]">
                        {Object.keys(queryResults[0]).map((col) => (
                          <th key={col} className="px-3 py-2 font-mono font-semibold text-[#52525b]">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#27272A]/50">
                      {queryResults.map((row, i) => (
                        <tr key={i} className="hover:bg-[#27272A]/20">
                          {Object.values(row).map((val, j) => (
                            <td key={j} className="max-w-[200px] truncate px-3 py-1.5 font-mono text-[#A1A1AA]">
                              {val === null ? <span className="text-[#3f3f46]">null</span> : String(val)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Category breakdown */}
          <div className="rounded-xl border border-[#27272A] bg-[#18181B]">
            <div className="border-b border-[#27272A] px-5 py-3.5">
              <h2 className="text-sm font-semibold text-[#FAFAFA]">By Category</h2>
            </div>
            <div className="grid grid-cols-2 gap-px bg-[#27272A]/50 sm:grid-cols-3">
              {categories.map((cat) => {
                const catTables = tables.filter((t) => t.category === cat)
                const catRows = catTables.reduce((s, t) => s + (t.rows ?? 0), 0)
                const color = CATEGORY_COLORS[cat] ?? '#A1A1AA'
                return (
                  <div key={cat} className="bg-[#18181B] px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-[11px] font-semibold capitalize text-[#A1A1AA]">{cat}</span>
                    </div>
                    <p className="mt-1 font-mono text-sm font-bold text-[#FAFAFA]">
                      {catRows.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-[#3f3f46]">{catTables.length} tables</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </AdminPageContainer>
  )
}
