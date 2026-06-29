'use client'

import { usePageTitle } from '@/lib/hooks/use-page-title'
import { useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Filler,
  Legend,
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import { AdminLoading, AdminError, AdminEmpty } from '@/components/admin/AdminStates'
import { AdminPageContainer, AdminPageHeader } from '@/components/admin/AdminPage'
import { useAdminApi } from '@/lib/hooks/useAdminApi'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Filler,
  Legend,
)

type AnalyticsData = {
  overview: { totalVisitors: number; period: string }
  topPages: { path: string; views: number }[]
  traffic: { source: string; visits: number; percent: number }[]
  weeklyVisitors: { day: string; value: number }[]
  dailyVisitors: { date: string; value: number }[]
  countries: { country: string; visits: number }[]
}

const CHART_COLORS = ['#409EFE', '#22C55E', '#A855F7', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#84CC16']

const baseOpts = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
} as const

function isLocalhost(s: string) {
  try {
    const h = new URL(s).hostname
    return h === 'localhost' || h === '127.0.0.1' || h === '::1'
  } catch {
    return false
  }
}

function formatPath(path: string): { label: string; isLocal: boolean } {
  try {
    const u = new URL(path)
    const isLocal = isLocalhost(path)
    return { label: u.pathname || '/', isLocal }
  } catch {
    return { label: path, isLocal: false }
  }
}

export default function AnalyticsPage() {
  usePageTitle('Analytics')
  const [period, setPeriod] = useState(30)
  const [showLocal, setShowLocal] = useState(false)
  const { data, loading, error, refetch } = useAdminApi<AnalyticsData>(
    `/api/admin/analytics?days=${period}`
  )

  if (loading) return <AdminLoading message="Loading analytics..." />
  if (error) return <AdminError error={error} onRetry={refetch} />

  const { overview, topPages, traffic, weeklyVisitors, dailyVisitors, countries } = data!

  const localCount = topPages.filter((p) => isLocalhost(p.path)).length
  const filteredPages = showLocal ? topPages : topPages.filter((p) => !isLocalhost(p.path))

  // ── Line chart: daily trend ────────────────────────────────────────────
  const lineData = {
    labels: dailyVisitors.map((d) => {
      const dt = new Date(d.date)
      return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }),
    datasets: [{
      data: dailyVisitors.map((d) => d.value),
      borderColor: '#409EFE',
      backgroundColor: 'rgba(64,158,254,0.12)',
      borderWidth: 2,
      pointRadius: dailyVisitors.length > 30 ? 0 : 3,
      pointHoverRadius: 5,
      fill: true,
      tension: 0.4,
    }],
  }

  const lineOpts = {
    ...baseOpts,
    scales: {
      x: {
        ticks: { color: '#52525b', font: { size: 10 }, maxTicksLimit: 7 },
        grid: { color: 'rgba(39,39,42,0.6)' },
        border: { display: false },
      },
      y: {
        ticks: { color: '#52525b', font: { size: 10 } },
        grid: { color: 'rgba(39,39,42,0.6)' },
        border: { display: false },
        beginAtZero: true,
      },
    },
  }

  // ── Bar chart: visitors by day of week ────────────────────────────────
  const barData = {
    labels: weeklyVisitors.map((d) => d.day),
    datasets: [{
      data: weeklyVisitors.map((d) => d.value),
      backgroundColor: 'rgba(64,158,254,0.35)',
      hoverBackgroundColor: '#409EFE',
      borderRadius: 6,
      borderSkipped: false,
    }],
  }

  const barOpts = {
    ...baseOpts,
    scales: {
      x: {
        ticks: { color: '#52525b', font: { size: 11 } },
        grid: { display: false },
        border: { display: false },
      },
      y: {
        ticks: { color: '#52525b', font: { size: 10 } },
        grid: { color: 'rgba(39,39,42,0.6)' },
        border: { display: false },
        beginAtZero: true,
      },
    },
  }

  // ── Doughnut chart: traffic sources ───────────────────────────────────
  const doughnutData = {
    labels: traffic.map((t) => t.source),
    datasets: [{
      data: traffic.map((t) => t.visits),
      backgroundColor: CHART_COLORS.slice(0, traffic.length),
      borderColor: '#09090B',
      borderWidth: 3,
      hoverOffset: 6,
    }],
  }

  const doughnutOpts = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
        labels: {
          color: '#A1A1AA',
          font: { size: 11 },
          padding: 14,
          boxWidth: 10,
          boxHeight: 10,
        },
      },
      tooltip: { enabled: true },
    },
  }

  return (
    <AdminPageContainer>
      <AdminPageHeader
        title="Analytics"
        description={`${overview.totalVisitors.toLocaleString()} visitors in the last ${overview.period}`}
      >
        <div className="flex gap-1.5">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setPeriod(d)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                period === d
                  ? 'bg-[#409EFE]/10 text-[#409EFE]'
                  : 'border border-surface-300 bg-surface-100 text-foreground-light hover:text-foreground-light'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </AdminPageHeader>

      {/* Stat cards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total Visitors', value: overview.totalVisitors.toLocaleString(), color: 'text-[#409EFE]' },
          { label: 'Unique Pages', value: topPages.length, color: 'text-[#FAFAFA]' },
          { label: 'Traffic Sources', value: traffic.length, color: 'text-[#22C55E]' },
          { label: 'Countries', value: countries.length, color: 'text-[#F59E0B]' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-[#27272A] bg-[#18181B] px-5 py-4">
            <p className="text-[11px] text-[#52525b]">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Line chart: daily trend */}
      <div className="rounded-xl border border-[#27272A] bg-[#18181B]">
        <div className="border-b border-[#27272A] px-5 py-4">
          <h2 className="text-sm font-semibold text-[#FAFAFA]">Daily Visitors</h2>
          <p className="mt-0.5 text-[11px] text-[#52525b]">Trend over the selected period</p>
        </div>
        <div className="px-5 py-5" style={{ height: 220 }}>
          {dailyVisitors.every((d) => d.value === 0) ? (
            <AdminEmpty title="No visitor data" description="Visits will appear here as they're tracked" />
          ) : (
            <Line data={lineData} options={lineOpts} />
          )}
        </div>
      </div>

      {/* Bar + countries */}
      <div className="grid gap-4 xl:grid-cols-[1fr_240px]">
        <div className="rounded-xl border border-[#27272A] bg-[#18181B]">
          <div className="border-b border-[#27272A] px-5 py-4">
            <h2 className="text-sm font-semibold text-[#FAFAFA]">Visitors by Day of Week</h2>
            <p className="mt-0.5 text-[11px] text-[#52525b]">Aggregated from visitor_logs</p>
          </div>
          <div className="px-5 py-5" style={{ height: 200 }}>
            <Bar data={barData} options={barOpts} />
          </div>
        </div>

        <div className="rounded-xl border border-[#27272A] bg-[#18181B]">
          <div className="border-b border-[#27272A] px-5 py-4">
            <h2 className="text-sm font-semibold text-[#FAFAFA]">Top Countries</h2>
          </div>
          {countries.length === 0 ? (
            <AdminEmpty title="No country data" description="Country data requires Vercel headers" />
          ) : (
            <div className="divide-y divide-[#27272A]/60">
              {countries.map((c) => (
                <div key={c.country} className="flex items-center justify-between px-5 py-3">
                  <span className="text-[12px] text-[#A1A1AA]">{c.country}</span>
                  <span className="font-mono text-[11px] font-semibold text-[#FAFAFA]">
                    {c.visits.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top pages + doughnut */}
      <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
        <div className="rounded-xl border border-[#27272A] bg-[#18181B]">
          <div className="flex items-center justify-between border-b border-[#27272A] px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground-light">Top Pages</h2>
              {localCount > 0 && (
                <p className="mt-0.5 text-[11px] text-foreground-muted">
                  {localCount} localhost {localCount === 1 ? 'entry' : 'entries'} hidden
                </p>
              )}
            </div>
            {localCount > 0 && (
              <button
                onClick={() => setShowLocal((v) => !v)}
                className="rounded-lg border border-[#27272A] bg-[#09090B] px-2.5 py-1 text-[11px] text-foreground-muted transition-colors hover:text-foreground-light"
              >
                {showLocal ? 'Hide localhost' : 'Show localhost'}
              </button>
            )}
          </div>
          {filteredPages.length === 0 ? (
            <AdminEmpty title="No page data yet" description="Visits will appear here as they're tracked" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[#27272A] text-[10px] font-semibold uppercase tracking-widest text-[#3f3f46]">
                    <th className="px-5 py-3">Page</th>
                    <th className="px-4 py-3 text-right">Views</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272A]/50">
                  {filteredPages.map((page) => {
                    const { label, isLocal } = formatPath(page.path)
                    return (
                      <tr key={page.path} className="transition-colors hover:bg-[#27272A]/20">
                        <td className="px-5 py-2.5">
                          <div className="flex items-center gap-2">
                            {isLocal && (
                              <span className="shrink-0 rounded border border-[#27272A] bg-[#09090B] px-1.5 py-px font-mono text-[9px] text-foreground-muted">
                                local
                              </span>
                            )}
                            <span className="font-mono text-[12px] text-[#409EFE]">{label}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-[12px] text-[#A1A1AA]">
                          {page.views.toLocaleString()}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-[#27272A] bg-[#18181B]">
          <div className="border-b border-[#27272A] px-5 py-4">
            <h2 className="text-sm font-semibold text-[#FAFAFA]">Traffic Sources</h2>
          </div>
          {traffic.length === 0 ? (
            <AdminEmpty title="No traffic data yet" />
          ) : (
            <div className="flex flex-col items-center px-4 py-5" style={{ height: 260 }}>
              <Doughnut data={doughnutData} options={doughnutOpts} />
            </div>
          )}
        </div>
      </div>
    </AdminPageContainer>
  )
}
