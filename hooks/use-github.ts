'use client'

import useSWR from 'swr'
import type { GitHubUser, GitHubRepo, LanguageStats } from '@/lib/github/types'

interface GitHubData {
  user: GitHubUser
  repositories: GitHubRepo[]
  totalStars: number
  topLanguages: LanguageStats[]
  cached: boolean
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function useGitHub() {
  const { data, error, isLoading, mutate } = useSWR<GitHubData>(
    '/api/github',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // 1 minute
    }
  )

  return {
    data,
    error,
    isLoading,
    refresh: mutate,
  }
}
