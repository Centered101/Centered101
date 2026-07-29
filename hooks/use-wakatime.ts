'use client'

import useSWR from 'swr'
import { fetchJson } from '@/lib/api-fetcher'
import type { WakaTimeStats } from '@/lib/wakatime/types'

const fallbackWakaTimeData: WakaTimeStats = {
  configured: false,
  range: 'last_7_days',
  humanReadableTotal: '0 mins',
  humanReadableDailyAverage: '0 mins',
  totalSeconds: 0,
  dailyAverageSeconds: 0,
  bestDayText: null,
  bestDayDate: null,
  languages: [],
  projects: [],
}

const fetcher = (url: string) => fetchJson<WakaTimeStats>(url, fallbackWakaTimeData, 'Failed to fetch WakaTime stats')

export function useWakaTime(range = 'last_7_days') {
  const { data, error, isLoading, mutate } = useSWR<WakaTimeStats>(
    `/api/wakatime?range=${range}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000,
    }
  )

  return {
    data,
    error,
    isLoading,
    refresh: mutate,
  }
}
