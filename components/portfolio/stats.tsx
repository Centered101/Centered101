'use client'

import { motion } from 'framer-motion'
import { Skeleton } from '@/components/ui/skeleton'
import { Star, GitFork, Users, Code2, Calendar, Zap, Trophy, Activity } from 'lucide-react'
import type { GitHubUser, GitHubRepo, LanguageStats } from '@/lib/github/types'

interface StatsProps {
  user?: GitHubUser
  repositories?: GitHubRepo[]
  totalStars?: number
  topLanguages?: LanguageStats[]
  isLoading?: boolean
}

export function Stats({
  user,
  repositories = [],
  totalStars = 0,
  topLanguages = [],
  isLoading,
}: StatsProps) {
  if (isLoading) {
    return <StatsSkeleton />
  }

  const totalForks = repositories.reduce((sum, repo) => sum + repo.forks_count, 0)
  const accountAge = user?.created_at 
    ? new Date().getFullYear() - new Date(user.created_at).getFullYear()
    : 0

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  }

  return (
    <section id="stats" className="px-6 py-24 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent/[0.02] to-transparent" />
      
      <div className="max-w-6xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">GitHub Stats</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            A snapshot of my open-source journey and contributions
          </p>
        </motion.div>

        {/* Bento Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {/* Total Stars - Large Card */}
          <motion.div
            variants={itemVariants}
            className="col-span-2 row-span-2 glass-card rounded-2xl p-8 relative overflow-hidden group hover-lift"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-3xl group-hover:bg-yellow-500/20 transition-colors" />
            <Star className="w-10 h-10 text-yellow-500 mb-4" />
            <p className="text-6xl md:text-7xl font-bold mb-2">{totalStars.toLocaleString()}</p>
            <p className="text-muted-foreground text-lg">Total Stars Earned</p>
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Activity className="w-4 h-4" />
              <span>Across {repositories.filter(r => r.stargazers_count > 0).length} repositories</span>
            </div>
          </motion.div>

          {/* Repositories */}
          <motion.div
            variants={itemVariants}
            className="glass-card rounded-2xl p-6 relative overflow-hidden group hover-lift"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-accent/10 rounded-full blur-2xl group-hover:bg-accent/20 transition-colors" />
            <Code2 className="w-8 h-8 text-accent mb-3" />
            <p className="text-4xl font-bold mb-1">{user?.public_repos || 0}</p>
            <p className="text-sm text-muted-foreground">Repositories</p>
          </motion.div>

          {/* Followers */}
          <motion.div
            variants={itemVariants}
            className="glass-card rounded-2xl p-6 relative overflow-hidden group hover-lift"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/10 rounded-full blur-2xl group-hover:bg-green-500/20 transition-colors" />
            <Users className="w-8 h-8 text-green-500 mb-3" />
            <p className="text-4xl font-bold mb-1">{(user?.followers || 0).toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Followers</p>
          </motion.div>

          {/* Forks */}
          <motion.div
            variants={itemVariants}
            className="glass-card rounded-2xl p-6 relative overflow-hidden group hover-lift"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-colors" />
            <GitFork className="w-8 h-8 text-purple-500 mb-3" />
            <p className="text-4xl font-bold mb-1">{totalForks.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Total Forks</p>
          </motion.div>

          {/* Experience Years */}
          <motion.div
            variants={itemVariants}
            className="glass-card rounded-2xl p-6 relative overflow-hidden group hover-lift"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-colors" />
            <Calendar className="w-8 h-8 text-cyan-500 mb-3" />
            <p className="text-4xl font-bold mb-1">{accountAge}+</p>
            <p className="text-sm text-muted-foreground">Years on GitHub</p>
          </motion.div>

          {/* Languages Card - Wide */}
          <motion.div
            variants={itemVariants}
            className="col-span-2 glass-card rounded-2xl p-6 relative overflow-hidden group hover-lift"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-3xl" />
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-6 h-6 text-accent" />
              <h3 className="text-lg font-semibold">Top Languages</h3>
            </div>
            
            {/* Language bar */}
            <div className="h-3 rounded-full overflow-hidden flex mb-4 bg-secondary">
              {topLanguages.slice(0, 5).map((lang, index) => (
                <motion.div
                  key={lang.name}
                  className="h-full first:rounded-l-full last:rounded-r-full progress-shine"
                  style={{ backgroundColor: lang.color }}
                  initial={{ width: 0 }}
                  whileInView={{ width: `${lang.percentage}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, delay: 0.5 + index * 0.1, ease: 'easeOut' }}
                />
              ))}
            </div>

            {/* Language legend */}
            <div className="flex flex-wrap gap-3">
              {topLanguages.slice(0, 5).map((lang) => (
                <div key={lang.name} className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: lang.color, boxShadow: `0 0 6px ${lang.color}60` }}
                  />
                  <span className="text-sm text-muted-foreground">
                    {lang.name} <span className="text-foreground font-medium">{lang.percentage}%</span>
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Following */}
          <motion.div
            variants={itemVariants}
            className="glass-card rounded-2xl p-6 relative overflow-hidden group hover-lift"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 rounded-full blur-2xl group-hover:bg-orange-500/20 transition-colors" />
            <Trophy className="w-8 h-8 text-orange-500 mb-3" />
            <p className="text-4xl font-bold mb-1">{(user?.following || 0).toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Following</p>
          </motion.div>

          {/* Top Repo Stars */}
          <motion.div
            variants={itemVariants}
            className="glass-card rounded-2xl p-6 relative overflow-hidden group hover-lift"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-pink-500/10 rounded-full blur-2xl group-hover:bg-pink-500/20 transition-colors" />
            <Star className="w-8 h-8 text-pink-500 mb-3" />
            <p className="text-4xl font-bold mb-1">
              {repositories.length > 0 ? Math.max(...repositories.map(r => r.stargazers_count)) : 0}
            </p>
            <p className="text-sm text-muted-foreground">Top Repo Stars</p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

function StatsSkeleton() {
  return (
    <section className="px-6 py-24">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <Skeleton className="h-12 w-64 mx-auto mb-4" />
          <Skeleton className="h-6 w-96 mx-auto" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="col-span-2 row-span-2">
            <Skeleton className="h-full min-h-[280px] rounded-2xl" />
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
          <div className="col-span-2">
            <Skeleton className="h-32 rounded-2xl" />
          </div>
        </div>
      </div>
    </section>
  )
}
