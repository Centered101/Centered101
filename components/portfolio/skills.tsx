'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import type { LanguageStats } from '@/lib/github/types'

interface SkillsProps {
  topLanguages?: LanguageStats[]
  isLoading?: boolean
}

// Additional skills/technologies to display
const additionalTech = [
  { name: 'React', category: 'Frontend' },
  { name: 'Next.js', category: 'Frontend' },
  { name: 'Node.js', category: 'Backend' },
  { name: 'PostgreSQL', category: 'Database' },
  { name: 'MongoDB', category: 'Database' },
  { name: 'Docker', category: 'DevOps' },
  { name: 'Git', category: 'Tools' },
  { name: 'AWS', category: 'Cloud' },
  { name: 'Vercel', category: 'Cloud' },
  { name: 'Tailwind CSS', category: 'Frontend' },
  { name: 'REST APIs', category: 'Backend' },
  { name: 'GraphQL', category: 'Backend' },
]

function AnimatedProgressBar({ percentage, color, delay }: { percentage: number; color: string; delay: number }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })

  return (
    <div ref={ref} className="h-2 bg-secondary rounded-full overflow-hidden">
      <motion.div
        className="h-full rounded-full progress-shine relative"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={isInView ? { width: `${percentage}%` } : { width: 0 }}
        transition={{ duration: 1.2, delay, ease: [0.25, 0.1, 0.25, 1] }}
      />
    </div>
  )
}

export function Skills({ topLanguages = [], isLoading }: SkillsProps) {
  if (isLoading) {
    return <SkillsSkeleton />
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
  }

  return (
    <section id="skills" className="px-6 py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-t from-accent/[0.02] to-transparent" />
      
      <div className="max-w-6xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">Skills & Technologies</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Languages and tools I use to bring ideas to life
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Language proficiency */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="glass-card rounded-2xl p-8"
          >
            <h3 className="text-xl font-semibold mb-8">Language Proficiency</h3>
            <div className="space-y-6">
              {topLanguages.slice(0, 6).map((lang, index) => (
                <div key={lang.name}>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-3">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: lang.color, boxShadow: `0 0 8px ${lang.color}60` }}
                      />
                      <span className="font-medium">{lang.name}</span>
                    </div>
                    <span className="text-muted-foreground text-sm">{lang.percentage}%</span>
                  </div>
                  <AnimatedProgressBar
                    percentage={lang.percentage}
                    color={lang.color}
                    delay={0.2 + index * 0.1}
                  />
                </div>
              ))}
            </div>
          </motion.div>

          {/* Tech stack badges */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="glass-card rounded-2xl p-8"
          >
            <h3 className="text-xl font-semibold mb-8">Tech Stack</h3>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="flex flex-wrap gap-3"
            >
              {additionalTech.map((tech) => (
                <motion.div key={tech.name} variants={itemVariants}>
                  <Badge
                    variant="secondary"
                    className="px-4 py-2 text-sm font-medium bg-secondary/80 hover:bg-accent/20 hover:text-accent transition-colors cursor-default"
                  >
                    {tech.name}
                  </Badge>
                </motion.div>
              ))}
              {topLanguages.slice(0, 4).map((lang) => (
                <motion.div key={`lang-${lang.name}`} variants={itemVariants}>
                  <Badge
                    variant="secondary"
                    className="px-4 py-2 text-sm font-medium hover:scale-105 transition-transform cursor-default"
                    style={{ 
                      backgroundColor: `${lang.color}20`,
                      borderColor: `${lang.color}40`,
                      color: lang.color,
                    }}
                  >
                    {lang.name}
                  </Badge>
                </motion.div>
              ))}
            </motion.div>

            {/* Categories */}
            <div className="mt-8 pt-6 border-t border-border/50">
              <h4 className="text-sm text-muted-foreground mb-4">Categories</h4>
              <div className="grid grid-cols-2 gap-4">
                {['Frontend', 'Backend', 'Database', 'DevOps'].map((category) => (
                  <div key={category} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-accent" />
                    <span className="text-sm">{category}</span>
                    <span className="text-xs text-muted-foreground">
                      ({additionalTech.filter(t => t.category === category).length})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

function SkillsSkeleton() {
  return (
    <section className="px-6 py-24">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <Skeleton className="h-12 w-80 mx-auto mb-4" />
          <Skeleton className="h-6 w-96 mx-auto" />
        </div>
        <div className="grid lg:grid-cols-2 gap-12">
          <div className="rounded-2xl border border-border p-8">
            <Skeleton className="h-6 w-48 mb-8" />
            <div className="space-y-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i}>
                  <div className="flex justify-between mb-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-border p-8">
            <Skeleton className="h-6 w-32 mb-8" />
            <div className="flex flex-wrap gap-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-24 rounded-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
