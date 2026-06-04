import type { GitHubRepo } from './types'

const PROJECT_POSTERS: Record<string, string> = {
  // Example:
  // 'my-repo-name': '/project-posters/my-repo-name.png',
}

export function getProjectPoster(repo: GitHubRepo): string | null {
  return repo.poster_url || repo.posterUrl || PROJECT_POSTERS[repo.name] || null
}
