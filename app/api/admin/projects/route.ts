import { NextResponse } from 'next/server'
import { requireAnyAdminPermission, writeAdminAuditLog } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { writeNotification } from '@/lib/admin-notifications'

const READ_PROJECT_PERMISSIONS = ['manage_portfolio', 'view_portfolio'] as const
const SAVE_PROJECT_PERMISSIONS = ['manage_portfolio', 'create_portfolio', 'edit_portfolio'] as const
const DELETE_PROJECT_PERMISSIONS = ['manage_portfolio', 'delete_portfolio'] as const
const EDIT_PROJECT_PERMISSIONS = ['manage_portfolio', 'edit_portfolio'] as const

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
  logo_url?: string | null
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

function normalizeText(value: unknown) {
  const text = typeof value === 'string' ? value.trim() : ''
  return text || null
}

function normalizeList(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }

  if (typeof value === 'string') {
    return value.split(/,|\s{2,}/).map((item) => item.trim()).filter(Boolean)
  }

  return []
}

export async function GET(request: Request) {
  try {
    const auth = await requireAnyAdminPermission(request, READ_PROJECT_PERMISSIONS)
    if (!auth) {
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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load projects'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await requireAnyAdminPermission(request, SAVE_PROJECT_PERMISSIONS)
  if (!auth) {
    return NextResponse.json({ error: 'Portfolio permission required' }, { status: 403 })
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

  let nextSortOrder = Number.isFinite(payload.sort_order) ? payload.sort_order : undefined

  if (!payload.id && payload.sort_order === undefined) {
    const { data: minRows, error: minError } = await supabase
      .from('portfolio_projects')
      .select('sort_order')
      .order('sort_order', { ascending: true })
      .limit(1)

    if (minError) {
      return NextResponse.json({ error: minError.message }, { status: 500 })
    }

    nextSortOrder = Number(minRows?.[0]?.sort_order ?? 100) - 100
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
    ...('logo_url' in payload ? { logo_url: normalizeText(payload.logo_url) } : {}),
    live_url: normalizeText(payload.live_url),
    github_url: normalizeText(payload.github_url),
    docs_url: normalizeText(payload.docs_url),
    source_type: payload.source_type?.trim() || 'manual',
    source_repo: normalizeText(payload.source_repo),
    tech_stack: normalizeList(payload.tech_stack),
    tags: normalizeList(payload.tags),
    featured: payload.featured ?? true,
    enabled: payload.enabled ?? true,
    ...(nextSortOrder !== undefined ? { sort_order: nextSortOrder } : {}),
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('portfolio_projects')
    .upsert(record, { onConflict: payload.id ? 'id' : 'slug' })
    .select('*')
    .single()

  if (error) {
    await writeAdminAuditLog(request, auth, {
      action: 'portfolio_project.save',
      resource: 'portfolio_projects',
      resourceId: payload.id || slug,
      outcome: 'failed',
      metadata: { slug, title, error: error.message },
    })

    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await writeAdminAuditLog(request, auth, {
    action: payload.id ? 'portfolio_project.update' : 'portfolio_project.create',
    resource: 'portfolio_projects',
    resourceId: data?.id || slug,
    metadata: { slug, title },
  })

  await writeNotification({
    type: 'info',
    title: payload.id ? `อัปเดตโปรเจกต์: ${title}` : `เพิ่มโปรเจกต์ใหม่: ${title}`,
    message: slug,
    resource: 'portfolio_projects',
    resourceId: data?.id || slug,
    actorUserId: auth.adminUserId,
  })

  return NextResponse.json({ project: data })
}

export async function DELETE(request: Request) {
  const auth = await requireAnyAdminPermission(request, DELETE_PROJECT_PERMISSIONS)
  if (!auth) {
    return NextResponse.json({ error: 'Portfolio delete permission required' }, { status: 403 })
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
    await writeAdminAuditLog(request, auth, {
      action: 'portfolio_project.delete',
      resource: 'portfolio_projects',
      resourceId: id || slug,
      outcome: 'failed',
      metadata: { id, slug, error: error.message },
    })

    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await writeAdminAuditLog(request, auth, {
    action: 'portfolio_project.delete',
    resource: 'portfolio_projects',
    resourceId: id || slug,
    metadata: { id, slug },
  })

  await writeNotification({
    type: 'warning',
    title: 'ลบโปรเจกต์แล้ว',
    message: `id: ${id || slug}`,
    resource: 'portfolio_projects',
    resourceId: (id || slug) ?? undefined,
    actorUserId: auth.adminUserId,
  })

  return NextResponse.json({ ok: true })
}

// Quick toggle: featured / enabled / sort_order
export async function PATCH(request: Request) {
  const auth = await requireAnyAdminPermission(request, EDIT_PROJECT_PERMISSIONS)
  if (!auth) return NextResponse.json({ error: 'Portfolio edit permission required' }, { status: 403 })
  const supabase = createAdminClient()
  if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 503 })
  const body = await request.json() as { id?: string; featured?: boolean; enabled?: boolean; sort_order?: number; order?: { id: string; sort_order?: number }[] }

  if (Array.isArray(body.order)) {
    const updates = body.order
      .filter((item) => item?.id)
      .map((item, index) => ({
        id: String(item.id),
        sort_order: Number.isFinite(Number(item.sort_order)) ? Number(item.sort_order) : (index + 1) * 100,
      }))

    if (updates.length === 0) return NextResponse.json({ error: 'order required' }, { status: 400 })

    const { data: maxRows, error: maxError } = await supabase
      .from('portfolio_projects')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)

    if (maxError) return NextResponse.json({ error: maxError.message }, { status: 500 })

    const maxOrder = Number(maxRows?.[0]?.sort_order ?? 0)
    const tempBase = Math.max(maxOrder, updates.length * 100) + 10000

    for (let index = 0; index < updates.length; index += 1) {
      const { error } = await supabase
        .from('portfolio_projects')
        .update({ sort_order: tempBase + index })
        .eq('id', updates[index].id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const savedProjects = []
    for (const item of updates) {
      const { data, error } = await supabase
        .from('portfolio_projects')
        .update({ sort_order: item.sort_order })
        .eq('id', item.id)
        .select('*')
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      savedProjects.push(data)
    }

    return NextResponse.json({ projects: savedProjects })
  }

  if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const patch: Record<string, unknown> = {}
  if (body.featured !== undefined) {
    patch.featured = body.featured
    if (body.featured) patch.enabled = true
  }
  if (body.enabled !== undefined) patch.enabled = body.enabled
  if (body.sort_order !== undefined) patch.sort_order = body.sort_order

  if (body.featured === true && body.sort_order === undefined) {
    const { data: minRows, error: minError } = await supabase
      .from('portfolio_projects')
      .select('sort_order')
      .order('sort_order', { ascending: true })
      .limit(1)

    if (minError) return NextResponse.json({ error: minError.message }, { status: 500 })
    patch.sort_order = Number(minRows?.[0]?.sort_order ?? 0) - 100
  }

  const { data, error } = await supabase
    .from('portfolio_projects').update(patch).eq('id', body.id).select('id,slug,title,featured,enabled,sort_order').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ project: data })
}
