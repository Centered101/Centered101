import { NextResponse } from 'next/server'
import { requireAnyAdminPermission } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const auth = await requireAnyAdminPermission(request, ['view_logs', 'manage_security'])
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  const url = new URL(request.url)
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200)

  const [auditLogs, secEvents, loginLogs] = await Promise.allSettled([
    supabase
      .from('audit_logs')
      .select('id, action, resource, resource_id, outcome, metadata, ip_address, user_agent, created_at')
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('security_events')
      .select('id, severity, event_type, message, metadata, ip_address, resolved, created_at')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('login_logs')
      .select('id, provider, email, github_username, outcome, ip_address, created_at')
      .order('created_at', { ascending: false })
      .limit(30),
  ])

  return NextResponse.json({
    auditLogs: auditLogs.status === 'fulfilled' ? (auditLogs.value.data ?? []) : [],
    securityEvents: secEvents.status === 'fulfilled' ? (secEvents.value.data ?? []) : [],
    loginLogs: loginLogs.status === 'fulfilled' ? (loginLogs.value.data ?? []) : [],
  })
}
