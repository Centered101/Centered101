'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Star, GitFork, ExternalLink, Github, Calendar } from 'lucide-react'
import { getLanguageColor, getRelativeTime } from '@/lib/github/api'
import { getProjectPosterCandidates } from '@/lib/github/project-posters'
import { useLanguage } from '@/components/language-provider'
import type { GitHubRepo } from '@/lib/github/types'

interface RepoCardProps {
  repo: GitHubRepo
  index: number
  onRepoClick?: (repoName: string, repoUrl: string) => void
}

export function RepoCard({ repo, index, onRepoClick }: RepoCardProps) {
  const { copy } = useLanguage()
  const langColor = getLanguageColor(repo.language || '')
  const topics = Array.isArray(repo.topics) ? repo.topics.slice(0, 3) : []
  const homepage = repo.homepage || undefined
  const posterCandidates = getProjectPosterCandidates(repo)
  const [posterIndex, setPosterIndex] = useState(0)
  const poster = posterCandidates[posterIndex]

  const handleClick = () => {
    onRepoClick?.(repo.name, repo.html_url)
    window.open(repo.html_url, '_blank', 'noopener,noreferrer')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      data-aos="fade-up"
      data-aos-delay={String(Math.min(index * 80, 320))}
      className="group"
    >
      <div
        onClick={handleClick}
        className="glass-card rounded-2xl p-6 h-full flex flex-col cursor-pointer hover-lift relative overflow-hidden"
      >
        {/* Glow effect on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className="absolute -inset-1 bg-gradient-to-r from-accent/20 via-white/5 to-accent/20 rounded-2xl blur-xl" />
        </div>

        <div className="relative z-10 flex flex-col h-full">
          {poster && (
            <div className="relative -mx-6 -mt-6 mb-5 aspect-[4/5] overflow-hidden border-b border-border/50 bg-secondary">
              <img
                src={poster}
                alt={`${repo.name} project poster`}
                draggable={false}
                onContextMenu={(event) => event.preventDefault()}
                className="h-full w-full select-none object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
                onError={() => setPosterIndex((current) => current + 1)}
              />
              <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-card/80 to-transparent" />
            </div>
          )}

          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold truncate group-hover:text-accent transition-colors">
                {repo.name}
              </h3>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                <span>{copy.projects.updated} {getRelativeTime(repo.pushed_at)}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <Star className="w-4 h-4 text-accent" />
              <span className="font-medium">{repo.stargazers_count}</span>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-grow">
            {repo.description || copy.projects.noDescription}
          </p>

          {/* Topics */}
          {topics.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {topics.map((topic) => (
                <Badge
                  key={topic}
                  variant="secondary"
                  className="text-xs px-2 py-0.5 bg-secondary/80 hover:bg-accent/20 transition-colors"
                >
                  {topic}
                </Badge>
              ))}
              {repo.topics && repo.topics.length > 3 && (
                <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-secondary/80">
                  +{repo.topics.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-border/50">
            <div className="flex items-center gap-4">
              {repo.language && (
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: langColor, boxShadow: `0 0 8px ${langColor}60` }}
                  />
                  <span className="text-sm text-muted-foreground">{repo.language}</span>
                </div>
              )}
              {repo.forks_count > 0 && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <GitFork className="w-3.5 h-3.5" />
                  <span>{repo.forks_count}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={(e) => {
                  e.stopPropagation()
                  window.open(repo.html_url, '_blank', 'noopener,noreferrer')
                }}
              >
                <Github className="w-4 h-4" />
                <span className="sr-only">{copy.projects.viewGithub}</span>
              </Button>
              {homepage && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    window.open(homepage, '_blank', 'noopener,noreferrer')
                  }}
                >
                  <ExternalLink className="w-4 h-4" />
                  <span className="sr-only">{copy.projects.viewDemo}</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
