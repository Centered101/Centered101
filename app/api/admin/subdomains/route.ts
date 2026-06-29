import { NextResponse } from 'next/server'
import { requireAnyAdminPermission, writeAdminAuditLog } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

type SubdomainPayload = {
  id?: string
  name?: string
  type?: string
  status?: string
  description?: string | null
  provider?: string
  ssl_enabled?: boolean
  ssl_expiry?: string | null
  latency_ms?: number | null
  monthly_visits?: number | null
}

export async function GET(request: Request) {
  const auth = await requireAnyAdminPermission(request, ['manage_domains', 'manage_dns'])
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  const { data, error } = await supabase
    .from('subdomains')
    .select('*')
    .order('type', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    if (error.code === '42P01') return NextResponse.json({ subdomains: [] })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ subdomains: data ?? [] })
}

export async function POST(request: Request) {
  const auth = await requireAnyAdminPermission(request, ['manage_domains'])
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  const payload = (await request.json()) as SubdomainPayload
  const name = payload.name?.trim().toLowerCase()
  if (!name) return NextResponse.json({ error: 'Domain name is required' }, { status: 400 })

  const record = {
    ...(payload.id ? { id: payload.id } : {}),
    name,
    type: payload.type || 'subdomain',
    status: payload.status || 'active',
    description: payload.description || null,
    provider: payload.provider || 'Vercel',
    ssl_enabled: payload.ssl_enabled ?? true,
    ssl_expiry: payload.ssl_expiry || null,
    latency_ms: payload.latency_ms || null,
    monthly_visits: payload.monthly_visits || null,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('subdomains')
    .upsert(record, { onConflict: payload.id ? 'id' : 'name' })
    .select('*')
    .single()

  if (error) {
    await writeAdminAuditLog(request, auth, { action: 'subdomain.save', resource: 'subdomains', resourceId: name, outcome: 'failed', metadata: { error: error.message } })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await writeAdminAuditLog(request, auth, { action: payload.id ? 'subdomain.update' : 'subdomain.create', resource: 'subdomains', resourceId: data?.id || name })
  return NextResponse.json({ subdomain: data })
}

export async function DELETE(request: Request) {
  const auth = await requireAnyAdminPermission(request, ['manage_domains'])
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  const url = new URL(request.url)
  const id = url.searchParams.get('id')?.trim()
  if (!id) return NextResponse.json({ error: 'Subdomain id is required' }, { status: 400 })

  const { error } = await supabase.from('subdomains').delete().eq('id', id)

  if (error) {
    await writeAdminAuditLog(request, auth, { action: 'subdomain.delete', resource: 'subdomains', resourceId: id, outcome: 'failed', metadata: { error: error.message } })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await writeAdminAuditLog(request, auth, { action: 'subdomain.delete', resource: 'subdomains', resourceId: id })
  return NextResponse.json({ ok: true })
}
