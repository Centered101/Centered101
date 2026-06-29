import { NextResponse } from 'next/server'
import { requireAnyAdminPermission } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

type SubdomainRow = { id: string; name: string }

type CheckResult = {
  id: string
  latency_ms: number | null
  status: string
  checked_at: string
}

async function pingOne(sd: SubdomainRow): Promise<CheckResult> {
  const url = `https://${sd.name}`
  const start = Date.now()
  const now = new Date().toISOString()

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)
    const res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
    })
    clearTimeout(timer)
    return {
      id: sd.id,
      latency_ms: Date.now() - start,
      status: res.ok || res.status < 400 ? 'active' : 'inactive',
      checked_at: now,
    }
  } catch {
    return { id: sd.id, latency_ms: null, status: 'inactive', checked_at: now }
  }
}

export async function POST(request: Request) {
  const auth = await requireAnyAdminPermission(request, ['manage_domains', 'manage_dns'])
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  const url = new URL(request.url)
  const targetId = url.searchParams.get('id')

  let dbQuery = supabase.from('subdomains').select('id, name')
  if (targetId) dbQuery = dbQuery.eq('id', targetId)
  const { data, error } = await dbQuery

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const rows = (data ?? []) as SubdomainRow[]
  if (rows.length === 0) return NextResponse.json({ results: [] })

  const settled = await Promise.allSettled(rows.map(pingOne))
  const results: CheckResult[] = settled.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : { id: rows[i].id, latency_ms: null, status: 'inactive', checked_at: new Date().toISOString() }
  )

  await Promise.allSettled(
    results.map((r) =>
      supabase
        .from('subdomains')
        .update({ latency_ms: r.latency_ms, status: r.status, updated_at: r.checked_at })
        .eq('id', r.id)
    )
  )

  return NextResponse.json({ results })
}
