'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ArrowDown, ArrowUp, Check, ExternalLink, Github, ImagePlus, Loader2, Pencil, Plus, Search, Star, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AdminLoading, AdminError, AdminEmpty } from '@/components/admin/AdminStates'
import { ConfirmModal } from '@/components/admin/ConfirmModal'
import { AdminPagination } from '@/components/admin/AdminPagination'
import { useAdminApi, useAdminMutation } from '@/lib/hooks/useAdminApi'
import { useAdminAuth } from '@/components/admin/AdminAuthProvider'
import { useAdminRealtime } from '@/lib/hooks/useAdminRealtime'

type Project = {
  id: string; slug: string; title: string; short_description: string | null
  description: string | null; category: string; status: string
  poster_url: string | null; poster_alt: string | null; logo_url: string | null
  live_url: string | null; github_url: string | null
  tech_stack: string[]; tags: string[]
  featured: boolean; enabled: boolean; sort_order: number; updated_at: string
}
type GhRepo = {
  github_id: number; name: string; full_name: string; description: string | null
  html_url: string; language: string | null; stargazers_count: number; is_fork: boolean
}
type ProjectForm = {
  id?: string; slug: string; title: string; short_description: string
  category: string; status: string; poster_url: string; poster_alt: string; logo_url: string
  github_url: string; live_url: string; tech_stack: string; featured: boolean; enabled: boolean
  sort_order?: number
}

const BLANK: ProjectForm = {
  slug: '', title: '', short_description: '', category: 'project',
  status: 'published', poster_url: '', poster_alt: '', logo_url: '', github_url: '', live_url: '',
  tech_stack: '', featured: false, enabled: true,
}

const LANG_COLOR: Record<string, string> = {
  TypeScript: '#3178C6', JavaScript: '#F7DF1E', Python: '#3776AB',
  Go: '#00ADD8', Rust: '#CE422B', CSS: '#563D7C', HTML: '#E34C26',
}

function slugify(t: string) {
  return t.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

function autoCommaList(value: string) {
  return value.replace(/\s{2,}/g, ', ')
}

function normalizeGitHubUrl(value: string | null | undefined) {
  const raw = (value || '').trim()
  if (!raw) return ''
  try {
    const withProtocol = raw.startsWith('http') ? raw : `https://${raw}`
    const url = new URL(withProtocol)
    const host = url.hostname.replace(/^www\./, '').toLowerCase()
    const parts = url.pathname
      .replace(/\.git$/i, '')
      .split('/')
      .filter(Boolean)
      .slice(0, 2)
    return host === 'github.com' && parts.length === 2 ? `github.com/${parts.join('/').toLowerCase()}` : raw.toLowerCase()
  } catch {
    return raw.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\.git$/i, '').replace(/\/+$/g, '').toLowerCase()
  }
}

const PAGE_SIZE = 10

export function FeaturedTab() {
  const { getAdminHeaders } = useAdminAuth()
  const { data: projData, loading, error, refetch } = useAdminApi<{ projects: Project[] }>('/api/admin/projects')
  const { data: ghData, loading: ghLoading } = useAdminApi<{ repos: GhRepo[] }>('/api/admin/open-source')
  const { mutate: saveProject, loading: saving } = useAdminMutation<ProjectForm>('/api/admin/projects', 'POST')
  const { mutate: deleteProject } = useAdminMutation<undefined>('/api/admin/projects', 'DELETE')
  useAdminRealtime(['portfolio_projects'], refetch)

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<ProjectForm>(BLANK)
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)
  const [uploading, setUploading] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)
  const [orderedProjects, setOrderedProjects] = useState<Project[]>([])
  const [orderDirty, setOrderDirty] = useState(false)
  const [savingOrder, setSavingOrder] = useState(false)
  const [page, setPage] = useState(1)
  const [draggingPoster, setDraggingPoster] = useState(false)
  const [draggingLogo, setDraggingLogo] = useState(false)
  const [repoQuery, setRepoQuery] = useState('')
  const [repoFilter, setRepoFilter] = useState<'all' | 'new' | 'added' | 'forks'>('all')
  const posterInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  const projects = projData?.projects ?? []
  const repos = ghData?.repos ?? []
  const projectGitHubUrls = new Set(projects.map((project) => normalizeGitHubUrl(project.github_url)).filter(Boolean))
  const normalizedRepoQuery = repoQuery.trim().toLowerCase()
  const filteredRepos = repos.filter((repo) => {
    const alreadyAdded = projectGitHubUrls.has(normalizeGitHubUrl(repo.html_url))
    const matchesFilter =
      repoFilter === 'all' ||
      (repoFilter === 'new' && !alreadyAdded) ||
      (repoFilter === 'added' && alreadyAdded) ||
      (repoFilter === 'forks' && repo.is_fork)
    const matchesQuery =
      !normalizedRepoQuery ||
      repo.name.toLowerCase().includes(normalizedRepoQuery) ||
      repo.full_name.toLowerCase().includes(normalizedRepoQuery) ||
      (repo.description ?? '').toLowerCase().includes(normalizedRepoQuery) ||
      (repo.language ?? '').toLowerCase().includes(normalizedRepoQuery)

    return matchesFilter && matchesQuery
  })
  const paged = orderedProjects.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const editingProject = form.id ? projects.find((project) => project.id === form.id) ?? null : null
  const linkedRepo = repos.find((repo) => normalizeGitHubUrl(repo.html_url) === normalizeGitHubUrl(form.github_url)) ?? null

  useEffect(() => {
    if (!orderDirty) void Promise.resolve().then(() => setOrderedProjects(projects))
  }, [projData?.projects, orderDirty])

  function openEdit(p: Project) {
    setForm({
      id: p.id, slug: p.slug, title: p.title,
      short_description: p.short_description ?? '',
      category: p.category, status: p.status,
      poster_url: p.poster_url ?? '', poster_alt: p.poster_alt ?? '', logo_url: p.logo_url ?? '',
      github_url: p.github_url ?? '', live_url: p.live_url ?? '',
      tech_stack: p.tech_stack.join(', '),
      featured: p.featured, enabled: p.enabled, sort_order: p.sort_order,
    })
    setModalOpen(true)
  }

  function applyRepoToForm(repo: GhRepo, replaceTitle = false) {
    setForm({
      ...(replaceTitle ? BLANK : form),
      slug: replaceTitle || !form.slug ? slugify(repo.name) : form.slug,
      title: replaceTitle || !form.title ? repo.name : form.title,
      short_description: form.short_description || repo.description || '',
      category: form.category === 'project' || !form.category ? (repo.is_fork ? 'Fork' : 'GitHub repository') : form.category,
      github_url: repo.html_url,
      tech_stack: form.tech_stack || repo.language || '',
      enabled: form.enabled,
    })
  }

  function openFromRepo(repo: GhRepo) {
    setForm({
      ...BLANK,
      slug: slugify(repo.name),
      title: repo.name,
      short_description: repo.description ?? '',
      category: repo.is_fork ? 'Fork' : 'GitHub repository',
      github_url: repo.html_url,
      tech_stack: repo.language ?? '',
      enabled: true,
    })
    setModalOpen(true)
  }

  async function toggle(id: string, field: 'featured' | 'enabled', value: boolean) {
    setToggling(`${id}-${field}`)
    try {
      const res = await fetch('/api/admin/projects', {
        method: 'PATCH',
        headers: { ...getAdminHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, [field]: value }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setOrderedProjects((current) => current.map((project) => (project.id === id ? { ...project, [field]: value } : project)))
      refetch()
    } catch (e) { toast.error((e as Error).message) }
    finally { setToggling(null) }
  }

  async function handleImageUpload(file: File, kind: 'poster' | 'logo') {
    if (!file.type.startsWith('image/')) {
      toast.error('กรุณาวางไฟล์รูปภาพเท่านั้น')
      return
    }

    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('slug', form.slug.trim() || 'project')
      fd.append('kind', kind)
      const res = await fetch('/api/admin/projects/upload', { method: 'POST', headers: getAdminHeaders(), body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Upload failed')
      setForm((p) => (
        kind === 'logo'
          ? { ...p, logo_url: json.publicUrl }
          : { ...p, poster_url: json.publicUrl, poster_alt: p.poster_alt || file.name.replace(/\.[^.]+$/, '') }
      ))
      toast.success(kind === 'logo' ? 'อัปโหลดโลโก้แล้ว' : 'อัปโหลดรูปโปรเจกต์แล้ว')
    } catch (err) { toast.error((err as Error).message) }
    finally {
      setUploading(false)
      if (posterInputRef.current) posterInputRef.current.value = ''
      if (logoInputRef.current) logoInputRef.current.value = ''
    }
  }

  function handleImageDrop(event: React.DragEvent<HTMLElement>, kind: 'poster' | 'logo') {
    event.preventDefault()
    event.stopPropagation()
    setDraggingPoster(false)
    setDraggingLogo(false)
    const file = event.dataTransfer.files?.[0]
    if (file) handleImageUpload(file, kind)
  }

  function setDragging(kind: 'poster' | 'logo', value: boolean) {
    if (kind === 'poster') setDraggingPoster(value)
    else setDraggingLogo(value)
  }

  function moveProject(index: number, direction: -1 | 1) {
    const absoluteIndex = (page - 1) * PAGE_SIZE + index
    const targetIndex = absoluteIndex + direction
    if (targetIndex < 0 || targetIndex >= orderedProjects.length) return

    setOrderedProjects((current) => {
      const next = [...current]
      const moving = next[absoluteIndex]
      next[absoluteIndex] = next[targetIndex]
      next[targetIndex] = moving
      return next
    })
    setOrderDirty(true)
  }

  async function saveOrder() {
    setSavingOrder(true)
    try {
      const res = await fetch('/api/admin/projects', {
        method: 'PATCH',
        headers: { ...getAdminHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order: orderedProjects.map((project, index) => ({ id: project.id, sort_order: (index + 1) * 100 })),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'บันทึกลำดับไม่สำเร็จ')
      if (Array.isArray(json.projects)) setOrderedProjects(json.projects)
      await refetch()
      setOrderDirty(false)
      toast.success('บันทึกลำดับโปรเจกต์แล้ว')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSavingOrder(false)
    }
  }

  function discardOrder() {
    setOrderedProjects(projects)
    setOrderDirty(false)
  }

  async function handleSave() {
    if (!form.title.trim() || !form.slug.trim()) { toast.error('Title and slug are required'); return }
    try {
      await saveProject(form)
      toast.success(form.id ? 'Project updated' : 'Project created')
      setModalOpen(false); refetch()
    } catch (err) { toast.error((err as Error).message) }
  }

  async function handleDelete(p: Project) {
    try {
      await deleteProject(undefined, { id: p.id })
      toast.success(`Deleted "${p.title}"`)
      setDeleteTarget(null)
      if (form.id === p.id) {
        setModalOpen(false)
        setForm(BLANK)
      }
      refetch()
    } catch (err) { toast.error((err as Error).message) }
  }

  if (loading) return <AdminLoading message="กำลังโหลดโปรเจกต์..." />
  if (error) return <AdminError error={error} onRetry={refetch} />

  return (
    <div className="space-y-3 sm:space-y-6 sm:p-6">
      {/* Projects */}
      <div className="space-y-3 sm:space-y-4">
        <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-[#dfe3e8] bg-[#fbfdff] px-3 py-3 sm:mb-4 sm:px-4">
          <div className="min-w-0">
            <p className="text-sm font-black text-[#09090b]">จัดการโปรเจกต์ที่แสดงบนหน้าเว็บ</p>
            <p className="mt-0.5 truncate text-xs text-[#647084]">จัดลำดับจากปุ่มขึ้น/ลง แล้วค่อยกดบันทึกลำดับ</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {orderDirty ? (
              <>
                <button
                  type="button"
                  onClick={discardOrder}
                  disabled={savingOrder}
                  className="flex h-9 min-w-28 items-center justify-center rounded-lg border border-[#dfe3e8] bg-white px-3 text-xs font-bold text-[#647084] transition hover:border-[#409EFE]/40 hover:text-[#409EFE] disabled:opacity-50"
                >
                  ยกเลิกการจัด
                </button>
                <button
                  type="button"
                  onClick={saveOrder}
                  disabled={savingOrder}
                  className="flex h-9 min-w-28 items-center justify-center gap-1.5 rounded-lg bg-[#409EFE] px-3 text-xs font-bold text-white transition hover:bg-[#60aeff] disabled:opacity-50"
                >
                  {savingOrder ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                  บันทึกลำดับ
                </button>
              </>
            ) : null}
          <button
            onClick={() => { setForm(BLANK); setModalOpen(true) }}
            className="flex h-9 min-w-28 items-center justify-center gap-1.5 rounded-lg bg-[#409EFE] px-3 text-xs font-bold text-white transition hover:bg-[#60aeff]"
          >
            <Plus className="size-3.5" /> เพิ่มโปรเจกต์
          </button>
          </div>
        </div>

        {orderedProjects.length === 0 ? (
          <AdminEmpty title="ยังไม่มีโปรเจกต์" description="เพิ่มโปรเจกต์แรกสำหรับหน้า portfolio" />
        ) : (
          <>
            <div className="overflow-hidden rounded-lg border border-border bg-background">
              {paged.map((p, index) => {
                const absoluteIndex = (page - 1) * PAGE_SIZE + index
                return (
                  <div
                    key={p.id}
                    className="grid gap-3 border-b border-border/80 p-3 transition-colors last:border-b-0 hover:bg-[#409EFE]/[0.035] sm:gap-4 sm:p-4 lg:grid-cols-[88px_1fr_auto]"
                  >
                    <div className="relative h-24 w-20 shrink-0">
                      <div className="relative h-20 w-16 overflow-hidden rounded-lg border border-border bg-secondary shadow-sm">
                        {p.poster_url ? (
                          <img src={p.poster_url} alt={p.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="grid h-full place-items-center text-[10px] font-bold text-muted-foreground">ไม่มีรูป</div>
                        )}
                      </div>
                      {p.logo_url ? (
                        <div className="absolute bottom-0 right-0 size-11 overflow-hidden rounded-lg border border-border bg-white shadow-[0_10px_24px_-14px_rgba(15,23,42,0.45)]">
                          <img src={p.logo_url} alt={`${p.title} logo`} className="h-full w-full object-contain p-1.5" />
                        </div>
                      ) : null}
                    </div>

                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md border border-border bg-card px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">#{absoluteIndex + 1}</span>
                        <span className="truncate text-sm font-black text-foreground">{p.title}</span>
                      </div>
                      <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{p.short_description || 'ยังไม่มีคำอธิบายสั้น'}</p>
                      <div className="grid gap-2 text-[11px] text-muted-foreground sm:grid-cols-2 xl:grid-cols-4">
                        <span className="truncate"><strong className="text-foreground">Slug:</strong> /{p.slug}</span>
                        <span className="truncate"><strong className="text-foreground">หมวดหมู่:</strong> {p.category || '-'}</span>
                        <span className="truncate"><strong className="text-foreground">ลำดับ:</strong> {(absoluteIndex + 1) * 100}</span>
                        <span className="truncate"><strong className="text-foreground">Tech:</strong> {p.tech_stack?.join(', ') || '-'}</span>
                      </div>
                    </div>

                    <div className="flex min-w-0 flex-wrap items-center justify-start gap-2 lg:flex-nowrap lg:justify-end lg:self-center">
                      <button
                        type="button"
                        onClick={() => moveProject(index, -1)}
                        disabled={absoluteIndex === 0}
                        className="grid size-8 place-items-center rounded-md border border-border text-muted-foreground transition hover:border-[#409EFE]/40 hover:text-[#409EFE] disabled:cursor-not-allowed disabled:opacity-35"
                        aria-label="เลื่อนขึ้น"
                      >
                        <ArrowUp className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveProject(index, 1)}
                        disabled={absoluteIndex === orderedProjects.length - 1}
                        className="grid size-8 place-items-center rounded-md border border-border text-muted-foreground transition hover:border-[#409EFE]/40 hover:text-[#409EFE] disabled:cursor-not-allowed disabled:opacity-35"
                        aria-label="เลื่อนลง"
                      >
                        <ArrowDown className="size-3.5" />
                      </button>
                      <label className="flex h-8 items-center gap-1.5 rounded-md border border-border px-2 text-[11px] font-semibold text-muted-foreground lg:border-0 lg:px-0">
                        <span className="whitespace-nowrap lg:w-18 lg:text-right">แสดงบนเว็บ</span>
                        <Switch
                          checked={p.enabled}
                          disabled={toggling === `${p.id}-enabled`}
                          onCheckedChange={(v) => toggle(p.id, 'enabled', v)}
                        />
                      </label>
                      {p.live_url ? (
                        <a href={p.live_url} target="_blank" rel="noopener noreferrer"
                          className="grid size-8 place-items-center rounded-md border border-border text-muted-foreground transition hover:border-[#409EFE]/40 hover:text-[#409EFE]">
                          <ExternalLink className="size-3.5" />
                        </a>
                      ) : (
                        <span className="grid size-8 place-items-center rounded-md border border-border text-muted-foreground/25 opacity-45">
                          <ExternalLink className="size-3.5" />
                        </span>
                      )}
                      {p.github_url ? (
                        <a href={p.github_url} target="_blank" rel="noopener noreferrer"
                          className="grid size-8 place-items-center rounded-md border border-border text-muted-foreground transition hover:border-[#409EFE]/40 hover:text-[#409EFE]">
                          <Github className="size-3.5" />
                        </a>
                      ) : (
                        <span className="grid size-8 place-items-center rounded-md border border-border text-muted-foreground/25 opacity-45">
                          <Github className="size-3.5" />
                        </span>
                      )}
                      <button onClick={() => openEdit(p)}
                        className="grid size-8 place-items-center rounded-md border border-border text-muted-foreground transition hover:border-[#409EFE]/40 hover:text-[#409EFE]">
                        <Pencil className="size-3" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
            <AdminPagination page={page} total={orderedProjects.length} pageSize={PAGE_SIZE} onChange={setPage} className="mt-3 border-t border-border pt-3" />
          </>
        )}
      </div>

      {/* GitHub repos */}
      <section className="rounded-lg border border-border bg-card shadow-sm">
        <div className="border-b border-border px-3 py-3 sm:px-5 sm:py-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="min-w-0">
              <h2 className="text-sm font-black text-foreground">GitHub Repositories</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Repo สาธารณะที่ cache จาก GitHub API</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative min-w-0 sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={repoQuery}
                  onChange={(event) => setRepoQuery(event.target.value)}
                  placeholder="ค้นหา repo, ภาษา..."
                  className="h-9 rounded-lg border-border bg-background pl-9 text-xs"
                />
              </div>
              <select
                value={repoFilter}
                onChange={(event) => setRepoFilter(event.target.value as typeof repoFilter)}
                className="h-9 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground outline-none transition focus:border-[#409EFE]/50"
              >
                <option value="all">ทั้งหมด</option>
                <option value="new">ยังไม่เพิ่ม</option>
                <option value="added">เพิ่มแล้ว</option>
                <option value="forks">Fork</option>
              </select>
            </div>
          </div>
        </div>
        <div className="p-3 sm:p-5">
        {ghLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">กำลังโหลด repo...</div>
        ) : repos.length === 0 ? (
          <AdminEmpty title="ยังไม่มี repo" description="ยังไม่ได้ตั้งค่าการซิงก์ GitHub" />
        ) : filteredRepos.length === 0 ? (
          <AdminEmpty title="ไม่พบ repo" description="ลองเปลี่ยนคำค้นหาหรือตัวกรอง" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filteredRepos.map((r) => {
              const alreadyAdded = projectGitHubUrls.has(normalizeGitHubUrl(r.html_url))

              return (
              <div key={r.github_id}
                className="group flex flex-col gap-2 rounded-xl border border-[#27272A] bg-[#09090B] p-4 transition-colors hover:border-[#3f3f46]">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Github className="size-3.5 shrink-0 text-[#52525b]" />
                    <span className="text-sm font-medium text-[#FAFAFA] group-hover:text-[#409EFE]">{r.name}</span>
                    {r.is_fork && <span className="rounded border border-[#27272A] px-1 py-px text-[9px] text-[#3f3f46]">fork</span>}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-[#52525b]">
                    <Star className="size-3" />{r.stargazers_count}
                  </div>
                </div>
                {r.description && <p className="text-[11px] text-[#52525b] line-clamp-2">{r.description}</p>}
                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="min-w-0">
                    {r.language && (
                      <div className="flex items-center gap-1.5">
                        <span className="size-2.5 rounded-full" style={{ backgroundColor: LANG_COLOR[r.language] || '#52525b' }} />
                        <span className="text-[10px] text-[#52525b]">{r.language}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <a
                      href={r.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="grid size-8 place-items-center rounded-md border border-[#27272A] text-[#52525b] transition hover:border-[#409EFE]/40 hover:text-[#409EFE]"
                      aria-label={`เปิด ${r.name} บน GitHub`}
                    >
                      <ExternalLink className="size-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => openFromRepo(r)}
                      disabled={alreadyAdded}
                      className="flex h-8 items-center gap-1.5 rounded-md border border-[#27272A] px-2.5 text-[11px] font-bold text-[#A1A1AA] transition hover:border-[#409EFE]/40 hover:text-[#409EFE] disabled:cursor-not-allowed disabled:border-[#27272A] disabled:text-[#3f3f46]"
                    >
                      {alreadyAdded ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
                      {alreadyAdded ? 'เพิ่มแล้ว' : 'เพิ่มเข้า portfolio'}
                    </button>
                  </div>
                </div>
              </div>
            )})}
          </div>
        )}
        </div>
      </section>

      {/* Edit/Create modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent aria-describedby={undefined}
          className="max-h-[90vh] overflow-y-auto !border-[#dfe3e8] !bg-white !p-0 !text-[#090c13] shadow-[0_24px_80px_-48px_rgba(64,158,254,0.65)] sm:max-w-3xl [&_label]:!text-[#647084] [&_input]:!border-[#dfe3e8] [&_input]:!bg-white [&_input]:!text-[#090c13] [&_input::placeholder]:!text-[#9aa2ad] [&_select]:!border-[#dfe3e8] [&_select]:!bg-white [&_select]:!text-[#090c13]">
          <DialogHeader className="sticky top-0 z-10 border-b border-[#e5e7eb] bg-white px-6 py-4">
            <DialogTitle className="text-center !text-[#090c13]">{form.id ? 'แก้ไขโปรเจกต์' : 'เพิ่มโปรเจกต์ใหม่'}</DialogTitle>
          </DialogHeader>
          <div className="mx-6 mt-4 flex items-center gap-3 rounded-xl border border-[#dfe3e8] bg-[#fbfdff] p-3">
            <div className="relative h-16 w-14 shrink-0">
              <div className="relative h-14 w-11 overflow-hidden rounded-lg border border-[#dfe3e8] bg-white">
                {form.poster_url ? (
                  <img src={form.poster_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <ImagePlus className="m-auto mt-4 size-4 text-[#94a3b8]" />
                )}
              </div>
              {form.logo_url ? (
                <div className="absolute bottom-0 right-0 size-8 overflow-hidden rounded-lg border border-[#dfe3e8] bg-white shadow-[0_10px_24px_-14px_rgba(15,23,42,0.45)]">
                  <img src={form.logo_url} alt="" className="h-full w-full object-contain p-1" />
                </div>
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-[#09090b]">{form.title || 'Preview โปรเจกต์'}</p>
              <p className="mt-0.5 truncate text-xs font-semibold text-[#647084]">
                {form.category || 'หมวดหมู่'} · {form.enabled ? 'แสดงบนหน้า portfolio' : 'ซ่อนจากหน้า portfolio'}
              </p>
            </div>
          </div>

          <div className="px-6 py-4">
            <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs text-muted-foreground">ชื่อโปรเจกต์ *</Label>
                <Input value={form.title}
                  onChange={(e) => {
                    const title = e.target.value
                    setForm((p) => ({ ...p, title, ...(p.id ? {} : { slug: slugify(title) }) }))
                  }}
                  className="mt-1 h-9 !border-[#dfe3e8] !bg-white text-sm !text-[#090c13] focus-visible:ring-[#409EFE]/30" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Slug *</Label>
                <Input value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
                  className="mt-1 h-9 !border-[#dfe3e8] !bg-white font-mono text-sm !text-[#090c13] focus-visible:ring-[#409EFE]/30" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">คำอธิบายสั้น</Label>
              <Input value={form.short_description} onChange={(e) => setForm((p) => ({ ...p, short_description: e.target.value }))}
                className="mt-1 h-9 !border-[#dfe3e8] !bg-white text-sm !text-[#090c13] focus-visible:ring-[#409EFE]/30" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">หมวดหมู่</Label>
                <Input value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                  className="mt-1 h-9 !border-[#dfe3e8] !bg-white text-sm !text-[#090c13] focus-visible:ring-[#409EFE]/30" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">สถานะ</Label>
                <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                  className="mt-1 h-9 w-full rounded-md border !border-[#dfe3e8] !bg-white px-2 text-sm !text-[#090c13] focus:outline-none focus:ring-1 focus:ring-[#409EFE]/30">
                  {[
                    ['published', 'เผยแพร่'],
                    ['active', 'ใช้งาน'],
                    ['in_progress', 'กำลังทำ'],
                    ['paused', 'พักไว้'],
                    ['archived', 'เก็บถาวร'],
                  ].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
            </div>
            {/* Poster upload */}
            <div>
              <Label className="text-xs text-muted-foreground">รูปโปรเจกต์</Label>
              <input ref={posterInputRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, 'poster') }} />
              {form.poster_url ? (
                <div
                  className={`mt-1 flex gap-2 rounded-lg transition ${draggingPoster ? 'bg-[#f6fbff] ring-2 ring-[#409EFE]/35' : ''}`}
                  onDragEnter={(e) => { e.preventDefault(); setDragging('poster', true) }}
                  onDragOver={(e) => { e.preventDefault(); setDragging('poster', true) }}
                  onDragLeave={(e) => {
                    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
                    setDragging('poster', false)
                  }}
                  onDrop={(e) => handleImageDrop(e, 'poster')}
                >
                  <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-lg border border-[#dfe3e8] bg-white">
                    <img src={form.poster_url} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <Input value={form.poster_url} onChange={(e) => setForm((p) => ({ ...p, poster_url: e.target.value }))}
                      className="h-8 !border-[#dfe3e8] !bg-white font-mono text-[11px] !text-[#647084] focus-visible:ring-[#409EFE]/30" />
                    <div className="flex gap-1.5">
                      <button type="button" onClick={() => posterInputRef.current?.click()} disabled={uploading}
                        className="flex items-center gap-1 rounded-md border border-[#dfe3e8] bg-white px-2 py-1 text-[10px] font-semibold text-[#647084] transition hover:border-[#409EFE]/40 hover:text-[#409EFE] disabled:opacity-50">
                        {uploading ? <Loader2 className="size-3 animate-spin" /> : <ImagePlus className="size-3" />} แทนที่
                      </button>
                      <button type="button" onClick={() => setForm((p) => ({ ...p, poster_url: '', poster_alt: '' }))}
                        className="flex items-center gap-1 rounded-md border border-[#dfe3e8] bg-white px-2 py-1 text-[10px] font-semibold text-[#647084] transition hover:border-[#ef4444]/30 hover:text-[#ef4444]">
                        <X className="size-3" /> ลบออก
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-1 space-y-2">
                  <button type="button" onClick={() => posterInputRef.current?.click()} disabled={uploading}
                    onDragEnter={(e) => { e.preventDefault(); setDragging('poster', true) }}
                    onDragOver={(e) => { e.preventDefault(); setDragging('poster', true) }}
                    onDragLeave={() => setDragging('poster', false)}
                    onDrop={(e) => handleImageDrop(e, 'poster')}
                    className={`flex w-full items-center justify-center gap-2 rounded-lg border border-dashed py-4 text-[11px] font-semibold transition disabled:opacity-50 ${
                      draggingPoster
                        ? 'border-[#409EFE] bg-[#f6fbff] text-[#409EFE] ring-2 ring-[#409EFE]/20'
                        : 'border-[#dfe3e8] bg-white text-[#647084] hover:border-[#409EFE]/40 hover:text-[#409EFE]'
                    }`}>
                    {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
                    {uploading ? 'กำลังอัปโหลด...' : draggingPoster ? 'ปล่อยไฟล์เพื่ออัปโหลดรูปโปรเจกต์' : 'อัปโหลดรูปโปรเจกต์'}
                  </button>
                  <Input value={form.poster_url} onChange={(e) => setForm((p) => ({ ...p, poster_url: e.target.value }))}
                    className="h-8 !border-[#dfe3e8] !bg-white font-mono text-[11px] !text-[#647084] focus-visible:ring-[#409EFE]/30"
                    placeholder="หรือวาง URL..." />
                </div>
              )}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">โลโก้โปรเจกต์</Label>
              <p className="mt-0.5 text-[11px] text-[#647084]">ใช้แสดงเป็น logo link ใต้ Selected work เมื่อไม่อยู่ใน 3 การ์ดหลัก</p>
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, 'logo') }} />
              {form.logo_url ? (
                <div
                  className={`mt-2 flex gap-2 rounded-lg transition ${draggingLogo ? 'bg-[#f6fbff] ring-2 ring-[#409EFE]/35' : ''}`}
                  onDragEnter={(e) => { e.preventDefault(); setDragging('logo', true) }}
                  onDragOver={(e) => { e.preventDefault(); setDragging('logo', true) }}
                  onDragLeave={(e) => {
                    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
                    setDragging('logo', false)
                  }}
                  onDrop={(e) => handleImageDrop(e, 'logo')}
                >
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-lg border border-[#dfe3e8] bg-white">
                    <img src={form.logo_url} alt="" className="h-full w-full object-contain p-2" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <Input value={form.logo_url} onChange={(e) => setForm((p) => ({ ...p, logo_url: e.target.value }))}
                      className="h-8 !border-[#dfe3e8] !bg-white font-mono text-[11px] !text-[#647084] focus-visible:ring-[#409EFE]/30" />
                    <div className="flex gap-1.5">
                      <button type="button" onClick={() => logoInputRef.current?.click()} disabled={uploading}
                        className="flex items-center gap-1 rounded-md border border-[#dfe3e8] bg-white px-2 py-1 text-[10px] font-semibold text-[#647084] transition hover:border-[#409EFE]/40 hover:text-[#409EFE] disabled:opacity-50">
                        {uploading ? <Loader2 className="size-3 animate-spin" /> : <ImagePlus className="size-3" />} แทนที่
                      </button>
                      <button type="button" onClick={() => setForm((p) => ({ ...p, logo_url: '' }))}
                        className="flex items-center gap-1 rounded-md border border-[#dfe3e8] bg-white px-2 py-1 text-[10px] font-semibold text-[#647084] transition hover:border-[#ef4444]/30 hover:text-[#ef4444]">
                        <X className="size-3" /> ลบโลโก้
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-2 space-y-2">
                  <button type="button" onClick={() => logoInputRef.current?.click()} disabled={uploading}
                    onDragEnter={(e) => { e.preventDefault(); setDragging('logo', true) }}
                    onDragOver={(e) => { e.preventDefault(); setDragging('logo', true) }}
                    onDragLeave={() => setDragging('logo', false)}
                    onDrop={(e) => handleImageDrop(e, 'logo')}
                    className={`flex w-full items-center justify-center gap-2 rounded-lg border border-dashed py-4 text-[11px] font-semibold transition disabled:opacity-50 ${
                      draggingLogo
                        ? 'border-[#409EFE] bg-[#f6fbff] text-[#409EFE] ring-2 ring-[#409EFE]/20'
                        : 'border-[#dfe3e8] bg-white text-[#647084] hover:border-[#409EFE]/40 hover:text-[#409EFE]'
                    }`}>
                    {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
                    {uploading ? 'กำลังอัปโหลด...' : draggingLogo ? 'ปล่อยไฟล์เพื่ออัปโหลดโลโก้' : 'อัปโหลดโลโก้'}
                  </button>
                  <Input value={form.logo_url} onChange={(e) => setForm((p) => ({ ...p, logo_url: e.target.value }))}
                    className="h-8 !border-[#dfe3e8] !bg-white font-mono text-[11px] !text-[#647084] focus-visible:ring-[#409EFE]/30"
                    placeholder="หรือวาง URL โลโก้..." />
                </div>
              )}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">คำอธิบายรูป</Label>
              <Input value={form.poster_alt} onChange={(e) => setForm((p) => ({ ...p, poster_alt: e.target.value }))}
                className="mt-1 h-9 !border-[#dfe3e8] !bg-white text-sm !text-[#090c13] focus-visible:ring-[#409EFE]/30" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">ลิงก์ GitHub</Label>
              <div className="mt-1 rounded-lg border border-[#dfe3e8] bg-[#fbfdff] p-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <select
                    value={linkedRepo?.html_url ?? ''}
                    onChange={(event) => {
                      const repo = repos.find((item) => item.html_url === event.target.value)
                      if (repo) applyRepoToForm(repo)
                      else setForm((p) => ({ ...p, github_url: '' }))
                    }}
                    className="h-9 min-w-0 flex-1 rounded-md border border-[#dfe3e8] bg-white px-2 text-xs font-semibold text-[#090c13] outline-none transition focus:border-[#409EFE]/50"
                  >
                    <option value="">ไม่เชื่อม GitHub repo</option>
                    {repos.map((repo) => (
                      <option key={repo.github_id} value={repo.html_url}>
                        {repo.full_name}{repo.is_fork ? ' (fork)' : ''}
                      </option>
                    ))}
                  </select>
                  {linkedRepo ? (
                    <button
                      type="button"
                      onClick={() => applyRepoToForm(linkedRepo, true)}
                      className="h-9 rounded-md border border-[#dfe3e8] bg-white px-3 text-xs font-bold text-[#647084] transition hover:border-[#409EFE]/40 hover:text-[#409EFE]"
                    >
                      ใช้ข้อมูล repo
                    </button>
                  ) : null}
                </div>
                <p className="mt-1.5 text-[11px] text-[#647084]">
                  {linkedRepo
                    ? `เชื่อมกับ ${linkedRepo.full_name} แล้ว`
                    : form.github_url
                      ? 'ยังไม่พบ repo ที่ตรงกับ URL นี้ใน cache'
                      : 'เลือกจาก cache เพื่อกันพิมพ์ URL ผิด'}
                </p>
              </div>
              <Input value={form.github_url} onChange={(e) => setForm((p) => ({ ...p, github_url: e.target.value }))}
                className="mt-1 h-9 !border-[#dfe3e8] !bg-white text-sm !text-[#090c13] focus-visible:ring-[#409EFE]/30" placeholder="https://github.com/..." />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">ลิงก์เว็บจริง</Label>
              <Input value={form.live_url} onChange={(e) => setForm((p) => ({ ...p, live_url: e.target.value }))}
                className="mt-1 h-9 !border-[#dfe3e8] !bg-white text-sm !text-[#090c13] focus-visible:ring-[#409EFE]/30" placeholder="https://..." />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">เทคโนโลยีที่ใช้ (คั่นด้วย comma)</Label>
              <Input value={form.tech_stack} onChange={(e) => setForm((p) => ({ ...p, tech_stack: autoCommaList(e.target.value) }))}
                className="mt-1 h-9 !border-[#dfe3e8] !bg-white text-sm !text-[#090c13] focus-visible:ring-[#409EFE]/30" placeholder="Next.js, TypeScript" />
            </div>
            <div className="grid gap-3">
              <div className="flex items-center justify-between rounded-lg border border-[#dfe3e8] bg-white px-3 py-2.5">
                <div>
                  <p className="text-sm !text-[#090c13]">แสดงบนเว็บ</p>
                  <p className="mt-0.5 text-[11px] text-[#647084]">เปิดแล้วจะเข้า portfolio ตามลำดับ: 3 อันดับแรกเป็นการ์ดหลัก ที่เหลือเป็นโลโก้</p>
                </div>
                <Switch checked={form.enabled} onCheckedChange={(v) => setForm((p) => ({ ...p, enabled: v }))} />
              </div>
            </div>
            </div>
          </div>
          <div className="sticky bottom-0 z-10 mt-2 flex w-full flex-wrap items-center justify-between gap-2 border-t border-[#e5e7eb] bg-white px-6 py-3">
            <div>
              {editingProject ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeleteTarget(editingProject)}
                  className="flex h-9 items-center gap-1.5 rounded-md border border-[#fecaca] bg-[#fff7f7] px-3 text-xs font-bold text-[#ef4444] transition hover:border-[#ef4444]/40 hover:bg-[#fee2e2]"
                >
                  <Trash2 className="size-3.5" />
                  ลบโปรเจกต์
                </Button>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setModalOpen(false)}
                className="flex h-9 items-center gap-1.5 rounded-md border border-[#dfe3e8] bg-white px-3 text-xs font-bold text-[#647084] transition hover:border-[#409EFE]/40 hover:text-[#409EFE]">
                <X className="size-3.5" /> ยกเลิก
              </Button>
              <Button onClick={handleSave} disabled={saving}
                className="flex h-9 items-center gap-1.5 rounded-md border border-[#409EFE] bg-[#409EFE] px-4 text-xs font-bold text-white transition hover:bg-[#60aeff] disabled:opacity-60">
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                {form.id ? 'บันทึก' : 'สร้าง'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmModal
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`ลบ "${deleteTarget?.title}" ใช่ไหม?`}
        description="โปรเจกต์นี้จะถูกลบถาวร"
        confirmLabel="ลบ"
        destructive
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />
    </div>
  )
}
