import { NextResponse } from 'next/server'
import { requireAnyAdminPermission, writeAdminAuditLog } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const auth = await requireAnyAdminPermission(request, ['manage_security', 'manage_users', 'view_logs'])
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  const [users, sessions, events, loginLogs] = await Promise.allSettled([
    supabase
      .from('admin_users')
      .select('id, email, github_username, display_name, avatar_url, status, is_locked, last_login_at, created_at'),
    supabase
      .from('user_sessions')
      .select('id, admin_user_id, provider, ip_address, last_seen_at, expires_at, revoked_at, created_at')
      .is('revoked_at', null)
      .order('last_seen_at', { ascending: false }),
    supabase
      .from('security_events')
      .select('id, admin_user_id, severity, event_type, message, metadata, ip_address, resolved, created_at')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('login_logs')
      .select('id, admin_user_id, provider, email, github_username, outcome, ip_address, created_at')
      .order('created_at', { ascending: false })
      .limit(30),
  ])

  // Attach roles to each admin user
  const usersData = users.status === 'fulfilled' ? (users.value.data ?? []) : []

  let usersWithRoles: unknown[] = usersData
  if (usersData.length > 0) {
    const userIds = usersData.map((u) => u.id)
    const { data: userRolesData } = await supabase
      .from('user_roles')
      .select('user_id, role:roles(key, name)')
      .in('user_id', userIds)

    const rolesByUser = new Map<string, string[]>()
    for (const row of userRolesData ?? []) {
      const uid = String(row.user_id)
      const roleKey = (row.role as { key?: string } | null)?.key ?? ''
      if (roleKey) {
        const arr = rolesByUser.get(uid) ?? []
        arr.push(roleKey)
        rolesByUser.set(uid, arr)
      }
    }

    usersWithRoles = usersData.map((u) => ({
      ...u,
      roles: rolesByUser.get(u.id) ?? [],
    }))
  }

  return NextResponse.json({
    adminUsers: usersWithRoles,
    sessions: sessions.status === 'fulfilled' ? (sessions.value.data ?? []) : [],
    securityEvents: events.status === 'fulfilled' ? (events.value.data ?? []) : [],
    loginLogs: loginLogs.status === 'fulfilled' ? (loginLogs.value.data ?? []) : [],
  })
}

export async function PATCH(request: Request) {
  const auth = await requireAnyAdminPermission(request, ['manage_security', 'manage_users'])
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  const url = new URL(request.url)
  const action = url.searchParams.get('action')

  if (action === 'resolve_event') {
    const { id } = await request.json() as { id: string }
    const { error } = await supabase.from('security_events').update({ resolved: true }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await writeAdminAuditLog(request, auth, { action: 'security_event.resolve', resource: 'security_events', resourceId: id })
    return NextResponse.json({ ok: true })
  }

  if (action === 'revoke_session') {
    const { id } = await request.json() as { id: string }
    const { error } = await supabase.from('user_sessions').update({ revoked_at: new Date().toISOString() }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await writeAdminAuditLog(request, auth, { action: 'session.revoke', resource: 'user_sessions', resourceId: id })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
