'use client'

import { usePageTitle } from '@/lib/hooks/use-page-title'
import Link from 'next/link'
import { ArrowUpRight, BarChart3, Clock, Database, FileText, FolderOpen, HardDrive, MessageSquare, Shield, Users } from 'lucide-react'
import { useAdminApi } from '@/lib/hooks/useAdminApi'
import { AdminLoading, AdminError } from '@/components/admin/AdminStates'

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

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function outcomeColor(outcome: string) {
  if (outcome === 'success') return '#22C55E'
  if (outcome === 'failed') return '#EF4444'
  return '#F59E0B'
}

export default function DashboardPage() {
  usePageTitle('Dashboard')
  const { data, loading, error, refetch } = useAdminApi<DashboardData>('/api/admin/dashboard')

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  if (loading) return <AdminLoading message="Loading dashboard..." />
  if (error) return <AdminError error={error} onRetry={refetch} />

  const s = data!.stats
  const stats = [
    { label: 'Portfolio Projects', value: s.projects, icon: FolderOpen, color: '#409EFE', href: '/admin/portfolio', change: 'published' },
    { label: 'Blog Posts', value: s.posts, icon: FileText, color: '#22C55E', href: '/admin/content', change: `${s.draftPosts} drafts` },
    { label: 'Unread Messages', value: s.unreadMessages, icon: MessageSquare, color: s.unreadMessages > 0 ? '#F59E0B' : '#A1A1AA', href: '/admin/business', change: 'contact inbox' },
    { label: 'Digital Assets', value: s.assets, icon: HardDrive, color: '#A1A1AA', href: '/admin/assets', change: `${s.assetsSizeGB} GB used` },
    { label: 'Visitors (30d)', value: s.visitors30d.toLocaleString(), icon: Users, color: '#409EFE', href: '/admin/analytics', change: 'last 30 days' },
    { label: 'Security Alerts', value: s.unresolvedSecurityEvents, icon: Shield, color: s.unresolvedSecurityEvents > 0 ? '#EF4444' : '#22C55E', href: '/admin/security', change: 'unresolved' },
  ]

  const quickActions = [
    { label: 'New Blog Post', icon: FileText, href: '/admin/content', description: 'Write & publish' },
    { label: 'Add Project', icon: FolderOpen, href: '/admin/portfolio', description: 'Update portfolio' },
    { label: 'Run Query', icon: Database, href: '/admin/database', description: 'DB explorer' },
    { label: 'View Analytics', icon: BarChart3, href: '/admin/analytics', description: 'Site stats' },
  ]

  return (
    <div className="space-y-6 p-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#FAFAFA]">{greeting}, Centered101 👋</h1>
          <p className="mt-0.5 text-sm text-[#52525b]">{today}</p>
        </div>
        <span className="flex items-center gap-1.5 rounded-lg border border-[#22C55E]/20 bg-[#22C55E]/5 px-3 py-1.5 text-xs font-medium text-[#22C55E]">
          <span className="size-1.5 rounded-full bg-[#22C55E]" />
          Database connected
        </span>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="group rounded-xl border border-[#27272A] bg-[#18181B] p-4 transition-colors hover:border-[#409EFE]/30"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="grid size-8 place-items-center rounded-lg border border-[#27272A] bg-[#09090B]">
                  <Icon className="size-4" style={{ color: stat.color }} />
                </div>
                <ArrowUpRight className="size-3.5 text-[#3f3f46] opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <p className="text-xl font-bold text-[#FAFAFA]">{stat.value}</p>
              <p className="mt-0.5 text-[11px] font-medium text-[#A1A1AA]">{stat.label}</p>
              <p className="mt-0.5 text-[10px] text-[#52525b]">{stat.change}</p>
            </Link>
          )
        })}
      </div>

      {/* Recent Activity + Quick Actions */}
      <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
        {/* Activity */}
        <div className="rounded-xl border border-[#27272A] bg-[#18181B]">
          <div className="flex items-center justify-between border-b border-[#27272A] px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-[#FAFAFA]">Recent Activity</h2>
              <p className="mt-0.5 text-[11px] text-[#52525b]">Admin audit log</p>
            </div>
            <Clock className="size-4 text-[#3f3f46]" />
          </div>
          {data!.recentActivity.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-[12px] text-[#3f3f46]">
              No activity yet
            </div>
          ) : (
            <div className="divide-y divide-[#27272A]/60">
              {data!.recentActivity.map((act) => (
                <div key={act.id} className="flex items-start gap-3.5 px-5 py-3.5">
                  <div
                    className="mt-1.5 size-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: outcomeColor(act.outcome) }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-[#FAFAFA]">{act.action}</p>
                    <p className="mt-0.5 truncate text-[11px] text-[#52525b]">
                      {act.resource}{act.resource_id ? ` · ${act.resource_id}` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] text-[#3f3f46]">{timeAgo(act.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="rounded-xl border border-[#27272A] bg-[#18181B]">
          <div className="border-b border-[#27272A] px-5 py-4">
            <h2 className="text-sm font-semibold text-[#FAFAFA]">Quick Actions</h2>
          </div>
          <div className="grid gap-2 p-4 grid-cols-1">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <Link
                  key={action.label}
                  href={action.href}
                  className="group flex items-center gap-3 rounded-lg border border-[#27272A] bg-[#09090B] px-3 py-2.5 transition-colors hover:border-[#409EFE]/30 hover:bg-[#409EFE]/5"
                >
                  <Icon className="size-4 shrink-0 text-[#52525b] group-hover:text-[#409EFE]" />
                  <div>
                    <p className="text-[12px] font-medium text-[#FAFAFA]">{action.label}</p>
                    <p className="text-[10px] text-[#52525b]">{action.description}</p>
                  </div>
                  <ArrowUpRight className="ml-auto size-3 shrink-0 text-[#3f3f46] opacity-0 group-hover:opacity-100" />
                </Link>
              )
            })}
          </div>

          {/* Storage */}
          <div className="border-t border-[#27272A] px-5 py-4">
            <div className="mb-1.5 flex items-center justify-between text-[11px]">
              <span className="text-[#52525b]">Storage used</span>
              <span className="font-semibold text-[#A1A1AA]">{s.assetsSizeGB} GB</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[#27272A]">
              <div
                className="h-full rounded-full bg-[#409EFE]"
                style={{ width: `${Math.min(parseFloat(s.assetsSizeGB) / 35 * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
