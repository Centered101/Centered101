'use client'

import Link from 'next/link'
import {
  ArrowUpRight,
  BarChart3,
  Database,
  FileText,
  FolderOpen,
  HardDrive,
  MessageSquare,
  RefreshCw,
  Shield,
  Users,
} from 'lucide-react'
import { AdminError, AdminLoading } from '@/components/admin/AdminStates'
import { AdminPageContainer, AdminPageHeader, AdminPageSection } from '@/components/admin/AdminPage'
import { useAdminAuth } from '@/components/admin/AdminAuthProvider'
import { useAdminApi } from '@/lib/hooks/useAdminApi'
import { usePageTitle } from '@/lib/hooks/use-page-title'

type DashboardData = {
  stats: {
    projects: number
    posts: number
    draftPosts: number
    unreadMessages: number
    assets: number
    assetsSizeGB: string
    visitors30d: number
    unresolvedSecurityEvents: number
  }
  recentActivity: {
    id: string
    action: string
    resource: string
    resource_id: string | null
    outcome: string
    metadata: Record<string, unknown>
    created_at: string
  }[]
}

type Metric = {
  label: string
  value: string | number
  detail: string
  href: string
  tone: string
  icon: React.ComponentType<{ className?: string }>
}

function timeAgo(iso: string) {
  const timestamp = new Date(iso).getTime()
  if (!Number.isFinite(timestamp)) return '-'
  const mins = Math.floor((Date.now() - timestamp) / 60000)
  if (mins < 1) return 'เมื่อสักครู่'
  if (mins < 60) return `${mins} นาทีที่แล้ว`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} ชั่วโมงที่แล้ว`
  return `${Math.floor(hrs / 24)} วันที่แล้ว`
}

function activityLabel(action: string) {
  const labels: Record<string, string> = {
    'portfolio_project.update': 'อัปเดตโปรเจกต์พอร์ตโฟลิโอ',
    'portfolio_project.create': 'เพิ่มโปรเจกต์พอร์ตโฟลิโอ',
    'portfolio_project.delete': 'ลบโปรเจกต์พอร์ตโฟลิโอ',
    'portfolio_project.logo_upload': 'อัปโหลดโลโก้โปรเจกต์',
    'portfolio_project.poster_upload': 'อัปโหลดรูปโปรเจกต์',
    'portfolio_project.save': 'บันทึกโปรเจกต์พอร์ตโฟลิโอ',
    admin_login: 'เข้าสู่ระบบแอดมิน',
    settings_update: 'อัปเดตการตั้งค่า',
  }
  return labels[action] ?? action.replace(/_/g, ' ')
}

function resourceLabel(resource: string) {
  const labels: Record<string, string> = {
    portfolio_projects: 'โปรเจกต์',
    storage: 'ไฟล์',
    admin_users: 'ผู้ดูแล',
    settings: 'ตั้งค่า',
  }
  return labels[resource] ?? resource
}

function outcomeClass(outcome: string) {
  if (outcome === 'success') return 'bg-success'
  if (outcome === 'failed') return 'bg-destructive'
  return 'bg-warning'
}

function buildMetrics(stats: DashboardData['stats']): Metric[] {
  return [
    {
      label: 'โปรเจกต์พอร์ตโฟลิโอ',
      value: stats.projects,
      detail: 'รายการที่เผยแพร่บน portfolio',
      href: '/portfolio/admin',
      tone: 'text-[var(--admin-accent)]',
      icon: FolderOpen,
    },
    {
      label: 'บทความ',
      value: stats.posts,
      detail: `ฉบับร่าง ${stats.draftPosts} รายการ`,
      href: '/admin/content',
      tone: 'text-success',
      icon: FileText,
    },
    {
      label: 'ข้อความใหม่',
      value: stats.unreadMessages,
      detail: 'กล่องข้อความติดต่อ',
      href: '/admin/business',
      tone: stats.unreadMessages > 0 ? 'text-warning' : 'text-foreground-light',
      icon: MessageSquare,
    },
    {
      label: 'ไฟล์ดิจิทัล',
      value: stats.assets,
      detail: `ใช้แล้ว ${stats.assetsSizeGB} GB`,
      href: '/admin/assets',
      tone: 'text-foreground-light',
      icon: HardDrive,
    },
    {
      label: 'ผู้เข้าชม 30 วัน',
      value: stats.visitors30d.toLocaleString('th-TH'),
      detail: 'จาก visitor logs',
      href: '/admin/analytics',
      tone: 'text-[var(--admin-accent)]',
      icon: Users,
    },
    {
      label: 'ความปลอดภัย',
      value: stats.unresolvedSecurityEvents,
      detail: 'รายการที่ยังไม่จัดการ',
      href: '/admin/security',
      tone: stats.unresolvedSecurityEvents > 0 ? 'text-destructive' : 'text-success',
      icon: Shield,
    },
  ]
}

function MetricCard({ metric }: { metric: Metric }) {
  const Icon = metric.icon
  return (
    <Link
      href={metric.href}
      className="group rounded-lg border border-surface-300 bg-surface-100 p-3 transition hover:border-[var(--admin-accent)]/40 hover:bg-surface-200 sm:p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-surface-300 bg-dash-canvas">
          <Icon className={`size-4 ${metric.tone}`} />
        </span>
        <ArrowUpRight className="size-4 shrink-0 text-foreground-faint opacity-0 transition group-hover:opacity-100" />
      </div>
      <p className="mt-4 text-2xl font-black text-foreground sm:text-3xl">{metric.value}</p>
      <p className="mt-1 text-xs font-bold text-foreground-light">{metric.label}</p>
      <p className="mt-0.5 truncate text-[11px] text-foreground-muted">{metric.detail}</p>
    </Link>
  )
}

function ActivityList({ activities }: { activities: DashboardData['recentActivity'] }) {
  if (activities.length === 0) {
    return (
      <div className="grid min-h-40 place-items-center text-center text-xs text-foreground-muted">
        ยังไม่มีกิจกรรมล่าสุด
      </div>
    )
  }

  return (
    <div className="divide-y divide-surface-300/70">
      {activities.map((activity) => (
        <div key={activity.id} className="grid gap-2 px-3 py-3 sm:grid-cols-[1fr_auto] sm:px-5">
          <div className="flex min-w-0 items-start gap-3">
            <span className={`mt-2 size-2 shrink-0 rounded-full ${outcomeClass(activity.outcome)}`} />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-foreground">{activityLabel(activity.action)}</p>
              <p className="mt-0.5 truncate text-xs text-foreground-muted">
                {resourceLabel(activity.resource)}
                {activity.resource_id ? ` · ${activity.resource_id}` : ''}
              </p>
            </div>
          </div>
          <span className="pl-5 text-xs text-foreground-faint sm:pl-0">{timeAgo(activity.created_at)}</span>
        </div>
      ))}
    </div>
  )
}

function QuickActions() {
  const actions = [
    { label: 'เพิ่มโปรเจกต์', href: '/portfolio/admin', icon: FolderOpen },
    { label: 'จัดการไฟล์', href: '/admin/assets', icon: HardDrive },
    { label: 'รัน Query', href: '/admin/database', icon: Database },
    { label: 'ดู Analytics', href: '/admin/analytics', icon: BarChart3 },
  ]

  return (
    <div className="grid gap-2">
      {actions.map((action) => {
        const Icon = action.icon
        return (
          <Link
            key={action.href}
            href={action.href}
            className="group flex min-h-12 items-center gap-3 rounded-lg border border-surface-300 bg-dash-canvas px-3 transition hover:border-[var(--admin-accent)]/40 hover:bg-surface-200"
          >
            <Icon className="size-4 shrink-0 text-foreground-muted transition group-hover:text-[var(--admin-accent)]" />
            <span className="min-w-0 flex-1 truncate text-xs font-bold text-foreground-light">{action.label}</span>
            <ArrowUpRight className="size-3.5 shrink-0 text-foreground-faint" />
          </Link>
        )
      })}
    </div>
  )
}

function StorageMeter({ usedGB }: { usedGB: string }) {
  const used = Number.parseFloat(usedGB)
  const percent = Number.isFinite(used) ? Math.min((used / 35) * 100, 100) : 0
  return (
    <div className="rounded-lg border border-surface-300 bg-dash-canvas p-3">
      <div className="mb-2 flex items-center justify-between gap-3 text-xs">
        <span className="font-bold text-foreground-light">พื้นที่จัดเก็บ</span>
        <span className="text-foreground-muted">{usedGB} GB / 35 GB</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-300">
        <div className="h-full rounded-full bg-[var(--admin-accent)]" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  usePageTitle('แดชบอร์ด')
  const { authInfo } = useAdminAuth()
  const { data, loading, error, refetch } = useAdminApi<DashboardData>('/api/admin/dashboard')

  const firstName = (authInfo?.displayName || authInfo?.githubUsername || 'Centered101').split(' ')[0]
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'สวัสดีตอนเช้า' : hour < 18 ? 'สวัสดีตอนบ่าย' : 'สวัสดีตอนเย็น'
  const today = new Date().toLocaleDateString('th-TH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  if (loading) return <AdminLoading message="กำลังโหลดแดชบอร์ด..." />
  if (error) return <AdminError error={error} onRetry={refetch} />
  if (!data) return <AdminError error="ไม่พบข้อมูลแดชบอร์ด" onRetry={refetch} />

  const metrics = buildMetrics(data.stats)

  return (
    <AdminPageContainer>
      <AdminPageHeader
        title={`${greeting}, ${firstName}`}
        description={today}
      >
        <button
          type="button"
          onClick={refetch}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-surface-300 bg-surface-100 px-3 text-xs font-bold text-foreground-light transition hover:border-[var(--admin-accent)]/40 hover:text-foreground"
        >
          <RefreshCw className="size-3.5" />
          รีเฟรช
        </button>
      </AdminPageHeader>

      <section className="rounded-lg border border-surface-300 bg-surface-100 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-[var(--admin-accent)]">Control Center</p>
            <h2 className="mt-2 text-xl font-black text-foreground sm:text-2xl">ภาพรวมระบบ Centered101</h2>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-foreground-muted sm:text-sm">
              รวมสถานะสำคัญของ portfolio, content, asset, analytics และ security ไว้ในหน้าเดียว
            </p>
          </div>
          <span className="inline-flex h-8 w-fit items-center gap-2 rounded-lg border border-success/25 bg-success/10 px-3 text-xs font-bold text-success">
            <span className="size-1.5 rounded-full bg-success" />
            Database ready
          </span>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <AdminPageSection
          title="กิจกรรมล่าสุด"
          description="บันทึกการทำงานของผู้ดูแล เรียงจากล่าสุด"
          className="overflow-hidden"
        >
          <ActivityList activities={data.recentActivity} />
        </AdminPageSection>

        <div className="grid content-start gap-4">
          <AdminPageSection title="คำสั่งลัด" description="ทางลัดไปงานที่ใช้บ่อย">
            <QuickActions />
          </AdminPageSection>

          <AdminPageSection title="Storage" description="คำนวณจาก digital assets">
            <StorageMeter usedGB={data.stats.assetsSizeGB} />
          </AdminPageSection>
        </div>
      </div>
    </AdminPageContainer>
  )
}
