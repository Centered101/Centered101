'use client'

import useSWR from 'swr'
import type { LearningStoryItem } from '@/lib/portfolio/types'

interface LearningStoryData {
  configured: boolean
  items: LearningStoryItem[]
}

const fetcher = async (url: string) => {
  const response = await fetch(url)
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch learning story')
  }

  return data
}

export function useLearningStory(locale: string) {
  const { data, error, isLoading, mutate } = useSWR<LearningStoryData>(
    `/api/portfolio/learning-story?locale=${locale}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000,
    }
  )

  return {
    configured: data?.configured ?? false,
    items: data?.items || [],
    error,
    isLoading,
    refresh: mutate,
  }
}
