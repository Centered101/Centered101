import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

    const supabase = createAdminClient() || await createClient()

    const userAgent = request.headers.get('user-agent') || null
    const referer = request.headers.get('referer') || null
    const forwardedFor = request.headers.get('x-forwarded-for')
    const ipAddress = forwardedFor?.split(',')[0]?.trim() || null
    const country = request.headers.get('x-vercel-ip-country') || null
    const city = request.headers.get('x-vercel-ip-city') || null

    const analyticsPayload = {
      event_type: eventType,
      event_data: eventData || {},
      page_path: pagePath || null,
      referrer: referer,
      user_agent: userAgent,
      ip_address: ipAddress,
    }

    const { error: analyticsError } = await supabase
      .from('portfolio_analytics')
      .insert(analyticsPayload)

    if (analyticsError) {
      console.warn('Analytics event save skipped:', analyticsError)
    }

    if (eventType === 'page_view') {
      const { error: visitorError } = await supabase
        .from('visitor_logs')
        .insert({
          page_path: pagePath || null,
          url: typeof eventData?.url === 'string' ? eventData.url : null,
          title: typeof eventData?.title === 'string' ? eventData.title : null,
          referrer: referer,
          user_agent: userAgent,
          ip_address: ipAddress,
          country,
          city,
        })

      if (visitorError) {
        console.warn('Visitor log save skipped:', visitorError)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
