import { NextResponse } from 'next/server'
import { getAdminAuthContext } from '@/lib/admin-auth'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getSession()
  const accessToken = data.session?.access_token

  if (error || !accessToken) {
    return NextResponse.json({ error: 'No active admin session' }, { status: 401 })
  }

  const authRequest = new Request(request.url, {
    headers: {
      authorization: `Bearer ${accessToken}`,
      'user-agent': request.headers.get('user-agent') || '',
      'x-forwarded-for': request.headers.get('x-forwarded-for') || '',
      'x-real-ip': request.headers.get('x-real-ip') || '',
    },
  })
  const auth = await getAdminAuthContext(authRequest)

  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized admin session' }, { status: 401 })
  }

  return NextResponse.json({
    accessToken,
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
