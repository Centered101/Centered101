'use client'

import Image from 'next/image'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { ExternalLink, Github, ImagePlus, Loader2, Pencil, Plus, Star, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { AdminLoading, AdminError, AdminEmpty } from '@/components/admin/AdminStates'
import { ConfirmModal } from '@/components/admin/ConfirmModal'
import { AdminPageSection } from '@/components/admin/AdminPage'
import { AdminPagination } from '@/components/admin/AdminPagination'
import { useAdminApi, useAdminMutation } from '@/lib/hooks/useAdminApi'
import { useAdminAuth } from '@/components/admin/AdminAuthProvider'
import { useAdminRealtime } from '@/lib/hooks/useAdminRealtime'

type Project = {
  id: string; slug: string; title: string; short_description: string | null
  description: string | null; category: string; status: string
  poster_url: string | null; poster_alt: string | null
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
  category: string; status: string; poster_url: string; poster_alt: string
  github_url: string; live_url: string; tech_stack: string; featured: boolean; enabled: boolean
}

const BLANK: ProjectForm = {
  slug: '', title: '', short_description: '', category: 'project',
  status: 'published', poster_url: '', poster_alt: '', github_url: '', live_url: '',
  tech_stack: '', featured: false, enabled: true,
}

const LANG_COLOR: Record<string, string> = {
  TypeScript: '#3178C6', JavaScript: '#F7DF1E', Python: '#3776AB',
  Go: '#00ADD8', Rust: '#CE422B', CSS: '#563D7C', HTML: '#E34C26',
}

function slugify(t: string) {
  return t.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '')
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
  const [page, setPage] = useState(1)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const projects = projData?.projects ?? []
  const repos = ghData?.repos ?? []
  const paged = projects.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function openEdit(p: Project) {
    setForm({
      id: p.id, slug: p.slug, title: p.title,
      short_description: p.short_description ?? '',
      category: p.category, status: p.status,
      poster_url: p.poster_url ?? '', poster_alt: p.poster_alt ?? '',
      github_url: p.github_url ?? '', live_url: p.live_url ?? '',
      tech_stack: p.tech_stack.join(', '),
      featured: p.featured, enabled: p.enabled,
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
      refetch()
    } catch (e) { toast.error((e as Error).message) }
    finally { setToggling(null) }
  }

  async function handlePosterUpload(file: File) {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('slug', form.slug.trim() || 'project')
      const res = await fetch('/api/admin/projects/upload', { method: 'POST', headers: getAdminHeaders(), body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Upload failed')
      setForm((p) => ({ ...p, poster_url: json.publicUrl, poster_alt: p.poster_alt || file.name.replace(/\.[^.]+$/, '') }))
      toast.success('Poster uploaded')
    } catch (err) { toast.error((err as Error).message) }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = '' }
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
      setDeleteTarget(null); refetch()
    } catch (err) { toast.error((err as Error).message) }
  }

  if (loading) return <AdminLoading message="Loading projects..." />
  if (error) return <AdminError error={error} onRetry={refetch} />

  return (
    <div className="space-y-6 p-6">
      {/* Projects */}
      <AdminPageSection
        title={`Portfolio Projects (${projects.length})`}
        description={`${projects.filter((p) => p.featured && p.enabled).length} featured · visible on portfolio`}
      >
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => { setForm(BLANK); setModalOpen(true) }}
            className="flex items-center gap-1.5 rounded-lg bg-[#409EFE] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#60aeff]"
          >
            <Plus className="size-3.5" /> Add Project
          </button>
        </div>

        {projects.length === 0 ? (
          <AdminEmpty title="No projects yet" description="Add your first portfolio project" />
        ) : (
          <>
            <div className="divide-y divide-[#27272A]/50">
              {paged.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center gap-3 py-3 sm:flex-nowrap">
                  {p.poster_url && (
                    <Image src={p.poster_url} alt={p.title} width={40} height={40} className="size-10 shrink-0 rounded-lg object-cover" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[#FAFAFA]">{p.title}</span>
                      <StatusBadge status={p.status} />
                    </div>
                    <p className="truncate text-[11px] text-[#52525b]">{p.short_description || `/${p.slug}`}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    <label className="flex items-center gap-1.5 text-[11px] text-[#52525b]">
                      Featured
                      <Switch
                        checked={p.featured}
                        disabled={toggling === `${p.id}-featured`}
                        onCheckedChange={(v) => toggle(p.id, 'featured', v)}
                        className="data-[state=checked]:bg-[#F59E0B]"
                      />
                    </label>
                    <label className="flex items-center gap-1.5 text-[11px] text-[#52525b]">
                      Visible
                      <Switch
                        checked={p.enabled}
                        disabled={toggling === `${p.id}-enabled`}
                        onCheckedChange={(v) => toggle(p.id, 'enabled', v)}
                      />
                    </label>
                    <div className="flex gap-1">
                      {p.live_url && (
                        <a href={p.live_url} target="_blank" rel="noopener noreferrer"
                          className="grid size-7 place-items-center rounded-lg border border-[#27272A] text-[#52525b] hover:text-[#409EFE]">
                          <ExternalLink className="size-3.5" />
                        </a>
                      )}
                      <button onClick={() => openEdit(p)}
                        className="grid size-7 place-items-center rounded-lg border border-[#27272A] text-[#52525b] hover:text-[#409EFE]">
                        <Pencil className="size-3" />
                      </button>
                      <button onClick={() => setDeleteTarget(p)}
                        className="grid size-7 place-items-center rounded-lg border border-[#27272A] text-[#52525b] hover:text-[#EF4444]">
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <AdminPagination page={page} total={projects.length} pageSize={PAGE_SIZE} onChange={setPage} className="mt-3 pt-3 border-t border-[#27272A]" />
          </>
        )}
      </AdminPageSection>

      {/* GitHub repos */}
      <AdminPageSection title="GitHub Repositories" description="Public repos — cached from GitHub API">
        {ghLoading ? (
          <div className="py-8 text-center text-sm text-[#52525b]">Loading repos...</div>
        ) : repos.length === 0 ? (
          <AdminEmpty title="No repos cached" description="GitHub sync not configured" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {repos.map((r) => (
              <a key={r.github_id} href={r.html_url} target="_blank" rel="noopener noreferrer"
                className="group flex flex-col gap-1.5 rounded-xl border border-[#27272A] bg-[#09090B] p-4 transition-colors hover:border-[#3f3f46]">
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
                {r.language && (
                  <div className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: LANG_COLOR[r.language] || '#52525b' }} />
                    <span className="text-[10px] text-[#52525b]">{r.language}</span>
                  </div>
                )}
              </a>
            ))}
          </div>
        )}
      </AdminPageSection>

      {/* Edit/Create modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent aria-describedby={undefined}
          className="max-h-[90vh] overflow-y-auto border-[#27272A] bg-[#18181B] text-[#FAFAFA] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#FAFAFA]">{form.id ? 'Edit Project' : 'New Project'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-[#A1A1AA]">Title *</Label>
                <Input value={form.title}
                  onChange={(e) => {
                    const title = e.target.value
                    setForm((p) => ({ ...p, title, ...(p.id ? {} : { slug: slugify(title) }) }))
                  }}
                  className="mt-1 h-9 border-[#27272A] bg-[#09090B] text-sm text-[#FAFAFA] focus-visible:ring-[#409EFE]/30" />
              </div>
              <div>
                <Label className="text-xs text-[#A1A1AA]">Slug *</Label>
                <Input value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
                  className="mt-1 h-9 border-[#27272A] bg-[#09090B] font-mono text-sm text-[#FAFAFA] focus-visible:ring-[#409EFE]/30" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-[#A1A1AA]">Short Description</Label>
              <Input value={form.short_description} onChange={(e) => setForm((p) => ({ ...p, short_description: e.target.value }))}
                className="mt-1 h-9 border-[#27272A] bg-[#09090B] text-sm text-[#FAFAFA] focus-visible:ring-[#409EFE]/30" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-[#A1A1AA]">Category</Label>
                <Input value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                  className="mt-1 h-9 border-[#27272A] bg-[#09090B] text-sm text-[#FAFAFA] focus-visible:ring-[#409EFE]/30" />
              </div>
              <div>
                <Label className="text-xs text-[#A1A1AA]">Status</Label>
                <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                  className="mt-1 h-9 w-full rounded-md border border-[#27272A] bg-[#09090B] px-2 text-sm text-[#FAFAFA] focus:outline-none focus:ring-1 focus:ring-[#409EFE]/30">
                  {['published', 'active', 'in_progress', 'paused', 'archived'].map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            {/* Poster upload */}
            <div>
              <Label className="text-xs text-[#A1A1AA]">Poster Image</Label>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePosterUpload(f) }} />
              {form.poster_url ? (
                <div className="mt-1 flex gap-2">
                  <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-lg border border-[#27272A]">
                    <Image src={form.poster_url} alt="" fill sizes="64px" className="object-cover" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <Input value={form.poster_url} onChange={(e) => setForm((p) => ({ ...p, poster_url: e.target.value }))}
                      className="h-8 border-[#27272A] bg-[#09090B] font-mono text-[11px] text-[#A1A1AA] focus-visible:ring-[#409EFE]/30" />
                    <div className="flex gap-1.5">
                      <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                        className="flex items-center gap-1 rounded-md border border-[#27272A] bg-[#09090B] px-2 py-1 text-[10px] text-[#A1A1AA] hover:text-[#FAFAFA] disabled:opacity-50">
                        {uploading ? <Loader2 className="size-3 animate-spin" /> : <ImagePlus className="size-3" />} Replace
                      </button>
                      <button type="button" onClick={() => setForm((p) => ({ ...p, poster_url: '', poster_alt: '' }))}
                        className="flex items-center gap-1 rounded-md border border-[#27272A] bg-[#09090B] px-2 py-1 text-[10px] text-[#52525b] hover:text-[#EF4444]">
                        <X className="size-3" /> Remove
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-1 space-y-2">
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#27272A] bg-[#09090B] py-4 text-[11px] text-[#52525b] hover:border-[#409EFE]/40 hover:text-[#409EFE] disabled:opacity-50">
                    {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
                    {uploading ? 'Uploading...' : 'Upload poster'}
                  </button>
                  <Input value={form.poster_url} onChange={(e) => setForm((p) => ({ ...p, poster_url: e.target.value }))}
                    className="h-8 border-[#27272A] bg-[#09090B] font-mono text-[11px] text-[#A1A1AA] focus-visible:ring-[#409EFE]/30"
                    placeholder="or paste URL..." />
                </div>
              )}
            </div>
            <div>
              <Label className="text-xs text-[#A1A1AA]">Poster Alt Text</Label>
              <Input value={form.poster_alt} onChange={(e) => setForm((p) => ({ ...p, poster_alt: e.target.value }))}
                className="mt-1 h-9 border-[#27272A] bg-[#09090B] text-sm text-[#FAFAFA] focus-visible:ring-[#409EFE]/30" />
            </div>
            <div>
              <Label className="text-xs text-[#A1A1AA]">GitHub URL</Label>
              <Input value={form.github_url} onChange={(e) => setForm((p) => ({ ...p, github_url: e.target.value }))}
                className="mt-1 h-9 border-[#27272A] bg-[#09090B] text-sm text-[#FAFAFA] focus-visible:ring-[#409EFE]/30" placeholder="https://github.com/..." />
            </div>
            <div>
              <Label className="text-xs text-[#A1A1AA]">Live URL</Label>
              <Input value={form.live_url} onChange={(e) => setForm((p) => ({ ...p, live_url: e.target.value }))}
                className="mt-1 h-9 border-[#27272A] bg-[#09090B] text-sm text-[#FAFAFA] focus-visible:ring-[#409EFE]/30" placeholder="https://..." />
            </div>
            <div>
              <Label className="text-xs text-[#A1A1AA]">Tech Stack (comma-separated)</Label>
              <Input value={form.tech_stack} onChange={(e) => setForm((p) => ({ ...p, tech_stack: e.target.value }))}
                className="mt-1 h-9 border-[#27272A] bg-[#09090B] text-sm text-[#FAFAFA] focus-visible:ring-[#409EFE]/30" placeholder="Next.js, TypeScript" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center justify-between rounded-lg border border-[#27272A] px-3 py-2.5">
                <p className="text-sm text-[#FAFAFA]">Featured</p>
                <Switch checked={form.featured} onCheckedChange={(v) => setForm((p) => ({ ...p, featured: v }))} />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-[#27272A] px-3 py-2.5">
                <p className="text-sm text-[#FAFAFA]">Visible</p>
                <Switch checked={form.enabled} onCheckedChange={(v) => setForm((p) => ({ ...p, enabled: v }))} />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}
              className="h-8 border-[#27272A] bg-transparent text-[#A1A1AA] hover:bg-[#27272A] hover:text-[#FAFAFA]">Cancel</Button>
            <Button onClick={handleSave} disabled={saving}
              className="h-8 bg-[#409EFE] text-sm text-white hover:bg-[#60aeff] disabled:opacity-60">
              {saving && <Loader2 className="mr-1.5 size-3 animate-spin" />}
              {form.id ? 'Save Changes' : 'Create Project'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmModal
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete "${deleteTarget?.title}"?`}
        description="This project will be permanently removed."
        confirmLabel="Delete"
        destructive
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />
    </div>
  )
}
