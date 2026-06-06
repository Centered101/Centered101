'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { useLanguage } from '@/components/language-provider'
import { TheSvgIcon } from '@/components/the-svg-icon'
import { usePortfolioTools } from '@/hooks/use-portfolio-tools'
import type { LanguageStats } from '@/lib/github/types'

interface SkillsProps {
  topLanguages?: LanguageStats[]
  isLoading?: boolean
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
  const { copy } = useLanguage()
  const {
    configured: toolsConfigured,
    tools,
    isLoading: toolsLoading,
    error: toolsError,
  } = usePortfolioTools()

  if (isLoading && toolsLoading) {
    return <SkillsSkeleton />
  }

  const visibleLanguages = isLoading ? [] : topLanguages.slice(0, 9)
  const visibleTools = !toolsLoading && toolsConfigured && !toolsError ? tools : []
  const showLanguageCard = Boolean(isLoading || visibleLanguages.length > 0)
  const showToolsCard = Boolean(toolsLoading || visibleTools.length > 0)

  if (!showLanguageCard && !showToolsCard) {
    return null
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
    <section id="skills" className="px-6 py-24 relative" data-aos="fade-up">
      <div className="absolute inset-0 bg-gradient-to-t from-accent/[0.02] to-transparent" />
      
      <div className="relative mx-auto w-full max-w-[1400px]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">{copy.skills.title}</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {copy.skills.description}
          </p>
        </motion.div>

        <div className={showLanguageCard && showToolsCard ? 'grid lg:grid-cols-2 gap-12' : 'mx-auto grid w-full max-w-[1400px] gap-12'}>
          {/* Language proficiency */}
          {isLoading ? (
            <LanguageCardSkeleton />
          ) : visibleLanguages.length > 0 ? (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              data-aos="fade-right"
              className="glass-card rounded-2xl p-8"
            >
              <h3 className="text-xl font-semibold mb-8">{copy.skills.language}</h3>
              <div className="space-y-6">
                {visibleLanguages.map((lang, index) => (
                  <div key={lang.name}>
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-3">
                        <TheSvgIcon
                          label={lang.name}
                          slug={languageIcons[lang.name]}
                          className="size-9"
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
          ) : null}

          {/* Tech stack badges */}
          {toolsLoading ? (
            <ToolsCardSkeleton />
          ) : visibleTools.length > 0 ? (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              data-aos="fade-left"
              data-aos-delay="120"
              className="glass-card rounded-2xl p-8"
            >
              <h3 className="text-xl font-semibold mb-8">{copy.skills.stack}</h3>
              <motion.div
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="flex flex-wrap gap-3"
              >
                {visibleTools.map((tech) => (
                  <motion.div key={tech.name} variants={itemVariants}>
                    <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/60 px-3 py-2 text-sm font-medium transition-colors hover:border-accent/30 hover:bg-accent/10">
                      <TheSvgIcon label={tech.name} slug={tech.icon} className="size-9" />
                      <span>{tech.name}</span>
                    </div>
                  </motion.div>
                ))}
                {topLanguages.slice(0, 4).map((lang) => (
                  <motion.div key={`lang-${lang.name}`} variants={itemVariants}>
                    <div
                      className="flex items-center gap-3 rounded-xl border px-3 py-2 text-sm font-medium transition-transform hover:scale-105"
                      style={{
                        backgroundColor: `${lang.color}20`,
                        borderColor: `${lang.color}40`,
                        color: lang.color,
                      }}
                    >
                      <TheSvgIcon label={lang.name} slug={languageIcons[lang.name]} className="size-9" />
                      <span>{lang.name}</span>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              {/* Categories */}
              <div className="mt-8 pt-6 border-t border-border/50">
                <h4 className="text-sm text-muted-foreground mb-4">{copy.skills.categories}</h4>
                <div className="grid grid-cols-2 gap-4">
                  {['Frontend', 'Backend', 'Database', 'DevOps'].map((category) => (
                    <div key={category} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-accent" />
                      <span className="text-sm">{category}</span>
                      <span className="text-xs text-muted-foreground">
                        ({visibleTools.filter(t => t.category === category).length})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : null}
        </div>
      </div>
    </section>
  )
}

function LanguageCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border p-8">
      <Skeleton className="h-6 w-48 mb-8" />
      <div className="space-y-6">
        {Array.from({ length: 9 }).map((_, i) => (
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
  )
}

function ToolsCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border p-8">
      <Skeleton className="h-6 w-32 mb-8" />
      <div className="flex flex-wrap gap-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-24 rounded-full" />
        ))}
      </div>
    </div>
  )
}

function SkillsSkeleton() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto w-full max-w-[1400px]">
        <div className="text-center mb-16">
          <Skeleton className="h-12 w-80 mx-auto mb-4" />
          <Skeleton className="h-6 w-96 mx-auto" />
        </div>
        <div className="grid lg:grid-cols-2 gap-12">
          <LanguageCardSkeleton />
          <ToolsCardSkeleton />
        </div>
      </div>
    </section>
  )
}
