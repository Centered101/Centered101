'use client'

import useSWR from 'swr'
import { fetchJson } from '@/lib/api-fetcher'
import type { LearningStoryItem } from '@/lib/portfolio/types'

interface LearningStoryData {
  configured: boolean
  items: LearningStoryItem[]
}

const fallbackLearningStoryData: LearningStoryData = {
  configured: false,
  items: [],
}

const fetcher = (url: string) => fetchJson<LearningStoryData>(url, fallbackLearningStoryData, 'Failed to fetch learning story')

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
