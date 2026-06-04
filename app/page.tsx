'use client'

import { useGitHub } from '@/hooks/use-github'
import { useAnalytics } from '@/hooks/use-analytics'
import { Navigation } from '@/components/portfolio/navigation'
import { Hero } from '@/components/portfolio/hero'
import { Projects } from '@/components/portfolio/projects'
import { Stats } from '@/components/portfolio/stats'
import { WakaTimeStats } from '@/components/portfolio/wakatime-stats'
import { Skills } from '@/components/portfolio/skills'
import { Timeline } from '@/components/portfolio/timeline'
import { Contact } from '@/components/portfolio/contact'
import { Footer } from '@/components/portfolio/footer'

export default function Home() {
  const { data, isLoading } = useGitHub()
  const { trackRepoClick, trackContactSubmit, trackResumeDownload } = useAnalytics()

  return (
    <div className="min-h-screen bg-background">
      <Navigation user={data?.user} />
      
      <main>
        <Hero
          user={data?.user}
          totalStars={data?.totalStars}
          topLanguages={data?.topLanguages}
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

        <Timeline
          isLoading={isLoading}
        />
        
        <Contact
          user={data?.user}
          socialAccounts={data?.socialAccounts}
          orcidId={data?.orcidId}
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
