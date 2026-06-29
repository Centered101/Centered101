'use client'

import { AnimatePresence, motion, useInView } from 'framer-motion'
import { useRef, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { useLanguage } from '@/components/language-provider'
import { TheSvgIcon } from '@/components/the-svg-icon'
import { usePortfolioTools } from '@/hooks/use-portfolio-tools'
import type { LanguageStats } from '@/lib/github/types'
import type { PortfolioTool } from '@/lib/portfolio/types'

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

// Display taxonomy for the "Tools I work with" wall. Groups render in this order.
const TOOL_GROUP_ORDER = [
  'Language', 'Library', 'Editor', 'Design', 'Gaming', 'Software', 'Cloud', 'Database',
  // legacy categories kept last so older data still renders sensibly
  'Frontend', 'Backend', 'DevOps', 'Tools',
]

const NEW_GROUPS = new Set([
  'Language', 'Library', 'Editor', 'Design', 'Gaming', 'Software', 'Cloud', 'Database',
])

// Curated tool → group map so existing tools sort into the new groups with no
// manual re-categorising. Keyed by lower-cased tool name.
const TOOL_NAME_GROUPS: Record<string, string> = {
  html: 'Language', html5: 'Language', css: 'Language', css3: 'Language',
  javascript: 'Language', typescript: 'Language', python: 'Language', 'c++': 'Language', c: 'Language',
  react: 'Library', 'next.js': 'Library', nextjs: 'Library', jquery: 'Library', 'tailwind css': 'Library', tailwindcss: 'Library',
  vscode: 'Editor', 'vs code': 'Editor', obsidian: 'Editor',
  figma: 'Design', adobe: 'Design', blender: 'Design',
  godot: 'Gaming',
  cloudflare: 'Cloud', netlify: 'Cloud', vercel: 'Cloud', 'google cloud': 'Cloud', firebase: 'Cloud',
  postgresql: 'Database', supabase: 'Database',
  git: 'Software', github: 'Software', npm: 'Software', 'node.js': 'Software', nodejs: 'Software',
  postman: 'Software', notion: 'Software', ubuntu: 'Software', windows: 'Software', 'kali linux': 'Software',
}

// An admin-set new-taxonomy category wins; otherwise use the curated map, then
// fall back to whatever category is stored.
function groupForTool(tool: PortfolioTool): string {
  if (NEW_GROUPS.has(tool.category)) return tool.category
  return TOOL_NAME_GROUPS[(tool.name || '').trim().toLowerCase()] ?? tool.category
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
  const [toolsExpanded, setToolsExpanded] = useState(false)

  if (isLoading && toolsLoading) {
    return <SkillsSkeleton />
  }

  const visibleLanguages = isLoading ? [] : topLanguages.slice(0, 15)
  const visibleTools = !toolsLoading && toolsConfigured && !toolsError ? tools : []
  const showLanguageCard = Boolean(isLoading || visibleLanguages.length > 0)
  const showToolsCard = Boolean(toolsLoading || visibleTools.length > 0)

  // Split the tools into labelled groups (Language, Library, Editor, …) and
  // order them. A running index lets the mobile collapse hide the overflow.
  const groupMap = new Map<string, PortfolioTool[]>()
  for (const tool of visibleTools) {
    const group = groupForTool(tool)
    const bucket = groupMap.get(group)
    if (bucket) bucket.push(tool)
    else groupMap.set(group, [tool])
  }
  const toolGroups = Array.from(groupMap.entries())
    .sort(([a], [b]) => {
      const ia = TOOL_GROUP_ORDER.indexOf(a)
      const ib = TOOL_GROUP_ORDER.indexOf(b)
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)
    })
    .map(([name, items]) => ({ name, items }))
  // A long tool list collapses behind a Show more / Show less toggle with a soft
  // fade at the bottom edge, instead of stretching the card to match Languages.
  const toolsCollapsible = visibleTools.length > 12
  const toolsCollapsed = toolsCollapsible && !toolsExpanded

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

        <div className={showLanguageCard && showToolsCard ? 'grid gap-12 lg:grid-cols-2 lg:items-start' : 'mx-auto grid w-full max-w-[1400px] gap-12'}>
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
              <div className="relative">
                <motion.div
                  initial={false}
                  animate={{ height: toolsCollapsed ? 420 : 'auto' }}
                  transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
                  className="overflow-hidden"
                >
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    className="space-y-6"
                  >
                    {toolGroups.map((group) => (
                      <div key={group.name}>
                        <div className="mb-3 flex items-center gap-2">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {group.name}
                          </h4>
                          <span className="text-xs text-muted-foreground/70">({group.items.length})</span>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {group.items.map((tool) => (
                            <motion.div key={tool.name} variants={itemVariants}>
                              <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/60 px-3 py-2 text-sm font-medium transition-colors hover:border-accent/30 hover:bg-accent/10">
                                <TheSvgIcon label={tool.name} slug={tool.icon} className="size-9" />
                                <span>{tool.name}</span>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </motion.div>
                </motion.div>

                {/* Soft fade at the collapsed edge */}
                <AnimatePresence>
                  {toolsCollapsed && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-card via-card/85 to-transparent"
                    />
                  )}
                </AnimatePresence>
              </div>

              {toolsCollapsible && (
                <button
                  type="button"
                  onClick={() => setToolsExpanded((open) => !open)}
                  aria-expanded={toolsExpanded}
                  className="mx-auto mt-5 block text-sm font-medium text-accent transition-colors hover:text-accent/80"
                >
                  {toolsExpanded ? copy.skills.showLess : copy.skills.showMore}
                </button>
              )}
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
