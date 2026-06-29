import { NextResponse } from 'next/server'
import { requireAnyAdminPermission, writeAdminAuditLog } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

type BlogPostPayload = {
  id?: string
  slug?: string
  title?: string
  excerpt?: string | null
  content?: string | null
  category?: string
  tags?: string[]
  status?: string
  cover_url?: string | null
  read_time_minutes?: number | null
  published_at?: string | null
  scheduled_at?: string | null
}

export async function GET(request: Request) {
  const auth = await requireAnyAdminPermission(request, ['manage_blog', 'create_posts', 'edit_posts'])
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  const url = new URL(request.url)
  const status = url.searchParams.get('status')
  const category = url.searchParams.get('category')

  let query = supabase
    .from('blog_posts')
    .select('id, slug, title, excerpt, category, tags, status, cover_url, read_time_minutes, views, published_at, created_at, updated_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (category) query = query.eq('category', category)

  const { data, error } = await query

  if (error) {
    if (error.code === '42P01') return NextResponse.json({ posts: [] })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ posts: data ?? [] })
}

export async function POST(request: Request) {
  const auth = await requireAnyAdminPermission(request, ['manage_blog', 'create_posts', 'edit_posts'])
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  const payload = (await request.json()) as BlogPostPayload
  const slug = payload.slug?.trim()
  const title = payload.title?.trim()
  if (!slug || !title) return NextResponse.json({ error: 'Slug and title are required' }, { status: 400 })

  const now = new Date().toISOString()
  const record = {
    ...(payload.id ? { id: payload.id } : {}),
    slug,
    title,
    excerpt: payload.excerpt?.trim() || null,
    content: payload.content || null,
    category: payload.category?.trim() || 'development',
    tags: Array.isArray(payload.tags) ? payload.tags : [],
    status: payload.status?.trim() || 'draft',
    cover_url: payload.cover_url?.trim() || null,
    read_time_minutes: payload.read_time_minutes || null,
    published_at: payload.status === 'published' ? (payload.published_at || now) : payload.published_at || null,
    scheduled_at: payload.scheduled_at || null,
    updated_at: now,
  }

  const { data, error } = await supabase
    .from('blog_posts')
    .upsert(record, { onConflict: payload.id ? 'id' : 'slug' })
    .select('*')
    .single()

  if (error) {
    await writeAdminAuditLog(request, auth, { action: 'blog_post.save', resource: 'blog_posts', resourceId: slug, outcome: 'failed', metadata: { error: error.message } })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await writeAdminAuditLog(request, auth, { action: payload.id ? 'blog_post.update' : 'blog_post.create', resource: 'blog_posts', resourceId: data?.id || slug, metadata: { slug, title, status: record.status } })
  return NextResponse.json({ post: data })
}

export async function DELETE(request: Request) {
  const auth = await requireAnyAdminPermission(request, ['manage_blog', 'delete_posts'])
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  const url = new URL(request.url)
  const id = url.searchParams.get('id')?.trim()
  if (!id) return NextResponse.json({ error: 'Post id is required' }, { status: 400 })

  // Soft delete
  const { error } = await supabase
    .from('blog_posts')
    .update({ deleted_at: new Date().toISOString(), status: 'archived' })
    .eq('id', id)

  if (error) {
    await writeAdminAuditLog(request, auth, { action: 'blog_post.delete', resource: 'blog_posts', resourceId: id, outcome: 'failed', metadata: { error: error.message } })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await writeAdminAuditLog(request, auth, { action: 'blog_post.delete', resource: 'blog_posts', resourceId: id })
  return NextResponse.json({ ok: true })
}
