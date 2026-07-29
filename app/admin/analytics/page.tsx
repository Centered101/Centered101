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
  usePageTitle('วิเคราะห์ข้อมูล')
  const [period, setPeriod] = useState(30)
  const [showLocal, setShowLocal] = useState(false)
  const { data, loading, error, refetch } = useAdminApi<AnalyticsData>(
    `/api/admin/analytics?days=${period}`
  )

  if (loading) return <AdminLoading message="กำลังโหลดข้อมูลวิเคราะห์..." />
  if (error) return <AdminError error={error} onRetry={refetch} />

  const { overview, topPages, traffic, weeklyVisitors, dailyVisitors, countries } = data!

  const localCount = topPages.filter((p) => isLocalhost(p.path)).length
  const filteredPages = showLocal ? topPages : topPages.filter((p) => !isLocalhost(p.path))

  // ── Line chart: daily trend ────────────────────────────────────────────
  const lineData = {
    labels: dailyVisitors.map((d) => {
      const dt = new Date(d.date)
      return dt.toLocaleDateString('th-TH', { month: 'short', day: 'numeric' })
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
        title="วิเคราะห์ข้อมูล"
        description={`${overview.totalVisitors.toLocaleString()} ผู้เข้าชมในช่วง ${overview.period} ล่าสุด`}
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
              {d} วัน
            </button>
          ))}
        </div>
      </AdminPageHeader>

      {/* Stat cards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'ผู้เข้าชมทั้งหมด', value: overview.totalVisitors.toLocaleString(), color: 'text-[#409EFE]' },
          { label: 'หน้าที่ถูกเข้าชม', value: topPages.length, color: 'text-[#FAFAFA]' },
          { label: 'แหล่งที่มา', value: traffic.length, color: 'text-[#22C55E]' },
          { label: 'ประเทศ', value: countries.length, color: 'text-[#F59E0B]' },
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
          <h2 className="text-sm font-semibold text-[#FAFAFA]">ผู้เข้าชมรายวัน</h2>
          <p className="mt-0.5 text-[11px] text-[#52525b]">แนวโน้มในช่วงเวลาที่เลือก</p>
        </div>
        <div className="px-5 py-5" style={{ height: 220 }}>
          {dailyVisitors.every((d) => d.value === 0) ? (
            <AdminEmpty title="ยังไม่มีข้อมูลผู้เข้าชม" description="ข้อมูลการเข้าชมจะแสดงที่นี่เมื่อระบบเริ่มบันทึก" />
          ) : (
            <Line data={lineData} options={lineOpts} />
          )}
        </div>
      </div>

      {/* Bar + countries */}
      <div className="grid gap-4 xl:grid-cols-[1fr_240px]">
        <div className="rounded-xl border border-[#27272A] bg-[#18181B]">
          <div className="border-b border-[#27272A] px-5 py-4">
            <h2 className="text-sm font-semibold text-[#FAFAFA]">ผู้เข้าชมตามวันในสัปดาห์</h2>
            <p className="mt-0.5 text-[11px] text-[#52525b]">สรุปจาก visitor_logs</p>
          </div>
          <div className="px-5 py-5" style={{ height: 200 }}>
            <Bar data={barData} options={barOpts} />
          </div>
        </div>

        <div className="rounded-xl border border-[#27272A] bg-[#18181B]">
          <div className="border-b border-[#27272A] px-5 py-4">
            <h2 className="text-sm font-semibold text-[#FAFAFA]">ประเทศยอดนิยม</h2>
          </div>
          {countries.length === 0 ? (
            <AdminEmpty title="ยังไม่มีข้อมูลประเทศ" description="ข้อมูลประเทศต้องใช้ header จาก Vercel" />
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
              <h2 className="text-sm font-semibold text-foreground-light">หน้ายอดนิยม</h2>
              {localCount > 0 && (
                <p className="mt-0.5 text-[11px] text-foreground-muted">
                  ซ่อนข้อมูล localhost {localCount} รายการ
                </p>
              )}
            </div>
            {localCount > 0 && (
              <button
                onClick={() => setShowLocal((v) => !v)}
                className="rounded-lg border border-[#27272A] bg-[#09090B] px-2.5 py-1 text-[11px] text-foreground-muted transition-colors hover:text-foreground-light"
              >
                {showLocal ? 'ซ่อน localhost' : 'แสดง localhost'}
              </button>
            )}
          </div>
          {filteredPages.length === 0 ? (
            <AdminEmpty title="ยังไม่มีข้อมูลหน้า" description="ข้อมูลการเข้าชมจะแสดงที่นี่เมื่อระบบเริ่มบันทึก" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[#27272A] text-[10px] font-semibold uppercase tracking-widest text-[#3f3f46]">
                    <th className="px-5 py-3">หน้า</th>
                    <th className="px-4 py-3 text-right">ยอดเข้าชม</th>
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
            <h2 className="text-sm font-semibold text-[#FAFAFA]">แหล่งที่มาทราฟฟิก</h2>
          </div>
          {traffic.length === 0 ? (
            <AdminEmpty title="ยังไม่มีข้อมูลทราฟฟิก" />
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
