'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { RepoCard } from './repo-card'
import { ExternalLink, Github, Sparkles } from 'lucide-react'
import { getLanguageColor, getRelativeTime, getTopRepositories } from '@/lib/github/api'
import { useLanguage } from '@/components/language-provider'
import type { GitHubRepo } from '@/lib/github/types'

type PortfolioProject = {
  id: string
  slug: string
  title: string
  short_description: string | null
  description: string | null
  category: string
  status: string
  poster_url: string | null
  poster_alt: string | null
  logo_url: string | null
  live_url: string | null
  github_url: string | null
  docs_url: string | null
  source_type: string
  source_repo: string | null
  tech_stack: string[]
  tags: string[]
  featured: boolean
  enabled: boolean
  sort_order: number
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

interface ProjectsProps {
  repositories?: GitHubRepo[]
  isLoading?: boolean
  onRepoClick?: (repoName: string, repoUrl: string) => void
}

function ProjectCard({
  project,
  index,
  onRepoClick,
}: {
  project: PortfolioProject
  index: number
  onRepoClick?: (repoName: string, repoUrl: string) => void
}) {
  const { copy } = useLanguage()
  const [active, setActive] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const primaryUrl = project.live_url || project.github_url || project.docs_url
  const description = project.short_description || project.description
  const mainTech = project.tech_stack[0]
  const mainTechColor = getLanguageColor(mainTech || '')

  const openProject = () => {
    if (!primaryUrl) {
      return
    }

    onRepoClick?.(project.title, primaryUrl)
    window.open(primaryUrl, '_blank', 'noopener,noreferrer')
  }

  // On touch devices (no hover) the first tap only reveals the card overlay
  // so the buttons become tappable; a second tap opens the project.
  const handleCardClick = () => {
    if (!active && typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches) {
      setActive(true)
      return
    }
    openProject()
  }

  // Collapse the overlay back to its idle state when tapping outside the card.
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

  if (project.poster_url) {
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
          onClick={handleCardClick}
        className={`glass-card relative isolate aspect-[4/5] overflow-hidden rounded-2xl p-0 hover-lift ${
            primaryUrl ? 'cursor-pointer' : ''
          }`}
        >
          <Image
            src={project.poster_url}
            alt={project.poster_alt || `${project.title} poster`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            draggable={false}
            onContextMenu={(event) => event.preventDefault()}
            className={`select-none object-cover transition-transform duration-700 group-hover:scale-105 ${active ? 'scale-105' : ''}`}
          />

          <div className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/52 to-black/10 transition-opacity duration-300 group-hover:opacity-100 ${active ? 'opacity-100' : 'opacity-0'}`} />

          <div className={`absolute inset-x-0 bottom-0 p-4 text-white transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 sm:p-6 ${active ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
            <div className="mb-3 flex items-center gap-3">
              {project.logo_url ? (
                <span className="relative isolate grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/30 bg-white/25 text-sm font-black text-white shadow-[0_12px_34px_-18px_rgba(0,0,0,0.85)] backdrop-blur-xl">
                  <span className="absolute inset-0 bg-white/15" />
                  <Image
                    src={project.logo_url}
                    alt=""
                    fill
                    sizes="48px"
                    draggable={false}
                    onContextMenu={(event) => event.preventDefault()}
                    className="relative z-10 object-cover"
                  />
                </span>
              ) : null}
              <div className="min-w-0">
                <Badge className="rounded-md border border-white/35 bg-white/25 px-2.5 py-1 text-white shadow-[0_10px_24px_-18px_rgba(0,0,0,0.85)] backdrop-blur-xl" variant="secondary">
                  {project.category}
                </Badge>
              </div>
            </div>

            <h3 className="text-xl font-semibold leading-tight">{project.title}</h3>

            {description ? (
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/72">
                {description}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-1.5">
              {project.tech_stack.slice(0, 3).map((tech) => (
                <span
                  key={tech}
                  className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-medium text-white/80 backdrop-blur"
                >
                  {tech}
                </span>
              ))}
            </div>

            <div className="mt-5 flex items-center gap-2">
              {project.github_url ? (
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-9 rounded-lg bg-white text-black hover:bg-white/90"
                  onClick={(event) => {
                    event.stopPropagation()
                    onRepoClick?.(project.title, project.github_url || '')
                    window.open(project.github_url || '', '_blank', 'noopener,noreferrer')
                  }}
                >
                  <Github className="size-4" />
                  GitHub
                </Button>
              ) : null}
              {project.live_url ? (
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-9 rounded-lg bg-white/15 text-white hover:bg-white/25"
                  onClick={(event) => {
                    event.stopPropagation()
                    onRepoClick?.(project.title, project.live_url || '')
                    window.open(project.live_url || '', '_blank', 'noopener,noreferrer')
                  }}
                >
                  <ExternalLink className="size-4" />
                  {copy.projects.live}
                </Button>
              ) : null}
            </div>
          </div>
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
        onClick={handleCardClick}
        className={`glass-card relative flex h-full flex-col overflow-hidden rounded-2xl p-4 hover-lift sm:p-6 ${
          primaryUrl ? 'cursor-pointer' : ''
        }`}
      >
        <div className={`absolute inset-0 transition-opacity duration-500 group-hover:opacity-100 ${active ? 'opacity-100' : 'opacity-0'}`}>
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-accent/20 via-white/5 to-accent/20 blur-xl" />
        </div>

        <div className="relative z-10 flex h-full flex-col">
          {project.poster_url ? (
            <div className="relative -mx-6 -mt-6 mb-5 aspect-[4/5] overflow-hidden border-b border-border/50 bg-secondary">
              <Image
                src={project.poster_url}
                alt={project.poster_alt || `${project.title} poster`}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                draggable={false}
                onContextMenu={(event) => event.preventDefault()}
                className={`select-none object-cover transition-transform duration-500 group-hover:scale-105 ${active ? 'scale-105' : ''}`}
              />
              <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-card/80 to-transparent" />
            </div>
          ) : null}

          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h3 className={`truncate text-lg font-semibold transition-colors group-hover:text-accent ${active ? 'text-accent' : ''}`}>
                {project.title}
              </h3>
            </div>
            <Badge variant="secondary" className="shrink-0 capitalize">
              {project.category}
            </Badge>
          </div>

          {description ? (
            <p className="mb-4 line-clamp-2 flex-grow text-sm text-muted-foreground">
              {description}
            </p>
          ) : (
            <div className="flex-grow" />
          )}

          {project.tags.length > 0 ? (
            <div className="mb-4 flex flex-wrap gap-1.5">
              {project.tags.slice(0, 3).map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="bg-secondary/80 px-2 py-0.5 text-xs transition-colors hover:bg-accent/20"
                >
                  {tag}
                </Badge>
              ))}
              {project.tags.length > 3 ? (
                <Badge variant="secondary" className="bg-secondary/80 px-2 py-0.5 text-xs">
                  +{project.tags.length - 3}
                </Badge>
              ) : null}
            </div>
          ) : null}

          <div className="flex items-center justify-between border-t border-border/50 pt-4">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              {mainTech ? (
                <div className="flex items-center gap-1.5">
                  <span
                    className="size-3 rounded-full"
                    style={{ backgroundColor: mainTechColor, boxShadow: `0 0 8px ${mainTechColor}60` }}
                  />
                  <span className="text-sm text-muted-foreground">{mainTech}</span>
                </div>
              ) : null}
              {project.tech_stack.slice(1, 3).map((tech) => (
                <span key={tech} className="text-sm text-muted-foreground">
                  {tech}
                </span>
              ))}
            </div>

            <div className={`flex items-center gap-2 transition-opacity group-hover:opacity-100 ${active ? 'opacity-100' : 'opacity-0'}`}>
              {project.github_url ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="size-8 p-0"
                  onClick={(event) => {
                    event.stopPropagation()
                    onRepoClick?.(project.title, project.github_url || '')
                    window.open(project.github_url || '', '_blank', 'noopener,noreferrer')
                  }}
                >
                  <Github className="size-4" />
                  <span className="sr-only">View GitHub</span>
                </Button>
              ) : null}
              {project.live_url ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="size-8 p-0"
                  onClick={(event) => {
                    event.stopPropagation()
                    onRepoClick?.(project.title, project.live_url || '')
                    window.open(project.live_url || '', '_blank', 'noopener,noreferrer')
                  }}
                >
                  <ExternalLink className="size-4" />
                  <span className="sr-only">View live project</span>
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function ProjectLogoLink({
  project,
  index,
  onRepoClick,
}: {
  project: PortfolioProject
  index: number
  onRepoClick?: (repoName: string, repoUrl: string) => void
}) {
  const primaryUrl = project.live_url || project.github_url || project.docs_url
  const githubUrl = project.github_url
  const [active, setActive] = useState(false)
  const cardRef = useRef<HTMLButtonElement>(null)

  const openProject = () => {
    if (!primaryUrl) {
      return
    }

    onRepoClick?.(project.title, primaryUrl)
    window.open(primaryUrl, '_blank', 'noopener,noreferrer')
  }

  const handleProjectClick = () => {
    if (!active && githubUrl && typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches) {
      setActive(true)
      return
    }
    openProject()
  }

  const openGithub = (event: React.MouseEvent<HTMLSpanElement> | React.KeyboardEvent<HTMLSpanElement>) => {
    event.stopPropagation()
    if (!githubUrl) return
    onRepoClick?.(project.title, githubUrl)
    window.open(githubUrl, '_blank', 'noopener,noreferrer')
  }

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
    <motion.button
      ref={cardRef}
      type="button"
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.38, delay: index * 0.04 }}
      onClick={handleProjectClick}
      disabled={!primaryUrl}
      title={project.title}
      aria-label={`Open ${project.title}`}
      className={`group relative isolate flex min-w-0 items-center gap-3 overflow-hidden rounded-xl border p-2.5 text-left transition-all hover:border-accent/35 hover:bg-accent/10 disabled:pointer-events-none disabled:opacity-50 ${active ? 'border-accent/35 bg-accent/10' : 'border-border bg-secondary/35'}`}
      data-gsap-item
    >
      {project.poster_url ? (
        <>
          <img
            src={project.poster_url}
            alt=""
            aria-hidden="true"
            draggable={false}
            onContextMenu={(event) => event.preventDefault()}
            className={`absolute inset-0 h-full w-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-110 ${active ? 'scale-110' : 'scale-105'}`}
          />
          <span className={`absolute inset-0 transition-colors group-hover:bg-background/52 ${active ? 'bg-background/52' : 'bg-background/62'}`} />
        </>
      ) : null}
      <span className="relative isolate grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/45 bg-white/35 text-sm font-black text-accent shadow-[0_10px_28px_-18px_rgba(15,23,42,0.75)] backdrop-blur-xl">
        <span className="absolute inset-0 bg-white/25" />
        {project.logo_url ? (
          <img
            src={project.logo_url}
            alt=""
            draggable={false}
            onContextMenu={(event) => event.preventDefault()}
            className="relative z-10 h-full w-full object-cover"
          />
        ) : null}
      </span>
      <span className="relative min-w-0 flex-[9]">
        <span className="block truncate text-sm font-semibold text-foreground">{project.title}</span>
        <span
          className={`mt-1 inline-flex max-w-full truncate rounded-md px-2 py-0.5 text-xs font-medium ${
            project.poster_url
              ? 'border border-white/35 bg-white/25 text-foreground shadow-[0_10px_24px_-18px_rgba(15,23,42,0.75)] backdrop-blur-xl'
              : 'text-muted-foreground'
          }`}
        >
          {project.category}
        </span>
      </span>
      <span className="relative ml-auto flex flex-[1] shrink-0 items-center justify-end">
        {githubUrl ? (
          <span
            role="button"
            tabIndex={0}
            onClick={openGithub}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') openGithub(event)
            }}
            className={`grid size-9 place-items-center rounded-lg border border-border bg-background/90 text-muted-foreground transition-all duration-200 hover:border-accent/40 hover:bg-accent/10 hover:text-accent group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 ${active ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'}`}
            aria-label={`Open ${project.title} GitHub`}
          >
            <Github className="size-4" />
          </span>
        ) : (
          <ExternalLink className={`size-4 transition-colors group-hover:text-accent ${active ? 'text-accent' : 'text-muted-foreground'}`} />
        )}
      </span>
    </motion.button>
  )
}

export function Projects({ repositories = [], isLoading, onRepoClick }: ProjectsProps) {
  const { copy } = useLanguage()
  const [projects, setProjects] = useState<PortfolioProject[]>([])
  const [isProjectsLoading, setIsProjectsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    fetch('/api/projects', { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) {
          return { projects: [] }
        }

        return response.json()
      })
      .then((data) => {
        if (isMounted) {
          setProjects((data.projects || []) as PortfolioProject[])
        }
      })
      .catch(() => {
        if (isMounted) {
          setProjects([])
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsProjectsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  const featuredProjects = projects.slice(0, 6)
  const selectedProjectCards = featuredProjects.slice(0, 3)
  const compactProjects = featuredProjects.slice(3).filter((project) => project.logo_url)
  const githubRepos = useMemo(() => getTopRepositories(repositories, 6), [repositories])

  if (isLoading || isProjectsLoading) {
    return <ProjectsSkeleton />
  }

  if (featuredProjects.length === 0 && githubRepos.length === 0) {
    return null
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  return (
    <section id="projects" className="relative px-4 py-16 sm:px-6 sm:py-24" data-aos="fade-up">
      <div className="absolute inset-0 bg-gradient-to-b from-accent/[0.02] via-transparent to-transparent" />

      <div className="relative mx-auto w-full max-w-[1400px]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-16 text-center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glass-card mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm"
          >
            <Sparkles className="size-4 text-accent" />
            <span className="text-muted-foreground">{copy.projects.eyebrow}</span>
          </motion.div>
          <h2 className="mb-4 text-3xl font-bold md:text-5xl">
            <span className="gradient-text">{copy.projects.title}</span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            {copy.projects.description}
          </p>
        </motion.div>

        {featuredProjects.length > 0 ? (
          <div>
            <div className="mb-8 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">{copy.projects.portfolioLabel}</p>
                <h3 className="mt-2 text-2xl font-bold">{copy.projects.selectedWork}</h3>
              </div>
            </div>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3"
            >
              {selectedProjectCards.map((project, index) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  index={index}
                  onRepoClick={onRepoClick}
                />
              ))}
            </motion.div>
            {compactProjects.length > 0 ? (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:mt-6 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
                {compactProjects.map((project, index) => (
                  <ProjectLogoLink
                    key={project.id}
                    project={project}
                    index={index}
                    onRepoClick={onRepoClick}
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {githubRepos.length > 0 ? (
          <div className={featuredProjects.length > 0 ? 'mt-16' : ''}>
            <div className="mb-8 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">{copy.projects.githubLabel}</p>
                <h3 className="mt-2 text-2xl font-bold">{copy.projects.publicRepositories}</h3>
              </div>
            </div>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3"
            >
              {githubRepos.map((repo, index) => (
                <RepoCard
                  key={repo.id}
                  repo={repo}
                  index={index}
                  onRepoClick={onRepoClick}
                />
              ))}
            </motion.div>
          </div>
        ) : null}
      </div>
    </section>
  )
}

function ProjectsSkeleton() {
  return (
    <section id="projects" className="relative px-4 py-16 sm:px-6 sm:py-24">
      <div className="absolute inset-0 bg-gradient-to-b from-accent/[0.02] via-transparent to-transparent" />
      <div className="relative mx-auto w-full max-w-[1400px]">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <Skeleton className="mb-3 h-4 w-24 rounded-sm" />
            <Skeleton className="h-8 w-44 rounded-md" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/5] rounded-lg" />
          ))}
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-card/80 p-3">
              <Skeleton className="size-11 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
