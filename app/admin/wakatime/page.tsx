'use client'

import { usePageTitle } from '@/lib/hooks/use-page-title'
import { Clock, Code2, Monitor, FolderOpen, Zap, TrendingUp } from 'lucide-react'
import { AdminLoading, AdminError, AdminEmpty } from '@/components/admin/AdminStates'
import { AdminPageContainer, AdminPageHeader, AdminPageSection } from '@/components/admin/AdminPage'
import { useAdminApi } from '@/lib/hooks/useAdminApi'

type Language = { name: string; total_seconds: number; percent: number; text: string }
type Editor = { name: string; total_seconds: number; percent: number; text: string }
type Project = { name: string; total_seconds: number; percent: number; text: string }
type OS = { name: string; total_seconds: number; percent: number; text: string }

type WakaStats = {
  human_readable_total: string
  human_readable_daily_average: string
  total_seconds: number
  daily_average: number
  languages: Language[]
  editors: Editor[]
  projects: Project[]
  operating_systems: OS[]
  best_day: { date: string; text: string; total_seconds: number } | null
  username: string
}

type DaySummary = {
  grand_total: { total_seconds: number; text: string }
  range: { date: string; text: string }
}

type WakaData = {
  stats: WakaStats | null
  summaries: DaySummary[]
  error: string | null
}

const ACCENT = '#409EFE'
const BAR_COLORS = ['#409EFE', '#22C55E', '#A855F7', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4']

function BarRow({ label, percent, text, color }: { label: string; percent: number; text: string; color: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="w-28 shrink-0 truncate text-[12px] text-foreground-light">{label}</span>
      <div className="flex-1 overflow-hidden rounded-full bg-surface-300" style={{ height: 6 }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(percent, 100)}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-24 shrink-0 text-right font-mono text-[11px] text-foreground-muted">{text}</span>
      <span className="w-10 shrink-0 text-right font-mono text-[10px] text-foreground-faint">{percent.toFixed(1)}%</span>
    </div>
  )
}

export default function WakaTimePage() {
  usePageTitle('WakaTime')
  const { data, loading, error, refetch } = useAdminApi<WakaData>('/api/admin/wakatime')

  if (loading) return <AdminLoading message="Loading WakaTime stats..." />
  if (error) return <AdminError error={error} onRetry={refetch} />
  if (data?.error) return <AdminError error={data.error} onRetry={refetch} />

  const { stats, summaries } = data!

  if (!stats) return <AdminEmpty title="No data" description="WakaTime returned no stats for this period" />

  const maxSummary = Math.max(...summaries.map((s) => s.grand_total.total_seconds), 1)

  return (
    <AdminPageContainer>
      <AdminPageHeader
        title="WakaTime"
        description={`Coding activity for @${stats.username}`}
      />

      {/* Hero stats */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total This Week', value: stats.human_readable_total, icon: Clock, color: ACCENT },
          { label: 'Daily Average', value: stats.human_readable_daily_average, icon: TrendingUp, color: '#22C55E' },
          { label: 'Languages', value: stats.languages.length, icon: Code2, color: '#A855F7' },
          { label: 'Best Day', value: stats.best_day?.text ?? '—', icon: Zap, color: '#F59E0B' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-surface-300 bg-surface-100 px-5 py-4">
            <div className="mb-2 flex items-center gap-2">
              <s.icon className="size-3.5" style={{ color: s.color }} />
              <p className="text-[11px] text-foreground-muted">{s.label}</p>
            </div>
            <p className="text-xl font-bold text-foreground-light" style={{ color: s.color }}>
              {s.value}
            </p>
            {s.label === 'Best Day' && stats.best_day && (
              <p className="mt-0.5 text-[10px] text-foreground-faint">
                {new Date(stats.best_day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Daily activity bar chart */}
      {summaries.length > 0 && (
        <AdminPageSection title="Daily Activity" description="Last 7 days">
          <div className="flex items-end gap-2" style={{ height: 80 }}>
            {summaries.map((s) => {
              const heightPct = (s.grand_total.total_seconds / maxSummary) * 100
              const day = new Date(s.range.date).toLocaleDateString('en-US', { weekday: 'short' })
              return (
                <div key={s.range.date} className="group flex flex-1 flex-col items-center gap-1">
                  <div
                    title={s.grand_total.text}
                    className="w-full rounded-t transition-opacity group-hover:opacity-80"
                    style={{
                      height: `${Math.max(heightPct, 4)}%`,
                      backgroundColor: heightPct > 60 ? ACCENT : 'rgba(64,158,254,0.35)',
                    }}
                  />
                  <span className="text-[9px] text-foreground-faint">{day}</span>
                </div>
              )
            })}
          </div>
        </AdminPageSection>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        {/* Languages */}
        <AdminPageSection title="Languages" description={`${stats.languages.length} detected`}>
          <div className="divide-y divide-surface-300/60">
            {stats.languages.slice(0, 8).map((l, i) => (
              <BarRow
                key={l.name}
                label={l.name}
                percent={l.percent}
                text={l.text}
                color={BAR_COLORS[i % BAR_COLORS.length]}
              />
            ))}
          </div>
        </AdminPageSection>

        {/* Projects */}
        <AdminPageSection title="Projects" description={`${stats.projects.length} active`}>
          <div className="divide-y divide-surface-300/60">
            {stats.projects.slice(0, 8).map((p, i) => (
              <BarRow
                key={p.name}
                label={p.name}
                percent={p.percent}
                text={p.text}
                color={BAR_COLORS[i % BAR_COLORS.length]}
              />
            ))}
          </div>
        </AdminPageSection>

        {/* Editors */}
        <AdminPageSection title="Editors">
          <div className="divide-y divide-surface-300/60">
            {stats.editors.map((e, i) => (
              <BarRow key={e.name} label={e.name} percent={e.percent} text={e.text} color={BAR_COLORS[i % BAR_COLORS.length]} />
            ))}
          </div>
        </AdminPageSection>

        {/* Operating Systems */}
        <AdminPageSection title="Operating Systems">
          <div className="flex items-center gap-4 py-2">
            {stats.operating_systems.map((os, i) => (
              <div key={os.name} className="flex items-center gap-2">
                <Monitor className="size-4" style={{ color: BAR_COLORS[i % BAR_COLORS.length] }} />
                <div>
                  <p className="text-[12px] font-medium text-foreground-light">{os.name}</p>
                  <p className="text-[11px] text-foreground-muted">{os.text} · {os.percent.toFixed(1)}%</p>
                </div>
              </div>
            ))}
          </div>
        </AdminPageSection>
      </div>

      {/* Projects full list if >8 */}
      {stats.projects.length > 8 && (
        <AdminPageSection title="All Projects">
          <div className="divide-y divide-surface-300/60">
            {stats.projects.map((p, i) => (
              <div key={p.name} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <FolderOpen className="size-3.5 text-foreground-faint" />
                  <span className="text-[12px] text-foreground-light">{p.name}</span>
                </div>
                <span className="font-mono text-[11px] text-foreground-muted">{p.text}</span>
              </div>
            ))}
          </div>
        </AdminPageSection>
      )}
    </AdminPageContainer>
  )
}
