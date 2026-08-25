import 'server-only'

import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

import { createClient } from '@/lib/work/supabase/server'
import type { OrgRole } from '@/lib/work/types/enums'

/**
 * Server-side session access.
 *
 * Everything here uses `getUser()`, never `getSession()`. `getSession()` reads
 * the cookie and trusts it; `getUser()` revalidates the token against the auth
 * server, so a forged or revoked cookie does not pass. On the server that
 * distinction is the whole point.
 */

export async function getUser(): Promise<User | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

/**
 * Requires a signed-in user, redirecting to /login otherwise.
 *
 * `next` preserves where they were heading so they land there after signing
 * in rather than being dumped on a dashboard.
 */
export async function requireUser(next?: string): Promise<User> {
  const user = await getUser()
  if (!user) {
    redirect(next ? `/work/login?next=${encodeURIComponent(next)}` : '/work/login')
  }
  return user
}

export type OrgMembership = {
  organizationId: string
  organizationName: string
  role: OrgRole
}

export type SessionContext = {
  user: User
  displayName: string
  email: string
  initial: string
  memberships: OrgMembership[]
  isAgencyStaff: boolean
  /** True when the schema has not been migrated yet — see the note below. */
  schemaMissing: boolean
}

/**
 * Loads the user plus their agency memberships.
 *
 * The membership query runs under the caller's session, so RLS decides what
 * comes back — this function reports access, it does not grant it.
 *
 * SCHEMA NOT YET MIGRATED: until `supabase db push` has run, `profiles` and
 * `organization_members` do not exist on the remote project. Rather than
 * crashing every page, that specific failure is detected and surfaced as
 * `schemaMissing`, so the UI can say plainly what is wrong. Any other error is
 * rethrown — swallowing real database errors would hide genuine problems
 * behind a misleading "not migrated" message.
 */
export async function getSessionContext(next?: string): Promise<SessionContext> {
  const user = await requireUser(next)
  const supabase = await createClient()

  let memberships: OrgMembership[] = []
  let schemaMissing = false

  const { data, error } = await supabase
    .from('organization_members')
    .select('organization_id, role, organizations(name)')
    .eq('profile_id', user.id)

  if (error) {
    // 42P01 = undefined_table. PostgREST also reports an unknown relation as
    // PGRST205 when it is missing from the schema cache.
    if (error.code === '42P01' || error.code === 'PGRST205') {
      schemaMissing = true
      console.warn(
        '[auth] organization_members is missing — run `npx supabase db push` to apply migrations.',
      )
    } else {
      throw new Error(`Failed to load memberships: ${error.message}`)
    }
  } else if (data) {
    memberships = data.map((row) => {
      const org = row.organizations as unknown as { name: string } | null
      return {
        organizationId: row.organization_id as string,
        organizationName: org?.name ?? 'พื้นที่ทำงาน',
        role: row.role as OrgRole,
      }
    })
  }

  const email = user.email ?? ''
  const metadata = user.user_metadata as { full_name?: string; name?: string } | undefined
  const displayName = metadata?.full_name || metadata?.name || email.split('@')[0] || 'ผู้ใช้'

  return {
    user,
    email,
    displayName,
    initial: (displayName.trim()[0] ?? '?').toUpperCase(),
    memberships,
    isAgencyStaff: memberships.length > 0,
    schemaMissing,
  }
}

/**
 * Where a user belongs after signing in.
 *
 * Agency staff go to the admin dashboard, everyone else to the client portal.
 * This is a routing convenience, not a permission decision — the portals
 * themselves are guarded server-side, and RLS guards the data underneath.
 * Real role enforcement arrives in Phase 4.
 */
export async function resolveHomePath(): Promise<string> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return '/work/login'

  const { data, error } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('profile_id', user.id)
    .limit(1)

  // If the schema is not migrated we cannot tell staff from clients. Send them
  // to the admin side, which is where a first-time operator expects to land.
  if (error) return '/work/admin/dashboard'

  return data && data.length > 0 ? '/work/admin/dashboard' : '/work/portal'
}
