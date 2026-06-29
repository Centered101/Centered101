'use client'

import dynamic from 'next/dynamic'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useGitHub } from '@/hooks/use-github'
import { useAnalytics } from '@/hooks/use-analytics'
import { Navigation } from '@/components/portfolio/navigation'
import { Hero } from '@/components/portfolio/hero'
import { Projects } from '@/components/portfolio/projects'

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

export default function Home() {
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
        fetch('/api/wakatime?range=last_7_days'),
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
      const timeout = window.setTimeout(() => setShowPortfolio(true), 120)
      return () => window.clearTimeout(timeout)
    }
  }, [isLoading, isSupabaseReady])

  return (
    <div className="portfolio-classic-theme min-h-screen bg-background text-foreground">
      <AnimatePresence>
        {!showPortfolio ? <PortfolioBootScreen /> : null}
      </AnimatePresence>

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
  )
}

function PortfolioBootScreen() {
  return (
    <motion.div
      initial={{ y: 0, opacity: 1 }}
      exit={{ y: '-100%', opacity: 1 }}
      transition={{ duration: 0.75, ease: [0.76, 0, 0.24, 1] }}
      className="fixed inset-0 z-[999] grid place-items-center overflow-hidden bg-background"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 grid-pattern opacity-60" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(64,158,254,0.18),transparent_36rem)]" />
      <div
        aria-hidden
        className="absolute left-1/2 top-[38%] size-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl"
      />

      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } } }}
        className="relative flex flex-col items-center text-center"
      >
        {/* Logo with rotating conic ring */}
        <motion.div
          variants={{ hidden: { opacity: 0, scale: 0.8 }, show: { opacity: 1, scale: 1 } }}
          transition={{ type: 'spring', stiffness: 220, damping: 18 }}
          className="relative grid size-28 place-items-center"
        >
          <span aria-hidden className="absolute size-16 rounded-2xl border-2 border-primary/70 animate-ping" />
          <span aria-hidden className="absolute size-16 rounded-2xl border-2 border-primary/40 animate-ping [animation-delay:0.5s]" />
          <span aria-hidden className="absolute size-16 rounded-2xl bg-primary/10 blur-md" />
          <div className="relative size-16 overflow-hidden rounded-2xl border border-primary/25 bg-white shadow-[0_22px_80px_-38px_rgba(64,158,254,0.95)]">
            <Image
              src="https://wwcduaaqtyopvofzlouw.supabase.co/storage/v1/object/public/general/Tes-D.png"
              alt="Centered101"
              fill
              sizes="64px"
              priority
              draggable={false}
              onContextMenu={(event) => event.preventDefault()}
              className="select-none object-cover"
            />
          </div>
        </motion.div>

        {/* Brand */}
        <motion.p
          variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
          className="gradient-text mt-7 text-lg font-black uppercase tracking-[0.34em]"
        >
          Centered101
        </motion.p>

        {/* Status */}
        <motion.p
          variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}
          className="mt-3 text-[0.7rem] uppercase tracking-[0.25em] text-muted-foreground"
        >
          Loading portfolio data
        </motion.p>
      </motion.div>
    </motion.div>
  )
}
