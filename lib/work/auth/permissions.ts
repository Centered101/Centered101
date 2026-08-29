import 'server-only'

import { cache } from 'react'
import { notFound, redirect } from 'next/navigation'

import { initialFor } from '@/lib/work/format'
import { createClient } from '@/lib/work/supabase/server'
import type { OrgRole, ProjectRole } from '@/lib/work/types/enums'
import { avatarUrlFor, displayNameFor, getUser } from './session'

/**
 * Server-side authorization.
 *
 * ONE definition of every access rule, called from layouts, pages and server
 * actions. Nothing here reads a role from localStorage, from a prop, from the
 * JWT, or from any other value the browser can set — every decision below
 * starts from a row in `organization_members` or `project_members`, read under
 * the caller's own session.
 *
 * This layer is a UX boundary and a defence in depth. It is NOT the last line:
 * RLS is (docs/ARCHITECTURE.md §7). If a guard here were deleted tomorrow, a
 * client would reach an admin route and see an empty page, because the
 * database would still refuse to hand over another tenant's rows. Both layers
 * exist because either one alone fails badly — RLS alone gives a confusing
 * blank screen, a route guard alone gives a data breach.
 */

// -----------------------------------------------------------------------------
// Refusal
// -----------------------------------------------------------------------------
/**
 * Refuses a request from someone who is signed in but not allowed.
 *
 * Next's own `forbidden()` would be the natural fit, but it is still gated
 * behind `experimental.authInterrupts`, and this app ships a production site
 * from the same config — turning on an experimental flag for one guard is a
 * bad trade. A redirect to a page that says plainly what happened costs the
 * 403 status code and nothing else that a browser user can perceive.
 *
 * API routes do NOT use this. They return a real 403 response, because there
 * the status code is the entire message.
 */
export function denyAccess(reason?: string): never {
  redirect(reason ? `/work/forbidden?reason=${encodeURIComponent(reason)}` : '/work/forbidden')
}

// -----------------------------------------------------------------------------
// Capabilities
// -----------------------------------------------------------------------------
/**
 * What each agency role may DO, as distinct from where it may go.
 *
 * The brief's example is exactly why this exists: an accountant belongs in
 * /admin and must see invoices and payments, but must not be able to edit a
 * project. Route-level "is staff" cannot express that; a capability can.
 *
 * Mirrors the SQL predicates in migration 0005 (`app.can_manage_project`,
 * `app.can_manage_project_finance`) deliberately. When these disagree the
 * database wins — this map only decides what to render and which server
 * actions to admit, and a mismatch shows up as a failed write, not a leak.
 */
export const CAPABILITIES = {
  super_admin: [
    'project:read',
    'project:write',
    'client:read',
    'client:write',
    'finance:read',
    'finance:write',
    'document:read',
    'document:write',
    'member:manage',
    'settings:manage',
  ],
  admin: [
    'project:read',
    'project:write',
    'client:read',
    'client:write',
    'finance:read',
    'finance:write',
    'document:read',
    'document:write',
    'member:manage',
    'settings:manage',
  ],
  // Builds the work. Sees money to know where a project stands, cannot move it.
  developer: ['project:read', 'project:write', 'client:read', 'finance:read', 'document:read'],
  // The mirror image: owns the money, does not touch delivery.
  accountant: ['project:read', 'client:read', 'finance:read', 'finance:write', 'document:read', 'document:write'],
} as const satisfies Record<OrgRole, readonly string[]>

export type Capability = (typeof CAPABILITIES)[OrgRole][number]

export function can(role: OrgRole, capability: Capability): boolean {
  return (CAPABILITIES[role] as readonly string[]).includes(capability)
}

// -----------------------------------------------------------------------------
// Context
// -----------------------------------------------------------------------------
/** Everything both audiences carry, so layouts need one call rather than two. */
type BaseContext = {
  userId: string
  email: string
  displayName: string
  /** First letter of the display name, for the avatar chip. */
  initial: string
  /** Provider profile picture (Google), or null — the chip falls back to `initial`. */
  avatarUrl: string | null
  /**
   * True when the membership tables do not exist yet.
   *
   * Surfaced rather than thrown so the UI can say plainly that migrations have
   * not been applied. Without it, an unmigrated database is indistinguishable
   * from a user with no memberships — and the app would silently treat every
   * signed-in person as a client.
   */
  schemaMissing: boolean
}

export type StaffContext = BaseContext & {
  kind: 'staff'
  organizationId: string
  organizationName: string
  role: OrgRole
  can: (capability: Capability) => boolean
}

export type ClientContext = BaseContext & {
  kind: 'client'
}

export type AccessContext = StaffContext | ClientContext

/**
 * Resolves who the caller is, once.
 *
 * Returns null for a signed-out visitor rather than redirecting, so callers
 * that only want to BRANCH on the answer (the login page, the root router) are
 * not forced into a redirect they did not ask for.
 *
 * A user with an `organization_members` row is agency staff. A user without
 * one is a client — there is no third state and no "both": staff reach client
 * projects through their organization, so nobody needs two hats.
 *
 * MEMOISED PER REQUEST, for the same reason as `getUser()`: every layout AND
 * every page below it calls a guard, and each guard lands here. Without
 * `cache()` a single admin page ran this membership query two or three times.
 * Memoising is what makes it affordable for each page to keep asserting its
 * own permissions rather than trusting the layout to have done it.
 */
export const getAccessContext = cache(async (): Promise<AccessContext | null> => {
  const user = await getUser()
  if (!user) return null

  const displayName = displayNameFor(user)
  const base = {
    userId: user.id,
    email: user.email ?? '',
    displayName,
    initial: initialFor(displayName),
    avatarUrl: avatarUrlFor(user),
    schemaMissing: false,
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('organization_members')
    .select('organization_id, role, organizations(name)')
    .eq('profile_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) {
    // 42P01 = undefined_table; PostgREST reports an unknown relation as
    // PGRST205. Anything else is a real failure and must not be mistaken for
    // "this person is a client".
    const unmigrated = error.code === '42P01' || error.code === 'PGRST205'
    if (!unmigrated) {
      console.error('[auth] membership lookup failed:', error)
      throw new Error(`Failed to load memberships: ${error.message}`)
    }
    console.warn(
      '[auth] organization_members is missing — run `supabase db push` to apply migrations.',
    )
    return { ...base, kind: 'client', schemaMissing: true }
  }

  // No membership row is not an error: that is what a client looks like.
  if (!data) return { ...base, kind: 'client' }

  const org = data.organizations as unknown as { name: string } | null
  const role = data.role as OrgRole

  return {
    ...base,
    kind: 'staff',
    organizationId: data.organization_id as string,
    organizationName: org?.name ?? 'พื้นที่ทำงาน',
    role,
    can: (capability: Capability) => can(role, capability),
  }
})

// -----------------------------------------------------------------------------
// Guards
// -----------------------------------------------------------------------------
// For "signed in, nothing more", call `requireUser()` from ./session directly.
// A requireAuth() alias used to live here and only forwarded its argument.

/**
 * Agency staff only.
 *
 * A signed-in CLIENT is sent to their own portal rather than shown a 403. They
 * are not doing anything wrong — /admin simply is not their address — and
 * bouncing them somewhere useful beats a dead end.
 */
export async function requireAdmin(next = '/work/admin/dashboard'): Promise<StaffContext> {
  const context = await getAccessContext()
  if (!context) redirect(`/work/login?next=${encodeURIComponent(next)}`)
  if (context.kind !== 'staff') redirect('/work/portal')
  return context
}

/**
 * Agency staff holding one of `roles`.
 *
 * Unlike requireAdmin this DOES refuse: the caller is in the right portal but
 * lacks the role, which is a genuine permission failure and should read as one.
 */
export async function requireRole(...roles: OrgRole[]): Promise<StaffContext> {
  const context = await requireAdmin()
  if (!roles.includes(context.role)) denyAccess('ต้องมีสิทธิ์ระดับ ' + roles.join(' หรือ '))
  return context
}

/** Agency staff holding a specific capability. */
export async function requireCapability(capability: Capability): Promise<StaffContext> {
  const context = await requireAdmin()
  if (!context.can(capability)) denyAccess('บัญชีของคุณไม่มีสิทธิ์ ' + capability)
  return context
}

/**
 * Client portal users only.
 *
 * Staff are redirected to /admin for the same reason clients are redirected
 * out of it: the portal shows "your projects", and for staff that question is
 * answered by the admin side.
 */
export async function requireClient(next = '/work/portal'): Promise<ClientContext> {
  const context = await getAccessContext()
  if (!context) redirect(`/work/login?next=${encodeURIComponent(next)}`)
  if (context.kind === 'staff') redirect('/work/admin/dashboard')
  return context
}

// -----------------------------------------------------------------------------
// Project access
// -----------------------------------------------------------------------------
export type ProjectAccess = {
  projectId: string
  organizationId: string
  userId: string
  /** Null for agency staff, who reach the project through their organization. */
  projectRole: ProjectRole | null
  isStaff: boolean
  canManage: boolean
}

/**
 * Access to ONE project, by id.
 *
 * The check is a read of the project row under the caller's session. That is
 * not a shortcut — it is the same control the brief demands: RLS returns the
 * row only to staff of its organization or to an explicit project_member, so
 * Client A asking for Client B's UUID gets zero rows here, exactly as they
 * would from the REST API, from a hand-written fetch, or from anywhere else.
 *
 * Answers with notFound(), never 403. A 403 confirms the id exists, which
 * turns URL guessing into a project enumeration oracle. "No such project" is
 * both safer and true from the caller's point of view.
 */
export async function requireProjectAccess(projectId: string): Promise<ProjectAccess> {
  const context = await getAccessContext()
  if (!context) redirect('/work/login')

  // A malformed id would make PostgREST raise instead of returning empty.
  if (!isUuid(projectId)) notFound()

  const supabase = await createClient()

  const { data: project, error } = await supabase
    .from('projects')
    .select('id, organization_id')
    .eq('id', projectId)
    .maybeSingle()

  if (error || !project) notFound()

  if (context.kind === 'staff') {
    return {
      projectId,
      organizationId: project.organization_id as string,
      userId: context.userId,
      projectRole: null,
      isStaff: true,
      canManage: context.can('project:write'),
    }
  }

  const { data: membership } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('profile_id', context.userId)
    .maybeSingle()

  // Belt and braces: RLS already withheld the project row above if the caller
  // were not a member. This catches the one case it cannot — a membership
  // deleted between the two reads.
  if (!membership) notFound()

  return {
    projectId,
    organizationId: project.organization_id as string,
    userId: context.userId,
    projectRole: membership.role as ProjectRole,
    isStaff: false,
    canManage: false,
  }
}

/** Project access plus the right to change it. Used by mutating server actions. */
export async function requireProjectManage(projectId: string): Promise<ProjectAccess> {
  const access = await requireProjectAccess(projectId)
  if (!access.canManage) denyAccess('บัญชีของคุณไม่มีสิทธิ์แก้ไขโปรเจกต์นี้')
  return access
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: string): boolean {
  return UUID_RE.test(value)
}

// -----------------------------------------------------------------------------
// Landing
// -----------------------------------------------------------------------------
/** Where a signed-in user belongs, decided by their role in the database. */
export async function resolveLandingPath(): Promise<string> {
  const context = await getAccessContext()
  if (!context) return '/work/login'
  return context.kind === 'staff' ? '/work/admin/dashboard' : '/work/portal'
}
