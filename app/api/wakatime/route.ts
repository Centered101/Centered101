import { NextResponse } from 'next/server'
import { getLanguageColor } from '@/lib/github/api'
import type { WakaTimeStats } from '@/lib/wakatime/types'

type WakaTimeEntity = {
  name?: string
  total_seconds?: number
  text?: string
  percent?: number
  color?: string | null
}

type WakaTimeStatsResponse = {
  data?: {
    human_readable_total?: string
    human_readable_daily_average?: string
    total_seconds?: number
    daily_average?: number
    best_day?: {
      text?: string
      date?: string
    }
    languages?: WakaTimeEntity[]
    projects?: WakaTimeEntity[]
  }
}

const DEFAULT_RANGE = 'last_7_days'

function normalizeEntity(entity: WakaTimeEntity, useLanguageColor = false) {
  const name = entity.name || 'Unknown'

  return {
    name,
    totalSeconds: entity.total_seconds || 0,
    text: entity.text || '0 mins',
    percent: Math.round((entity.percent || 0) * 10) / 10,
    color: useLanguageColor ? getLanguageColor(name) : entity.color || getLanguageColor(name),
  }
}

function emptyStats(configured: boolean, range = DEFAULT_RANGE): WakaTimeStats {
  return {
    configured,
    range,
    humanReadableTotal: '0 mins',
    humanReadableDailyAverage: '0 mins',
    totalSeconds: 0,
    dailyAverageSeconds: 0,
    bestDayText: null,
    bestDayDate: null,
    languages: [],
    projects: [],
  }
}

export async function GET(request: Request) {
  const apiKey = process.env.WAKATIME_API_KEY
  const url = new URL(request.url)
  const range = url.searchParams.get('range') || DEFAULT_RANGE

  if (!apiKey) {
    return NextResponse.json(emptyStats(false, range))
  }

  try {
    const response = await fetch(`https://wakatime.com/api/v1/users/current/stats/${range}`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`,
      },
      next: { revalidate: 3600 },
    })

    if (!response.ok) {
      return NextResponse.json(
        { ...emptyStats(true, range), error: `WakaTime responded with ${response.status}` },
        { status: response.status }
      )
    }

    const payload = (await response.json()) as WakaTimeStatsResponse
    const data = payload.data

    return NextResponse.json({
      configured: true,
      range,
      humanReadableTotal: data?.human_readable_total || '0 mins',
      humanReadableDailyAverage: data?.human_readable_daily_average || '0 mins',
      totalSeconds: data?.total_seconds || 0,
      dailyAverageSeconds: data?.daily_average || 0,
      bestDayText: data?.best_day?.text || null,
      bestDayDate: data?.best_day?.date || null,
      languages: (data?.languages || []).slice(0, 5).map((language) => normalizeEntity(language, true)),
      projects: (data?.projects || []).slice(0, 5).map((project) => normalizeEntity(project)),
    } satisfies WakaTimeStats)
  } catch (error) {
    console.error('WakaTime API error:', error)
    return NextResponse.json(
      { ...emptyStats(Boolean(apiKey), range), error: 'Failed to fetch WakaTime stats' },
      { status: 500 }
    )
  }
}
