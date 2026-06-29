import { NextResponse } from 'next/server'
import { requireAnyAdminPermission } from '@/lib/admin-auth'

function getDateStr(daysAgo: number) {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().slice(0, 10)
}

async function wakaFetch(path: string) {
  const key = process.env.WAKATIME_API_KEY?.trim()
  if (!key) throw new Error('WAKATIME_API_KEY not configured')
  const encoded = Buffer.from(key).toString('base64')
  const res = await fetch(`https://wakatime.com/api/v1${path}`, {
    headers: { Authorization: `Basic ${encoded}` },
    next: { revalidate: 300 },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`WakaTime ${res.status}: ${body.slice(0, 120)}`)
  }
  return res.json()
}

export async function GET(request: Request) {
  const auth = await requireAnyAdminPermission(request, ['view_logs', 'manage_settings'])
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const key = process.env.WAKATIME_API_KEY?.trim()
  if (!key) return NextResponse.json({ error: 'WAKATIME_API_KEY not configured' }, { status: 503 })

  const [stats, summaries] = await Promise.allSettled([
    wakaFetch('/users/current/stats/last_7_days'),
    wakaFetch(`/users/current/summaries?start=${getDateStr(6)}&end=${getDateStr(0)}`),
  ])

  return NextResponse.json({
    stats: stats.status === 'fulfilled' ? stats.value.data : null,
    summaries: summaries.status === 'fulfilled' ? summaries.value.data : [],
    error: stats.status === 'rejected' ? stats.reason.message : null,
  })
}
