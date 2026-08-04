'use client'

import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { usePageTitle } from '@/lib/hooks/use-page-title'
import { CheckCircle2, Inbox, Mail, MailOpen, MessageCircle, Trash2, UserRound } from 'lucide-react'
import { AdminPageContainer, AdminPageHeader } from '@/components/admin/AdminPage'
import { FeaturedTab } from '@/components/admin/portfolio/FeaturedTab'
import { CodingTab } from '@/components/admin/portfolio/CodingTab'
import { ToolsTab } from '@/components/admin/portfolio/ToolsTab'
import { StoryTab } from '@/components/admin/portfolio/StoryTab'
import { ConnectTab } from '@/components/admin/portfolio/ConnectTab'
import { ResumeTab } from '@/components/admin/portfolio/ResumeTab'
import { AppearanceTab } from '@/components/admin/portfolio/AppearanceTab'
import { AdminLoading, AdminError } from '@/components/admin/AdminStates'
import { useAdminApi, useAdminMutation } from '@/lib/hooks/useAdminApi'
import { useAdminAuth } from '@/components/admin/AdminAuthProvider'

const TABS = [
  { id: 'overview' },
  { id: 'projects' },
  { id: 'coding' },
  { id: 'tools' },
  { id: 'story' },
  { id: 'resume' },
  { id: 'appearance' },
  { id: 'connect' },
] as const

type TabId = (typeof TABS)[number]['id']
const TAB_IDS = TABS.map((t) => t.id) as string[]
const TAB_COPY: Record<TabId, { title: string; description: string }> = {
  overview: {
    title: 'คนติดต่อมา',
    description: 'หน้าแรกของ Portfolio Admin แสดงข้อความจากฟอร์มติดต่อก่อน ส่วนอื่นใช้ sidebar จัดการทั่วไป',
  },
  projects: {
    title: 'โปรเจกต์เด่น',
    description: 'จัดการโปรเจกต์ ภาพหลัก โลโก้ และลำดับการแสดงผลบนหน้า portfolio',
  },
  coding: {
    title: 'เวลาเขียนโค้ด',
    description: 'ดูสถิติ WakaTime และสรุปกิจกรรมการเขียนโค้ดที่แสดงบน portfolio',
  },
  tools: {
    title: 'สกิลและเครื่องมือ',
    description: 'จัดหมวดหมู่สกิล เครื่องมือ และไอคอนที่ใช้ในหน้า portfolio',
  },
  story: {
    title: 'เส้นทางการเรียนรู้',
    description: 'จัดการ timeline การเรียนรู้ ประสบการณ์ และหมุดหมายสำคัญ',
  },
  resume: {
    title: 'เรซูเม่',
    description: 'อัปโหลดและตรวจไฟล์ CV ที่ใช้กับปุ่มดาวน์โหลดบนหน้า portfolio',
  },
  appearance: {
    title: 'หน้าเว็บ',
    description: 'จัดการรูป Hero และตำแหน่งการแสดงผลบนหน้า portfolio',
  },
  connect: {
    title: 'ช่องทางติดต่อ',
    description: 'จัดการลิงก์ติดต่อและดูตัวอย่างช่องทางที่แสดงบนหน้า portfolio',
  },
}

type ContactMessage = {
  id: string
  name: string
  email: string
  subject: string | null
  message: string
  is_read: boolean
  created_at: string
}

type ContactsData = { messages: ContactMessage[] }

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'เมื่อสักครู่'
  if (mins < 60) return `${mins} นาทีที่แล้ว`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} ชั่วโมงที่แล้ว`
  return `${Math.floor(hrs / 24)} วันที่แล้ว`
}

export function PortfolioAdminPage() {
  usePageTitle('Portfolio Admin')
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const activeTab: TabId = TAB_IDS.includes(tabParam ?? '') ? (tabParam as TabId) : 'overview'
  const copy = TAB_COPY[activeTab]

  return (
    <AdminPageContainer className="p-0">
      <div className="min-h-100 space-y-5">
        {activeTab !== 'overview' && activeTab !== 'connect' && (
          <AdminPageHeader title={copy.title} description={copy.description} />
        )}
        {activeTab === 'overview' && <PortfolioInboxOverview />}
        {activeTab === 'projects' && <FeaturedTab />}
        {activeTab === 'coding' && <CodingTab />}
        {activeTab === 'tools' && <ToolsTab />}
        {activeTab === 'story' && <StoryTab />}
        {activeTab === 'resume' && <ResumeTab />}
        {activeTab === 'appearance' && <AppearanceTab />}
        {activeTab === 'connect' && <ConnectTab />}
      </div>
    </AdminPageContainer>
  )
}

function PortfolioInboxOverview() {
  const { data, loading, error, refetch } = useAdminApi<ContactsData>('/api/admin/contacts')
  const { getAdminHeaders } = useAdminAuth()
  const { mutate: patchMsg } = useAdminMutation<{ id: string; is_read?: boolean; status?: string }>('/api/admin/contacts', 'PATCH')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  if (loading) return <AdminLoading message="กำลังโหลดข้อความติดต่อ..." />
  if (error) return <AdminError error={error} onRetry={refetch} />

  const messages = data?.messages ?? []
  const unread = messages.filter((m) => !m.is_read)
  const selected = messages.find((m) => m.id === selectedId) ?? messages[0] ?? null

  async function selectMessage(msg: ContactMessage) {
    setSelectedId(msg.id)
    if (!msg.is_read) {
      await patchMsg({ id: msg.id, is_read: true })
      refetch()
    }
  }

  async function deleteMessage(id: string) {
    await fetch(`/api/admin/contacts?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: getAdminHeaders(),
    })
    if (selectedId === id) setSelectedId(null)
    refetch()
  }

  return (
    <>
      <AdminPageHeader
        title="คนติดต่อมา"
        description="หน้าแรกของ Portfolio Admin แสดงข้อความจากฟอร์มติดต่อก่อน ส่วนอื่นใช้ sidebar จัดการทั่วไป"
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'ข้อความทั้งหมด', value: messages.length, icon: Inbox },
          { label: 'ยังไม่อ่าน', value: unread.length, icon: Mail },
          { label: 'ผู้ติดต่อล่าสุด', value: messages[0]?.name ?? '-', icon: UserRound },
        ].map((item) => {
          const Icon = item.icon
          return (
            <div key={item.label} className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-muted-foreground">
                <Icon className="size-4 text-accent" />
                <p className="text-xs font-semibold">{item.label}</p>
              </div>
              <p className="truncate text-2xl font-black text-foreground">{item.value}</p>
            </div>
          )
        })}
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-3 py-3 sm:px-5 sm:py-4">
          <div className="min-w-0">
            <h2 className="text-sm font-black text-foreground">อ่านข้อความติดต่อ</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">อ่าน ทำเครื่องหมาย และลบข้อความได้จากหน้านี้</p>
          </div>
        </div>

        {messages.length === 0 ? (
          <div className="grid min-h-48 place-items-center px-4 py-10 text-center sm:px-5">
            <div>
              <MessageCircle className="mx-auto mb-3 size-8 text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">ยังไม่มีใครติดต่อมา</p>
              <p className="mt-1 text-xs text-muted-foreground">ข้อความจากฟอร์ม portfolio จะแสดงตรงนี้</p>
            </div>
          </div>
        ) : (
          <div className="grid min-h-[420px] lg:grid-cols-[360px_1fr]">
            <div className="max-h-[44vh] divide-y divide-border overflow-y-auto border-b border-border lg:max-h-none lg:border-b-0 lg:border-r">
              {messages.map((msg) => {
                const active = selected?.id === msg.id
                return (
                  <button
                    key={msg.id}
                    type="button"
                    onClick={() => selectMessage(msg)}
                    className={`flex w-full items-start gap-3 px-3 py-3 text-left transition hover:bg-secondary/70 sm:px-5 sm:py-4 ${active ? 'bg-secondary' : ''}`}
                  >
                    <span className={`mt-2 size-2 shrink-0 rounded-full ${msg.is_read ? 'bg-border' : 'bg-accent'}`} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-black text-foreground">{msg.name}</span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(msg.created_at)}</span>
                      </span>
                      <span className="mt-1 block truncate text-xs font-semibold text-muted-foreground">
                        {msg.subject || msg.email}
                      </span>
                      <span className="mt-1 block line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {msg.message}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="min-w-0">
              {selected ? (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-3 py-3 sm:px-5 sm:py-4">
                    <div className="min-w-0">
                      <p className="truncate text-base font-black text-foreground">{selected.name}</p>
                      <p className="mt-1 flex min-w-0 items-center gap-1.5 break-all text-xs font-semibold text-muted-foreground">
                        <Mail className="size-3.5 text-accent" />
                        {selected.email}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">{timeAgo(selected.created_at)}</p>
                    </div>
                    <div className="flex w-full items-center gap-2 sm:w-auto">
                      {!selected.is_read && (
                        <button
                          type="button"
                          onClick={() => selectMessage(selected)}
                          className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-semibold text-muted-foreground transition hover:border-accent/40 hover:text-accent sm:flex-none"
                        >
                          <CheckCircle2 className="size-3.5" />
                          อ่านแล้ว
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => deleteMessage(selected.id)}
                        className="grid size-8 place-items-center rounded-md border border-border bg-background text-muted-foreground transition hover:border-destructive/30 hover:text-destructive"
                        aria-label="ลบข้อความ"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="px-3 py-4 sm:px-5 sm:py-5">
                    {selected.subject && (
                      <p className="mb-4 text-sm font-black text-foreground">{selected.subject}</p>
                    )}
                    <p className="whitespace-pre-wrap text-sm leading-7 text-foreground">
                      {selected.message}
                    </p>
                  </div>
                </>
              ) : (
                <div className="grid min-h-80 place-items-center text-center">
                  <div>
                    <MailOpen className="mx-auto mb-3 size-8 text-muted-foreground" />
                    <p className="text-sm font-semibold text-foreground">เลือกข้อความเพื่ออ่าน</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
