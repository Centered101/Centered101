import type { GitHubUser, GitHubRepo, GitHubSocialAccount, LanguageStats } from './types'

const GITHUB_API_BASE = 'https://api.github.com'
const GITHUB_USERNAME = 'centered101'

// Language colors mapping
const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572a5',
  Rust: '#dea584',
  Go: '#00add8',
  Java: '#b07219',
  'C++': '#f34b7d',
  C: '#555555',
  'C#': '#178600',
  Ruby: '#701516',
  PHP: '#4f5d95',
  Swift: '#f05138',
  Kotlin: '#a97bff',
  Dart: '#00b4ab',
  HTML: '#e34c26',
  CSS: '#663399',
  SCSS: '#c6538c',
  Shell: '#89e051',
  Vue: '#41b883',
  Svelte: '#ff3e00',
  Astro: '#ff5d01',
  MDX: '#fcb32c',
  Dockerfile: '#384d54',
  PowerShell: '#012456',
  Lua: '#000080',
  R: '#198ce7',
  JupyterNotebook: '#da5b0b',
  'Jupyter Notebook': '#da5b0b',
  default: '#409EFE',
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

export async function fetchGitHubSocialAccounts(
  username: string = GITHUB_USERNAME
): Promise<GitHubSocialAccount[]> {
  const response = await fetch(`${GITHUB_API_BASE}/users/${username}/social_accounts`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2026-03-10',
      ...(process.env.GITHUB_TOKEN && {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      }),
    },
    next: { revalidate: 3600 },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch social accounts: ${response.status}`)
  }

  return response.json()
}

export function extractOrcidId(socialAccounts: GitHubSocialAccount[]): string | null {
  const orcidAccount = socialAccounts.find((account) => {
    try {
      return new URL(account.url).hostname.replace(/^www\./, '') === 'orcid.org'
    } catch {
      return false
    }
  })

  if (!orcidAccount) {
    return null
  }

  try {
    const path = new URL(orcidAccount.url).pathname.replace(/^\/|\/$/g, '')
    return path || null
  } catch {
    return null
  }
}

export function calculateTotalStars(repos: GitHubRepo[]): number {
  return repos.reduce((total, repo) => total + repo.stargazers_count, 0)
}

export function calculateTopLanguages(repos: GitHubRepo[], limit: number = 9): LanguageStats[] {
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
