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
  ImagePlus,
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
  Upload,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ecosystemPages, ecosystemServices } from '@/lib/ecosystem'

type GitHubRepo = {
  name: string
  poster_url?: string | null
}

type ProjectPoster = {
  repo_name: string
  poster_url: string
  enabled: boolean
  updated_at?: string
}

const TOKEN_STORAGE_KEY = 'centered101_admin_token'

const adminModules = [
  {
    id: 'overview',
    label: 'Overview',
    icon: LayoutDashboard,
    description: 'ภาพรวมระบบ Centered101 ทั้งหมด',
    status: 'Live',
  },
  {
    id: 'posters',
    label: 'Project Posters',
    icon: ImagePlus,
    description: 'ควบคุม poster ของ Featured Projects',
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
  const [posters, setPosters] = useState<Record<string, ProjectPoster>>({})
  const [selectedRepo, setSelectedRepo] = useState('')
  const [posterUrl, setPosterUrl] = useState('')
  const [posterFile, setPosterFile] = useState<File | null>(null)
  const [posterInputKey, setPosterInputKey] = useState(0)
  const [enabled, setEnabled] = useState(true)
  const [status, setStatus] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [activeModule, setActiveModule] = useState('overview')
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const selectedPoster = useMemo(() => posters[selectedRepo], [posters, selectedRepo])
  const activeModuleConfig = adminModules.find((module) => module.id === activeModule) || adminModules[0]
  const ActiveModuleIcon = activeModuleConfig.icon

  useEffect(() => {
    const savedToken = window.localStorage.getItem(TOKEN_STORAGE_KEY)
    if (savedToken) {
      setToken(savedToken)
      loadPosters(savedToken)
    }

    fetch('/api/github')
      .then((response) => response.json())
      .then((data) => {
        const nextRepos = (data.repositories || []) as GitHubRepo[]
        setRepos(nextRepos)
        setSelectedRepo(nextRepos[0]?.name || '')
      })
      .catch(() => {
        setStatus('โหลด repo ไม่สำเร็จ')
        toast.error('โหลด repo ไม่สำเร็จ')
      })
  }, [])

  useEffect(() => {
    if (!selectedRepo) {
      return
    }

    setPosterUrl(selectedPoster?.poster_url || '')
    setEnabled(selectedPoster?.enabled ?? true)
    setPosterFile(null)
    setPosterInputKey((current) => current + 1)
  }, [selectedPoster, selectedRepo])

  const loadPosters = async (nextToken = token) => {
    if (!nextToken) {
      setStatus('ใส่ admin token ก่อน')
      toast.warning('ใส่ admin token ก่อน')
      return
    }

    setIsLoading(true)
    setStatus('')
    const toastId = toast.loading('กำลังโหลด dashboard...')

    try {
      const response = await fetch('/api/admin/project-posters', {
        headers: { 'x-admin-token': nextToken },
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'โหลด poster ไม่สำเร็จ')
      }

      const nextPosters = Object.fromEntries(
        ((data.posters || []) as ProjectPoster[]).map((poster) => [poster.repo_name, poster])
      )

      setPosters(nextPosters)
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

  const savePoster = async () => {
    if (!selectedRepo || !posterUrl.trim()) {
      setStatus('เลือก repo และใส่ URL รูปก่อน')
      toast.warning('เลือก repo และใส่ URL รูปก่อน')
      return
    }

    setIsLoading(true)
    setStatus('')
    const toastId = toast.loading('กำลังบันทึก poster...')

    try {
      const response = await fetch('/api/admin/project-posters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token,
        },
        body: JSON.stringify({
          repo_name: selectedRepo,
          poster_url: posterUrl.trim(),
          enabled,
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'บันทึกไม่สำเร็จ')
      }

      setPosters((current) => ({
        ...current,
        [selectedRepo]: data.poster,
      }))
      setStatus('บันทึกแล้ว')
      toast.success('บันทึก poster แล้ว', { id: toastId })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด'
      setStatus(message)
      toast.error(message, { id: toastId })
    } finally {
      setIsLoading(false)
    }
  }

  const uploadPoster = async () => {
    if (!selectedRepo || !posterFile) {
      setStatus('เลือก repo และเลือกรูปก่อน')
      toast.warning('เลือก repo และเลือกรูปก่อน')
      return
    }

    setIsLoading(true)
    setStatus('')
    const toastId = toast.loading('กำลังอัปโหลด poster ไป Supabase...')

    try {
      const formData = new FormData()
      formData.append('repo_name', selectedRepo)
      formData.append('enabled', String(enabled))
      formData.append('file', posterFile)

      const response = await fetch('/api/admin/project-posters', {
        method: 'POST',
        headers: {
          'x-admin-token': token,
        },
        body: formData,
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'อัปโหลดไม่สำเร็จ')
      }

      setPosters((current) => ({
        ...current,
        [selectedRepo]: data.poster,
      }))
      setPosterUrl(data.poster.poster_url)
      setPosterFile(null)
      setPosterInputKey((current) => current + 1)
      setStatus('อัปโหลดแล้ว')
      toast.success('อัปโหลด poster แล้ว', { id: toastId })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด'
      setStatus(message)
      toast.error(message, { id: toastId })
    } finally {
      setIsLoading(false)
    }
  }

  const deletePoster = async () => {
    if (!selectedRepo) {
      return
    }

    setIsLoading(true)
    setStatus('')
    const toastId = toast.loading('กำลังลบ poster...')

    try {
      const response = await fetch(`/api/admin/project-posters?repo_name=${encodeURIComponent(selectedRepo)}`, {
        method: 'DELETE',
        headers: { 'x-admin-token': token },
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'ลบไม่สำเร็จ')
      }

      setPosters((current) => {
        const next = { ...current }
        delete next[selectedRepo]
        return next
      })
      setPosterUrl('')
      setStatus('ลบแล้ว')
      toast.success('ลบ poster แล้ว', { id: toastId })
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
    setPosters({})
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
                  loadPosters()
                }
              }}
              placeholder="ADMIN_DASHBOARD_TOKEN"
              type="password"
              className="mt-2 border-white/10 bg-white/[0.03]"
            />

            <Button className="mt-4 w-full gap-2" onClick={() => loadPosters()} disabled={isLoading}>
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
                <ImagePlus className="size-5 text-accent" />
                <p className="mt-5 text-sm text-white/45">Project posters</p>
                <p className="text-2xl font-black">{Object.keys(posters).length}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-[#0b0b0b] p-5">
                <Database className="size-5 text-accent" />
                <p className="mt-5 text-sm text-white/45">Supabase modules</p>
                <p className="text-2xl font-black">Active</p>
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

            {activeModule === 'posters' ? (
              <section className="grid gap-6 xl:grid-cols-[380px_1fr]">
                <div className="rounded-lg border border-white/10 bg-[#0b0b0b]">
                  <div className="border-b border-white/10 p-4">
                    <h2 className="font-black">Repositories</h2>
                    <p className="mt-1 text-sm text-white/45">เลือก repo ที่ต้องการตั้งค่า poster</p>
                  </div>

                  <div className="p-4">
                    <Label htmlFor="token">Admin token</Label>
                    <Input
                      id="token"
                      value={token}
                      onChange={(event) => setToken(event.target.value)}
                      placeholder="ADMIN_DASHBOARD_TOKEN"
                      type="password"
                      className="mt-2 border-white/10 bg-white/[0.03]"
                    />
                    <Button className="mt-4 w-full gap-2" onClick={() => loadPosters()} disabled={isLoading}>
                      <RefreshCw className="size-4" />
                      Refresh data
                    </Button>

                    <div className="mt-5 max-h-[520px] space-y-2 overflow-auto pr-1">
                      {repos.map((repo) => (
                        <button
                          key={repo.name}
                          type="button"
                          onClick={() => setSelectedRepo(repo.name)}
                          className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                            selectedRepo === repo.name
                              ? 'border-accent bg-accent/10 text-white'
                              : 'border-white/10 bg-white/[0.03] text-white/55 hover:text-white'
                          }`}
                        >
                          <span className="truncate">{repo.name}</span>
                          {posters[repo.name] ? <span className="text-xs text-accent">poster</span> : null}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-white/10 bg-[#0b0b0b]">
                  <div className="flex items-center justify-between border-b border-white/10 p-4">
                    <div>
                      <h2 className="font-black">Project Poster</h2>
                      <p className="mt-1 text-sm text-white/45">รองรับ poster 4:5 สำหรับ Featured Projects</p>
                    </div>
                    <ImagePlus className="size-5 text-accent" />
                  </div>

                  <div className="grid gap-6 p-4 lg:grid-cols-[1fr_360px]">
                    <div>
                      <Label htmlFor="repo">Repository</Label>
                      <Input id="repo" value={selectedRepo} readOnly className="mt-2 border-white/10 bg-white/[0.03]" />

                      <Label htmlFor="poster-file" className="mt-5 block">
                        Upload poster to Supabase
                      </Label>
                      <div className="mt-2 grid gap-3 rounded-md border border-white/10 bg-white/[0.03] p-3">
                        <Input
                          key={posterInputKey}
                          id="poster-file"
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/avif,image/svg+xml,image/x-icon,.svg,.ico"
                          onChange={(event) => setPosterFile(event.target.files?.[0] || null)}
                          className="border-white/10 bg-[#050505]"
                        />
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-xs text-white/45">
                            {posterFile ? `${posterFile.name} (${Math.round(posterFile.size / 1024)} KB)` : 'รองรับ png, jpg, webp, avif, svg, ico ขนาดไม่เกิน 8MB'}
                          </p>
                          <Button className="gap-2" onClick={uploadPoster} disabled={isLoading || !posterFile}>
                            <Upload className="size-4" />
                            Upload
                          </Button>
                        </div>
                      </div>

                      <Label htmlFor="poster-url" className="mt-5 block">
                        Poster URL
                      </Label>
                      <Input
                        id="poster-url"
                        value={posterUrl}
                        onChange={(event) => setPosterUrl(event.target.value)}
                        placeholder="/porfilio/project-posters/repo-name.png"
                        className="mt-2 border-white/10 bg-white/[0.03]"
                      />

                      <div className="mt-5 flex items-center gap-3">
                        <Switch checked={enabled} onCheckedChange={setEnabled} />
                        <span className="text-sm text-white/55">แสดง poster นี้บนหน้าเว็บ</span>
                      </div>

                      <div className="mt-6 flex flex-wrap gap-3">
                        <Button className="gap-2" onClick={savePoster} disabled={isLoading}>
                          <Save className="size-4" />
                          Save poster
                        </Button>
                        <Button variant="outline" className="gap-2 border-white/10 bg-white/[0.03] text-white" onClick={deletePoster} disabled={isLoading || !selectedPoster}>
                          <Trash2 className="size-4" />
                          Delete
                        </Button>
                      </div>

                      {status ? (
                        <p className="mt-4 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/60">
                          {status}
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <p className="mb-2 text-sm font-semibold text-white/55">Preview 4:5</p>
                      <div className="aspect-[4/5] overflow-hidden rounded-md border border-white/10 bg-white/[0.03]">
                        {posterUrl ? (
                          <img
                            src={posterUrl}
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
