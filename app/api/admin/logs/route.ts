import { NextResponse } from 'next/server'
import { requireAnyAdminPermission } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const auth = await requireAnyAdminPermission(request, ['view_logs', 'manage_security'])
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  const url = new URL(request.url)
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '200'), 500)

  const { data, error } = await supabase
    .from('audit_logs')
    .select('id, actor_user_id, action, resource, resource_id, outcome, ip_address, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    if (error.code === '42P01') return NextResponse.json({ logs: [] })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ logs: data ?? [] })
}
