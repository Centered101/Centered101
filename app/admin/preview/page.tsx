'use client'

import { useEffect, useState } from 'react'
import { usePageTitle } from '@/lib/hooks/use-page-title'
import { useAdminApi } from '@/lib/hooks/useAdminApi'
import { AdminLoading, AdminError } from '@/components/admin/AdminStates'
import { AdminPageContainer, AdminPageHeader } from '@/components/admin/AdminPage'
import {
  ExternalLink,
  Eye,
  EyeOff,
  Github,
  Code2,
  Clock,
  Package,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Maximize2,
} from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'

// ─── Types from public routes ────────────────────────────────────────────────

type PublicProject = {
  id: string
  slug: string
  title: string
  short_description: string | null
  tech_stack: string[]
  tags: string[]
  live_url: string | null
  github_url: string | null
  poster_url: string | null
  featured: boolean
  enabled: boolean
  status: string
  sort_order: number
}

type PublicTool = {
  id: string
  name: string
  category: string
  icon: string | null
}

type WakaSummary = {
  configured: boolean
  humanReadableTotal: string
  humanReadableDailyAverage: string
  bestDayText: string | null
  languages: { name: string; percent: number; color: string }[]
  projects: { name: string; percent: number }[]
}

// ─── Admin project type (for total count comparison) ─────────────────────────

type AdminProjectsData = { projects: { id: string; enabled: boolean; featured: boolean; status: string }[] }

const CATEGORY_ORDER = ['Frontend', 'Backend', 'Database', 'DevOps', 'Cloud', 'Tools']

function usePublicFetch<T>(url: string) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    fetch(url)
      .then((r) => r.json())
      .then((d) => { if (active) { setData(d); setLoading(false) } })
      .catch((e) => { if (active) { setError(e.message); setLoading(false) } })
    return () => { active = false }
  }, [url])

  return { data, loading, error }
}

export default function PreviewPage() {
  usePageTitle('Portfolio Preview')
  const [iframeOpen, setIframeOpen] = useState(false)

  // Public routes — what visitors see
  const { data: pubProjectsData, loading: pubProjLoading } = usePublicFetch<{ projects: PublicProject[] }>('/api/projects')
  const { data: toolsData, loading: toolsLoading } = usePublicFetch<{ tools: PublicTool[] }>('/api/portfolio/tools')
  const { data: wakaData, loading: wakaLoading } = usePublicFetch<WakaSummary>('/api/wakatime?range=last_7_days')

  // Admin route — full dataset for comparison
  const { data: adminData, loading: adminLoading } = useAdminApi<AdminProjectsData>('/api/admin/projects')

  const loading = pubProjLoading || toolsLoading || adminLoading

  if (loading && !pubProjectsData && !adminData) return <AdminLoading message="Fetching live portfolio data..." />

  const visibleProjects = pubProjectsData?.projects ?? []
  const allProjects = adminData?.projects ?? []

  const hiddenCount = allProjects.filter((p) => !p.enabled || p.status !== 'published' || !p.featured).length
  const featuredCount = allProjects.filter((p) => p.enabled && p.featured && p.status === 'published').length

  const tools = toolsData?.tools ?? []
  const toolsByCategory = tools.reduce<Record<string, PublicTool[]>>((acc, t) => {
    if (!acc[t.category]) acc[t.category] = []
    acc[t.category].push(t)
    return acc
  }, {})

  const waka = wakaData

  return (
    <AdminPageContainer>
      <AdminPageHeader
        title="Portfolio Preview"
        description="Real-time view of what visitors see — data from public API routes"
      >
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-lg border border-[#27272A] bg-[#18181B] px-3 py-1.5 text-xs text-[#A1A1AA] hover:text-[#FAFAFA]"
        >
          <ExternalLink className="size-3.5" />
          Open Live Site
        </a>
        <button
          onClick={() => setIframeOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-[#409EFE] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#60aeff]"
        >
          <Maximize2 className="size-3.5" />
          Preview Full Screen
        </button>
      </AdminPageHeader>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: 'Visitors See',
            value: `${featuredCount} projects`,
            sub: `${allProjects.length} total in DB`,
            icon: Eye,
            color: 'text-[#22C55E]',
          },
          {
            label: 'Not Visible',
            value: `${hiddenCount} hidden`,
            sub: 'draft / disabled / not featured',
            icon: EyeOff,
            color: 'text-[#52525b]',
          },
          {
            label: 'Tech Tools',
            value: `${tools.length} listed`,
            sub: `${Object.keys(toolsByCategory).length} categories`,
            icon: Code2,
            color: 'text-[#409EFE]',
          },
          {
            label: 'This Week',
            value: waka?.configured ? waka.humanReadableTotal : '—',
            sub: waka?.configured ? `avg ${waka.humanReadableDailyAverage}/day` : 'WakaTime not configured',
            icon: Clock,
            color: 'text-[#F59E0B]',
          },
        ].map((s) => {
          const Icon = s.icon
          return (
            <div key={s.label} className="rounded-xl border border-[#27272A] bg-[#18181B] p-4">
              <div className="mb-2 flex items-center gap-2">
                <Icon className={`size-4 ${s.color}`} />
                <span className="text-[11px] text-[#52525b]">{s.label}</span>
              </div>
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              <p className="mt-0.5 text-[10px] text-[#3f3f46]">{s.sub}</p>
            </div>
          )
        })}
      </div>

      {/* Featured projects (what visitors see) */}
      <div className="rounded-xl border border-[#27272A] bg-[#18181B]">
        <div className="flex items-center justify-between border-b border-[#27272A] px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-[#FAFAFA]">Featured Projects</h2>
            <p className="mt-0.5 text-[11px] text-[#52525b]">
              From <code className="font-mono text-[10px]">/api/projects</code> — enabled + published + featured only
            </p>
          </div>
          <a
            href="/admin/projects"
            className="flex items-center gap-1 text-[11px] text-[#409EFE] hover:underline"
          >
            Manage <ArrowRight className="size-3" />
          </a>
        </div>

        {visibleProjects.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <EyeOff className="mx-auto mb-2 size-8 text-[#3f3f46]" />
            <p className="text-sm text-[#52525b]">No projects visible to visitors</p>
            <p className="mt-1 text-[11px] text-[#3f3f46]">
              Set projects to enabled + published + featured to show on the site
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#27272A]/50">
            {visibleProjects.map((proj, i) => (
              <div key={proj.id} className="flex items-start gap-4 px-5 py-4">
                <span className="mt-0.5 font-mono text-[11px] text-[#3f3f46]">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-[#FAFAFA]">{proj.title}</span>
                    <span className="rounded border border-[#22C55E]/20 bg-[#22C55E]/10 px-1.5 py-px text-[9px] font-semibold text-[#22C55E]">
                      LIVE
                    </span>
                    {proj.featured && (
                      <span className="rounded border border-[#409EFE]/20 bg-[#409EFE]/10 px-1.5 py-px text-[9px] font-semibold text-[#409EFE]">
                        FEATURED
                      </span>
                    )}
                  </div>
                  {proj.short_description && (
                    <p className="mt-0.5 text-[12px] text-[#52525b]">{proj.short_description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {proj.tech_stack.slice(0, 6).map((t) => (
                      <span key={t} className="rounded border border-[#27272A] bg-[#09090B] px-1.5 py-px text-[10px] text-[#A1A1AA]">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {proj.github_url && (
                    <a href={proj.github_url} target="_blank" rel="noopener noreferrer"
                      className="grid size-7 place-items-center rounded-lg border border-[#27272A] bg-[#09090B] text-[#52525b] hover:text-[#FAFAFA]">
                      <Github className="size-3.5" />
                    </a>
                  )}
                  {proj.live_url && (
                    <a href={proj.live_url} target="_blank" rel="noopener noreferrer"
                      className="grid size-7 place-items-center rounded-lg border border-[#27272A] bg-[#09090B] text-[#52525b] hover:text-[#409EFE]">
                      <ExternalLink className="size-3.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All projects visibility status */}
      {allProjects.length > 0 && (
        <div className="rounded-xl border border-[#27272A] bg-[#18181B]">
          <div className="flex items-center justify-between border-b border-[#27272A] px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-[#FAFAFA]">All Projects — Visibility Status</h2>
              <p className="mt-0.5 text-[11px] text-[#52525b]">Admin data vs what visitors see</p>
            </div>
            <a href="/admin/portfolio" className="flex items-center gap-1 text-[11px] text-[#409EFE] hover:underline">
              Manage <ArrowRight className="size-3" />
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-[#27272A] text-[10px] font-semibold uppercase tracking-widest text-[#3f3f46]">
                  <th className="px-5 py-3">Project</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Enabled</th>
                  <th className="px-4 py-3">Featured</th>
                  <th className="px-4 py-3">Visible</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272A]/40">
                {allProjects.map((p) => {
                  const visible = p.enabled && p.featured && p.status === 'published'
                  return (
                    <tr key={p.id} className="hover:bg-[#27272A]/20">
                      <td className="px-5 py-2.5">
                        <span className="text-[12px] font-medium text-[#A1A1AA]">
                          {visibleProjects.find((vp) => vp.id === p.id)?.title ?? `ID: ${p.id.slice(0, 8)}…`}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-[11px] font-semibold capitalize ${p.status === 'published' ? 'text-[#22C55E]' : 'text-[#52525b]'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        {p.enabled
                          ? <CheckCircle2 className="size-4 text-[#22C55E]" />
                          : <XCircle className="size-4 text-[#3f3f46]" />}
                      </td>
                      <td className="px-4 py-2.5">
                        {p.featured
                          ? <CheckCircle2 className="size-4 text-[#409EFE]" />
                          : <XCircle className="size-4 text-[#3f3f46]" />}
                      </td>
                      <td className="px-4 py-2.5">
                        {visible
                          ? <span className="rounded bg-[#22C55E]/10 px-2 py-0.5 text-[10px] font-semibold text-[#22C55E]">VISIBLE</span>
                          : <span className="rounded bg-[#27272A] px-2 py-0.5 text-[10px] font-semibold text-[#52525b]">HIDDEN</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tech Stack */}
      <div className="rounded-xl border border-[#27272A] bg-[#18181B]">
        <div className="flex items-center justify-between border-b border-[#27272A] px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-[#FAFAFA]">Tech Stack</h2>
            <p className="mt-0.5 text-[11px] text-[#52525b]">
              From <code className="font-mono text-[10px]">/api/portfolio/tools</code> — {tools.length} tools
            </p>
          </div>
          <a href="/admin/portfolio" className="flex items-center gap-1 text-[11px] text-[#409EFE] hover:underline">
            Manage <ArrowRight className="size-3" />
          </a>
        </div>
        {toolsLoading ? (
          <div className="px-5 py-6 text-center text-[12px] text-[#52525b]">Loading tools…</div>
        ) : tools.length === 0 ? (
          <div className="px-5 py-6 text-center text-[12px] text-[#52525b]">No tools configured</div>
        ) : (
          <div className="divide-y divide-[#27272A]/40">
            {CATEGORY_ORDER.filter((cat) => toolsByCategory[cat]).map((cat) => (
              <div key={cat} className="px-5 py-4">
                <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-widest text-[#3f3f46]">{cat}</p>
                <div className="flex flex-wrap gap-1.5">
                  {toolsByCategory[cat].map((tool) => (
                    <span
                      key={tool.id}
                      className="flex items-center gap-1 rounded-lg border border-[#27272A] bg-[#09090B] px-2.5 py-1 text-[11px] text-[#A1A1AA]"
                    >
                      {tool.icon && (
                        <span className="font-mono text-[10px] opacity-60">{tool.icon}</span>
                      )}
                      {tool.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* WakaTime */}
      {!wakaLoading && waka && (
        <div className="rounded-xl border border-[#27272A] bg-[#18181B]">
          <div className="flex items-center justify-between border-b border-[#27272A] px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-[#FAFAFA]">WakaTime — Visitor View</h2>
              <p className="mt-0.5 text-[11px] text-[#52525b]">
                From <code className="font-mono text-[10px]">/api/wakatime</code> — cached 1h
              </p>
            </div>
            <a href="/admin/wakatime" className="flex items-center gap-1 text-[11px] text-[#409EFE] hover:underline">
              Full stats <ArrowRight className="size-3" />
            </a>
          </div>
          {!waka.configured ? (
            <div className="px-5 py-6 text-center text-[12px] text-[#52525b]">
              WakaTime not configured — set <code className="font-mono text-[10px]">WAKATIME_API_KEY</code> in .env
            </div>
          ) : (
            <div className="grid divide-y divide-[#27272A]/40 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              <div className="px-5 py-4">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-[#3f3f46]">Top Languages</p>
                <div className="space-y-2">
                  {waka.languages.map((lang) => (
                    <div key={lang.name} className="flex items-center gap-3">
                      <div className="w-20 shrink-0">
                        <p className="text-[12px] text-[#A1A1AA]">{lang.name}</p>
                      </div>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#27272A]">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${lang.percent}%`, backgroundColor: lang.color || '#409EFE' }}
                        />
                      </div>
                      <span className="w-10 text-right font-mono text-[11px] text-[#52525b]">{lang.percent}%</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="px-5 py-4">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-[#3f3f46]">This Week</p>
                <div className="space-y-3">
                  <div>
                    <p className="text-[11px] text-[#52525b]">Total coded</p>
                    <p className="text-xl font-bold text-[#F59E0B]">{waka.humanReadableTotal}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[#52525b]">Daily average</p>
                    <p className="text-sm font-semibold text-[#FAFAFA]">{waka.humanReadableDailyAverage}</p>
                  </div>
                  {waka.bestDayText && (
                    <div>
                      <p className="text-[11px] text-[#52525b]">Best day</p>
                      <p className="text-sm font-semibold text-[#22C55E]">{waka.bestDayText}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* iframe preview modal */}
      <Dialog open={iframeOpen} onOpenChange={setIframeOpen}>
        <DialogContent
          aria-describedby={undefined}
          className="max-h-[95vh] w-[95vw] max-w-[95vw] overflow-hidden border-[#27272A] bg-[#09090B] p-0"
        >
          <div className="flex items-center justify-between border-b border-[#27272A] px-4 py-2.5">
            <span className="text-[12px] font-semibold text-[#A1A1AA]">Live Portfolio Preview</span>
            <div className="flex items-center gap-2">
              <span className="rounded border border-[#22C55E]/20 bg-[#22C55E]/10 px-2 py-px text-[10px] font-semibold text-[#22C55E]">
                LIVE
              </span>
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 rounded border border-[#27272A] bg-[#18181B] px-2 py-px text-[10px] text-[#A1A1AA] hover:text-[#FAFAFA]"
              >
                <ExternalLink className="size-3" /> Open in tab
              </a>
            </div>
          </div>
          <iframe
            src="/"
            className="h-[calc(95vh-44px)] w-full border-0"
            title="Portfolio Live Preview"
          />
        </DialogContent>
      </Dialog>
    </AdminPageContainer>
  )
}
