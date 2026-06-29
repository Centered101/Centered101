import { NextResponse } from 'next/server'
import { requireAnyAdminPermission, writeAdminAuditLog } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const auth = await requireAnyAdminPermission(request, ['manage_settings'])
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  const { data, error } = await supabase
    .from('system_settings')
    .select('key, value, description, is_public, updated_at')
    .order('key')

  if (error) {
    if (error.code === '42P01') return NextResponse.json({ settings: {} })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Convert rows to key→value object
  const settings: Record<string, unknown> = {}
  for (const row of data ?? []) {
    settings[row.key] = row.value
  }

  return NextResponse.json({ settings, rows: data ?? [] })
}

export async function PATCH(request: Request) {
  const auth = await requireAnyAdminPermission(request, ['manage_settings'])
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  const body = (await request.json()) as Record<string, unknown>
  const updates = Object.entries(body).map(([key, value]) => ({
    key,
    value: value as never,
    updated_at: new Date().toISOString(),
  }))

  const { error } = await supabase
    .from('system_settings')
    .upsert(updates, { onConflict: 'key' })

  if (error) {
    await writeAdminAuditLog(request, auth, { action: 'settings.update', resource: 'system_settings', outcome: 'failed', metadata: { keys: Object.keys(body), error: error.message } })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await writeAdminAuditLog(request, auth, { action: 'settings.update', resource: 'system_settings', metadata: { keys: Object.keys(body) } })
  return NextResponse.json({ ok: true })
}
