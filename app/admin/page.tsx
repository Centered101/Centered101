'use client'

import { usePageTitle } from '@/lib/hooks/use-page-title'
import Link from 'next/link'
import { ArrowUpRight, BarChart3, Clock, Database, FileText, FolderOpen, HardDrive, MessageSquare, Shield, Users } from 'lucide-react'
import { useAdminApi } from '@/lib/hooks/useAdminApi'
import { useAdminAuth } from '@/components/admin/AdminAuthProvider'
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
  if (mins < 1) return 'เมื่อสักครู่'
  if (mins < 60) return `${mins} นาทีที่แล้ว`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} ชั่วโมงที่แล้ว`
  return `${Math.floor(hrs / 24)} วันที่แล้ว`
}

function outcomeColor(outcome: string) {
  if (outcome === 'success') return '#22C55E'
  if (outcome === 'failed') return '#EF4444'
  return '#F59E0B'
}

function activityLabel(action: string) {
  const labels: Record<string, string> = {
    'portfolio_project.update': 'อัปเดตโปรเจกต์พอร์ตโฟลิโอ',
    'portfolio_project.create': 'เพิ่มโปรเจกต์พอร์ตโฟลิโอ',
    'portfolio_project.delete': 'ลบโปรเจกต์พอร์ตโฟลิโอ',
    'portfolio_project.logo_upload': 'อัปโหลดโลโก้โปรเจกต์',
    'portfolio_project.poster_upload': 'อัปโหลดรูปโปรเจกต์',
    'portfolio_project.save': 'บันทึกโปรเจกต์พอร์ตโฟลิโอ',
    portfolio_project_update: 'อัปเดตโปรเจกต์พอร์ตโฟลิโอ',
    portfolio_project_create: 'เพิ่มโปรเจกต์พอร์ตโฟลิโอ',
    portfolio_project_delete: 'ลบโปรเจกต์พอร์ตโฟลิโอ',
    portfolio_project_logo_upload: 'อัปโหลดโลโก้โปรเจกต์',
    portfolio_project_poster_upload: 'อัปโหลดรูปโปรเจกต์',
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

export default function DashboardPage() {
  usePageTitle('แดชบอร์ด')
  const { authInfo } = useAdminAuth()
  const { data, loading, error, refetch } = useAdminApi<DashboardData>('/api/admin/dashboard')

  const firstName = (authInfo?.displayName || authInfo?.githubUsername || 'Centered101').split(' ')[0]
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'สวัสดีตอนเช้า' : hour < 18 ? 'สวัสดีตอนบ่าย' : 'สวัสดีตอนเย็น'
  const today = new Date().toLocaleDateString('th-TH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  if (loading) return <AdminLoading message="กำลังโหลดแดชบอร์ด..." />
  if (error) return <AdminError error={error} onRetry={refetch} />

  const s = data!.stats
  const stats = [
    { label: 'โปรเจกต์พอร์ตโฟลิโอ', value: s.projects, icon: FolderOpen, color: '#409EFE', href: '/portfolio/admin', change: 'เผยแพร่แล้ว' },
    { label: 'บทความ', value: s.posts, icon: FileText, color: '#22C55E', href: '/admin/content', change: `ฉบับร่าง ${s.draftPosts} รายการ` },
    { label: 'ข้อความที่ยังไม่อ่าน', value: s.unreadMessages, icon: MessageSquare, color: s.unreadMessages > 0 ? '#F59E0B' : '#A1A1AA', href: '/admin/business', change: 'กล่องติดต่อ' },
    { label: 'ไฟล์ดิจิทัล', value: s.assets, icon: HardDrive, color: '#A1A1AA', href: '/admin/assets', change: `ใช้แล้ว ${s.assetsSizeGB} GB` },
    { label: 'ผู้เข้าชม 30 วัน', value: s.visitors30d.toLocaleString('th-TH'), icon: Users, color: '#409EFE', href: '/admin/analytics', change: 'ย้อนหลัง 30 วัน' },
    { label: 'แจ้งเตือนความปลอดภัย', value: s.unresolvedSecurityEvents, icon: Shield, color: s.unresolvedSecurityEvents > 0 ? '#EF4444' : '#22C55E', href: '/admin/security', change: 'ยังไม่จัดการ' },
  ]

  const quickActions = [
    { label: 'เขียนบทความใหม่', icon: FileText, href: '/admin/content', description: 'เขียนและเผยแพร่' },
    { label: 'เพิ่มโปรเจกต์', icon: FolderOpen, href: '/portfolio/admin', description: 'อัปเดตพอร์ตโฟลิโอ' },
    { label: 'รัน Query', icon: Database, href: '/admin/database', description: 'สำรวจฐานข้อมูล' },
    { label: 'ดู Analytics', icon: BarChart3, href: '/admin/analytics', description: 'สถิติเข้าเว็บ' },
  ]

  return (
    <div className="space-y-6 p-4 sm:p-5">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-[#27272A] bg-[#18181B] p-5 shadow-2xl shadow-black/20">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#409EFE]/60 to-transparent" />
        <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[#409EFE]">ศูนย์ควบคุมระบบ</p>
          <h1 className="text-2xl font-bold text-[#FAFAFA]">{greeting}, {firstName}</h1>
          <p className="mt-1 text-sm text-[#71717A]">{today}</p>
        </div>
        <span className="flex items-center gap-1.5 rounded-lg border border-[#22C55E]/20 bg-[#22C55E]/5 px-3 py-1.5 text-xs font-medium text-[#22C55E]">
          <span className="size-1.5 rounded-full bg-[#22C55E]" />
          ฐานข้อมูลเชื่อมต่อแล้ว
        </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="group rounded-xl border border-[#27272A] bg-[#18181B] p-4 transition-colors hover:border-[#409EFE]/40 hover:bg-[#1f1f23]"
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
              <h2 className="text-sm font-semibold text-[#FAFAFA]">กิจกรรมล่าสุด</h2>
              <p className="mt-0.5 text-[11px] text-[#52525b]">บันทึกการทำงานของผู้ดูแล</p>
            </div>
            <Clock className="size-4 text-[#3f3f46]" />
          </div>
          {data!.recentActivity.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-[12px] text-[#3f3f46]">
              ยังไม่มีกิจกรรม
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
                    <p className="text-[13px] font-medium text-[#FAFAFA]">{activityLabel(act.action)}</p>
                    <p className="mt-0.5 truncate text-[11px] text-[#52525b]">
                      {resourceLabel(act.resource)}{act.resource_id ? ` · ${act.resource_id}` : ''}
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
            <h2 className="text-sm font-semibold text-[#FAFAFA]">คำสั่งลัด</h2>
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
              <span className="text-[#52525b]">พื้นที่จัดเก็บที่ใช้</span>
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
