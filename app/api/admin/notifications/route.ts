import { NextResponse } from 'next/server'
import { requireAnyAdminPermission } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const auth = await requireAnyAdminPermission(request, ['view_logs', 'manage_security'])
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, title, message, read, resource, resource_id, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    if (error.code === '42P01') return NextResponse.json({ notifications: [] })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ notifications: data ?? [] })
}

// PATCH — mark as read: body { ids?: string[], all?: boolean }
export async function PATCH(request: Request) {
  const auth = await requireAnyAdminPermission(request, ['view_logs', 'manage_security'])
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  const body = await request.json().catch(() => ({}))
  const { ids, all } = body as { ids?: string[]; all?: boolean }

  let query = supabase.from('notifications').update({ read: true })
  if (all) {
    query = query.eq('read', false)
  } else if (ids?.length) {
    query = query.in('id', ids)
  } else {
    return NextResponse.json({ error: 'Provide ids or all:true' }, { status: 400 })
  }

  const { error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE — dismiss: ?id=
export async function DELETE(request: Request) {
  const auth = await requireAnyAdminPermission(request, ['view_logs', 'manage_security'])
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase.from('notifications').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
