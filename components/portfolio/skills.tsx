'use client'

import { motion, useInView } from 'framer-motion'
import { useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { useLanguage } from '@/components/language-provider'
import { TheSvgIcon } from '@/components/the-svg-icon'
import { usePortfolioTools } from '@/hooks/use-portfolio-tools'
import type { LanguageStats } from '@/lib/github/types'
import type { PortfolioTool } from '@/lib/portfolio/types'
import { comparePortfolioToolGroups, getPortfolioToolGroup } from '@/lib/portfolio/tool-groups'

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
  const [toolsPaused, setToolsPaused] = useState(false)
  const toolsViewportRef = useRef<HTMLDivElement>(null)
  const resumeToolsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const adjustingToolsScrollRef = useRef(false)

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
    const group = getPortfolioToolGroup(tool)
    const bucket = groupMap.get(group)
    if (bucket) bucket.push(tool)
    else groupMap.set(group, [tool])
  }
  const toolGroups = Array.from(groupMap.entries())
    .sort(([a], [b]) => comparePortfolioToolGroups(a, b))
    .map(([name, items]) => ({ name, items }))
  const toolsMarqueeDuration = Math.max(16, visibleTools.length * 1.25)

  if (!showLanguageCard && !showToolsCard) {
    return null
  }

  const pauseToolsLoop = () => {
    if (resumeToolsTimerRef.current) {
      clearTimeout(resumeToolsTimerRef.current)
    }
    setToolsPaused(true)
  }

  const centerToolsScrollWindow = () => {
    const viewport = toolsViewportRef.current
    if (!viewport || viewport.scrollTop > 0) return

    const loopPoint = viewport.scrollHeight / 2
    if (loopPoint > viewport.clientHeight) {
      viewport.scrollTop = Math.max(1, loopPoint * 0.08)
    }
  }

  const queueToolsLoopResume = () => {
    pauseToolsLoop()

    resumeToolsTimerRef.current = setTimeout(() => {
      setToolsPaused(false)
    }, 1400)
  }

  const wrapToolsScroll = () => {
    const viewport = toolsViewportRef.current
    if (!viewport || adjustingToolsScrollRef.current) return

    const loopPoint = viewport.scrollHeight / 2
    if (loopPoint <= viewport.clientHeight) return

    const bottomLimit = loopPoint - viewport.clientHeight * 0.18
    const topLimit = viewport.clientHeight * 0.08
    let nextScrollTop = viewport.scrollTop

    if (viewport.scrollTop >= bottomLimit) {
      nextScrollTop = viewport.scrollTop - loopPoint
    } else if (viewport.scrollTop <= topLimit && viewport.scrollTop > 0) {
      nextScrollTop = viewport.scrollTop + loopPoint
    }

    if (nextScrollTop !== viewport.scrollTop) {
      adjustingToolsScrollRef.current = true
      viewport.scrollTop = nextScrollTop
      requestAnimationFrame(() => {
        adjustingToolsScrollRef.current = false
      })
    }
  }

  const renderToolGroups = (instance: string) => (
    <>
      {toolGroups.map((group) => (
        <div key={`${instance}-${group.name}`}>
          <div className="mb-3 flex items-center gap-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {(copy.skills.groups as Record<string, string>)[group.name] ?? group.name}
            </h4>
            <span className="text-xs text-muted-foreground/70">({group.items.length})</span>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {group.items.map((tool, toolIndex) => (
              <div
                key={`${instance}-${group.name}-${tool.name}`}
                title={tool.name}
              >
                <div data-touch-hover className="touch-hover-bg grid size-10 place-items-center rounded-xl border border-border bg-secondary/35 transition-colors hover:border-accent/35 hover:bg-accent/10 md:hidden">
                  <TheSvgIcon label={tool.name} slug={tool.icon} className="size-7 border-0 bg-transparent" />
                </div>
                <div data-touch-hover className="touch-hover-bg hidden items-center gap-3 rounded-xl border border-border bg-secondary/60 px-3 py-2 text-sm font-medium transition-colors hover:border-accent/30 hover:bg-accent/10 md:flex">
                  <TheSvgIcon label={tool.name} slug={tool.icon} className="size-9" />
                  <span>{tool.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  )

  return (
    <section id="skills" className="px-4 py-16 sm:px-6 sm:py-24 relative" data-aos="fade-up">
      <div className="absolute inset-0 bg-gradient-to-t from-accent/[0.02] to-transparent" />
      
      <div className="relative mx-auto w-full max-w-[1400px]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10 sm:mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">{copy.skills.title}</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {copy.skills.description}
          </p>
        </motion.div>

        <div className={showLanguageCard && showToolsCard ? 'grid items-stretch gap-6 sm:gap-12 lg:grid-cols-2' : 'mx-auto grid w-full max-w-[1400px] items-stretch gap-6 sm:gap-12'}>
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
              className="glass-card h-full rounded-2xl p-5 sm:p-8"
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
              className="glass-card h-full rounded-2xl p-5 sm:p-8"
            >
              <h3 className="text-xl font-semibold mb-8">{copy.skills.stack}</h3>
              <div
                ref={toolsViewportRef}
                className={`tools-marquee-viewport relative h-[420px] [mask-image:linear-gradient(to_bottom,transparent,black_10%,black_90%,transparent)] ${toolsPaused ? 'is-paused' : ''}`}
                onPointerDownCapture={(event) => {
                  centerToolsScrollWindow()
                  if (event.pointerType !== 'mouse') {
                    queueToolsLoopResume()
                  }
                }}
                onScroll={() => {
                  wrapToolsScroll()
                  queueToolsLoopResume()
                }}
                onFocus={pauseToolsLoop}
                onBlur={queueToolsLoopResume}
              >
                <div
                  className="tools-marquee-y flex flex-col gap-6"
                  style={{ '--tools-marquee-duration': `${toolsMarqueeDuration}s` } as CSSProperties}
                >
                  <div className="space-y-6">
                    {renderToolGroups('main')}
                  </div>
                  <div className="space-y-6" aria-hidden="true">
                    {renderToolGroups('loop')}
                  </div>
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
    <div className="rounded-2xl border border-border p-5 sm:p-8">
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
    <div className="rounded-2xl border border-border p-5 sm:p-8">
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
    <section className="px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto w-full max-w-[1400px]">
        <div className="text-center mb-10 sm:mb-16">
          <Skeleton className="h-12 w-80 mx-auto mb-4" />
          <Skeleton className="h-6 w-96 mx-auto" />
        </div>
        <div className="grid gap-6 sm:gap-12 lg:grid-cols-2">
          <LanguageCardSkeleton />
          <ToolsCardSkeleton />
        </div>
      </div>
    </section>
  )
}
