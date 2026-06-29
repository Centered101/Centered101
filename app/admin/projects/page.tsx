'use client'

import { usePageTitle } from '@/lib/hooks/use-page-title'
import Image from 'next/image'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { ExternalLink, Github, ImagePlus, Loader2, Pencil, Plus, Sparkles, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { AdminLoading, AdminError, AdminEmpty } from '@/components/admin/AdminStates'
import { ConfirmModal } from '@/components/admin/ConfirmModal'
import { useAdminApi, useAdminMutation } from '@/lib/hooks/useAdminApi'
import { useAdminAuth } from '@/components/admin/AdminAuthProvider'
import { useAdminRealtime } from '@/lib/hooks/useAdminRealtime'
import { AdminPageContainer, AdminPageHeader } from '@/components/admin/AdminPage'
import { AdminPagination } from '@/components/admin/AdminPagination'

type Project = {
  id: string
  slug: string
  title: string
  short_description: string | null
  category: string
  status: string
  poster_url: string | null
  poster_alt: string | null
  live_url: string | null
  github_url: string | null
  tech_stack: string[]
  featured: boolean
  enabled: boolean
  sort_order: number
  updated_at: string
}

type ProjectsData = { projects: Project[] }

type ProjectForm = {
  id?: string
  slug: string
  title: string
  short_description: string
  category: string
  status: string
  poster_url: string
  poster_alt: string
  github_url: string
  live_url: string
  tech_stack: string
  featured: boolean
  enabled: boolean
}

const BLANK: ProjectForm = {
  slug: '', title: '', short_description: '', category: 'project',
  status: 'published', poster_url: '', poster_alt: '', github_url: '', live_url: '', tech_stack: '',
  featured: false, enabled: true,
}

function slugify(t: string) {
  return t.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

export default function ProjectsPage() {
  usePageTitle('Projects')
  const { data, loading, error, refetch } = useAdminApi<ProjectsData>('/api/admin/projects')
  const { mutate: saveProject, loading: saving } = useAdminMutation<ProjectForm>('/api/admin/projects', 'POST')
  const { mutate: deleteProject } = useAdminMutation<undefined>('/api/admin/projects', 'DELETE')
  const { getAdminHeaders } = useAdminAuth()

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<ProjectForm>(BLANK)
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)
  const [generating, setGenerating] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 12
  const fileInputRef = useRef<HTMLInputElement>(null)
  useAdminRealtime(['portfolio_projects'], refetch)

  async function generateDescription() {
    if (!form.title.trim()) { toast.error('Enter a title first'); return }
    setGenerating(true)
    try {
      const res = await fetch('/api/admin/ai/generate', {
        method: 'POST',
        headers: { ...getAdminHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: 'project_description',
          context: { title: form.title, tech_stack: form.tech_stack, category: form.category, github_url: form.github_url },
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Generation failed')
      setForm((p) => ({ ...p, short_description: json.result }))
      toast.success('Description generated')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setGenerating(false)
    }
  }

  async function handlePosterUpload(file: File) {
    const slug = form.slug.trim() || 'project'
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('slug', slug)
      const res = await fetch('/api/admin/projects/upload', { method: 'POST', headers: getAdminHeaders(), body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Upload failed')
      setForm((p) => ({ ...p, poster_url: json.publicUrl, poster_alt: p.poster_alt || file.name.replace(/\.[^.]+$/, '') }))
      toast.success('Poster uploaded')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (loading) return <AdminLoading message="Loading projects..." />
  if (error) return <AdminError error={error} onRetry={refetch} />

  const projects = data?.projects ?? []
  const paged = projects.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const active = paged.filter((p) => ['active', 'published', 'in_progress'].includes(p.status))
  const other = paged.filter((p) => !['active', 'published', 'in_progress'].includes(p.status))

  function openNew() { setForm(BLANK); setModalOpen(true) }
  function openEdit(proj: Project) {
    setForm({
      id: proj.id, slug: proj.slug, title: proj.title,
      short_description: proj.short_description ?? '',
      category: proj.category, status: proj.status,
      poster_url: proj.poster_url ?? '',
      poster_alt: proj.poster_alt ?? '',
      github_url: proj.github_url ?? '', live_url: proj.live_url ?? '',
      tech_stack: proj.tech_stack.join(', '),
      featured: proj.featured, enabled: proj.enabled,
    })
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.title.trim() || !form.slug.trim()) {
      toast.error('Title and slug are required')
      return
    }
    try {
      await saveProject(form)
      toast.success(form.id ? 'Project updated' : 'Project created')
      setModalOpen(false)
      refetch()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  async function handleDelete(proj: Project) {
    try {
      await deleteProject(undefined, { id: proj.id })
      toast.success(`Deleted "${proj.title}"`)
      setDeleteTarget(null)
      refetch()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  return (
    <AdminPageContainer>
      <AdminPageHeader
        title="Project Center"
        description={`Portfolio projects from Supabase · ${projects.length} total`}
      >
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 rounded-lg bg-[#409EFE] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#60aeff]"
        >
          <Plus className="size-3.5" />
          New Project
        </button>
      </AdminPageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total', value: projects.length, color: 'text-[#FAFAFA]' },
          { label: 'Active', value: active.length, color: 'text-[#22C55E]' },
          { label: 'Featured', value: projects.filter((p) => p.featured).length, color: 'text-[#409EFE]' },
          { label: 'Hidden', value: projects.filter((p) => !p.enabled).length, color: 'text-[#52525b]' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-[#27272A] bg-[#18181B] px-4 py-3">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="mt-0.5 text-[11px] text-[#52525b]">{s.label}</p>
          </div>
        ))}
      </div>

      {active.length > 0 && (
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#3f3f46]">
            Active / Published ({active.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {active.map((proj) => (
              <ProjectCard key={proj.id} proj={proj} onEdit={() => openEdit(proj)} onDelete={() => setDeleteTarget(proj)} />
            ))}
          </div>
        </div>
      )}

      {other.length > 0 && (
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#3f3f46]">
            Paused / Archived ({other.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {other.map((proj) => (
              <ProjectCard key={proj.id} proj={proj} onEdit={() => openEdit(proj)} onDelete={() => setDeleteTarget(proj)} />
            ))}
          </div>
        </div>
      )}

      {projects.length === 0 && (
        <AdminEmpty title="No projects yet" description="Add your first portfolio project to get started" />
      )}

      <AdminPagination
        page={page}
        total={projects.length}
        pageSize={PAGE_SIZE}
        onChange={setPage}
      />

      {/* Edit / New modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent aria-describedby={undefined} className="max-h-[90vh] overflow-y-auto border-[#27272A] bg-[#18181B] text-[#FAFAFA] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#FAFAFA]">{form.id ? 'Edit Project' : 'New Project'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-[#A1A1AA]">Title *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => {
                    const title = e.target.value
                    setForm((p) => ({ ...p, title, ...(p.id ? {} : { slug: slugify(title) }) }))
                  }}
                  className="mt-1 h-9 border-[#27272A] bg-[#09090B] text-sm text-[#FAFAFA] focus-visible:ring-[#409EFE]/30"
                  placeholder="My Cool Project"
                />
              </div>
              <div>
                <Label className="text-xs text-[#A1A1AA]">Slug *</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
                  className="mt-1 h-9 border-[#27272A] bg-[#09090B] font-mono text-sm text-[#FAFAFA] focus-visible:ring-[#409EFE]/30"
                  placeholder="my-cool-project"
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs text-[#A1A1AA]">Short Description</Label>
                <button
                  type="button"
                  onClick={generateDescription}
                  disabled={generating || !form.title.trim()}
                  className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-[#409EFE] hover:bg-[#409EFE]/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {generating ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
                  {generating ? 'Generating...' : 'AI Generate'}
                </button>
              </div>
              <Input
                value={form.short_description}
                onChange={(e) => setForm((p) => ({ ...p, short_description: e.target.value }))}
                className="mt-1 h-9 border-[#27272A] bg-[#09090B] text-sm text-[#FAFAFA] focus-visible:ring-[#409EFE]/30"
                placeholder="One-line description"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-[#A1A1AA]">Category</Label>
                <Input
                  value={form.category}
                  onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                  className="mt-1 h-9 border-[#27272A] bg-[#09090B] text-sm text-[#FAFAFA] focus-visible:ring-[#409EFE]/30"
                  placeholder="project"
                />
              </div>
              <div>
                <Label className="text-xs text-[#A1A1AA]">Status</Label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                  className="mt-1 h-9 w-full rounded-md border border-[#27272A] bg-[#09090B] px-2 text-sm text-[#FAFAFA] focus:outline-none focus:ring-1 focus:ring-[#409EFE]/30"
                >
                  {['published', 'active', 'in_progress', 'paused', 'archived'].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Poster */}
            <div>
              <Label className="text-xs text-[#A1A1AA]">Poster Image</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePosterUpload(f) }}
              />
              {form.poster_url ? (
                <div className="mt-1 flex gap-2">
                  <div className="relative aspect-4/5 w-14 shrink-0 overflow-hidden rounded-lg border border-[#27272A] bg-[#09090B]">
                    <Image src={form.poster_url} alt="" fill sizes="56px" className="object-cover" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <Input
                      value={form.poster_url}
                      onChange={(e) => setForm((p) => ({ ...p, poster_url: e.target.value }))}
                      className="h-8 border-[#27272A] bg-[#09090B] font-mono text-[11px] text-[#A1A1AA] focus-visible:ring-[#409EFE]/30"
                    />
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="flex items-center gap-1 rounded-md border border-[#27272A] bg-[#09090B] px-2 py-1 text-[10px] text-[#A1A1AA] hover:text-[#FAFAFA] disabled:opacity-50"
                      >
                        {uploading ? <Loader2 className="size-3 animate-spin" /> : <ImagePlus className="size-3" />}
                        Replace
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, poster_url: '', poster_alt: '' }))}
                        className="flex items-center gap-1 rounded-md border border-[#27272A] bg-[#09090B] px-2 py-1 text-[10px] text-[#52525b] hover:text-[#EF4444]"
                      >
                        <X className="size-3" />
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-1 space-y-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#27272A] bg-[#09090B] py-4 text-[11px] text-[#52525b] transition-colors hover:border-[#409EFE]/40 hover:text-[#409EFE] disabled:opacity-50"
                  >
                    {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
                    {uploading ? 'Uploading...' : 'Upload poster image'}
                  </button>
                  <Input
                    value={form.poster_url}
                    onChange={(e) => setForm((p) => ({ ...p, poster_url: e.target.value }))}
                    className="h-8 border-[#27272A] bg-[#09090B] font-mono text-[11px] text-[#A1A1AA] focus-visible:ring-[#409EFE]/30"
                    placeholder="or paste URL..."
                  />
                </div>
              )}
            </div>
            <div>
              <Label className="text-xs text-[#A1A1AA]">Poster Alt Text</Label>
              <Input
                value={form.poster_alt}
                onChange={(e) => setForm((p) => ({ ...p, poster_alt: e.target.value }))}
                className="mt-1 h-9 border-[#27272A] bg-[#09090B] text-sm text-[#FAFAFA] focus-visible:ring-[#409EFE]/30"
                placeholder="Image description..."
              />
            </div>

            <div>
              <Label className="text-xs text-[#A1A1AA]">GitHub URL</Label>
              <Input
                value={form.github_url}
                onChange={(e) => setForm((p) => ({ ...p, github_url: e.target.value }))}
                className="mt-1 h-9 border-[#27272A] bg-[#09090B] text-sm text-[#FAFAFA] focus-visible:ring-[#409EFE]/30"
                placeholder="https://github.com/..."
              />
            </div>
            <div>
              <Label className="text-xs text-[#A1A1AA]">Live URL</Label>
              <Input
                value={form.live_url}
                onChange={(e) => setForm((p) => ({ ...p, live_url: e.target.value }))}
                className="mt-1 h-9 border-[#27272A] bg-[#09090B] text-sm text-[#FAFAFA] focus-visible:ring-[#409EFE]/30"
                placeholder="https://..."
              />
            </div>
            <div>
              <Label className="text-xs text-[#A1A1AA]">Tech Stack (comma-separated)</Label>
              <Input
                value={form.tech_stack}
                onChange={(e) => setForm((p) => ({ ...p, tech_stack: e.target.value }))}
                className="mt-1 h-9 border-[#27272A] bg-[#09090B] text-sm text-[#FAFAFA] focus-visible:ring-[#409EFE]/30"
                placeholder="Next.js, TypeScript, Supabase"
              />
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
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
              className="h-8 border-[#27272A] bg-transparent text-[#A1A1AA] hover:bg-[#27272A] hover:text-[#FAFAFA]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="h-8 bg-[#409EFE] text-sm text-white hover:bg-[#60aeff] disabled:opacity-60"
            >
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
        description="This project will be permanently removed from your portfolio."
        confirmLabel="Delete"
        destructive
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />
    </AdminPageContainer>
  )
}

function ProjectCard({ proj, onEdit, onDelete }: { proj: Project; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#27272A] bg-[#18181B]">
      {proj.poster_url && (
        <div className="relative aspect-4/5 w-full overflow-hidden border-b border-[#27272A] bg-[#09090B]">
          <Image src={proj.poster_url} alt={proj.poster_alt || proj.title} fill sizes="(max-width: 768px) 50vw, 320px" className="object-cover" />
        </div>
      )}
      <div className="p-5">
        <div className="mb-3 flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-[#FAFAFA]">{proj.title}</h3>
              {proj.featured && (
                <span className="rounded border border-[#409EFE]/20 bg-[#409EFE]/10 px-1.5 py-px text-[9px] font-semibold text-[#409EFE]">FEATURED</span>
              )}
              <StatusBadge status={proj.status} />
            </div>
            <p className="mt-0.5 font-mono text-[10px] text-[#3f3f46]">/{proj.slug}</p>
            {proj.short_description && <p className="mt-1 text-[12px] text-[#52525b]">{proj.short_description}</p>}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {proj.tech_stack.slice(0, 5).map((t) => (
            <span key={t} className="rounded border border-[#27272A] bg-[#09090B] px-1.5 py-px text-[10px] text-[#A1A1AA]">{t}</span>
          ))}
          {proj.tech_stack.length > 5 && <span className="text-[10px] text-[#3f3f46]">+{proj.tech_stack.length - 5}</span>}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-[10px] text-[#3f3f46]">
            Updated {new Date(proj.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
          <div className="flex gap-1.5">
            {proj.github_url && (
              <a href={proj.github_url} target="_blank" rel="noopener noreferrer" className="grid size-7 place-items-center rounded-lg border border-[#27272A] bg-[#09090B] text-[#52525b] hover:text-[#FAFAFA]">
                <Github className="size-3.5" />
              </a>
            )}
            {proj.live_url && (
              <a href={proj.live_url} target="_blank" rel="noopener noreferrer" className="grid size-7 place-items-center rounded-lg border border-[#27272A] bg-[#09090B] text-[#52525b] hover:text-[#409EFE]">
                <ExternalLink className="size-3.5" />
              </a>
            )}
            <button onClick={onEdit} className="grid size-7 place-items-center rounded-lg border border-[#27272A] bg-[#09090B] text-[#52525b] hover:text-[#409EFE]">
              <Pencil className="size-3" />
            </button>
            <button onClick={onDelete} className="grid size-7 place-items-center rounded-lg border border-[#27272A] bg-[#09090B] text-[#52525b] hover:text-[#EF4444]">
              <Trash2 className="size-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
