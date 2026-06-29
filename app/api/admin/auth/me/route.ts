import { NextResponse } from 'next/server'
import { getAdminAuthContext } from '@/lib/admin-auth'

export async function GET(request: Request) {
  const auth = await getAdminAuthContext(request)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    admin: {
      source: auth.source,
      authUserId: auth.authUserId,
      adminUserId: auth.adminUserId,
      email: auth.email,
      githubUsername: auth.githubUsername,
      displayName: auth.displayName,
      avatarUrl: auth.avatarUrl,
      roles: auth.roles,
      permissions: auth.permissions,
    },
  })
}
