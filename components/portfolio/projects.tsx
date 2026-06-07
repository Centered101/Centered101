'use client'

import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { RepoCard } from './repo-card'
import { Clock, ExternalLink, Github, Sparkles } from 'lucide-react'
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
          onClick={openProject}
          className={`glass-card relative aspect-[4/5] overflow-hidden rounded-2xl p-0 hover-lift ${
            primaryUrl ? 'cursor-pointer' : ''
          }`}
        >
          <img
            src={project.poster_url}
            alt={project.poster_alt || `${project.title} poster`}
            draggable={false}
            onContextMenu={(event) => event.preventDefault()}
            className="h-full w-full select-none object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/52 to-black/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

          <div className="absolute inset-x-0 bottom-0 translate-y-4 p-5 text-white opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 sm:p-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <Badge className="border-white/15 bg-white/15 text-white backdrop-blur" variant="secondary">
                {project.category}
              </Badge>
              <div className="flex items-center gap-2 text-xs text-white/70">
                <Clock className="size-3" />
                <span>{getRelativeTime(project.updated_at)}</span>
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
                  Live
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
        onClick={openProject}
        className={`glass-card relative flex h-full flex-col overflow-hidden rounded-2xl p-6 hover-lift ${
          primaryUrl ? 'cursor-pointer' : ''
        }`}
      >
        <div className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-accent/20 via-white/5 to-accent/20 blur-xl" />
        </div>

        <div className="relative z-10 flex h-full flex-col">
          {project.poster_url ? (
            <div className="relative -mx-6 -mt-6 mb-5 aspect-[4/5] overflow-hidden border-b border-border/50 bg-secondary">
              <img
                src={project.poster_url}
                alt={project.poster_alt || `${project.title} poster`}
                draggable={false}
                onContextMenu={(event) => event.preventDefault()}
                className="h-full w-full select-none object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-card/80 to-transparent" />
            </div>
          ) : null}

          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-lg font-semibold transition-colors group-hover:text-accent">
                {project.title}
              </h3>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="size-3" />
                <span>Updated {getRelativeTime(project.updated_at)}</span>
              </div>
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

            <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
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

export function Projects({ repositories = [], isLoading, onRepoClick }: ProjectsProps) {
  const { copy } = useLanguage()
  const [projects, setProjects] = useState<PortfolioProject[]>([])
  const [isProjectsLoading, setIsProjectsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    fetch('/api/projects')
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
    <section id="projects" className="relative px-6 py-24" data-aos="fade-up">
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
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Portfolio</p>
                <h3 className="mt-2 text-2xl font-bold">Selected work</h3>
              </div>
            </div>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
            >
              {featuredProjects.map((project, index) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  index={index}
                  onRepoClick={onRepoClick}
                />
              ))}
            </motion.div>
          </div>
        ) : null}

        {githubRepos.length > 0 ? (
          <div className={featuredProjects.length > 0 ? 'mt-16' : ''}>
            <div className="mb-8 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">GitHub</p>
                <h3 className="mt-2 text-2xl font-bold">Public repositories</h3>
              </div>
            </div>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
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
    <section className="px-6 py-24">
      <div className="mx-auto w-full max-w-[1400px]">
        <div className="mb-16 text-center">
          <Skeleton className="mx-auto mb-6 h-8 w-32 rounded-full" />
          <Skeleton className="mx-auto mb-4 h-12 w-80" />
          <Skeleton className="mx-auto h-6 w-[500px] max-w-full" />
        </div>
        <div className="mb-10 flex justify-center">
          <Skeleton className="h-12 w-72 rounded-full" />
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[520px] rounded-2xl" />
          ))}
        </div>
      </div>
    </section>
  )
}
