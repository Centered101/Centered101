'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import Script from 'next/script'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertCircle, CheckCircle2, Download, Github, Loader2, MapPin, Mail, Send } from 'lucide-react'
import { useLanguage } from '@/components/language-provider'
import { TURNSTILE_DEBUG, TURNSTILE_SITE_KEY, TURNSTILE_TEST_MODE, TurnstileBox } from '@/components/portfolio/contact'
import type { GitHubUser, GitHubOrganization, LanguageStats } from '@/lib/github/types'

interface HeroProps {
  user?: GitHubUser
  totalStars?: number
  topLanguages?: LanguageStats[]
  organizations?: GitHubOrganization[]
  isLoading?: boolean
  onResumeDownload?: () => void
}

type PortfolioVisualSettings = {
  hero_image_url: string
  hero_image_x: number
  hero_image_y: number
  hero_image_width: number
  hero_image_max_width: number
  hero_image_opacity: number
}

const DEFAULT_VISUAL_SETTINGS: PortfolioVisualSettings = {
  hero_image_url: '/porfilio/images/bg-avatar-hero.png',
  hero_image_x: 160,
  hero_image_y: -12,
  hero_image_width: 50,
  hero_image_max_width: 760,
  hero_image_opacity: 95,
}

function TypewriterText({ roles }: { roles: string[] }) {
  const [roleIndex, setRoleIndex] = useState(0)
  const [text, setText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const currentRole = roles[roleIndex]
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        if (text.length < currentRole.length) {
          setText(currentRole.slice(0, text.length + 1))
        } else {
          setTimeout(() => setIsDeleting(true), 2000)
        }
      } else {
        if (text.length > 0) {
          setText(text.slice(0, -1))
        } else {
          setIsDeleting(false)
          setRoleIndex((prev) => (prev + 1) % roles.length)
        }
      }
    }, isDeleting ? 50 : 100)

    return () => clearTimeout(timeout)
  }, [text, isDeleting, roleIndex])

  return (
    <span className="typing-cursor text-accent">{text}</span>
  )
}

export function Hero({ user, totalStars = 0, organizations = [], isLoading, onResumeDownload }: HeroProps) {
  const { copy } = useLanguage()
  const [messageOpen, setMessageOpen] = useState(false)
  const [formState, setFormState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [submitCount, setSubmitCount] = useState(0)
  const [turnstileReady, setTurnstileReady] = useState(false)
  const [turnstileFailed, setTurnstileFailed] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')
  const [visualSettings, setVisualSettings] = useState<PortfolioVisualSettings>(DEFAULT_VISUAL_SETTINGS)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  })
  const needsBotCheck = TURNSTILE_TEST_MODE || submitCount >= 6

  const handleTurnstileVerify = useCallback((token: string) => {
    setTurnstileToken(token)
    setFormState((current) => (current === 'error' ? 'idle' : current))
    setErrorMessage('')
  }, [])

  const handleTurnstileReset = useCallback(() => {
    setTurnstileToken('')
  }, [])

  useEffect(() => {
    const savedCount = Number(window.localStorage.getItem('portfolio_contact_submit_count') || 0)
    if (Number.isFinite(savedCount)) setSubmitCount(savedCount)
  }, [])

  useEffect(() => {
    let cancelled = false

    fetch('/api/portfolio/settings', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : DEFAULT_VISUAL_SETTINGS))
      .then((data) => {
        if (!cancelled) setVisualSettings({ ...DEFAULT_VISUAL_SETTINGS, ...data })
      })
      .catch(() => {
        if (!cancelled) setVisualSettings(DEFAULT_VISUAL_SETTINGS)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!needsBotCheck || turnstileReady || turnstileFailed) return

    const timeoutId = window.setTimeout(() => {
      setTurnstileFailed(true)
      if (TURNSTILE_DEBUG) setErrorMessage(copy.contact.botCheckTimeoutDebug)
    }, 20000)

    return () => window.clearTimeout(timeoutId)
  }, [needsBotCheck, turnstileReady, turnstileFailed])

  if (isLoading) {
    return <HeroSkeleton />
  }

  const profileName = 'Centered101 Phongphon Phompha'
  // const profileName = user?.name || user?.login || 'Centered101'
  const username = user?.login || 'Centered101'
  const joinedDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null
  const resumeHref = '/api/portfolio/resume?download=1'

  const handleResumeClick = async () => {
    onResumeDownload?.()

    try {
      await fetch('/api/resume', { method: 'POST' })
    } catch {
      // Tracking should never block the file download.
    }
  }

  const handleMessageSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (needsBotCheck && !turnstileToken) {
      setFormState('error')
      setErrorMessage(
        turnstileFailed && TURNSTILE_DEBUG
          ? copy.contact.botCheckFailedDebug
          : copy.contact.botCheckRequired
      )
      return
    }
    setFormState('loading')
    setErrorMessage('')
    const toastId = toast.loading(copy.contact.sending)

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          subject: formData.subject || 'Portfolio message',
          source: 'Portfolio · Hero',
          turnstileToken,
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || copy.contact.sendError)
      }

      setFormState('success')
      setFormData({ name: '', email: '', subject: '', message: '' })
      setTurnstileToken('')
      window.turnstile?.reset()
      const nextSubmitCount = submitCount + 1
      setSubmitCount(nextSubmitCount)
      window.localStorage.setItem('portfolio_contact_submit_count', String(nextSubmitCount))
      toast.success(copy.contact.successTitle, { id: toastId })
    } catch (error) {
      const message = error instanceof Error ? error.message : copy.contact.unknownError
      setFormState('error')
      setErrorMessage(message)
      toast.error(message, { id: toastId })
    }
  }

  const handleMessageChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((current) => ({ ...current, [event.target.name]: event.target.value }))

    if (formState === 'error') {
      setFormState('idle')
      setErrorMessage('')
    }
  }

  return (
    <section id="home" className="relative flex min-h-screen min-h-[100svh] items-end overflow-hidden px-4 pb-8 pt-28 sm:px-6 sm:pb-24 md:pb-28 lg:px-8">
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&language=th"
        strategy="afterInteractive"
        onLoad={() => {
          setTurnstileReady(true)
          setTurnstileFailed(false)
        }}
        onError={() => setTurnstileFailed(true)}
      />
      <div className="absolute inset-0 z-0 grid-pattern" />
      <div className="pointer-events-none absolute inset-0 z-0 bg-[url('/porfilio/images/bg-portfolio.png')] bg-cover bg-center opacity-75" />
      <div className="pointer-events-none absolute inset-0 z-0 bg-background/62" />
      {/* Desktop + Tablet: avatar on the right side */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute z-0 hidden h-[min(76vh,700px)] select-none opacity-45 md:block lg:h-[min(80vh,740px)] lg:opacity-95"
        style={{
          bottom: `${visualSettings.hero_image_y}px`,
          right: `clamp(40px, ${visualSettings.hero_image_x}px, 14vw)`,
          width: `min(${visualSettings.hero_image_width}vw, ${visualSettings.hero_image_max_width}px)`,
          maxWidth: `${visualSettings.hero_image_max_width}px`,
          opacity: visualSettings.hero_image_opacity / 100,
        }}
      >
        <img
          src={visualSettings.hero_image_url}
          alt=""
          draggable={false}
          onContextMenu={(event) => event.preventDefault()}
          className="size-full object-contain object-right-bottom"
        />
      </div>
      {/* Mobile only: avatar centered at top */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-14 z-0 h-[48vh] w-[92vw] -translate-x-1/2 opacity-95 md:hidden"
      >
        <img
          src={visualSettings.hero_image_url}
          alt=""
          draggable={false}
          className="size-full object-contain object-top"
        />
      </div>
      <div className="z-10 mx-auto w-full max-w-[1400px]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          data-aos="fade-up"
          className="w-full px-0 md:max-w-[58%] xl:max-w-none"
        >
          <div className="grid gap-5 sm:grid-cols-[128px_1fr] sm:gap-8 lg:grid-cols-[160px_1fr]">
            <div className="flex items-start justify-start">
              <div className="relative">
                <div className="absolute inset-1.5 rounded-3xl bg-accent/35 opacity-80 blur-xl" />
                <Avatar className="relative size-24 rounded border border-primary bg-card sm:size-28 lg:size-36">
                  <AvatarImage src={user?.avatar_url} alt={profileName} />
                  <AvatarFallback className="rounded-3xl bg-card text-3xl font-bold">
                    {username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>

            <div className="min-w-0">
              <div className="mb-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
                <div>
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-bold tracking-normal sm:text-4xl">
                      <span className="gradient-text">{copy.hero.profileName}</span>
                    </h1>
                  </div>

                  <div className="grid max-w-xl grid-cols-3 gap-3 text-sm sm:gap-8">
                    <div>
                      <p className="text-lg font-bold">{user?.public_repos ?? 0}</p>
                      <p className="font-medium text-muted-foreground">{copy.hero.repository}</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold">{(user?.followers ?? 0).toLocaleString()}</p>
                      <p className="font-medium text-muted-foreground">{copy.hero.followers}</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold">{(user?.following ?? 0).toLocaleString()}</p>
                      <p className="font-medium text-muted-foreground">{copy.hero.following}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm sm:text-base">
                {user?.location ? (
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="size-4 text-accent" />
                    {user.location}
                  </p>
                ) : null}
                <p className="max-w-2xl leading-6 text-muted-foreground">
                  {user?.bio || copy.hero.fallbackBio}
                </p>
                <p className="h-6 text-sm font-medium text-accent sm:text-base">
                  <TypewriterText roles={[...copy.hero.roles]} />
                </p>
              </div>

              {organizations.length > 0 ? (
                <div className="mt-5">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {copy.hero.organizations}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {organizations.map((org) => (
                      <a
                        key={org.login}
                        href={`https://github.com/${org.login}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={org.description || org.login}
                        aria-label={org.login}
                        data-touch-hover
                        className="touch-hover-scale block size-9 overflow-hidden rounded-lg border border-border bg-card transition-transform hover:scale-105 hover:border-accent/40"
                      >
                        <Image
                          src={org.avatar_url}
                          alt={org.login}
                          width={36}
                          height={36}
                          draggable={false}
                          onContextMenu={(event) => event.preventDefault()}
                          className="size-full object-cover"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-8 flex w-full flex-row items-center gap-2 sm:max-w-xl lg:max-w-2xl">
            <Button
              className="h-10 min-w-0 flex-1 rounded-lg bg-secondary px-3 text-foreground hover:bg-accent hover:text-accent-foreground"
              asChild
            >
              <a href={`https://github.com/${username}`} target="_blank" rel="noopener noreferrer">
                <Github className="size-4" />
                {copy.hero.follow}
              </a>
            </Button>

            <Dialog open={messageOpen} onOpenChange={setMessageOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="secondary"
                  className="h-10 min-w-0 flex-1 rounded-lg bg-secondary px-3 text-foreground hover:bg-accent/20"
                >
                  <Mail className="size-4" />
                  {copy.hero.message}
                </Button>
              </DialogTrigger>
              <DialogContent className="overflow-hidden rounded-2xl border-slate-200 bg-white p-0 text-slate-950 shadow-[0_28px_90px_-45px_rgba(64,158,254,0.9)] sm:max-w-xl">
                <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
                  <DialogHeader className="space-y-2 text-left">
                    <div className="mb-1 flex size-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-accent">
                      <Mail className="size-5" />
                    </div>
                    <DialogTitle className="text-2xl font-bold tracking-normal">{copy.contact.sendTitle}</DialogTitle>
                    <DialogDescription className="text-sm leading-6 text-slate-500">
                      {copy.contact.sendSubtitle}
                    </DialogDescription>
                  </DialogHeader>
                </div>

                <div className="p-6">
                {formState === 'success' ? (
                  <div className="rounded-2xl border border-accent/20 bg-accent/10 p-6 text-center">
                    <CheckCircle2 className="mx-auto mb-3 size-9 text-accent" />
                    <p className="font-semibold">{copy.contact.successTitle}</p>
                    <p className="mt-1 text-sm text-slate-500">{copy.contact.successBody}</p>
                    <Button className="mt-5 w-full rounded-lg glow-accent" onClick={() => setFormState('idle')}>
                      {copy.contact.another}
                    </Button>
                  </div>
                ) : (
                  <form className="space-y-4" onSubmit={handleMessageSubmit}>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Input
                        name="name"
                        value={formData.name}
                        onChange={handleMessageChange}
                        placeholder={copy.contact.namePlaceholder}
                        required
                        disabled={formState === 'loading'}
                        className="h-11 rounded-lg border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-accent/50"
                      />
                      <Input
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleMessageChange}
                        placeholder={copy.contact.emailPlaceholder}
                        required
                        disabled={formState === 'loading'}
                        className="h-11 rounded-lg border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-accent/50"
                      />
                    </div>
                    <Input
                      name="subject"
                      value={formData.subject}
                      onChange={handleMessageChange}
                      placeholder={copy.contact.subjectPlaceholder}
                      disabled={formState === 'loading'}
                      className="h-11 rounded-lg border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-accent/50"
                    />
                    <Textarea
                      name="message"
                      value={formData.message}
                      onChange={handleMessageChange}
                      placeholder={copy.contact.messagePlaceholder}
                      rows={6}
                      required
                      disabled={formState === 'loading'}
                      className="h-[132px] resize-none overflow-y-auto rounded-lg border-slate-200 bg-white text-slate-900 [field-sizing:fixed] placeholder:text-slate-400 focus:border-accent/50"
                    />
                    {needsBotCheck ? (
                      <TurnstileBox
                        ready={turnstileReady}
                        failed={turnstileFailed}
                        siteKey={TURNSTILE_SITE_KEY}
                        loadingText={copy.contact.botCheckLoading}
                        failedText={copy.contact.botCheckFailed}
                        onVerify={handleTurnstileVerify}
                        onReset={handleTurnstileReset}
                      />
                    ) : null}
                    {formState === 'error' && !(needsBotCheck && turnstileFailed) ? (
                      <p className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                        <AlertCircle className="mr-2 inline size-4 align-text-bottom" />
                        {errorMessage}
                      </p>
                    ) : null}
                    <Button className="h-11 w-full rounded-lg glow-accent" type="submit" disabled={formState === 'loading'}>
                      {formState === 'loading' ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Send className="size-4" />
                      )}
                      {copy.contact.send}
                    </Button>
                  </form>
                )}
                </div>
              </DialogContent>
            </Dialog>

            <Button
              variant="secondary"
              className="h-10 min-w-0 flex-1 rounded-lg bg-secondary px-3 text-foreground hover:bg-accent/20"
              onClick={handleResumeClick}
              asChild
            >
              <a href={resumeHref} download="Centered101-resume.pdf">
                <Download className="size-4" />
                {copy.hero.resume}
              </a>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function HeroSkeleton() {
  return (
    <section className="relative flex min-h-screen min-h-[100svh] items-end overflow-hidden px-4 pb-8 pt-28 sm:px-6 sm:pb-24 lg:pb-28">
      <div className="absolute inset-0 z-0 grid-pattern" />
      <div className="pointer-events-none absolute inset-0 z-0 bg-[url('/porfilio/images/bg-portfolio.png')] bg-cover bg-center opacity-75" />
      <div className="pointer-events-none absolute inset-0 z-0 bg-background/62" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 right-64 z-0 hidden h-[min(82vh,760px)] w-[54vw] max-w-205 select-none opacity-95 lg:block"
      >
        <Image
          src="/porfilio/images/bg-avatar-hero.png"
          alt=""
          fill
          sizes="54vw"
          draggable={false}
          onContextMenu={(event) => event.preventDefault()}
          className="object-contain object-right-bottom"
        />
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-14 z-0 h-[48vh] w-[92vw] -translate-x-1/2 opacity-95 lg:hidden"
      >
        <Image
          src="/porfilio/images/bg-avatar-hero.png"
          alt=""
          fill
          sizes="92vw"
          draggable={false}
          className="object-contain object-top"
        />
      </div>
      <div className="relative z-10 mx-auto w-full max-w-[1400px]">
        <div className="mx-auto w-full px-0">
          <div className="grid grid-cols-[72px_1fr] gap-4 sm:grid-cols-[128px_1fr] sm:gap-8 lg:grid-cols-[160px_1fr]">
            <div className="flex items-start justify-start">
              <div className="relative">
                <div className="absolute inset-1.5 rounded bg-accent/35 opacity-80 blur-xl" />
                <Skeleton className="relative size-18 rounded-3xl border border-primary bg-card sm:size-28 lg:size-36" />
              </div>
            </div>
            <div className="min-w-0">
              <Skeleton className="mb-5 h-10 w-64" />
              <div className="mb-6 grid max-w-xl grid-cols-3 gap-3 sm:gap-8">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="space-y-2">
                    <Skeleton className="h-5 w-10" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-full max-w-md" />
                <Skeleton className="h-6 w-36" />
              </div>
            </div>
          </div>
          <div className="mt-8 flex w-full flex-row items-center gap-2 sm:max-w-xl lg:max-w-2xl">
            <Skeleton className="h-10 min-w-0 flex-1 rounded-lg" />
            <Skeleton className="h-10 min-w-0 flex-1 rounded-lg" />
            <Skeleton className="h-10 min-w-0 flex-1 rounded-lg" />
          </div>
        </div>
      </div>
    </section>
  )
}
