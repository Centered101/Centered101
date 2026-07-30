import { NextResponse } from 'next/server'
import { getAdminAuthContext, getAdminSessionTimeoutMs } from '@/lib/admin-auth'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getSession()
    const accessToken = data.session?.access_token

    if (error || !accessToken) {
      return NextResponse.json({ error: 'ยังไม่มี session admin ที่ใช้งานอยู่' }, { status: 401 })
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
      return NextResponse.json({ error: 'บัญชีนี้ยังไม่มีสิทธิ์ admin' }, { status: 401 })
    }

    return NextResponse.json({
      accessToken,
      sessionTimeoutMs: await getAdminSessionTimeoutMs(),
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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ตรวจสอบ session admin ไม่สำเร็จ'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
