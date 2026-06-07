'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  Activity,
  BarChart3,
  BookOpen,
  Cloud,
  Database,
  FileText,
  Github,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  MessageSquare,
  Save,
  Server,
  Settings,
  ShieldCheck,
  Trash2,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ecosystemPages, ecosystemServices } from '@/lib/ecosystem'

type GitHubRepo = {
  name: string
}

type PortfolioProject = {
  id?: string
  slug: string
  title: string
  short_description: string
  description: string
  category: string
  status: string
  poster_url: string
  poster_alt: string
  live_url: string
  github_url: string
  docs_url: string
  source_type: string
  source_repo: string
  tech_stack: string[]
  tags: string[]
  featured: boolean
  enabled: boolean
  sort_order: number
  updated_at?: string
}

const TOKEN_STORAGE_KEY = 'centered101_admin_token'

const emptyProject: PortfolioProject = {
  slug: '',
  title: '',
  short_description: '',
  description: '',
  category: 'project',
  status: 'published',
  poster_url: '',
  poster_alt: '',
  live_url: '',
  github_url: '',
  docs_url: '',
  source_type: 'manual',
  source_repo: '',
  tech_stack: [],
  tags: [],
  featured: true,
  enabled: true,
  sort_order: 100,
}

const adminModules = [
  {
    id: 'overview',
    label: 'Overview',
    icon: LayoutDashboard,
    description: 'ภาพรวมระบบ Centered101 ทั้งหมด',
    status: 'Live',
  },
  {
    id: 'projects',
    label: 'Projects',
    icon: FileText,
    description: 'ควบคุมโปรเจกต์ Portfolio จาก Supabase',
    status: 'Live',
  },
  {
    id: 'content',
    label: 'Content',
    icon: FileText,
    description: 'Blog, Knowledge Base, About, Timeline',
    status: 'Next',
  },
  {
    id: 'messages',
    label: 'Messages',
    icon: MessageSquare,
    description: 'ข้อความจาก Contact และ LINE notify',
    status: 'Next',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    description: 'Visitor logs, page views, resume downloads',
    status: 'Next',
  },
  {
    id: 'system',
    label: 'System',
    icon: Server,
    description: 'API health, database, deployments, status',
    status: 'Next',
  },
]

function StatusBadge({ status }: { status: string }) {
  const isLive = ['Live', 'Active', 'Connected'].includes(status)

  return (
    <span className={`border px-2 py-0.5 text-xs font-semibold ${
      isLive
        ? 'border-[#1ED760]/30 bg-[#1ED760]/10 text-[#1ED760]'
        : 'border-accent/30 bg-accent/10 text-accent'
    }`}>
      {status}
    </span>
  )
}

export default function AdminPage() {
  const [token, setToken] = useState('')
  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [projects, setProjects] = useState<PortfolioProject[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [projectForm, setProjectForm] = useState<PortfolioProject>(emptyProject)
  const [status, setStatus] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [activeModule, setActiveModule] = useState('overview')
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId),
    [projects, selectedProjectId]
  )
  const activeModuleConfig = adminModules.find((module) => module.id === activeModule) || adminModules[0]
  const ActiveModuleIcon = activeModuleConfig.icon

  useEffect(() => {
    const savedToken = window.localStorage.getItem(TOKEN_STORAGE_KEY)
    if (savedToken) {
      setToken(savedToken)
      unlockDashboard(savedToken)
    }

    fetch('/api/github')
      .then((response) => response.json())
      .then((data) => {
        const nextRepos = (data.repositories || []) as GitHubRepo[]
        setRepos(nextRepos)
      })
      .catch(() => {
        setStatus('โหลด repo ไม่สำเร็จ')
        toast.error('โหลด repo ไม่สำเร็จ')
      })
  }, [])

  useEffect(() => {
    if (!selectedProject) {
      setProjectForm(emptyProject)
      return
    }

    setProjectForm({
      ...emptyProject,
      ...selectedProject,
      short_description: selectedProject.short_description || '',
      description: selectedProject.description || '',
      poster_url: selectedProject.poster_url || '',
      poster_alt: selectedProject.poster_alt || '',
      live_url: selectedProject.live_url || '',
      github_url: selectedProject.github_url || '',
      docs_url: selectedProject.docs_url || '',
      source_repo: selectedProject.source_repo || '',
      tech_stack: selectedProject.tech_stack || [],
      tags: selectedProject.tags || [],
    })
  }, [selectedProject])

  const loadProjects = async (nextToken = token) => {
    if (!nextToken) {
      return
    }

    const response = await fetch('/api/admin/projects', {
      headers: { 'x-admin-token': nextToken },
    })
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'โหลด projects ไม่สำเร็จ')
    }

    const nextProjects = (data.projects || []) as PortfolioProject[]
    setProjects(nextProjects)
    setSelectedProjectId((current) => current || nextProjects[0]?.id || '')
  }

  const unlockDashboard = async (nextToken = token) => {
    if (!nextToken) {
      setStatus('ใส่ admin token ก่อน')
      toast.warning('ใส่ admin token ก่อน')
      return
    }

    setIsLoading(true)
    setStatus('')
    const toastId = toast.loading('กำลังโหลด dashboard...')

    try {
      await loadProjects(nextToken)
      window.localStorage.setItem(TOKEN_STORAGE_KEY, nextToken)
      setIsAuthenticated(true)
      setStatus('โหลดข้อมูลแล้ว')
      toast.success('โหลดข้อมูลแล้ว', { id: toastId })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด'
      setStatus(message)
      toast.error(message, { id: toastId })
    } finally {
      setIsLoading(false)
    }
  }

  const updateProjectField = <K extends keyof PortfolioProject>(key: K, value: PortfolioProject[K]) => {
    setProjectForm((current) => ({ ...current, [key]: value }))
  }

  const saveProject = async () => {
    if (!projectForm.slug.trim() || !projectForm.title.trim()) {
      setStatus('ใส่ slug และ title ก่อน')
      toast.warning('ใส่ slug และ title ก่อน')
      return
    }

    setIsLoading(true)
    setStatus('')
    const toastId = toast.loading('กำลังบันทึก project...')

    try {
      const response = await fetch('/api/admin/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token,
        },
        body: JSON.stringify(projectForm),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'บันทึก project ไม่สำเร็จ')
      }

      await loadProjects(token)
      setSelectedProjectId(data.project.id)
      setStatus('บันทึก project แล้ว')
      toast.success('บันทึก project แล้ว', { id: toastId })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด'
      setStatus(message)
      toast.error(message, { id: toastId })
    } finally {
      setIsLoading(false)
    }
  }

  const deleteProject = async () => {
    if (!projectForm.id) {
      setProjectForm(emptyProject)
      setSelectedProjectId('')
      return
    }

    setIsLoading(true)
    setStatus('')
    const toastId = toast.loading('กำลังลบ project...')

    try {
      const response = await fetch(`/api/admin/projects?id=${encodeURIComponent(projectForm.id)}`, {
        method: 'DELETE',
        headers: { 'x-admin-token': token },
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'ลบ project ไม่สำเร็จ')
      }

      setSelectedProjectId('')
      setProjectForm(emptyProject)
      await loadProjects(token)
      setStatus('ลบ project แล้ว')
      toast.success('ลบ project แล้ว', { id: toastId })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด'
      setStatus(message)
      toast.error(message, { id: toastId })
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY)
    setToken('')
    setProjects([])
    setSelectedProjectId('')
    setProjectForm(emptyProject)
    setIsAuthenticated(false)
    setStatus('')
    toast.info('ออกจากระบบ admin แล้ว')
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen w-full bg-[#050505] px-6 py-10 text-white">
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-xl items-center">
          <section className="w-full rounded-lg border border-white/10 bg-[#0b0b0b] p-6 shadow-[0_30px_120px_-60px_rgba(64,158,254,0.65)]">
            <div className="mb-6 flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-md border border-white/10 bg-white/[0.03]">
                <LockKeyhole className="size-5 text-accent" />
              </span>
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.24em] text-accent">Admin Auth</p>
                <h1 className="text-2xl font-black">Centered101 Control Center</h1>
              </div>
            </div>

            <p className="mb-5 text-sm leading-6 text-white/55">
              ใส่ admin token เพื่อเข้าสู่ dashboard ควบคุมระบบทั้งหมดของ centered101.com
            </p>

            <Label htmlFor="admin-token">Admin token</Label>
            <Input
              id="admin-token"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  unlockDashboard()
                }
              }}
              placeholder="ADMIN_DASHBOARD_TOKEN"
              type="password"
              className="mt-2 border-white/10 bg-white/[0.03]"
            />

            <Button className="mt-4 w-full gap-2" onClick={() => unlockDashboard()} disabled={isLoading}>
              <LockKeyhole className="size-4" />
              Unlock dashboard
            </Button>

            {status ? (
              <p className="mt-4 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/60">
                {status}
              </p>
            ) : null}
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-white/10 bg-[#080808] lg:flex lg:flex-col">
          <div className="border-b border-white/10 p-5">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-md border border-white/10 bg-white/[0.03] font-black text-accent">
                C
              </span>
              <div>
                <p className="font-black leading-none">Centered101</p>
                <p className="mt-1 text-xs text-white/45">Admin Console</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-1 p-3">
            {adminModules.map((module) => {
              const Icon = module.icon
              return (
                <button
                  key={module.id}
                  type="button"
                  onClick={() => setActiveModule(module.id)}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                    activeModule === module.id
                      ? 'bg-accent/15 text-white'
                      : 'text-white/55 hover:bg-white/[0.04] hover:text-white'
                  }`}
                >
                  <Icon className="size-4 text-accent" />
                  <span className="flex-1">{module.label}</span>
                  <StatusBadge status={module.status} />
                </button>
              )
            })}
          </nav>

          <div className="border-t border-white/10 p-4">
            <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
              <p className="text-xs text-white/45">Signed in with token</p>
              <p className="mt-1 truncate font-mono text-xs text-white/70">{token}</p>
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-white/10 bg-[#050505]/85 backdrop-blur-xl">
            <div className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">
                  {activeModuleConfig.label}
                </p>
                <h1 className="text-lg font-black sm:text-xl">System Control Center</h1>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" className="border-white/10 bg-white/[0.03] text-white hover:border-accent/40" asChild>
                  <a href="/">View Site</a>
                </Button>
                <Button variant="outline" className="gap-2 border-white/10 bg-white/[0.03] text-white hover:border-accent/40" onClick={logout}>
                  <LogOut className="size-4" />
                  Logout
                </Button>
              </div>
            </div>
          </header>

          <div className="space-y-6 p-4 sm:p-6">
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border border-white/10 bg-[#0b0b0b] p-5">
                <ShieldCheck className="size-5 text-accent" />
                <p className="mt-5 text-sm text-white/45">Admin auth</p>
                <p className="text-2xl font-black">Unlocked</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-[#0b0b0b] p-5">
                <Github className="size-5 text-accent" />
                <p className="mt-5 text-sm text-white/45">GitHub repos</p>
                <p className="text-2xl font-black">{repos.length}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-[#0b0b0b] p-5">
                <Database className="size-5 text-accent" />
                <p className="mt-5 text-sm text-white/45">Portfolio projects</p>
                <p className="text-2xl font-black">{projects.length}</p>
              </div>
            </section>

            <div className="grid gap-3 lg:hidden">
              <div className="grid gap-2 sm:grid-cols-2">
                {adminModules.map((module) => {
                  const Icon = module.icon
                  return (
                    <button
                      key={module.id}
                      type="button"
                      onClick={() => setActiveModule(module.id)}
                      className={`flex items-center gap-3 rounded-md border px-3 py-2 text-sm ${
                        activeModule === module.id ? 'border-accent/50 bg-accent/10' : 'border-white/10 bg-[#0b0b0b]'
                      }`}
                    >
                      <Icon className="size-4 text-accent" />
                      {module.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <section className="rounded-lg border border-white/10 bg-[#0b0b0b] p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-md border border-white/10 bg-white/[0.03]">
                    <ActiveModuleIcon className="size-5 text-accent" />
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-black">{activeModuleConfig.label}</h2>
                      <StatusBadge status={activeModuleConfig.status} />
                    </div>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-white/50">
                      {activeModuleConfig.description}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {activeModule === 'projects' ? (
              <section className="grid gap-6 xl:grid-cols-[380px_1fr]">
                <div className="rounded-lg border border-white/10 bg-[#0b0b0b]">
                  <div className="border-b border-white/10 p-4">
                    <h2 className="font-black">Portfolio Projects</h2>
                    <p className="mt-1 text-sm text-white/45">ข้อมูลที่แสดงใน Featured Projects ด้านบน</p>
                  </div>

                  <div className="p-4">
                    <Button
                      className="w-full gap-2"
                      onClick={() => {
                        setSelectedProjectId('')
                        setProjectForm(emptyProject)
                      }}
                    >
                      <FileText className="size-4" />
                      New project
                    </Button>
                    <Button
                      variant="outline"
                      className="mt-3 w-full gap-2 border-white/10 bg-white/[0.03] text-white"
                      onClick={() => loadProjects(token)}
                      disabled={isLoading}
                    >
                      <RefreshCw className="size-4" />
                      Refresh projects
                    </Button>

                    <div className="mt-5 max-h-[620px] space-y-2 overflow-auto pr-1">
                      {projects.map((project) => (
                        <button
                          key={project.id || project.slug}
                          type="button"
                          onClick={() => setSelectedProjectId(project.id || '')}
                          className={`w-full rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                            selectedProjectId === project.id
                              ? 'border-accent bg-accent/10 text-white'
                              : 'border-white/10 bg-white/[0.03] text-white/55 hover:text-white'
                          }`}
                        >
                          <span className="block truncate font-semibold">{project.title}</span>
                          <span className="mt-1 block truncate text-xs text-white/35">
                            {project.slug} · order {project.sort_order}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-white/10 bg-[#0b0b0b]">
                  <div className="flex items-center justify-between border-b border-white/10 p-4">
                    <div>
                      <h2 className="font-black">Project Editor</h2>
                      <p className="mt-1 text-sm text-white/45">แก้ข้อมูลจากตาราง portfolio_projects</p>
                    </div>
                    <FileText className="size-5 text-accent" />
                  </div>

                  <div className="grid gap-6 p-4 xl:grid-cols-[1fr_320px]">
                    <div className="grid gap-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <Label htmlFor="project-title">Title</Label>
                          <Input
                            id="project-title"
                            value={projectForm.title}
                            onChange={(event) => updateProjectField('title', event.target.value)}
                            className="mt-2 border-white/10 bg-white/[0.03]"
                          />
                        </div>
                        <div>
                          <Label htmlFor="project-slug">Slug</Label>
                          <Input
                            id="project-slug"
                            value={projectForm.slug}
                            onChange={(event) => updateProjectField('slug', event.target.value)}
                            className="mt-2 border-white/10 bg-white/[0.03]"
                          />
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-3">
                        <div>
                          <Label htmlFor="project-category">Category</Label>
                          <Input
                            id="project-category"
                            value={projectForm.category}
                            onChange={(event) => updateProjectField('category', event.target.value)}
                            className="mt-2 border-white/10 bg-white/[0.03]"
                          />
                        </div>
                        <div>
                          <Label htmlFor="project-status">Status</Label>
                          <Input
                            id="project-status"
                            value={projectForm.status}
                            onChange={(event) => updateProjectField('status', event.target.value)}
                            className="mt-2 border-white/10 bg-white/[0.03]"
                          />
                        </div>
                        <div>
                          <Label htmlFor="project-order">Sort order</Label>
                          <Input
                            id="project-order"
                            type="number"
                            value={projectForm.sort_order}
                            onChange={(event) => updateProjectField('sort_order', Number(event.target.value))}
                            className="mt-2 border-white/10 bg-white/[0.03]"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="project-short">Short description</Label>
                        <Input
                          id="project-short"
                          value={projectForm.short_description}
                          onChange={(event) => updateProjectField('short_description', event.target.value)}
                          className="mt-2 border-white/10 bg-white/[0.03]"
                        />
                      </div>

                      <div>
                        <Label htmlFor="project-description">Description</Label>
                        <textarea
                          id="project-description"
                          value={projectForm.description}
                          onChange={(event) => updateProjectField('description', event.target.value)}
                          rows={4}
                          className="mt-2 w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-accent/50"
                        />
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <Label htmlFor="project-poster">Poster URL</Label>
                          <Input
                            id="project-poster"
                            value={projectForm.poster_url}
                            onChange={(event) => updateProjectField('poster_url', event.target.value)}
                            className="mt-2 border-white/10 bg-white/[0.03]"
                          />
                        </div>
                        <div>
                          <Label htmlFor="project-poster-alt">Poster alt</Label>
                          <Input
                            id="project-poster-alt"
                            value={projectForm.poster_alt}
                            onChange={(event) => updateProjectField('poster_alt', event.target.value)}
                            className="mt-2 border-white/10 bg-white/[0.03]"
                          />
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-3">
                        <div>
                          <Label htmlFor="project-live">Live URL</Label>
                          <Input
                            id="project-live"
                            value={projectForm.live_url}
                            onChange={(event) => updateProjectField('live_url', event.target.value)}
                            className="mt-2 border-white/10 bg-white/[0.03]"
                          />
                        </div>
                        <div>
                          <Label htmlFor="project-github">GitHub URL</Label>
                          <Input
                            id="project-github"
                            value={projectForm.github_url}
                            onChange={(event) => updateProjectField('github_url', event.target.value)}
                            className="mt-2 border-white/10 bg-white/[0.03]"
                          />
                        </div>
                        <div>
                          <Label htmlFor="project-docs">Docs URL</Label>
                          <Input
                            id="project-docs"
                            value={projectForm.docs_url}
                            onChange={(event) => updateProjectField('docs_url', event.target.value)}
                            className="mt-2 border-white/10 bg-white/[0.03]"
                          />
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <Label htmlFor="project-tech">Tech stack</Label>
                          <Input
                            id="project-tech"
                            value={projectForm.tech_stack.join(', ')}
                            onChange={(event) => updateProjectField('tech_stack', event.target.value.split(',').map((item) => item.trim()).filter(Boolean))}
                            placeholder="Next.js, Supabase, TypeScript"
                            className="mt-2 border-white/10 bg-white/[0.03]"
                          />
                        </div>
                        <div>
                          <Label htmlFor="project-tags">Tags</Label>
                          <Input
                            id="project-tags"
                            value={projectForm.tags.join(', ')}
                            onChange={(event) => updateProjectField('tags', event.target.value.split(',').map((item) => item.trim()).filter(Boolean))}
                            placeholder="dashboard, api, web"
                            className="mt-2 border-white/10 bg-white/[0.03]"
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-5">
                        <label className="flex items-center gap-3 text-sm text-white/55">
                          <Switch checked={projectForm.enabled} onCheckedChange={(value) => updateProjectField('enabled', value)} />
                          Enabled
                        </label>
                        <label className="flex items-center gap-3 text-sm text-white/55">
                          <Switch checked={projectForm.featured} onCheckedChange={(value) => updateProjectField('featured', value)} />
                          Featured
                        </label>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <Button className="gap-2" onClick={saveProject} disabled={isLoading}>
                          <Save className="size-4" />
                          Save project
                        </Button>
                        <Button variant="outline" className="gap-2 border-white/10 bg-white/[0.03] text-white" onClick={deleteProject} disabled={isLoading}>
                          <Trash2 className="size-4" />
                          Delete
                        </Button>
                      </div>

                      {status ? (
                        <p className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/60">
                          {status}
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <p className="mb-2 text-sm font-semibold text-white/55">Poster preview</p>
                      <div className="aspect-[4/5] overflow-hidden rounded-md border border-white/10 bg-white/[0.03]">
                        {projectForm.poster_url ? (
                          <img
                            src={projectForm.poster_url}
                            alt=""
                            draggable={false}
                            onContextMenu={(event) => event.preventDefault()}
                            className="h-full w-full select-none object-cover"
                          />
                        ) : (
                          <div className="grid h-full place-items-center text-sm text-white/45">No poster</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            ) : activeModule === 'overview' ? (
              <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
                <div className="rounded-lg border border-white/10 bg-[#0b0b0b] p-6">
                  <div className="mb-5 flex items-center justify-between">
                    <h2 className="text-xl font-black">Ecosystem Pages</h2>
                    <Settings className="size-5 text-accent" />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {ecosystemPages.slice(0, 8).map((page) => {
                      const Icon = page.icon
                      return (
                        <a
                          key={page.slug}
                          href={page.slug}
                          className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/55 hover:border-accent/40 hover:text-white"
                        >
                          <span className="flex items-center gap-2">
                            <Icon className="size-4 text-accent" />
                            {page.title}
                          </span>
                          <StatusBadge status={page.status} />
                        </a>
                      )
                    })}
                  </div>
                </div>

                <div className="rounded-lg border border-white/10 bg-[#0b0b0b] p-6">
                  <div className="mb-5 flex items-center justify-between">
                    <h2 className="text-xl font-black">System Services</h2>
                    <Activity className="size-5 text-accent" />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {ecosystemServices.map((service) => {
                      const Icon = service.icon
                      return (
                        <div key={service.name} className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm">
                          <span className="flex items-center gap-2 text-white/55">
                            <Icon className="size-4 text-accent" />
                            {service.name}
                          </span>
                          <StatusBadge status={service.state} />
                        </div>
                      )
                    })}
                    <div className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm">
                      <span className="flex items-center gap-2 text-white/55">
                        <Cloud className="size-4 text-accent" />
                        Public API
                      </span>
                      <StatusBadge status="Next" />
                    </div>
                    <div className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm">
                      <span className="flex items-center gap-2 text-white/55">
                        <BookOpen className="size-4 text-accent" />
                        Knowledge Base
                      </span>
                      <StatusBadge status="Next" />
                    </div>
                  </div>
                </div>
              </section>
            ) : (
              <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-lg border border-white/10 bg-[#0b0b0b] p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-black">{activeModuleConfig.label}</h2>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">
                        ส่วนนี้เตรียมไว้เป็นหน้าควบคุม {activeModuleConfig.description} เดี๋ยวค่อยต่อ API และตาราง Supabase เพิ่มได้ตรงนี้
                      </p>
                    </div>
                    <StatusBadge status={activeModuleConfig.status} />
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    {['Data source', 'Supabase table', 'Public API'].map((item) => (
                      <div key={item} className="rounded-md border border-white/10 bg-white/[0.03] p-4">
                        <p className="text-sm font-semibold">{item}</p>
                        <p className="mt-1 text-xs text-white/40">Ready to connect</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-white/10 bg-[#0b0b0b] p-6">
                  <h2 className="text-xl font-black">Admin Standard</h2>
                  <div className="mt-5 space-y-3 text-sm text-white/55">
                    <p className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2">
                      Auth ผ่าน admin token แล้วค่อยเรียก API หลังบ้าน
                    </p>
                    <p className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2">
                      แยก module ชัดเจน เพื่อขยายเป็น control center ทั้งระบบ
                    </p>
                    <p className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2">
                      ใช้ toast แจ้งสถานะตอนโหลด บันทึก หรือลบข้อมูล
                    </p>
                  </div>
                </div>
              </section>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
