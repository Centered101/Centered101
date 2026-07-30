import { NextResponse } from 'next/server'
import { createShopServerClient } from '@/lib/shop/supabase-server'

function getOAuthErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : 'Shop OAuth callback failed'
  if (message.toLowerCase().includes('code verifier')) {
    return 'เซสชันเข้าสู่ระบบร้านค้าหมดอายุ กรุณากดเข้าสู่ระบบใหม่อีกครั้ง'
  }
  if (message.toLowerCase().includes('fetch failed')) {
    return 'เชื่อมต่อ Shop Supabase ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง'
  }
  return message
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const nextParam = requestUrl.searchParams.get('next') || '/shop'
  const next = nextParam.startsWith('/shop') ? nextParam : '/shop'

  if (code) {
    try {
      const supabase = await createShopServerClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        const redirectUrl = new URL(next, requestUrl.origin)
        redirectUrl.searchParams.set('auth_error', getOAuthErrorMessage(error))
        return NextResponse.redirect(redirectUrl)
      }
    } catch (error) {
      const message = getOAuthErrorMessage(error)
      const redirectUrl = new URL(next, requestUrl.origin)
      redirectUrl.searchParams.set('auth_error', message)
      return NextResponse.redirect(redirectUrl)
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin))
}
