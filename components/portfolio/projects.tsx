'use client'

import { motion } from 'framer-motion'
import { RepoCard } from './repo-card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getTopRepositories, getRecentRepositories } from '@/lib/github/api'
import { Star, Clock, Sparkles } from 'lucide-react'
import type { GitHubRepo } from '@/lib/github/types'

interface ProjectsProps {
  repositories?: GitHubRepo[]
  isLoading?: boolean
  onRepoClick?: (repoName: string, repoUrl: string) => void
}

export function Projects({ repositories = [], isLoading, onRepoClick }: ProjectsProps) {
  const topRepos = getTopRepositories(repositories, 6)
  const recentRepos = getRecentRepositories(repositories, 6)

  if (isLoading) {
    return <ProjectsSkeleton />
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
    <section id="projects" className="px-6 py-24 relative">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-accent/[0.02] via-transparent to-transparent" />
      
      <div className="max-w-6xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-card text-sm mb-6"
          >
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-muted-foreground">Open Source</span>
          </motion.div>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">Featured Projects</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            A collection of open-source projects showcasing my work in software development
          </p>
        </motion.div>

        <Tabs defaultValue="top" className="w-full">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex justify-center mb-10"
          >
            <TabsList className="glass-card border-none p-1.5">
              <TabsTrigger 
                value="top" 
                className="gap-2 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground px-6"
              >
                <Star className="w-4 h-4" />
                Most Starred
              </TabsTrigger>
              <TabsTrigger 
                value="recent" 
                className="gap-2 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground px-6"
              >
                <Clock className="w-4 h-4" />
                Recently Updated
              </TabsTrigger>
            </TabsList>
          </motion.div>

          <TabsContent value="top" className="mt-0">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {topRepos.map((repo, index) => (
                <RepoCard
                  key={repo.id}
                  repo={repo}
                  index={index}
                  onRepoClick={onRepoClick}
                />
              ))}
            </motion.div>
          </TabsContent>

          <TabsContent value="recent" className="mt-0">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {recentRepos.map((repo, index) => (
                <RepoCard
                  key={repo.id}
                  repo={repo}
                  index={index}
                  onRepoClick={onRepoClick}
                />
              ))}
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  )
}

function ProjectsSkeleton() {
  return (
    <section className="px-6 py-24">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <Skeleton className="h-8 w-32 mx-auto mb-6 rounded-full" />
          <Skeleton className="h-12 w-80 mx-auto mb-4" />
          <Skeleton className="h-6 w-[500px] mx-auto" />
        </div>
        <div className="flex justify-center mb-10">
          <Skeleton className="h-12 w-72 rounded-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      </div>
    </section>
  )
}
