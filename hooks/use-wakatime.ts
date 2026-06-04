'use client'

import useSWR from 'swr'
import type { WakaTimeStats } from '@/lib/wakatime/types'

const fetcher = async (url: string) => {
  const response = await fetch(url)
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch WakaTime stats')
  }

  return data
}

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
