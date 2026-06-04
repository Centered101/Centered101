'use client'

import useSWR from 'swr'
import type { GitHubUser, GitHubRepo, GitHubSocialAccount, LanguageStats } from '@/lib/github/types'

interface GitHubData {
  user: GitHubUser
  repositories: GitHubRepo[]
  socialAccounts: GitHubSocialAccount[]
  orcidId: string | null
  totalStars: number
  topLanguages: LanguageStats[]
  cached: boolean
}

const fetcher = async (url: string) => {
  const response = await fetch(url)
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch GitHub data')
  }

  return data
}

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
