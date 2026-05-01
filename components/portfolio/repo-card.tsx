'use client'

import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Star, GitFork, ExternalLink, Github, Calendar } from 'lucide-react'
import { getLanguageColor, getRelativeTime } from '@/lib/github/api'
import type { GitHubRepo } from '@/lib/github/types'

interface RepoCardProps {
  repo: GitHubRepo
  index: number
  onRepoClick?: (repoName: string, repoUrl: string) => void
}

export function RepoCard({ repo, index, onRepoClick }: RepoCardProps) {
  const langColor = getLanguageColor(repo.language || '')
  const topics = Array.isArray(repo.topics) ? repo.topics.slice(0, 3) : []

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
      className="group"
    >
      <div
        onClick={handleClick}
        className="glass-card rounded-2xl p-6 h-full flex flex-col cursor-pointer hover-lift relative overflow-hidden"
      >
        {/* Glow effect on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className="absolute -inset-1 bg-gradient-to-r from-accent/20 via-purple-500/10 to-cyan-500/20 rounded-2xl blur-xl" />
        </div>

        <div className="relative z-10 flex flex-col h-full">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold truncate group-hover:text-accent transition-colors">
                {repo.name}
              </h3>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                <span>Updated {getRelativeTime(repo.pushed_at)}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="font-medium">{repo.stargazers_count}</span>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-grow">
            {repo.description || 'No description provided'}
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
                <span className="sr-only">View on GitHub</span>
              </Button>
              {repo.homepage && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    window.open(repo.homepage, '_blank', 'noopener,noreferrer')
                  }}
                >
                  <ExternalLink className="w-4 h-4" />
                  <span className="sr-only">View demo</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
