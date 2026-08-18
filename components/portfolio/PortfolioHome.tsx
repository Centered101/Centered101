'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useGitHub } from '@/hooks/use-github'
import { useAnalytics } from '@/hooks/use-analytics'
import { Navigation } from '@/components/portfolio/navigation'
import { Hero } from '@/components/portfolio/hero'
import { Projects } from '@/components/portfolio/projects'
import { PortfolioBootScreen } from '@/components/portfolio/PortfolioBootScreen'

const Stats = dynamic(() => import('@/components/portfolio/stats').then((module) => module.Stats), {
  loading: () => null,
  ssr: false,
})
const WakaTimeStats = dynamic(() => import('@/components/portfolio/wakatime-stats').then((module) => module.WakaTimeStats), {
  loading: () => null,
  ssr: false,
})
const Skills = dynamic(() => import('@/components/portfolio/skills').then((module) => module.Skills), {
  loading: () => null,
  ssr: false,
})
const Timeline = dynamic(() => import('@/components/portfolio/timeline').then((module) => module.Timeline), {
  loading: () => null,
  ssr: false,
})
const Contact = dynamic(() => import('@/components/portfolio/contact').then((module) => module.Contact), {
  loading: () => null,
  ssr: false,
})
const Footer = dynamic(() => import('@/components/portfolio/footer').then((module) => module.Footer), {
  loading: () => null,
  ssr: false,
})

export function PortfolioHome() {
  const { data, isLoading } = useGitHub()
  const { trackRepoClick, trackContactSubmit, trackResumeDownload } = useAnalytics()
  const [showBootOverlay, setShowBootOverlay] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    const bootTimeoutId = globalThis.setTimeout(() => setShowBootOverlay(false), 520)
    let preloadTimeoutId: ReturnType<typeof window.setTimeout> | undefined
    let idleId: number | undefined

    const preload = () => {
      const options = { signal: controller.signal }

      void Promise.allSettled([
        fetch('/api/projects', options),
        fetch('/api/portfolio/tools', options),
        fetch('/api/portfolio/learning-story?locale=en', options),
        fetch('/api/social-links', options),
        fetch('/api/wakatime?range=last_30_days', options),
      ])
    }

    if ('requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(preload, { timeout: 1600 })
    } else {
      preloadTimeoutId = globalThis.setTimeout(preload, 500)
    }

    return () => {
      globalThis.clearTimeout(bootTimeoutId)
      controller.abort()
      if (idleId !== undefined) {
        window.cancelIdleCallback(idleId)
      }
      if (preloadTimeoutId !== undefined) {
        globalThis.clearTimeout(preloadTimeoutId)
      }
    }
  }, [])

  return (
    <div className="portfolio-classic-theme min-h-screen bg-background text-foreground">
      <AnimatePresence>
        {showBootOverlay ? <PortfolioBootScreen /> : null}
      </AnimatePresence>

      <Navigation user={data?.user} />

      <main>
        <Hero
          user={data?.user}
          totalStars={data?.totalStars}
          topLanguages={data?.topLanguages}
          organizations={data?.organizations}
          isLoading={isLoading}
        />

        <Projects
          repositories={data?.repositories}
          isLoading={isLoading}
          onRepoClick={trackRepoClick}
        />

        <Stats
          user={data?.user}
          repositories={data?.repositories}
          totalStars={data?.totalStars}
          topLanguages={data?.topLanguages}
          isLoading={isLoading}
        />

        <WakaTimeStats />

        <Skills
          topLanguages={data?.topLanguages}
          isLoading={isLoading}
        />

        <Timeline isLoading={isLoading} />

        <Contact
          user={data?.user}
          onSubmit={trackContactSubmit}
        />
      </main>

      <Footer
        user={data?.user}
        onResumeDownload={trackResumeDownload}
      />
    </div>
  )
}
