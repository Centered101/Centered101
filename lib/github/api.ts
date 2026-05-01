import type { GitHubUser, GitHubRepo, LanguageStats } from './types'

const GITHUB_API_BASE = 'https://api.github.com'
const GITHUB_USERNAME = 'centered101'

// Language colors mapping
const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  Rust: '#dea584',
  Go: '#00ADD8',
  Java: '#b07219',
  'C++': '#f34b7d',
  C: '#555555',
  Ruby: '#701516',
  PHP: '#4F5D95',
  Swift: '#ffac45',
  Kotlin: '#A97BFF',
  Dart: '#00B4AB',
  HTML: '#e34c26',
  CSS: '#563d7c',
  SCSS: '#c6538c',
  Shell: '#89e051',
  Vue: '#41b883',
  Svelte: '#ff3e00',
  default: '#8b949e',
}

export function getLanguageColor(language: string): string {
  return LANGUAGE_COLORS[language] || LANGUAGE_COLORS.default
}

export async function fetchGitHubUser(username: string = GITHUB_USERNAME): Promise<GitHubUser> {
  const response = await fetch(`${GITHUB_API_BASE}/users/${username}`, {
    headers: {
      Accept: 'application/vnd.github.v3+json',
      ...(process.env.GITHUB_TOKEN && {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      }),
    },
    next: { revalidate: 3600 }, // Cache for 1 hour
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch user: ${response.status}`)
  }

  return response.json()
}

export async function fetchGitHubRepos(
  username: string = GITHUB_USERNAME,
  perPage: number = 100
): Promise<GitHubRepo[]> {
  const response = await fetch(
    `${GITHUB_API_BASE}/users/${username}/repos?per_page=${perPage}&sort=pushed&direction=desc`,
    {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        ...(process.env.GITHUB_TOKEN && {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        }),
      },
      next: { revalidate: 3600 },
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch repos: ${response.status}`)
  }

  return response.json()
}

export function calculateTotalStars(repos: GitHubRepo[]): number {
  return repos.reduce((total, repo) => total + repo.stargazers_count, 0)
}

export function calculateTopLanguages(repos: GitHubRepo[], limit: number = 6): LanguageStats[] {
  const languageCounts: Record<string, number> = {}
  let totalCount = 0

  repos.forEach((repo) => {
    if (repo.language && !repo.fork) {
      languageCounts[repo.language] = (languageCounts[repo.language] || 0) + 1
      totalCount++
    }
  })

  const sortedLanguages = Object.entries(languageCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([name, count]) => ({
      name,
      percentage: Math.round((count / totalCount) * 100),
      color: getLanguageColor(name),
    }))

  return sortedLanguages
}

export function getTopRepositories(repos: GitHubRepo[], limit: number = 6): GitHubRepo[] {
  return repos
    .filter((repo) => !repo.fork && !repo.archived)
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, limit)
}

export function getRecentRepositories(repos: GitHubRepo[], limit: number = 6): GitHubRepo[] {
  return repos
    .filter((repo) => !repo.fork && !repo.archived)
    .sort((a, b) => new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime())
    .slice(0, limit)
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function getRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return 'just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)}w ago`
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}mo ago`
  return `${Math.floor(diffInSeconds / 31536000)}y ago`
}
