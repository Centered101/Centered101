import type { User } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  WILDCARD_PERMISSION,
  hasAnyPermission,
  hasPermission,
  isPermissionKey,
  isRoleKey,
  permissionsForRoles,
  type PermissionKey,
  type RoleKey,
} from '@/lib/rbac'

type AdminUserRow = {
  id: string
  auth_user_id: string | null
  email: string | null
  github_username: string | null
  display_name: string | null
  avatar_url: string | null
  status: string | null
  is_locked: boolean | null
}

export type AdminAuthSource = 'password' | 'database' | 'env-oauth'

export type AdminAuthContext = {
  source: AdminAuthSource
  authUserId?: string
  adminUserId?: string
  email?: string
  githubUsername?: string
  displayName?: string
  avatarUrl?: string
  roles: RoleKey[]
  permissions: PermissionKey[]
}

type AuditLogOptions = {
  action: string
  resource: string
  resourceId?: string
  outcome?: 'success' | 'failed' | 'blocked'
  metadata?: Record<string, unknown>
}

function cleanEnv(value: string | undefined | null) {
  return value?.trim().replace(/^['"]|['"]$/g, '') || ''
}

function parseList(value: string | undefined) {
  return cleanEnv(value)
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get('authorization') || ''
  const match = authorization.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || ''
}

function getRequestIp(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for')
  return forwardedFor?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null
}

function getGithubUsername(metadata: Record<string, unknown>) {
  const candidates = [
    metadata.user_name,
    metadata.preferred_username,
    metadata.login,
    metadata.nickname,
    metadata.name,
  ]

  return candidates.find((value): value is string => typeof value === 'string' && value.trim().length > 0)?.trim()
}

function getDisplayName(user: User) {
  const metadata = user.user_metadata || {}
  const candidates = [
    metadata.full_name,
    metadata.name,
    metadata.user_name,
    metadata.preferred_username,
    user.email,
  ]

  return candidates.find((value): value is string => typeof value === 'string' && value.trim().length > 0)?.trim()
}

function getAvatarUrl(user: User) {
  const metadata = user.user_metadata || {}
  const candidates = [metadata.avatar_url, metadata.picture]

  return candidates.find((value): value is string => typeof value === 'string' && value.trim().length > 0)?.trim()
}

function getAllowedGithubUsers() {
  return parseList(
    process.env.ADMIN_GITHUB_USERNAMES ||
      process.env.ADMIN_GITHUB_USERNAME ||
      process.env.GITHUB_USERNAME ||
      'Centered101'
  )
}

function getAllowedEmails() {
  return parseList(process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL)
}

function ownerContext(source: AdminAuthSource, details: Partial<AdminAuthContext> = {}): AdminAuthContext {
  return {
    source,
    ...details,
    roles: ['owner'],
    permissions: permissionsForRoles(['owner']),
  }
}

function getPasswordContext(request: Request) {
  const adminUsername = cleanEnv(process.env.ADMIN_SECRET)
  const adminToken = cleanEnv(process.env.ADMIN_DASHBOARD_TOKEN)
  const providedUsername = cleanEnv(request.headers.get('x-admin-username'))
  const providedToken = request.headers.get('x-admin-token') || ''

  if (
    adminUsername &&
    adminToken &&
    providedUsername &&
    providedToken &&
    providedUsername === adminUsername &&
    providedToken === adminToken
  ) {
    return ownerContext('password', {
      displayName: providedUsername,
    })
  }

  return null
}

function getEnvOAuthContext(user: User) {
  const email = user.email?.toLowerCase() || ''
  const githubUsername = getGithubUsername(user.user_metadata || {})?.toLowerCase() || ''
  const allowedGithubUsers = getAllowedGithubUsers()
  const allowedEmails = getAllowedEmails()

  if (
    (githubUsername && allowedGithubUsers.includes(githubUsername)) ||
    (email && allowedEmails.includes(email))
  ) {
    return ownerContext('env-oauth', {
      authUserId: user.id,
      email,
      githubUsername,
      displayName: githubUsername || email,
    })
  }

  return null
}

async function assignOwnerRole(
  supabase: NonNullable<ReturnType<typeof createAdminClient>>,
  adminUserId: string
) {
  const { data: ownerRole, error: ownerRoleError } = await supabase
    .from('roles')
    .select('id')
    .eq('key', 'owner')
    .single()

  if (ownerRoleError || !ownerRole) {
    throw ownerRoleError || new Error('Owner role is not seeded')
  }

  const { error: assignError } = await supabase
    .from('user_roles')
    .upsert(
      {
        user_id: adminUserId,
        role_id: String((ownerRole as { id: unknown }).id),
      },
      { onConflict: 'user_id,role_id' }
    )

  if (assignError) {
    throw assignError
  }
}

async function provisionAllowedEnvAdminUser(
  supabase: NonNullable<ReturnType<typeof createAdminClient>>,
  user: User,
  envContext: AdminAuthContext | null
) {
  if (!envContext) {
    return null
  }

  const email = envContext.email || user.email?.toLowerCase() || null
  const githubUsername =
    envContext.githubUsername || getGithubUsername(user.user_metadata || {})?.toLowerCase() || null
  const displayName = getDisplayName(user) || githubUsername || email || 'Admin'
  const avatarUrl = getAvatarUrl(user)

  const { data: adminUser, error } = await supabase
    .from('admin_users')
    .upsert(
      {
        auth_user_id: user.id,
        email,
        github_username: githubUsername,
        display_name: displayName,
        avatar_url: avatarUrl || null,
        status: 'active',
        is_locked: false,
        last_login_at: new Date().toISOString(),
      },
      { onConflict: 'auth_user_id' }
    )
    .select('id, auth_user_id, email, github_username, display_name, avatar_url, status, is_locked')
    .single()

  if (error || !adminUser) {
    throw error || new Error('Failed to provision admin user')
  }

  await assignOwnerRole(supabase, String((adminUser as { id: unknown }).id))

  return adminUser as AdminUserRow
}

async function syncAdminUserProfile(
  supabase: NonNullable<ReturnType<typeof createAdminClient>>,
  adminUser: AdminUserRow,
  user: User
) {
  const email = adminUser.email || user.email?.toLowerCase() || null
  const githubUsername =
    adminUser.github_username || getGithubUsername(user.user_metadata || {})?.toLowerCase() || null

  const { error } = await supabase
    .from('admin_users')
    .update({
      auth_user_id: adminUser.auth_user_id || user.id,
      email,
      github_username: githubUsername,
      display_name: adminUser.display_name || getDisplayName(user) || githubUsername || email,
      avatar_url: getAvatarUrl(user) || null,
      last_login_at: new Date().toISOString(),
    })
    .eq('id', adminUser.id)

  if (error) {
    console.warn('Admin user profile sync failed:', error)
  }
}

async function findAdminUser(
  supabase: NonNullable<ReturnType<typeof createAdminClient>>,
  user: User
) {
  const email = user.email?.toLowerCase() || ''
  const githubUsername = getGithubUsername(user.user_metadata || {})?.toLowerCase() || ''
  const queries = [
    { column: 'auth_user_id', value: user.id },
    { column: 'email', value: email },
    { column: 'github_username', value: githubUsername },
  ].filter((query) => query.value)

  for (const query of queries) {
    const { data, error } = await supabase
      .from('admin_users')
      .select('id, auth_user_id, email, github_username, display_name, avatar_url, status, is_locked')
      .eq(query.column, query.value)
      .maybeSingle()

    if (error) {
      throw error
    }

    if (data) {
      return data as AdminUserRow
    }
  }

  return null
}

async function getDatabaseRolePermissions(
  supabase: NonNullable<ReturnType<typeof createAdminClient>>,
  adminUserId: string
) {
  const { data: userRoles, error: userRolesError } = await supabase
    .from('user_roles')
    .select('role_id')
    .eq('user_id', adminUserId)

  if (userRolesError) {
    throw userRolesError
  }

  const roleIds = (userRoles || [])
    .map((row) => String((row as { role_id?: unknown }).role_id || ''))
    .filter(Boolean)

  if (roleIds.length === 0) {
    return {
      roles: [] as RoleKey[],
      permissions: [] as PermissionKey[],
    }
  }

  const { data: rolesData, error: rolesError } = await supabase
    .from('roles')
    .select('id, key')
    .in('id', roleIds)

  if (rolesError) {
    throw rolesError
  }

  const roles = (rolesData || [])
    .map((row) => String((row as { key?: unknown }).key || ''))
    .filter(isRoleKey)

  const { data: rolePermissions, error: rolePermissionsError } = await supabase
    .from('role_permissions')
    .select('permission_id')
    .in('role_id', roleIds)

  if (rolePermissionsError) {
    throw rolePermissionsError
  }

  const permissionIds = (rolePermissions || [])
    .map((row) => String((row as { permission_id?: unknown }).permission_id || ''))
    .filter(Boolean)

  if (permissionIds.length === 0) {
    return {
      roles,
      permissions: permissionsForRoles(roles),
    }
  }

  const { data: permissionsData, error: permissionsError } = await supabase
    .from('permissions')
    .select('id, key')
    .in('id', permissionIds)

  if (permissionsError) {
    throw permissionsError
  }

  const permissions = (permissionsData || [])
    .map((row) => String((row as { key?: unknown }).key || ''))
    .filter(isPermissionKey)

  return {
    roles,
    permissions: permissions.includes(WILDCARD_PERMISSION)
      ? permissionsForRoles(['owner'])
      : permissions,
  }
}

async function getDatabaseContext(
  request: Request,
  supabase: NonNullable<ReturnType<typeof createAdminClient>>
) {
  const accessToken = getBearerToken(request)
  if (!accessToken) {
    return null
  }

  const { data, error } = await supabase.auth.getUser(accessToken)
  if (error || !data.user) {
    return null
  }

  const envFallback = getEnvOAuthContext(data.user)

  try {
    let adminUser = await findAdminUser(supabase, data.user)
    if (!adminUser) {
      adminUser = await provisionAllowedEnvAdminUser(supabase, data.user, envFallback)
      if (!adminUser) {
        return null
      }
    }

    if (adminUser.is_locked || adminUser.status !== 'active') {
      return null
    }

    await syncAdminUserProfile(supabase, adminUser, data.user)

    const { roles, permissions } = await getDatabaseRolePermissions(supabase, adminUser.id)
    if (roles.length === 0 || permissions.length === 0) {
      if (envFallback) {
        await assignOwnerRole(supabase, adminUser.id)
        const nextRolePermissions = await getDatabaseRolePermissions(supabase, adminUser.id)
        if (nextRolePermissions.roles.length > 0 && nextRolePermissions.permissions.length > 0) {
          return {
            source: 'database' as const,
            authUserId: data.user.id,
            adminUserId: adminUser.id,
            email: adminUser.email || data.user.email || undefined,
            githubUsername: adminUser.github_username || getGithubUsername(data.user.user_metadata || {}) || undefined,
            displayName: adminUser.display_name || getDisplayName(data.user) || undefined,
            avatarUrl: adminUser.avatar_url || getAvatarUrl(data.user) || undefined,
            roles: nextRolePermissions.roles,
            permissions: nextRolePermissions.permissions,
          }
        }
      }

      return envFallback
    }

    return {
      source: 'database' as const,
      authUserId: data.user.id,
      adminUserId: adminUser.id,
      email: adminUser.email || data.user.email || undefined,
      githubUsername: adminUser.github_username || getGithubUsername(data.user.user_metadata || {}) || undefined,
      displayName: adminUser.display_name || getDisplayName(data.user) || undefined,
      avatarUrl: adminUser.avatar_url || getAvatarUrl(data.user) || undefined,
      roles,
      permissions,
    }
  } catch (authError) {
    console.warn('Admin RBAC lookup failed, falling back to env allow-list:', authError)
    return envFallback
  }
}

// Server-side auth cache — avoids 6+ DB queries on every request
// TTL 60s. Safe because tokens are validated on first hit; cached result is scoped to that token.
const AUTH_CACHE = new Map<string, { ctx: AdminAuthContext | null; exp: number }>()
const AUTH_TTL = 60_000

function getCacheKey(request: Request): string | null {
  const token = getBearerToken(request)
  if (token) return `bearer:${token}`
  const username = cleanEnv(request.headers.get('x-admin-username'))
  const adminToken = cleanEnv(request.headers.get('x-admin-token'))
  if (username && adminToken) return `pw:${username}:${adminToken}`
  return null
}

export async function getAdminAuthContext(request: Request) {
  const key = getCacheKey(request)
  if (key) {
    const cached = AUTH_CACHE.get(key)
    if (cached && cached.exp > Date.now()) return cached.ctx
  }

  const passwordContext = getPasswordContext(request)
  if (passwordContext) {
    if (key) AUTH_CACHE.set(key, { ctx: passwordContext, exp: Date.now() + AUTH_TTL })
    return passwordContext
  }

  const supabase = createAdminClient()
  if (!supabase) return null

  const ctx = await getDatabaseContext(request, supabase)
  if (key) AUTH_CACHE.set(key, { ctx, exp: Date.now() + AUTH_TTL })
  return ctx
}

export async function isAdminAuthorized(request: Request) {
  return Boolean(await getAdminAuthContext(request))
}

export async function hasAdminPermission(request: Request, permission: PermissionKey) {
  const context = await getAdminAuthContext(request)
  return Boolean(context && hasPermission(context.permissions, permission))
}

export async function hasAnyAdminPermission(
  request: Request,
  permissions: readonly PermissionKey[]
) {
  const context = await getAdminAuthContext(request)
  return Boolean(context && hasAnyPermission(context.permissions, permissions))
}

export async function requireAdminPermission(request: Request, permission: PermissionKey) {
  const context = await getAdminAuthContext(request)
  if (!context || !hasPermission(context.permissions, permission)) {
    return null
  }

  return context
}

export async function requireAnyAdminPermission(
  request: Request,
  permissions: readonly PermissionKey[]
) {
  const context = await getAdminAuthContext(request)
  if (!context || !hasAnyPermission(context.permissions, permissions)) {
    return null
  }

  return context
}

export async function writeAdminAuditLog(
  request: Request,
  context: AdminAuthContext,
  options: AuditLogOptions
) {
  const supabase = createAdminClient()
  if (!supabase) {
    return
  }

  const { error } = await supabase.from('audit_logs').insert({
    actor_user_id: context.adminUserId || null,
    actor_auth_user_id: context.authUserId || null,
    action: options.action,
    resource: options.resource,
    resource_id: options.resourceId || null,
    outcome: options.outcome || 'success',
    metadata: {
      source: context.source,
      roles: context.roles,
      ...(options.metadata || {}),
    },
    ip_address: getRequestIp(request),
    user_agent: request.headers.get('user-agent'),
  })

  if (error) {
    console.warn('Admin audit log write failed:', error)
  }
}
