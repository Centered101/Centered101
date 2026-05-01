import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const userAgent = request.headers.get('user-agent') || null
    const referer = request.headers.get('referer') || null
    const forwardedFor = request.headers.get('x-forwarded-for')
    const ipAddress = forwardedFor?.split(',')[0]?.trim() || null

    await supabase.from('resume_downloads').insert({
      user_agent: userAgent,
      ip_address: ipAddress,
      referrer: referer,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Resume download tracking error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
