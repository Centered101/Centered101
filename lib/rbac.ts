export const WILDCARD_PERMISSION = '*' as const

export const PERMISSION_KEYS = [
  'public_access_only',
  'manage_users',
  'create_users',
  'edit_users',
  'delete_users',
  'view_users',
  'manage_roles',
  'manage_permissions',
  'manage_portfolio',
  'create_portfolio',
  'edit_portfolio',
  'delete_portfolio',
  'view_portfolio',
  'manage_blog',
  'create_posts',
  'edit_posts',
  'delete_posts',
  'publish_posts',
  'manage_docs',
  'create_docs',
  'edit_docs',
  'delete_docs',
  'manage_projects',
  'create_projects',
  'edit_projects',
  'delete_projects',
  'manage_media',
  'upload_media',
  'delete_media',
  'manage_comments',
  'manage_reports',
  'manage_forum',
  'view_logs',
  'manage_settings',
  'manage_database',
  'manage_api_keys',
  'manage_security',
  'manage_services',
  'manage_orders',
  'manage_clients',
  'manage_billing',
  'manage_domains',
  'manage_dns',
  'manage_deployments',
] as const

export type PermissionKey = (typeof PERMISSION_KEYS)[number] | typeof WILDCARD_PERMISSION

export const ROLE_KEYS = [
  'owner',
  'administrator',
  'developer',
  'editor',
  'moderator',
  'support',
  'member',
  'guest',
] as const

export type RoleKey = (typeof ROLE_KEYS)[number]

export const PERMISSION_IMPLICATIONS: Partial<Record<PermissionKey, readonly PermissionKey[]>> = {
  manage_users: ['create_users', 'edit_users', 'delete_users', 'view_users'],
  manage_roles: ['manage_permissions'],
  manage_portfolio: ['create_portfolio', 'edit_portfolio', 'delete_portfolio', 'view_portfolio'],
  manage_blog: ['create_posts', 'edit_posts', 'delete_posts', 'publish_posts'],
  manage_docs: ['create_docs', 'edit_docs', 'delete_docs'],
  manage_projects: ['create_projects', 'edit_projects', 'delete_projects'],
  manage_media: ['upload_media', 'delete_media'],
  manage_security: ['view_logs'],
  manage_services: ['manage_orders', 'manage_clients'],
  manage_billing: ['manage_orders', 'manage_clients'],
  manage_domains: ['manage_dns'],
}

export const ROLE_PERMISSIONS: Record<RoleKey, readonly PermissionKey[]> = {
  owner: [WILDCARD_PERMISSION],
  administrator: [
    'manage_users',
    'manage_roles',
    'manage_portfolio',
    'manage_blog',
    'manage_docs',
    'manage_projects',
    'manage_media',
    'manage_comments',
    'manage_reports',
    'view_logs',
    'manage_settings',
  ],
  developer: [
    'manage_projects',
    'manage_docs',
    'view_logs',
    'manage_api_keys',
    'manage_deployments',
  ],
  editor: [
    'manage_portfolio',
    'manage_blog',
    'manage_docs',
    'manage_media',
  ],
  moderator: ['manage_comments', 'manage_reports'],
  support: ['view_users', 'manage_clients'],
  member: ['view_portfolio'],
  guest: ['public_access_only'],
}

export function isRoleKey(value: string): value is RoleKey {
  return (ROLE_KEYS as readonly string[]).includes(value)
}

export function isPermissionKey(value: string): value is PermissionKey {
  return value === WILDCARD_PERMISSION || (PERMISSION_KEYS as readonly string[]).includes(value)
}

export function expandPermissions(permissions: readonly PermissionKey[]) {
  if (permissions.includes(WILDCARD_PERMISSION)) {
    return new Set<PermissionKey>([WILDCARD_PERMISSION, ...PERMISSION_KEYS])
  }

  const expanded = new Set<PermissionKey>(permissions)
  const queue = [...permissions]

  while (queue.length > 0) {
    const permission = queue.shift()
    if (!permission) {
      continue
    }

    for (const implied of PERMISSION_IMPLICATIONS[permission] || []) {
      if (!expanded.has(implied)) {
        expanded.add(implied)
        queue.push(implied)
      }
    }
  }

  return expanded
}

export function permissionsForRoles(roles: readonly RoleKey[]) {
  const directPermissions = roles.flatMap((role) => ROLE_PERMISSIONS[role] || [])
  return Array.from(expandPermissions(directPermissions))
}

export function hasPermission(permissions: readonly PermissionKey[], permission: PermissionKey) {
  const expanded = expandPermissions(permissions)
  return expanded.has(WILDCARD_PERMISSION) || expanded.has(permission)
}

export function hasAnyPermission(
  permissions: readonly PermissionKey[],
  candidates: readonly PermissionKey[]
) {
  return candidates.some((permission) => hasPermission(permissions, permission))
}
