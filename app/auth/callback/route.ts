import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function getOAuthErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : 'OAuth callback failed'
  if (message.toLowerCase().includes('code verifier')) {
    return 'เซสชันเข้าสู่ระบบหมดอายุ กรุณากดเข้าสู่ระบบด้วย GitHub ใหม่อีกครั้ง'
  }
  if (message.toLowerCase().includes('fetch failed')) {
    return 'เชื่อมต่อ Supabase ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง'
  }
  return message
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const nextParam = requestUrl.searchParams.get('next') || '/admin'
  const next = nextParam.startsWith('/') ? nextParam : '/admin'

  if (code) {
    try {
      const supabase = await createClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error('Supabase OAuth callback failed:', error)
        const redirectUrl = new URL(next, requestUrl.origin)
        redirectUrl.searchParams.set('auth_error', getOAuthErrorMessage(error))
        return NextResponse.redirect(redirectUrl)
      }
    } catch (error) {
      const message = getOAuthErrorMessage(error)
      console.error('Supabase OAuth callback crashed:', error)
      const redirectUrl = new URL(next, requestUrl.origin)
      redirectUrl.searchParams.set('auth_error', message)
      return NextResponse.redirect(redirectUrl)
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin))
}
