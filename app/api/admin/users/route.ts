import { NextResponse } from 'next/server'
import { requireAnyAdminPermission, writeAdminAuditLog } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const auth = await requireAnyAdminPermission(request, ['manage_users', 'view_users'])
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  const { data, error } = await supabase
    .from('admin_users')
    .select('id, email, github_username, display_name, avatar_url, status, is_locked, last_login_at, created_at, assigned_roles:user_roles!user_roles_user_id_fkey(roles(key))')
    .order('created_at', { ascending: false })

  if (error) {
    if (error.code === '42P01') return NextResponse.json({ users: [] })
    console.error('admin_users query error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const users = (data ?? []).map((u) => ({
    ...u,
    roles: ((u.assigned_roles as unknown as { roles: { key: string } | null }[]) ?? [])
      .map((r) => r.roles?.key)
      .filter((k): k is string => Boolean(k)),
    assigned_roles: undefined,
  }))

  return NextResponse.json({ users })
}

export async function POST(request: Request) {
  const auth = await requireAnyAdminPermission(request, ['manage_users', 'create_users'])
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  const body = (await request.json()) as {
    github_username?: string
    email?: string
    display_name?: string
    role?: string
  }

  const github_username = body.github_username?.trim().toLowerCase() || null
  const email = body.email?.trim().toLowerCase() || null

  if (!github_username && !email) {
    return NextResponse.json({ error: 'GitHub username or email is required' }, { status: 400 })
  }

  const { data: newUser, error: insertError } = await supabase
    .from('admin_users')
    .insert({
      github_username,
      email,
      display_name: body.display_name?.trim() || null,
      status: 'active',
      is_locked: false,
    })
    .select('id')
    .single()

  if (insertError) {
    if (insertError.code === '23505') {
      return NextResponse.json({ error: 'A user with that GitHub username or email already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  if (body.role) {
    const { data: roleRow } = await supabase
      .from('roles')
      .select('id')
      .eq('key', body.role)
      .maybeSingle()

    if (roleRow) {
      await supabase.from('user_roles').insert({
        user_id: newUser.id,
        role_id: roleRow.id,
        assigned_by: auth.adminUserId ?? null,
      })
    }
  }

  await writeAdminAuditLog(request, auth, {
    action: 'admin_user.create',
    resource: 'admin_users',
    resourceId: newUser.id,
    metadata: { github_username, email, role: body.role },
  })

  return NextResponse.json({ ok: true, id: newUser.id }, { status: 201 })
}

export async function PATCH(request: Request) {
  const auth = await requireAnyAdminPermission(request, ['manage_users', 'edit_users'])
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  const url = new URL(request.url)
  const id = url.searchParams.get('id')?.trim()
  if (!id) return NextResponse.json({ error: 'User id is required' }, { status: 400 })

  const body = (await request.json()) as {
    status?: string
    is_locked?: boolean
    roles?: string[]
    display_name?: string
    email?: string
    github_username?: string
  }

  const { roles: _roles, ...fields } = body
  const { error } = await supabase
    .from('admin_users')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    await writeAdminAuditLog(request, auth, {
      action: 'admin_user.update',
      resource: 'admin_users',
      resourceId: id,
      outcome: 'failed',
      metadata: { error: error.message },
    })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await writeAdminAuditLog(request, auth, {
    action: 'admin_user.update',
    resource: 'admin_users',
    resourceId: id,
    metadata: body,
  })
  return NextResponse.json({ ok: true })
}
