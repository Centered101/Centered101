'use client'

import { motion } from 'framer-motion'
import { BarChart3, Clock, Code2, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useWakaTime } from '@/hooks/use-wakatime'
import { useLanguage } from '@/components/language-provider'

function formatRange(range: string) {
  return range.replace(/_/g, ' ')
}

export function WakaTimeStats() {
  const { copy } = useLanguage()
  const { data, isLoading, error } = useWakaTime('last_7_days')

  if (isLoading) {
    return <WakaTimeSkeleton />
  }

  const languages = data?.languages || []
  const projects = data?.projects || []
  const configured = data?.configured
  const hasSummary = Boolean(data?.humanReadableTotal)
  const hasDailyAverage = Boolean(data?.humanReadableDailyAverage)
  const hasBestDay = Boolean(data?.bestDayText)
  const hasLanguages = languages.length > 0
  const hasProjects = projects.length > 0

  if (!configured || error || (!hasSummary && !hasLanguages && !hasProjects)) {
    return null
  }

  return (
    <section id="wakatime" className="relative overflow-hidden px-6 py-24" data-aos="fade-up">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent/[0.025] to-transparent" />

      <div className="relative mx-auto w-full max-w-[1400px]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-16 text-center"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full glass-card px-4 py-1.5 text-sm">
            <Sparkles className="size-4 text-accent" />
            <span className="text-muted-foreground">{copy.wakatime.eyebrow}</span>
          </div>
          <h2 className="mb-4 text-3xl font-bold md:text-5xl">
            <span className="gradient-text">{copy.wakatime.title}</span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            {copy.wakatime.description}
          </p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-5">
          {hasSummary ? (
            <div className="glass-card rounded-2xl p-6 lg:col-span-2" data-aos="fade-right">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{formatRange(data.range)}</p>
                  <h3 className="text-xl font-semibold">{copy.wakatime.summary}</h3>
                </div>
                <Clock className="size-6 text-accent" />
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-background/45 p-4">
                  <p className="text-sm text-muted-foreground">{copy.wakatime.totalCoded}</p>
                  <p className="text-4xl font-bold">{data.humanReadableTotal}</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {hasDailyAverage ? (
                    <div className="rounded-xl border border-border bg-background/45 p-4">
                      <p className="text-sm text-muted-foreground">{copy.wakatime.dailyAvg}</p>
                      <p className="text-2xl font-bold">{data.humanReadableDailyAverage}</p>
                    </div>
                  ) : null}
                  {hasBestDay ? (
                    <div className="rounded-xl border border-border bg-background/45 p-4">
                      <p className="text-sm text-muted-foreground">{copy.wakatime.bestDay}</p>
                      <p className="text-2xl font-bold">{data.bestDayText}</p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

            {hasLanguages ? (
              <div className="glass-card rounded-2xl p-6 lg:col-span-3" data-aos="fade-left" data-aos-delay="120">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{copy.wakatime.topStack}</p>
                    <h3 className="text-xl font-semibold">{copy.wakatime.languages}</h3>
                  </div>
                  <Code2 className="size-6 text-accent" />
                </div>

                <div className="space-y-4">
                  {languages.map((language) => (
                    <div key={language.name}>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className="size-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: language.color || '#409EFE' }}
                          />
                          <span className="truncate font-medium">{language.name}</span>
                        </div>
                        <span className="shrink-0 text-sm text-muted-foreground">{language.text}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full bg-accent"
                          style={{
                            width: `${Math.max(language.percent, 4)}%`,
                            backgroundColor: language.color || '#409EFE',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {hasProjects ? (
              <div className="glass-card rounded-2xl p-6 lg:col-span-5" data-aos="fade-up" data-aos-delay="160">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{copy.wakatime.recentFocus}</p>
                    <h3 className="text-xl font-semibold">{copy.wakatime.projects}</h3>
                  </div>
                  <BarChart3 className="size-6 text-accent" />
                </div>

                <div className="flex flex-wrap gap-2">
                  {projects.map((project) => (
                    <Badge
                      key={project.name}
                      variant="secondary"
                      className="gap-2 bg-secondary/80 px-3 py-1.5 text-sm"
                    >
                      {project.name}
                      <span className="text-muted-foreground">{project.text}</span>
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
        </div>
      </div>
    </section>
  )
}

function WakaTimeSkeleton() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto w-full max-w-[1400px]">
        <div className="mb-16 text-center">
          <Skeleton className="mx-auto mb-6 h-8 w-40 rounded-full" />
          <Skeleton className="mx-auto mb-4 h-12 w-72" />
          <Skeleton className="mx-auto h-6 w-96" />
        </div>
        <div className="grid gap-6 lg:grid-cols-5">
          <Skeleton className="h-80 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-80 rounded-2xl lg:col-span-3" />
        </div>
      </div>
    </section>
  )
}
