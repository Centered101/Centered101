import { NextResponse } from 'next/server'
import { requireAnyAdminPermission } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const auth = await requireAnyAdminPermission(request, ['view_logs', 'manage_settings'])
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  const url = new URL(request.url)
  const days = Math.min(parseInt(url.searchParams.get('days') || '30'), 90)
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const [visitors, pageViews, visitorLogs] = await Promise.allSettled([
    supabase
      .from('visitor_logs')
      .select('id, page_path, country, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(5000),
    supabase
      .from('portfolio_analytics')
      .select('id, event_type, page_path, created_at')
      .eq('event_type', 'page_view')
      .gte('created_at', since)
      .limit(5000),
    supabase
      .from('visitor_logs')
      .select('page_path, referrer')
      .gte('created_at', since)
      .not('page_path', 'is', null),
  ])

  const visitorData =
    visitors.status === 'fulfilled' ? (visitors.value.data ?? []) : []

  // Top pages aggregation
  const pageCount = new Map<string, number>()
  if (visitorLogs.status === 'fulfilled') {
    for (const row of visitorLogs.value.data ?? []) {
      const p = row.page_path || '/'
      pageCount.set(p, (pageCount.get(p) ?? 0) + 1)
    }
  }

  const topPages = Array.from(pageCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([path, views]) => ({ path, views }))

  // Traffic sources from referrer
  const refCount = new Map<string, number>()
  if (visitorLogs.status === 'fulfilled') {
    for (const row of visitorLogs.value.data ?? []) {
      let source = 'Direct'
      if (row.referrer) {
        try {
          const h = new URL(row.referrer).hostname
          if (h.includes('github')) source = 'GitHub'
          else if (h.includes('google')) source = 'Google'
          else if (h.includes('twitter') || h.includes('x.com')) source = 'Twitter/X'
          else source = h
        } catch {
          source = 'Direct'
        }
      }
      refCount.set(source, (refCount.get(source) ?? 0) + 1)
    }
  }

  const totalRefs = Array.from(refCount.values()).reduce((s, c) => s + c, 0) || 1
  const traffic = Array.from(refCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([source, visits]) => ({
      source,
      visits,
      percent: Math.round((visits / totalRefs) * 100),
    }))

  // Weekly visitor totals by day-of-week
  const dayMap = new Map<string, number>()
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  for (const row of visitorData) {
    const d = new Date(row.created_at)
    const label = dayLabels[d.getDay()]
    dayMap.set(label, (dayMap.get(label) ?? 0) + 1)
  }

  const weeklyVisitors = dayLabels.map((day) => ({ day, value: dayMap.get(day) ?? 0 }))

  // Daily visitor trend for the selected period
  const dailyMap = new Map<string, number>()
  for (const row of visitorData) {
    const date = row.created_at.slice(0, 10) // YYYY-MM-DD
    dailyMap.set(date, (dailyMap.get(date) ?? 0) + 1)
  }
  const dailyVisitors = Array.from({ length: days }, (_, i) => {
    const d = new Date(Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000)
    const date = d.toISOString().slice(0, 10)
    return { date, value: dailyMap.get(date) ?? 0 }
  })

  // Country breakdown
  const countryMap = new Map<string, number>()
  for (const row of visitorData) {
    const c = row.country || 'Unknown'
    countryMap.set(c, (countryMap.get(c) ?? 0) + 1)
  }
  const countries = Array.from(countryMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([country, visits]) => ({ country, visits }))

  return NextResponse.json({
    overview: {
      totalVisitors: visitorData.length,
      period: `${days} days`,
    },
    topPages,
    traffic,
    weeklyVisitors,
    dailyVisitors,
    countries,
  })
}
