import 'server-only'

import { getUser } from '@/lib/work/auth/session'
import { createClient } from '@/lib/work/supabase/server'
import type { OrgRole } from '@/lib/work/types/enums'
import { unwrapOr } from './internal'

/** The agency workspace and who is in it. */

export type OrganizationMember = {
  id: string
  profileId: string
  role: OrgRole
  fullName: string | null
  email: string
  createdAt: string
}

export async function getOrganizationMembers(): Promise<OrganizationMember[]> {
  const supabase = await createClient()

  const result = await supabase
    .from('organization_members')
    .select('id, profile_id, role, created_at, profiles(full_name, email)')
    .order('created_at', { ascending: true })

  const rows = unwrapOr<
    {
      id: string
      profile_id: string
      role: OrgRole
      created_at: string
      profiles: { full_name: string | null; email: string } | null
    }[]
  >(result, 'สมาชิกทีม', [])

  return rows.map((row) => ({
    id: row.id,
    profileId: row.profile_id,
    role: row.role,
    fullName: row.profiles?.full_name ?? null,
    email: row.profiles?.email ?? '',
    createdAt: row.created_at,
  }))
}

export type Profile = {
  id: string
  email: string
  fullName: string | null
  avatarUrl: string | null
  createdAt: string
}

/**
 * The signed-in user's own profile row.
 *
 * `profiles_select_self` makes this readable; `profiles_update_self` is the
 * only write policy, and it pins both USING and WITH CHECK to auth.uid(). A
 * user cannot read, let alone edit, someone else's profile — and there is no
 * role column on profiles to escalate, because roles live in membership tables
 * only a manager may write.
 */
export async function getOwnProfile(): Promise<Profile | null> {
  // getUser() rather than supabase.auth.getUser(): the guard on this page has
  // already resolved the session, and getUser() is request-memoised, so this
  // is free instead of a third round trip to the auth server.
  const user = await getUser()
  if (!user) return null

  const supabase = await createClient()

  const result = await supabase
    .from('profiles')
    .select('id, email, full_name, avatar_url, created_at')
    .eq('id', user.id)
    .maybeSingle()

  const row = unwrapOr<{
    id: string
    email: string
    full_name: string | null
    avatar_url: string | null
    created_at: string
  } | null>(result, 'โปรไฟล์', null)

  if (!row) return null

  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
  }
}
