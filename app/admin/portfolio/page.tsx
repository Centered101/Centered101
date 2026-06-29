'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { usePageTitle } from '@/lib/hooks/use-page-title'
import { Layers, Clock, Wrench, BookOpen, MessageCircle, FileText } from 'lucide-react'
import { AdminPageContainer, AdminPageHeader } from '@/components/admin/AdminPage'
import { FeaturedTab } from '@/components/admin/portfolio/FeaturedTab'
import { CodingTab } from '@/components/admin/portfolio/CodingTab'
import { ToolsTab } from '@/components/admin/portfolio/ToolsTab'
import { StoryTab } from '@/components/admin/portfolio/StoryTab'
import { ConnectTab } from '@/components/admin/portfolio/ConnectTab'
import { ResumeTab } from '@/components/admin/portfolio/ResumeTab'

const TABS = [
  { id: 'projects', label: 'Featured Projects', icon: Layers },
  { id: 'coding', label: 'Coding Time', icon: Clock },
  { id: 'tools', label: 'Skills & Tools', icon: Wrench },
  { id: 'story', label: 'My Learning Story', icon: BookOpen },
  { id: 'resume', label: 'Resume', icon: FileText },
  { id: 'connect', label: 'Get in Touch', icon: MessageCircle },
] as const

type TabId = (typeof TABS)[number]['id']
const TAB_IDS = TABS.map((t) => t.id) as string[]

export default function PortfolioPage() {
  usePageTitle('Portfolio')
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const activeTab: TabId = TAB_IDS.includes(tabParam ?? '') ? (tabParam as TabId) : 'projects'

  function setTab(id: TabId) {
    router.replace(`/admin/portfolio?tab=${id}`, { scroll: false })
  }

  return (
    <AdminPageContainer className="p-0">
      <div className="border-b border-[#27272A] px-5 pt-5">
        <AdminPageHeader
          title="Portfolio"
          description="Manage all portfolio sections from one place"
          className="mb-4"
        />
        <div className="flex gap-1 overflow-x-auto pb-px">
          {TABS.map((t) => {
            const Icon = t.icon
            const active = activeTab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-t-lg border-b-2 px-4 py-2.5 text-xs font-medium transition-colors ${
                  active
                    ? 'border-[#409EFE] text-[#409EFE]'
                    : 'border-transparent text-[#52525b] hover:text-[#A1A1AA]'
                }`}
              >
                <Icon className="size-3.5" />
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="min-h-100">
        {activeTab === 'projects' && <FeaturedTab />}
        {activeTab === 'coding' && <CodingTab />}
        {activeTab === 'tools' && <ToolsTab />}
        {activeTab === 'story' && <StoryTab />}
        {activeTab === 'resume' && <ResumeTab />}
        {activeTab === 'connect' && <ConnectTab />}
      </div>
    </AdminPageContainer>
  )
}
