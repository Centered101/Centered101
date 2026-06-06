import type { GitHubRepo } from './types'

const POSTER_BASE_PATH = '/porfilio/project-posters'
const POSTER_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'avif'] as const

const PROJECT_POSTERS: Record<string, string> = {
  // Optional custom mapping:
  // 'my-repo-name': '/porfilio/project-posters/custom-poster.png',
}

export function getProjectPosterCandidates(repo: GitHubRepo): string[] {
  const manualPoster = repo.poster_url || repo.posterUrl || PROJECT_POSTERS[repo.name]
  const names = new Set([
    repo.name,
    repo.name.toLowerCase(),
    repo.name.replace(/\s+/g, '-'),
    repo.name.toLowerCase().replace(/\s+/g, '-'),
  ])

  return [
    ...(manualPoster ? [manualPoster] : []),
    ...Array.from(names).flatMap((name) =>
      POSTER_EXTENSIONS.map((extension) => `${POSTER_BASE_PATH}/${name}.${extension}`)
    ),
  ]
}

export function getProjectPoster(repo: GitHubRepo): string | null {
  return getProjectPosterCandidates(repo)[0] || null
}
