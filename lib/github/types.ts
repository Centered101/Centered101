export interface GitHubUser {
  login: string
  id: number
  avatar_url: string
  html_url: string
  name: string | null
  company: string | null
  blog: string | null
  location: string | null
  email: string | null
  bio: string | null
  twitter_username: string | null
  public_repos: number
  public_gists: number
  followers: number
  following: number
  created_at: string
  updated_at: string
}

export interface GitHubRepo {
  id: number
  name: string
  full_name: string
  description: string | null
  html_url: string
  homepage: string | null
  language: string | null
  stargazers_count: number
  forks_count: number
  watchers_count: number
  open_issues_count: number
  fork: boolean
  archived: boolean
  topics: string[]
  created_at: string
  updated_at: string
  pushed_at: string
}

export interface GitHubEvent {
  id: string
  type: string
  repo: {
    id: number
    name: string
    url: string
  }
  payload: Record<string, unknown>
  created_at: string
}

export interface ContributionDay {
  date: string
  count: number
  level: 0 | 1 | 2 | 3 | 4
}

export interface LanguageStats {
  name: string
  percentage: number
  color: string
}

export interface GitHubProfile {
  user: GitHubUser
  repositories: GitHubRepo[]
  totalStars: number
  topLanguages: LanguageStats[]
}
