'use client'

import { usePageTitle } from '@/lib/hooks/use-page-title'
import { useState } from 'react'
import { toast } from 'sonner'
import { Eye, FileText, Loader2, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { AdminLoading, AdminError, AdminEmpty } from '@/components/admin/AdminStates'
import { AdminPageContainer, AdminPageHeader } from '@/components/admin/AdminPage'
import { AdminPagination } from '@/components/admin/AdminPagination'
import { ConfirmModal } from '@/components/admin/ConfirmModal'
import { useAdminApi, useAdminMutation } from '@/lib/hooks/useAdminApi'
import { useAdminAuth } from '@/components/admin/AdminAuthProvider'

type Post = {
  id: string
  slug: string
  title: string
  excerpt: string | null
  category: string
  tags: string[]
  status: string
  cover_url: string | null
  read_time_minutes: number | null
  views: number
  published_at: string | null
  created_at: string
  updated_at: string
}

type PostForm = {
  id?: string
  slug: string
  title: string
  excerpt: string
  category: string
  status: string
  tags: string
  read_time_minutes: string
}

const BLANK: PostForm = {
  slug: '', title: '', excerpt: '', category: 'development',
  status: 'draft', tags: '', read_time_minutes: '',
}

function slugify(t: string) {
  return t.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

export default function ContentPage() {
  usePageTitle('Content')
  const { data, loading, error, refetch } = useAdminApi<{ posts: Post[] }>('/api/admin/content')
  const { mutate: savePost, loading: saving } = useAdminMutation<PostForm>('/api/admin/content', 'POST')
  const { mutate: deletePost } = useAdminMutation<undefined>('/api/admin/content', 'DELETE')
  const { getAdminHeaders } = useAdminAuth()

  const [filter, setFilter] = useState('All')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 15
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<PostForm>(BLANK)
  const [deleteTarget, setDeleteTarget] = useState<Post | null>(null)
  const [generating, setGenerating] = useState<'excerpt' | 'tags' | null>(null)

  async function handleGenerate(task: 'post_excerpt' | 'post_tags', field: 'excerpt' | 'tags') {
    if (!form.title.trim()) { toast.error('Enter a title first'); return }
    setGenerating(field)
    try {
      const res = await fetch('/api/admin/ai/generate', {
        method: 'POST',
        headers: { ...getAdminHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task,
          context: { title: form.title, category: form.category, excerpt: form.excerpt, tags: form.tags },
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Generation failed')
      setForm((p) => ({ ...p, [field]: json.result }))
      toast.success(`${field === 'excerpt' ? 'Excerpt' : 'Tags'} generated`)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setGenerating(null)
    }
  }

  if (loading) return <AdminLoading message="Loading posts..." />
  if (error) return <AdminError error={error} onRetry={refetch} />

  const posts = data?.posts ?? []
  const categories = ['All', ...Array.from(new Set(posts.map((p) => p.category)))]
  const filtered = filter === 'All' ? posts : posts.filter((p) => p.category === filter)
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const stats = [
    { label: 'Published', count: posts.filter((p) => p.status === 'published').length, color: 'text-[#22C55E]' },
    { label: 'Draft', count: posts.filter((p) => p.status === 'draft').length, color: 'text-[#F59E0B]' },
    { label: 'Scheduled', count: posts.filter((p) => p.status === 'scheduled').length, color: 'text-[#409EFE]' },
    { label: 'Archived', count: posts.filter((p) => p.status === 'archived').length, color: 'text-[#A1A1AA]' },
  ]

  function openNew() { setForm(BLANK); setModalOpen(true) }
  function openEdit(post: Post) {
    setForm({
      id: post.id, slug: post.slug, title: post.title,
      excerpt: post.excerpt ?? '', category: post.category, status: post.status,
      tags: post.tags.join(', '),
      read_time_minutes: post.read_time_minutes?.toString() ?? '',
    })
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.title.trim() || !form.slug.trim()) { toast.error('Title and slug are required'); return }
    try {
      await savePost(form)
      toast.success(form.id ? 'Post updated' : 'Post created')
      setModalOpen(false)
      refetch()
    } catch (err) { toast.error((err as Error).message) }
  }

  async function handleDelete(post: Post) {
    try {
      await deletePost(undefined, { id: post.id })
      toast.success(`Deleted "${post.title}"`)
      setDeleteTarget(null)
      refetch()
    } catch (err) { toast.error((err as Error).message) }
  }

  return (
    <AdminPageContainer>
      <AdminPageHeader title="Content Manager" description={`Blog posts from Supabase · ${posts.length} total`}>
        <Button
          size="sm"
          onClick={openNew}
          className="h-8 gap-1.5 text-xs font-semibold text-white"
          style={{ backgroundColor: 'var(--admin-accent)' }}
        >
          <Plus className="size-3.5" />
          New Post
        </Button>
      </AdminPageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-[#27272A] bg-[#18181B] px-4 py-3">
            <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
            <p className="mt-0.5 text-[11px] text-[#52525b]">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#27272A] bg-[#18181B]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#27272A] px-5 py-3.5">
          <h2 className="text-sm font-semibold text-[#FAFAFA]">Posts ({filtered.length})</h2>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => { setFilter(cat); setPage(1) }}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  filter === cat ? 'bg-[#409EFE]/10 text-[#409EFE]' : 'text-foreground-muted hover:bg-surface-300 hover:text-foreground-light'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <AdminEmpty title="No posts found" description="Create your first blog post to get started" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-160 text-left text-[13px]">
              <thead>
                <tr className="border-b border-[#27272A] text-[10px] font-semibold uppercase tracking-widest text-[#3f3f46]">
                  <th className="px-5 py-3">Title</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Views</th>
                  <th className="px-4 py-3">Published</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272A]/50">
                {paged.map((post) => (
                  <tr key={post.id} className="transition-colors hover:bg-[#27272A]/20">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="size-3.5 shrink-0 text-[#3f3f46]" />
                        <span className="font-medium text-[#FAFAFA]">{post.title}</span>
                      </div>
                      <p className="mt-0.5 font-mono text-[10px] text-[#52525b]">{post.slug}</p>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-[#A1A1AA]">{post.category}</td>
                    <td className="px-4 py-3"><StatusBadge status={post.status} /></td>
                    <td className="px-4 py-3 font-mono text-[12px] text-[#A1A1AA]">
                      {post.views > 0 ? (
                        <span className="flex items-center gap-1"><Eye className="size-3 text-[#3f3f46]" />{post.views.toLocaleString()}</span>
                      ) : <span className="text-[#3f3f46]">—</span>}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-[#52525b]">
                      {post.published_at ? new Date(post.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => openEdit(post)}
                          className="grid size-7 place-items-center rounded-lg border border-[#27272A] bg-[#09090B] text-[#52525b] hover:text-[#409EFE]"
                        >
                          <Pencil className="size-3" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(post)}
                          className="grid size-7 place-items-center rounded-lg border border-[#27272A] bg-[#09090B] text-[#52525b] hover:text-[#EF4444]"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <AdminPagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>

      {/* Edit / New modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent aria-describedby={undefined} className="border-[#27272A] bg-[#18181B] text-[#FAFAFA] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#FAFAFA]">{form.id ? 'Edit Post' : 'New Post'}</DialogTitle>
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
                />
              </div>
              <div>
                <Label className="text-xs text-[#A1A1AA]">Slug *</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
                  className="mt-1 h-9 border-[#27272A] bg-[#09090B] font-mono text-sm text-[#FAFAFA] focus-visible:ring-[#409EFE]/30"
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs text-[#A1A1AA]">Excerpt</Label>
                <button
                  type="button"
                  onClick={() => handleGenerate('post_excerpt', 'excerpt')}
                  disabled={!!generating || !form.title.trim()}
                  className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-[#409EFE] hover:bg-[#409EFE]/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {generating === 'excerpt' ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
                  {generating === 'excerpt' ? 'Generating...' : 'AI Generate'}
                </button>
              </div>
              <Input value={form.excerpt} onChange={(e) => setForm((p) => ({ ...p, excerpt: e.target.value }))} className="mt-1 h-9 border-[#27272A] bg-[#09090B] text-sm text-[#FAFAFA] focus-visible:ring-[#409EFE]/30" placeholder="Short summary" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-[#A1A1AA]">Category</Label>
                <Input value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} className="mt-1 h-9 border-[#27272A] bg-[#09090B] text-sm text-[#FAFAFA] focus-visible:ring-[#409EFE]/30" />
              </div>
              <div>
                <Label className="text-xs text-[#A1A1AA]">Status</Label>
                <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))} className="mt-1 h-9 w-full rounded-md border border-[#27272A] bg-[#09090B] px-2 text-sm text-[#FAFAFA] focus:outline-none focus:ring-1 focus:ring-[#409EFE]/30">
                  {['draft', 'published', 'scheduled', 'archived'].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs text-[#A1A1AA]">Tags (comma-separated)</Label>
                <button
                  type="button"
                  onClick={() => handleGenerate('post_tags', 'tags')}
                  disabled={!!generating || !form.title.trim()}
                  className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-[#409EFE] hover:bg-[#409EFE]/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {generating === 'tags' ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
                  {generating === 'tags' ? 'Generating...' : 'AI Generate'}
                </button>
              </div>
              <Input value={form.tags} onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))} className="mt-1 h-9 border-[#27272A] bg-[#09090B] text-sm text-[#FAFAFA] focus-visible:ring-[#409EFE]/30" placeholder="nextjs, typescript" />
            </div>
            <div>
              <Label className="text-xs text-[#A1A1AA]">Read Time (minutes)</Label>
              <Input value={form.read_time_minutes} onChange={(e) => setForm((p) => ({ ...p, read_time_minutes: e.target.value }))} type="number" min="1" className="mt-1 h-9 w-28 border-[#27272A] bg-[#09090B] text-sm text-[#FAFAFA] focus-visible:ring-[#409EFE]/30" placeholder="5" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)} className="h-8 border-[#27272A] bg-transparent text-[#A1A1AA] hover:bg-[#27272A] hover:text-[#FAFAFA]">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="h-8 bg-[#409EFE] text-sm text-white hover:bg-[#60aeff] disabled:opacity-60">
              {saving && <Loader2 className="mr-1.5 size-3 animate-spin" />}
              {form.id ? 'Save Changes' : 'Create Post'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmModal
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete "${deleteTarget?.title}"?`}
        description="This post will be soft-deleted and archived."
        confirmLabel="Delete"
        destructive
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />
    </AdminPageContainer>
  )
}
