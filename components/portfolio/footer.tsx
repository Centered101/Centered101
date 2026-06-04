'use client'

import { useState } from 'react'
import { motion, useMotionValueEvent, useScroll } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Github, Twitter, Mail, Download, ArrowUp, Globe, MapPin, Sparkles } from 'lucide-react'
import { useLanguage } from '@/components/language-provider'
import { smoothScrollTo } from '@/lib/smooth-scroll'
import type { GitHubUser } from '@/lib/github/types'

interface FooterProps {
  user?: GitHubUser
  onResumeDownload?: () => void
}

export function Footer({ user, onResumeDownload }: FooterProps) {
  const { copy } = useLanguage()
  const currentYear = new Date().getFullYear()
  const [showBackToTop, setShowBackToTop] = useState(false)
  const { scrollY } = useScroll()

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setShowBackToTop(latest > 500)
  })

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

  const profileName = user?.name || user?.login || 'centered101'
  const username = user?.login || 'centered101'
  const resumeHref = '/resume/centered101-resume.pdf'
  const socialLinks = [
    {
      name: 'GitHub',
      icon: Github,
      href: `https://github.com/${username}`,
      show: true,
    },
    {
      name: 'Twitter',
      icon: Twitter,
      href: user?.twitter_username ? `https://twitter.com/${user.twitter_username}` : null,
      show: Boolean(user?.twitter_username),
    },
    {
      name: 'Website',
      icon: Globe,
      href: user?.blog ? (user.blog.startsWith('http') ? user.blog : `https://${user.blog}`) : null,
      show: Boolean(user?.blog),
    },
    {
      name: 'Email',
      icon: Mail,
      href: user?.email ? `mailto:${user.email}` : null,
      show: Boolean(user?.email),
    },
  ].filter((link) => link.show && link.href)

  return (
    <>
      <motion.button
        type="button"
        aria-label={copy.footer.backTop}
        onClick={scrollToTop}
        initial={false}
        animate={{
          opacity: showBackToTop ? 1 : 0,
          y: showBackToTop ? 0 : 16,
          pointerEvents: showBackToTop ? 'auto' : 'none',
        }}
        transition={{ duration: 0.25 }}
        className="fixed bottom-6 right-6 z-50 grid size-11 place-items-center rounded-full border border-border bg-card/90 text-muted-foreground shadow-[0_18px_60px_-28px_rgba(64,158,254,0.8)] backdrop-blur-xl transition-colors hover:border-accent/40 hover:text-accent"
      >
        <ArrowUp className="size-4" />
      </motion.button>

      <footer className="relative overflow-hidden border-t border-border/50 px-6 py-16" data-aos="fade-up">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,rgba(64,158,254,0.035)_48%,rgba(5,6,7,0.9)_100%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />

        <div className="relative mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr_0.9fr]">
            <div data-aos="fade-up">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs text-muted-foreground">
                <Sparkles className="size-3.5 text-accent" />
                {copy.footer.builtWith}
              </div>
              <h3 className="mb-3 text-3xl font-bold">
                <span className="gradient-text">{profileName}</span>
              </h3>
              <p className="max-w-sm text-sm leading-6 text-muted-foreground">
                {copy.footer.tagline}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {user?.location ? (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-4 text-accent" />
                    {user.location}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1.5">
                  <Github className="size-4 text-accent" />
                  @{username}
                </span>
              </div>
            </div>

            <nav className="grid grid-cols-2 gap-2" data-aos="fade-up" data-aos-delay="100">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  suppressHydrationWarning
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
                  <span className="size-1.5 rounded-full bg-muted-foreground/30 transition-colors group-hover:bg-accent" />
                </button>
              ))}
            </nav>

            <div className="space-y-4" data-aos="fade-up" data-aos-delay="180">
              <div className="flex flex-wrap gap-2">
                {socialLinks.map((link) => (
                  <Button
                    key={link.name}
                    variant="ghost"
                    size="icon"
                    className="rounded-xl border border-border bg-secondary/35 hover:border-accent/35 hover:bg-accent/10 hover:text-accent"
                    asChild
                  >
                    <a
                      href={link.href || '#'}
                      target={link.name === 'Email' ? undefined : '_blank'}
                      rel={link.name === 'Email' ? undefined : 'noopener noreferrer'}
                      aria-label={link.name}
                    >
                      <link.icon className="size-5" />
                    </a>
                  </Button>
                ))}
              </div>

              <Button
                onClick={handleResumeClick}
                className="w-full gap-2 glow-accent"
                asChild
              >
                <a href={resumeHref} download="centered101-resume.pdf">
                  <Download className="size-4" />
                  {copy.hero.resume}
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
        </motion.div>
      </div>
      </footer>
    </>
  )
}
