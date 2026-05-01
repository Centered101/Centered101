import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { eventType, eventData, pagePath } = body

    if (!eventType) {
      return NextResponse.json(
        { error: 'Event type is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const userAgent = request.headers.get('user-agent') || null
    const referer = request.headers.get('referer') || null
    const forwardedFor = request.headers.get('x-forwarded-for')
    const ipAddress = forwardedFor?.split(',')[0]?.trim() || null

    await supabase.from('portfolio_analytics').insert({
      event_type: eventType,
      event_data: eventData || {},
      page_path: pagePath || null,
      referrer: referer,
      user_agent: userAgent,
      ip_address: ipAddress,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
