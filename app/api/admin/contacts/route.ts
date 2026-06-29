import { NextResponse } from 'next/server'
import { requireAnyAdminPermission, writeAdminAuditLog } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const auth = await requireAnyAdminPermission(request, ['manage_clients', 'view_users'])
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  const url = new URL(request.url)
  const status = url.searchParams.get('status')

  const baseCols = 'id, name, email, subject, message, status, is_read, created_at, deleted_at'
  const buildQuery = (cols: string) => {
    let query = supabase
      .from('contact_messages')
      .select(cols)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(100)
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    return query
  }

  let { data, error } = await buildQuery(`${baseCols}, source`)
  // Gracefully handle databases where the `source` column hasn't been added yet.
  if (error && /source/i.test(error.message || '')) {
    ;({ data, error } = await buildQuery(baseCols))
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ messages: data ?? [] })
}

export async function PATCH(request: Request) {
  const auth = await requireAnyAdminPermission(request, ['manage_clients'])
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  const body = (await request.json()) as { id: string; status?: string; is_read?: boolean }
  const { id, ...updates } = body

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const { data, error } = await supabase
    .from('contact_messages')
    .update(updates)
    .eq('id', id)
    .select('id, status, is_read')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await writeAdminAuditLog(request, auth, {
    action: 'contact_message.update',
    resource: 'contact_messages',
    resourceId: id,
    metadata: updates,
  })

  return NextResponse.json({ message: data })
}

export async function DELETE(request: Request) {
  const auth = await requireAnyAdminPermission(request, ['manage_clients'])
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const { error } = await supabase
    .from('contact_messages')
    .update({ deleted_at: new Date().toISOString(), status: 'archived' })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await writeAdminAuditLog(request, auth, {
    action: 'contact_message.delete',
    resource: 'contact_messages',
    resourceId: id,
  })

  return NextResponse.json({ ok: true })
}
