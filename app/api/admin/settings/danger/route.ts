import { NextResponse } from 'next/server'
import { requireAnyAdminPermission, writeAdminAuditLog } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const auth = await requireAnyAdminPermission(request, ['manage_settings', 'manage_security'])
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  const { action } = (await request.json()) as { action: string }

  if (action === 'revoke_all_sessions') {
    const { error } = await supabase
      .from('user_sessions')
      .update({ revoked_at: new Date().toISOString() })
      .is('revoked_at', null)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await writeAdminAuditLog(request, auth, {
      action: 'sessions.revoke_all',
      resource: 'user_sessions',
      metadata: { triggered_by: auth.adminUserId },
    })
    return NextResponse.json({ ok: true })
  }

  if (action === 'reset_settings') {
    const { error } = await supabase.from('system_settings').delete().neq('key', '__placeholder__')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await writeAdminAuditLog(request, auth, {
      action: 'settings.reset_all',
      resource: 'system_settings',
      metadata: { triggered_by: auth.adminUserId },
    })
    return NextResponse.json({ ok: true })
  }

  if (action === 'clear_audit_logs') {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { error } = await supabase.from('audit_logs').delete().lt('created_at', cutoff)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await writeAdminAuditLog(request, auth, {
      action: 'audit_logs.clear_old',
      resource: 'audit_logs',
      metadata: { cutoff, triggered_by: auth.adminUserId },
    })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
