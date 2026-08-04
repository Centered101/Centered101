'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
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
  const [isSupabaseReady, setIsSupabaseReady] = useState(false)
  const [showPortfolio, setShowPortfolio] = useState(false)

  useEffect(() => {
    let isMounted = true

    const preload = async () => {
      const minimumDelay = new Promise((resolve) => window.setTimeout(resolve, 650))

      await Promise.allSettled([
        fetch('/api/projects'),
        fetch('/api/portfolio/tools'),
        fetch('/api/portfolio/learning-story?locale=en'),
        fetch('/api/social-links'),
        fetch('/api/wakatime?range=last_60_days'),
        minimumDelay,
      ])

      if (isMounted) {
        setIsSupabaseReady(true)
      }
    }

    preload()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!isLoading && isSupabaseReady) {
      setShowPortfolio(true)
    }
  }, [isLoading, isSupabaseReady])

  return (
    <>
      <AnimatePresence>
        {!showPortfolio ? <PortfolioBootScreen /> : null}
      </AnimatePresence>

      <div className="portfolio-classic-theme min-h-screen bg-background text-foreground">
        <motion.div
          initial={false}
          animate={{
            opacity: showPortfolio ? 1 : 0,
            y: showPortfolio ? 0 : 24,
          }}
          transition={{ duration: 0.55, ease: [0.25, 0.1, 0.25, 1] }}
          className={showPortfolio ? 'pointer-events-auto' : 'pointer-events-none'}
        >
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
        </motion.div>
      </div>
    </>
  )
}
