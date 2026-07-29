'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Star, GitFork, ExternalLink, Calendar } from 'lucide-react'
import { getLanguageColor, getRelativeTime } from '@/lib/github/api'
import { useLanguage } from '@/components/language-provider'
import type { GitHubRepo } from '@/lib/github/types'

interface RepoCardProps {
  repo: GitHubRepo
  index: number
  onRepoClick?: (repoName: string, repoUrl: string) => void
}

export function RepoCard({ repo, index, onRepoClick }: RepoCardProps) {
  const { copy } = useLanguage()
  const [active, setActive] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const langColor = getLanguageColor(repo.language || '')
  const topics = Array.isArray(repo.topics) ? repo.topics : []
  const topicsShouldLoop = topics.length > 3
  const homepage = repo.homepage || undefined

  const openRepo = () => {
    onRepoClick?.(repo.name, repo.html_url)
    window.open(repo.html_url, '_blank', 'noopener,noreferrer')
  }

  // On touch devices (no hover) the first tap only reveals the footer buttons
  // so they become tappable; a second tap opens the repository.
  const handleClick = () => {
    if (!active && typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches) {
      setActive(true)
      return
    }
    openRepo()
  }

  // Collapse the buttons back to their idle state when tapping outside the card.
  useEffect(() => {
    if (!active) return
    const handlePointerDown = (event: PointerEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        setActive(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [active])

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
        ref={cardRef}
        onClick={handleClick}
        className={`glass-card rounded-2xl p-4 sm:p-6 h-full flex flex-col cursor-pointer hover-lift relative overflow-hidden transition-colors ${
          active ? 'border-accent/35 bg-accent/10' : ''
        }`}
      >
        {/* Glow effect on hover */}
        <div className={`absolute inset-0 transition-opacity duration-500 group-hover:opacity-100 ${active ? 'opacity-100' : 'opacity-0'}`}>
          <div className="absolute -inset-1 bg-gradient-to-r from-accent/20 via-white/5 to-accent/20 rounded-2xl blur-xl" />
        </div>

        <div className="relative z-10 flex flex-col h-full">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <h3 className={`text-lg font-semibold truncate transition-colors group-hover:text-accent ${active ? 'text-accent' : ''}`}>
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
            <div
              className={`repo-topics-marquee mb-4 overflow-hidden ${topicsShouldLoop ? '[mask-image:linear-gradient(to_right,black_0%,black_84%,transparent)]' : ''}`}
              data-loop={topicsShouldLoop ? 'true' : undefined}
            >
              <div className="repo-topics-track flex w-max gap-1.5">
                {[topics, topicsShouldLoop ? topics : []].flat().map((topic, topicIndex) => (
                  <Badge
                    key={`${topic}-${topicIndex}`}
                    variant="secondary"
                    className="shrink-0 bg-secondary/80 px-2 py-0.5 text-xs transition-colors hover:bg-accent/20"
                    aria-hidden={topicIndex >= topics.length}
                  >
                    {topic}
                  </Badge>
                ))}
              </div>
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

            <div className={`flex items-center gap-2 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 ${active ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'}`}>
              {homepage && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-9 w-9 rounded-lg border border-border bg-background/90 p-0 text-muted-foreground hover:border-accent/40 hover:bg-accent/10 hover:text-accent"
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
