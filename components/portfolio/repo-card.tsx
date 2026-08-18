'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Star, GitFork, ExternalLink, Calendar } from 'lucide-react'
import { getLanguageColor, getRelativeTime } from '@/lib/github/api'
import { useLanguage } from '@/components/language-provider'
import { TheSvgIcon } from '@/components/the-svg-icon'
import type { GitHubRepo } from '@/lib/github/types'

interface RepoCardProps {
  repo: GitHubRepo
  index: number
  compact?: boolean
  onRepoClick?: (repoName: string, repoUrl: string) => void
}

const languageIcons: Record<string, string> = {
  TypeScript: 'typescript',
  JavaScript: 'javascript',
  Python: 'python',
  HTML: 'html5',
  CSS: 'css',
  'C++': 'cplusplus',
  C: 'c',
}

export function RepoCard({ repo, index, compact = false, onRepoClick }: RepoCardProps) {
  const { copy } = useLanguage()
  const [active, setActive] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const langColor = getLanguageColor(repo.language || '')
  const topics = Array.isArray(repo.topics) ? repo.topics : []
  const topicsShouldLoop = topics.length > 3
  const homepage = repo.homepage || undefined
  const compactFallback = repo.description || repo.language || copy.projects.noDescription

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

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.38, delay: index * 0.04 }}
        data-aos="fade-up"
        data-aos-delay={String(Math.min(index * 80, 320))}
        className="group"
      >
        <div
          ref={cardRef}
          onClick={handleClick}
          className={`repo-card-shadow glass-card relative isolate flex min-h-[70px] cursor-pointer items-center gap-3 overflow-hidden rounded-xl border px-3 py-2 text-left transition-[transform,border-color,box-shadow,background-color] duration-[700ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 ${
            active ? 'border-accent/35 bg-accent/10' : ''
          }`}
        >
          <span className="absolute inset-0 grid-pattern opacity-25" />
          <span className="absolute inset-0 bg-card/95" />
          <div className={`absolute inset-0 transition-opacity duration-[700ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:opacity-100 ${active ? 'opacity-100' : 'opacity-0'}`}>
            <div className="absolute -inset-2 rounded-2xl bg-gradient-to-r from-accent/24 via-white/8 to-accent/22 blur-xl" />
          </div>
          <TheSvgIcon
            label={repo.language || repo.name}
            slug={repo.language ? languageIcons[repo.language] || repo.language : null}
            className="relative z-10 size-11 bg-background/80 shadow-[0_10px_28px_-18px_rgba(15,23,42,0.75)] backdrop-blur-xl"
            style={{ borderColor: repo.language ? `${langColor}66` : undefined }}
          />
          <span className="relative z-10 min-w-0 flex-1">
            <span className={`block truncate text-sm font-semibold text-foreground transition-colors group-hover:text-accent ${active ? 'text-accent' : ''}`}>
              {repo.name}
            </span>
            {topics.length > 0 ? (
              <span className="mt-1 flex min-w-0 gap-1.5 overflow-hidden">
                {topics.slice(0, 5).map((topic) => (
                  <Badge
                    key={topic}
                    variant="secondary"
                    className="shrink-0 rounded-md bg-secondary/80 px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors group-hover:bg-accent/15 group-hover:text-foreground"
                  >
                    {topic}
                  </Badge>
                ))}
              </span>
            ) : (
              <span className="mt-1 flex min-w-0 items-center">
                <span className="truncate text-xs text-muted-foreground">{compactFallback}</span>
              </span>
            )}
          </span>
          <span className="relative z-10 ml-auto flex shrink-0 items-center gap-1 text-sm">
            <Star className="size-4 text-accent" />
            <span className="font-medium">{repo.stargazers_count}</span>
          </span>
        </div>
      </motion.div>
    )
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
        ref={cardRef}
        onClick={handleClick}
        className={`repo-card-shadow glass-card relative flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl p-4 transition-[transform,border-color,box-shadow,background-color] duration-[700ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 sm:p-6 ${
          active ? 'border-accent/35 bg-accent/10' : ''
        }`}
      >
        {/* Glow effect on hover */}
        <div className={`absolute inset-0 transition-opacity duration-[700ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:opacity-100 ${active ? 'opacity-100' : 'opacity-0'}`}>
          <div className="absolute -inset-2 rounded-2xl bg-gradient-to-r from-accent/24 via-white/8 to-accent/22 blur-xl" />
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
              className={`repo-topics-marquee -mx-1 mb-4 overflow-hidden px-1 ${topicsShouldLoop ? '[mask-image:linear-gradient(to_right,transparent_0%,black_8%,black_88%,transparent_100%)]' : ''}`}
              data-loop={topicsShouldLoop ? 'true' : undefined}
            >
              <div className="repo-topics-track flex w-max gap-1.5 py-px">
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
                  <TheSvgIcon
                    label={repo.language}
                    slug={languageIcons[repo.language] || repo.language}
                    className="size-8 rounded-lg bg-background/80 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.65)]"
                    style={{ borderColor: `${langColor}66` }}
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
