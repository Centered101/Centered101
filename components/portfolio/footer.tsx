'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, ArrowUp } from 'lucide-react'
import { useLanguage } from '@/components/language-provider'

import { TheSvgIcon } from '@/components/the-svg-icon'
import { useSocialLinks } from '@/hooks/use-social-links'
import { smoothScrollTo } from '@/lib/smooth-scroll'
import type { GitHubUser } from '@/lib/github/types'

interface FooterProps {
  user?: GitHubUser
  onResumeDownload?: () => void
}

export function Footer({ user, onResumeDownload }: FooterProps) {
  const { copy } = useLanguage()
  const { links: socialLinks } = useSocialLinks()
  const currentYear = new Date().getFullYear()
  const [showBackToTop, setShowBackToTop] = useState(false)

  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 500)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleResumeClick = async () => {
    onResumeDownload?.()
    // Track download
    try {
      await fetch('/api/resume', { method: 'POST' })
    } catch (error) {
      // Silently fail tracking
    }
  }

  const scrollToTop = () => {
    smoothScrollTo(0)
  }

  const navItems = [
    { id: 'home', label: copy.nav.home, action: scrollToTop },
    { id: 'projects', label: copy.nav.projects },
    { id: 'wakatime', label: copy.nav.wakatime },
    { id: 'skills', label: copy.nav.skills },
    { id: 'timeline', label: copy.nav.timeline },
    { id: 'contact', label: copy.nav.contact },
  ]

  const pageLinks = [
    { href: 'https://shop.centered101.com', label: 'Shop' },
  ]

  const profileName = user?.name || user?.login || 'centered101'
  const resumeHref = 'https://wwcduaaqtyopvofzlouw.supabase.co/storage/v1/object/public/general/Centered101-resume.pdf?download=Centered101-resume.pdf'

  return (
    <>
      <button
        type="button"
        aria-label={copy.footer.backTop}
        onClick={scrollToTop}
        className={`fixed bottom-[max(1.5rem,var(--safe-bottom))] right-[max(1.5rem,var(--safe-right))] z-50 grid size-11 place-items-center rounded-full border border-border bg-card/90 text-muted-foreground shadow-[0_18px_60px_-28px_rgba(64,158,254,0.8)] backdrop-blur-xl transition-colors hover:border-accent/40 hover:text-accent ${
          showBackToTop ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <ArrowUp className="size-4" />
      </button>

      <footer className="relative overflow-hidden border-t border-border/50 px-4 py-12 sm:px-6 sm:py-16">
        <div className="absolute inset-0 grid-pattern opacity-45" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />

        <div className="relative mx-auto w-full max-w-[1400px]">
          <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr_0.9fr]">
            <nav>
              <div>
                <p className="mb-3 text-sm font-semibold text-foreground">{copy.footer.navigation}</p>
                <div className="grid grid-cols-2 gap-2">
                  {navItems.map((item) => (
                    <button
                      key={item.id}
                      suppressHydrationWarning
                      data-touch-hover
                      onClick={() => {
                        if (item.action) {
                          item.action()
                        } else {
                          smoothScrollTo(item.id)
                        }
                      }}
                      className="group flex items-center justify-between rounded-xl border border-border bg-secondary/35 px-4 py-3 text-left text-sm text-muted-foreground transition-all hover:border-accent/35 hover:bg-accent/10 hover:text-foreground"
                    >
                      <span>{item.label}</span>
                      <span className="touch-hover-bg size-1.5 rounded-full bg-muted-foreground/30 transition-colors group-hover:bg-accent" />
                    </button>
                  ))}
                </div>
              </div>
            </nav>

            <nav className="space-y-6">
              <div>
                <p className="mb-3 text-sm font-semibold text-foreground">{copy.footer.pages}</p>
                <div className="grid gap-2">
                  {pageLinks.map((page) => (
                    <a
                      key={page.href}
                      href={page.href}
                      target={page.href.startsWith('http') ? '_blank' : undefined}
                      rel={page.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                      data-touch-hover
                      className="group flex items-center justify-between rounded-xl border border-border bg-secondary/35 px-4 py-3 text-sm text-muted-foreground transition-all hover:border-accent/35 hover:bg-accent/10 hover:text-foreground"
                    >
                      <span>{page.label}</span>
                      <span className="touch-hover-bg size-1.5 rounded-full bg-muted-foreground/30 transition-colors group-hover:bg-accent" />
                    </a>
                  ))}
                </div>
              </div>
            </nav>

            <div className="space-y-4">
              <p className="text-sm font-semibold text-foreground">{copy.footer.social}</p>
              <div className="flex flex-wrap gap-2">
                {socialLinks.map((link) => (
                  <Button
                    key={link.id}
                    variant="ghost"
                    size="icon"
                    className="rounded-xl border border-border bg-secondary/35 hover:border-accent/35 hover:bg-accent/10 hover:text-accent"
                    asChild
                  >
                    <a
                      href={link.href}
                      target={link.name === 'Email' ? undefined : '_blank'}
                      rel={link.name === 'Email' ? undefined : 'noopener noreferrer'}
                      aria-label={link.name}
                    >
                      <TheSvgIcon label={link.name} slug={link.icon} className="size-9 border-0 bg-transparent" />
                    </a>
                  </Button>
                ))}
              </div>

              <Button
                onClick={handleResumeClick}
                className="w-full gap-2 glow-accent"
                asChild
              >
                <a href={resumeHref} download="Centered101-resume.pdf">
                  <Download className="size-4" />
                  {copy.footer.resume}
                </a>
              </Button>

              <Button
                variant="outline"
                onClick={scrollToTop}
                className="w-full gap-2 border-border bg-secondary/35 hover:border-accent/35"
              >
                <ArrowUp className="size-4" />
                {copy.footer.backTop}
              </Button>
            </div>
          </div>

          <div className="section-divider my-8" />

          <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p suppressHydrationWarning>
              &copy; {currentYear} {profileName}. {copy.footer.rights}
            </p>
          </div>
      </div>
      </footer>
    </>
  )
}
