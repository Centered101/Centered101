'use client'

import { usePageTitle } from '@/lib/hooks/use-page-title'
import Image from 'next/image'
import { ExternalLink, GitFork, Star } from 'lucide-react'
import { AdminLoading, AdminError, AdminEmpty } from '@/components/admin/AdminStates'
import { AdminPageContainer, AdminPageHeader } from '@/components/admin/AdminPage'
import { useAdminApi } from '@/lib/hooks/useAdminApi'

// Fields must match what /api/admin/open-source actually SELECTs
type GitHubProfile = {
  username: string
  name: string | null
  bio: string | null
  avatar_url: string | null
  public_repos: number
  followers: number
  following: number
  total_stars: number | null
  cached_at: string
}

type GitHubRepo = {
  github_id: number      // primary key from GitHub, always unique
  name: string
  full_name: string
  description: string | null
  html_url: string
  language: string | null
  stargazers_count: number
  forks_count: number
  open_issues_count: number
  is_fork: boolean
  is_archived: boolean
  topics: string[]
  pushed_at: string | null
  cached_at: string
}

type OpenSourceData = {
  profile: GitHubProfile | null
  repos: GitHubRepo[]
}

const langColor: Record<string, string> = {
  TypeScript: '#409EFE',
  JavaScript: '#F59E0B',
  Python: '#22C55E',
  Go: '#60aeff',
  Rust: '#F97316',
  CSS: '#8B5CF6',
}

export default function OpenSourcePage() {
  usePageTitle('Open Source')
  const { data, loading, error, refetch } = useAdminApi<OpenSourceData>('/api/admin/open-source')

  if (loading) return <AdminLoading message="Loading GitHub data..." />
  if (error) return <AdminError error={error} onRetry={refetch} />

  const { profile, repos } = data!

  const totalStars = profile?.total_stars ?? repos.reduce((s, r) => s + r.stargazers_count, 0)
  const totalForks = repos.reduce((s, r) => s + r.forks_count, 0)
  const totalIssues = repos.reduce((s, r) => s + r.open_issues_count, 0)
  const publicRepos = repos.filter((r) => !r.is_fork).length

  return (
    <AdminPageContainer>
      <AdminPageHeader title="Open Source Hub" description="GitHub repositories from Supabase cache" />

      {/* Profile banner */}
      {profile && (
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-[#27272A] bg-[#18181B] p-5">
          {profile.avatar_url && (
            <Image src={profile.avatar_url} alt={profile.username} width={48} height={48} className="size-12 rounded-full" />
          )}
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-[#FAFAFA]">{profile.name || profile.username}</p>
            {profile.bio && <p className="mt-0.5 text-[12px] text-[#52525b]">{profile.bio}</p>}
            <p className="mt-1 font-mono text-[11px] text-[#3f3f46]">
              {profile.public_repos} repos · {profile.followers} followers
            </p>
          </div>
          <a
            href={`https://github.com/${profile.username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-[#27272A] bg-[#09090B] px-3 py-1.5 text-xs font-medium text-[#A1A1AA] hover:text-[#FAFAFA]"
          >
            <ExternalLink className="size-3.5" />
            View GitHub
          </a>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total Stars', value: totalStars.toLocaleString(), color: 'text-[#F59E0B]' },
          { label: 'Total Forks', value: totalForks, color: 'text-[#409EFE]' },
          { label: 'Open Issues', value: totalIssues, color: 'text-[#EF4444]' },
          { label: 'Public Repos', value: publicRepos, color: 'text-[#22C55E]' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-[#27272A] bg-[#18181B] px-4 py-3">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="mt-0.5 text-[11px] text-[#52525b]">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Repos */}
      {repos.length === 0 ? (
        <AdminEmpty
          title="No repositories cached"
          description="GitHub repositories will appear here after a sync"
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {repos.map((repo) => (
            <div
              key={repo.github_id}
              className="flex flex-col rounded-xl border border-[#27272A] bg-[#18181B] p-5"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-[#FAFAFA]">{repo.name}</span>
                    {repo.is_archived && (
                      <span className="rounded border border-[#27272A] bg-[#09090B] px-1 py-px text-[9px] text-[#3f3f46]">
                        ARCHIVED
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 font-mono text-[10px] text-[#3f3f46]">{repo.full_name}</p>
                </div>
                <a
                  href={repo.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-[#52525b] hover:text-[#409EFE]"
                >
                  <ExternalLink className="size-3.5" />
                </a>
              </div>

              {repo.description && (
                <p className="mb-3 line-clamp-2 text-[12px] text-[#52525b]">{repo.description}</p>
              )}

              {repo.topics.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1">
                  {repo.topics.slice(0, 4).map((t) => (
                    <span
                      key={t}
                      className="rounded border border-[#27272A] bg-[#09090B] px-1.5 py-px text-[10px] text-[#A1A1AA]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-auto flex items-center justify-between">
                <div className="flex items-center gap-3 text-[11px] text-[#52525b]">
                  <span className="flex items-center gap-1">
                    <Star className="size-3" /> {repo.stargazers_count.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <GitFork className="size-3" /> {repo.forks_count}
                  </span>
                </div>
                {repo.language && (
                  <span
                    className="text-[11px] font-semibold"
                    style={{ color: langColor[repo.language] ?? '#A1A1AA' }}
                  >
                    {repo.language}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminPageContainer>
  )
}
