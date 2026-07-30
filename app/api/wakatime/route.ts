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

type WakaTimeSummaryDay = {
  range?: {
    date?: string
  }
  grand_total?: {
    total_seconds?: number
    text?: string
  }
  languages?: WakaTimeEntity[]
  projects?: WakaTimeEntity[]
}

type WakaTimeSummariesResponse = {
  data?: WakaTimeSummaryDay[]
}

const DEFAULT_RANGE = 'last_7_days'
const CUSTOM_RANGE_DAYS: Record<string, number> = {
  last_60_days: 60,
}

function getDateStr(daysAgo: number) {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().slice(0, 10)
}

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.round((totalSeconds % 3600) / 60)

  if (hours <= 0) return `${minutes} mins`
  if (minutes <= 0) return `${hours} hrs`
  return `${hours} hrs ${minutes} mins`
}

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

function addEntityTotals(map: Map<string, WakaTimeEntity>, entities: WakaTimeEntity[] | undefined) {
  for (const entity of entities || []) {
    const name = entity.name || 'Unknown'
    const current = map.get(name) || {
      name,
      total_seconds: 0,
      text: '0 mins',
      percent: 0,
      color: entity.color,
    }

    current.total_seconds = (current.total_seconds || 0) + (entity.total_seconds || 0)
    current.color = current.color || entity.color
    map.set(name, current)
  }
}

function summarizeEntities(map: Map<string, WakaTimeEntity>, totalSeconds: number, useLanguageColor = false) {
  return Array.from(map.values())
    .sort((a, b) => (b.total_seconds || 0) - (a.total_seconds || 0))
    .slice(0, 5)
    .map((entity) => {
      const seconds = entity.total_seconds || 0
      return normalizeEntity(
        {
          ...entity,
          text: formatDuration(seconds),
          percent: totalSeconds > 0 ? (seconds / totalSeconds) * 100 : 0,
        },
        useLanguageColor
      )
    })
}

async function getCustomRangeStats(apiKey: string, range: string, days: number): Promise<WakaTimeStats> {
  const response = await fetch(
    `https://wakatime.com/api/v1/users/current/summaries?start=${getDateStr(days - 1)}&end=${getDateStr(0)}`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`,
      },
      next: { revalidate: 3600 },
    }
  )

  if (!response.ok) {
    throw new Error(`WakaTime responded with ${response.status}`)
  }

  const payload = (await response.json()) as WakaTimeSummariesResponse
  const summaries = payload.data || []
  const languageTotals = new Map<string, WakaTimeEntity>()
  const projectTotals = new Map<string, WakaTimeEntity>()
  let totalSeconds = 0
  let bestDaySeconds = 0
  let bestDayDate: string | null = null

  for (const day of summaries) {
    const daySeconds = day.grand_total?.total_seconds || 0
    totalSeconds += daySeconds
    if (daySeconds > bestDaySeconds) {
      bestDaySeconds = daySeconds
      bestDayDate = day.range?.date || null
    }
    addEntityTotals(languageTotals, day.languages)
    addEntityTotals(projectTotals, day.projects)
  }

  const countedDays = Math.max(summaries.length || days, 1)
  const dailyAverageSeconds = Math.round(totalSeconds / countedDays)

  return {
    configured: true,
    range,
    humanReadableTotal: formatDuration(totalSeconds),
    humanReadableDailyAverage: formatDuration(dailyAverageSeconds),
    totalSeconds,
    dailyAverageSeconds,
    bestDayText: bestDaySeconds > 0 ? formatDuration(bestDaySeconds) : null,
    bestDayDate,
    languages: summarizeEntities(languageTotals, totalSeconds, true),
    projects: summarizeEntities(projectTotals, totalSeconds),
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
    if (CUSTOM_RANGE_DAYS[range]) {
      return NextResponse.json(await getCustomRangeStats(apiKey, range, CUSTOM_RANGE_DAYS[range]))
    }

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
