'use client'

import { useState } from 'react'
import { Clock, Code2, Monitor, FolderOpen, Zap, TrendingUp } from 'lucide-react'
import { AdminLoading, AdminError, AdminEmpty } from '@/components/admin/AdminStates'
import { AdminPageSection } from '@/components/admin/AdminPage'
import { useAdminApi } from '@/lib/hooks/useAdminApi'

type Language = { name: string; total_seconds: number; percent: number; text: string }
type Editor = { name: string; total_seconds: number; percent: number; text: string }
type Project = { name: string; total_seconds: number; percent: number; text: string }
type OS = { name: string; total_seconds: number; percent: number; text: string }
type WakaStats = {
  human_readable_total: string; human_readable_daily_average: string
  total_seconds: number; daily_average: number
  languages: Language[]; editors: Editor[]; projects: Project[]; operating_systems: OS[]
  best_day: { date: string; text: string; total_seconds: number } | null
  username: string
}
type DaySummary = { grand_total: { total_seconds: number; text: string }; range: { date: string; text: string } }
type WakaData = { stats: WakaStats | null; summaries: DaySummary[]; error: string | null }

const ACCENT = '#409EFE'
const BAR_COLORS = ['#409EFE', '#22C55E', '#A855F7', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4']

const RANGES = [
  { label: '7 days', value: 7 },
  { label: '14 days', value: 14 },
  { label: '30 days', value: 30 },
]

function BarRow({ label, percent, text, color }: { label: string; percent: number; text: string; color: string }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="w-28 shrink-0 truncate text-[12px] text-[#A1A1AA]">{label}</span>
      <div className="flex-1 overflow-hidden rounded-full bg-[#27272A]" style={{ height: 5 }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(percent, 100)}%`, backgroundColor: color }} />
      </div>
      <span className="w-24 shrink-0 text-right font-mono text-[11px] text-[#52525b]">{text}</span>
      <span className="w-10 shrink-0 text-right font-mono text-[10px] text-[#3f3f46]">{percent.toFixed(1)}%</span>
    </div>
  )
}

export function CodingTab() {
  const [range, setRange] = useState(7)
  const { data, loading, error, refetch } = useAdminApi<WakaData>(`/api/admin/wakatime?days=${range}`)

  if (loading) return <AdminLoading message="Loading WakaTime stats..." />
  if (error) return <AdminError error={error} onRetry={refetch} />
  if (data?.error) return <AdminError error={data.error} onRetry={refetch} />
  if (!data?.stats) return <AdminEmpty title="No data" description="WakaTime returned no stats for this period" />

  const { stats, summaries } = data
  const maxSummary = Math.max(...summaries.map((s) => s.grand_total.total_seconds), 1)

  return (
    <div className="space-y-6 p-6">
      {/* Range selector */}
      <div className="flex items-center gap-2">
        {RANGES.map((r) => (
          <button
            key={r.value}
            onClick={() => setRange(r.value)}
            className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
              range === r.value
                ? 'border-[#409EFE]/50 bg-[#409EFE]/10 text-[#409EFE]'
                : 'border-[#27272A] text-[#52525b] hover:text-[#FAFAFA]'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Hero stats */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total Coding', value: stats.human_readable_total, icon: Clock, color: ACCENT },
          { label: 'Daily Average', value: stats.human_readable_daily_average, icon: TrendingUp, color: '#22C55E' },
          { label: 'Languages', value: stats.languages.length, icon: Code2, color: '#A855F7' },
          { label: 'Best Day', value: stats.best_day?.text ?? '—', icon: Zap, color: '#F59E0B' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-[#27272A] bg-[#18181B] px-5 py-4">
            <div className="mb-2 flex items-center gap-2">
              <s.icon className="size-3.5" style={{ color: s.color }} />
              <p className="text-[11px] text-[#52525b]">{s.label}</p>
            </div>
            <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
            {s.label === 'Best Day' && stats.best_day && (
              <p className="mt-0.5 text-[10px] text-[#3f3f46]">
                {new Date(stats.best_day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Daily bar chart */}
      {summaries.length > 0 && (
        <AdminPageSection title="Daily Activity" description={`Last ${range} days`}>
          <div className="flex items-end gap-2" style={{ height: 80 }}>
            {summaries.map((s) => {
              const heightPct = (s.grand_total.total_seconds / maxSummary) * 100
              const day = new Date(s.range.date).toLocaleDateString('en-US', { weekday: 'short' })
              return (
                <div key={s.range.date} className="group flex flex-1 flex-col items-center gap-1">
                  <div
                    title={s.grand_total.text}
                    className="w-full rounded-t transition-opacity group-hover:opacity-80"
                    style={{ height: `${Math.max(heightPct, 4)}%`, backgroundColor: heightPct > 60 ? ACCENT : 'rgba(64,158,254,0.35)' }}
                  />
                  <span className="text-[9px] text-[#3f3f46]">{day}</span>
                </div>
              )
            })}
          </div>
        </AdminPageSection>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Languages */}
        <AdminPageSection title="Languages" description="By coding time">
          {stats.languages.slice(0, 8).map((l, i) => (
            <BarRow key={l.name} label={l.name} percent={l.percent} text={l.text} color={BAR_COLORS[i % BAR_COLORS.length]} />
          ))}
        </AdminPageSection>

        {/* Editors */}
        <AdminPageSection title="Editors">
          {stats.editors.map((e, i) => (
            <BarRow key={e.name} label={e.name} percent={e.percent} text={e.text} color={BAR_COLORS[i % BAR_COLORS.length]} />
          ))}
        </AdminPageSection>

        {/* Projects */}
        <AdminPageSection title="Projects">
          {stats.projects.slice(0, 8).map((p, i) => (
            <BarRow key={p.name} label={p.name} percent={p.percent} text={p.text} color={BAR_COLORS[i % BAR_COLORS.length]} />
          ))}
        </AdminPageSection>

        {/* OS */}
        <AdminPageSection title="Operating Systems">
          {stats.operating_systems.map((o, i) => (
            <BarRow key={o.name} label={o.name} percent={o.percent} text={o.text} color={BAR_COLORS[i % BAR_COLORS.length]} />
          ))}
        </AdminPageSection>
      </div>
    </div>
  )
}
