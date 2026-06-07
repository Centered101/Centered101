import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

type PortfolioProjectPayload = {
  id?: string
  slug?: string
  title?: string
  short_description?: string | null
  description?: string | null
  category?: string
  status?: string
  poster_url?: string | null
  poster_alt?: string | null
  live_url?: string | null
  github_url?: string | null
  docs_url?: string | null
  source_type?: string
  source_repo?: string | null
  tech_stack?: string[]
  tags?: string[]
  featured?: boolean
  enabled?: boolean
  sort_order?: number
}

function isAuthorized(request: Request) {
  const token = process.env.ADMIN_DASHBOARD_TOKEN || process.env.ADMIN_TOKEN
  const providedToken = request.headers.get('x-admin-token') || ''

  return Boolean(token && providedToken && token === providedToken)
}

function normalizeText(value: unknown) {
  const text = typeof value === 'string' ? value.trim() : ''
  return text || null
}

function normalizeList(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }

  if (typeof value === 'string') {
    return value.split(',').map((item) => item.trim()).filter(Boolean)
  }

  return []
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase admin client is not configured' }, { status: 503 })
  }

  const { data, error } = await supabase
    .from('portfolio_projects')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('updated_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ projects: data || [] })
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = (await request.json()) as PortfolioProjectPayload
  const slug = payload.slug?.trim()
  const title = payload.title?.trim()

  if (!slug || !title) {
    return NextResponse.json({ error: 'Slug and title are required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase admin client is not configured' }, { status: 503 })
  }

  const record = {
    ...(payload.id ? { id: payload.id } : {}),
    slug,
    title,
    short_description: normalizeText(payload.short_description),
    description: normalizeText(payload.description),
    category: payload.category?.trim() || 'project',
    status: payload.status?.trim() || 'published',
    poster_url: normalizeText(payload.poster_url),
    poster_alt: normalizeText(payload.poster_alt),
    live_url: normalizeText(payload.live_url),
    github_url: normalizeText(payload.github_url),
    docs_url: normalizeText(payload.docs_url),
    source_type: payload.source_type?.trim() || 'manual',
    source_repo: normalizeText(payload.source_repo),
    tech_stack: normalizeList(payload.tech_stack),
    tags: normalizeList(payload.tags),
    featured: payload.featured ?? true,
    enabled: payload.enabled ?? true,
    sort_order: Number.isFinite(payload.sort_order) ? payload.sort_order : 100,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('portfolio_projects')
    .upsert(record, { onConflict: payload.id ? 'id' : 'slug' })
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ project: data })
}

export async function DELETE(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const id = url.searchParams.get('id')?.trim()
  const slug = url.searchParams.get('slug')?.trim()

  if (!id && !slug) {
    return NextResponse.json({ error: 'Project id or slug is required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase admin client is not configured' }, { status: 503 })
  }

  const query = supabase.from('portfolio_projects').delete()
  const { error } = id ? await query.eq('id', id) : await query.eq('slug', slug)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
