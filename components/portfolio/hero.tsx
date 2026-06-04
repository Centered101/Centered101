'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { CalendarDays, CheckCircle2, Github, Loader2, MapPin, Mail, Send } from 'lucide-react'
import { useLanguage } from '@/components/language-provider'
import type { GitHubUser, LanguageStats } from '@/lib/github/types'

interface HeroProps {
  user?: GitHubUser
  totalStars?: number
  topLanguages?: LanguageStats[]
  isLoading?: boolean
  onResumeDownload?: () => void
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

export function Hero({ user, totalStars = 0, topLanguages = [], isLoading, onResumeDownload }: HeroProps) {
  const { copy } = useLanguage()
  const [messageOpen, setMessageOpen] = useState(false)
  const [formState, setFormState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  })

  if (isLoading) {
    return <HeroSkeleton />
  }

  const profileName = user?.name || user?.login || 'centered101'
  const username = user?.login || 'centered101'
  const joinedDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null
  const resumeHref = '/resume/centered101-resume.pdf'

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
    setFormState('loading')
    setErrorMessage('')

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          subject: 'Portfolio message',
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message')
      }

      setFormState('success')
      setFormData({ name: '', email: '', message: '' })
    } catch (error) {
      setFormState('error')
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong')
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
    <section id="home" className="relative flex min-h-screen items-center px-4 pb-14 pt-28 sm:px-6 sm:pb-20">
      <div className="absolute inset-0 grid-pattern" />
      <div className="relative z-10 mx-auto w-full max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          data-aos="fade-up"
          className="mx-auto w-full px-0 sm:px-4 lg:px-8"
        >
          <div className="grid gap-5 sm:grid-cols-[128px_1fr] sm:gap-8 lg:grid-cols-[160px_1fr]">
            <div className="flex items-start justify-center sm:justify-start">
              <div className="relative">
                <div className="absolute -inset-1.5 rounded-3xl bg-accent/35 opacity-80 blur-xl" />
                <Avatar className="relative size-28 rounded-3xl border-4 border-background bg-card sm:size-32 lg:size-36">
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
                      <span className="gradient-text">{profileName}</span>
                    </h1>
                    <Badge variant="secondary" className="rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-accent">
                      @{username}
                    </Badge>
                  </div>

                  <div className="grid max-w-xl grid-cols-3 gap-3 text-sm sm:gap-8">
                    <div>
                      <p className="text-lg font-bold">{user?.public_repos ?? 0}</p>
                      <p className="font-medium text-muted-foreground">Repository</p>
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

                <div className="hidden rounded-xl border border-border px-4 py-3 text-right lg:block">
                  <p className="text-sm text-muted-foreground">{copy.hero.stars}</p>
                  <p className="text-2xl font-bold text-accent">{totalStars.toLocaleString()}</p>
                </div>
              </div>

              <div className="space-y-2 text-sm sm:text-base">
                {joinedDate ? (
                  <p className="inline-flex items-center gap-2 text-muted-foreground">
                    <CalendarDays className="size-4 text-accent" />
                    Joined {joinedDate}
                  </p>
                ) : null}
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

              {topLanguages.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {topLanguages.slice(0, 5).map((lang) => (
                    <Badge
                      key={lang.name}
                      variant="secondary"
                      className="rounded-full bg-secondary/70 px-3 py-1 text-xs"
                    >
                      <span
                        className="mr-1.5 size-2 rounded-full"
                        style={{ backgroundColor: lang.color }}
                      />
                      {lang.name}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-8 grid gap-2 sm:grid-cols-3">
            <Button
              className="h-10 rounded-lg bg-secondary text-foreground hover:bg-accent hover:text-accent-foreground"
              asChild
            >
              <a href={`https://github.com/${username}`} target="_blank" rel="noopener noreferrer">
                <Github className="size-4" />
                Follow
              </a>
            </Button>

            <Dialog open={messageOpen} onOpenChange={setMessageOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="secondary"
                  className="h-10 rounded-lg bg-secondary text-foreground hover:bg-accent/20"
                >
                  <Mail className="size-4" />
                  {copy.hero.message}
                </Button>
              </DialogTrigger>
              <DialogContent className="border-border bg-card/95 backdrop-blur-xl sm:max-w-xl">
                <DialogHeader>
                  <DialogTitle>{copy.contact.sendTitle}</DialogTitle>
                  <DialogDescription>{copy.contact.sendSubtitle}</DialogDescription>
                </DialogHeader>

                {formState === 'success' ? (
                  <div className="mt-8 rounded-xl border border-green-500/20 bg-green-500/10 p-5 text-center">
                    <CheckCircle2 className="mx-auto mb-3 size-8 text-green-500" />
                    <p className="font-semibold">{copy.contact.successTitle}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{copy.contact.successBody}</p>
                    <Button className="mt-5 w-full" onClick={() => setFormState('idle')}>
                      {copy.contact.another}
                    </Button>
                  </div>
                ) : (
                  <form className="mt-8 space-y-4" onSubmit={handleMessageSubmit}>
                    <Input
                      name="name"
                      value={formData.name}
                      onChange={handleMessageChange}
                      placeholder={copy.contact.namePlaceholder}
                      required
                      disabled={formState === 'loading'}
                      className="bg-secondary/60"
                    />
                    <Input
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleMessageChange}
                      placeholder={copy.contact.emailPlaceholder}
                      required
                      disabled={formState === 'loading'}
                      className="bg-secondary/60"
                    />
                    <Textarea
                      name="message"
                      value={formData.message}
                      onChange={handleMessageChange}
                      placeholder={copy.contact.messagePlaceholder}
                      rows={6}
                      required
                      disabled={formState === 'loading'}
                      className="resize-none bg-secondary/60"
                    />
                    {formState === 'error' ? (
                      <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                        {errorMessage}
                      </p>
                    ) : null}
                    <Button className="w-full" type="submit" disabled={formState === 'loading'}>
                      {formState === 'loading' ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Send className="size-4" />
                      )}
                      {copy.contact.send}
                    </Button>
                  </form>
                )}
              </DialogContent>
            </Dialog>

            <Button
              variant="secondary"
              className="h-10 rounded-lg bg-secondary text-foreground hover:bg-accent/20"
              onClick={handleResumeClick}
              asChild
            >
              <a href={resumeHref} download="centered101-resume.pdf">
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
    <section className="flex min-h-screen items-center px-4 pb-14 pt-28 sm:px-6 sm:pb-20">
      <div className="absolute inset-0 grid-pattern" />
      <div className="relative z-10 mx-auto w-full max-w-7xl">
        <div className="mx-auto w-full px-0 sm:px-4 lg:px-8">
          <div className="grid gap-5 sm:grid-cols-[128px_1fr] sm:gap-8 lg:grid-cols-[160px_1fr]">
            <Skeleton className="mx-auto size-28 rounded-3xl sm:mx-0 sm:size-32 lg:size-36" />
            <div className="min-w-0">
              <Skeleton className="mb-4 h-10 w-64" />
              <div className="mb-6 grid max-w-xl grid-cols-3 gap-3">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
              <Skeleton className="mb-2 h-5 w-48" />
              <Skeleton className="mb-2 h-5 w-32" />
              <Skeleton className="h-6 w-full max-w-xl" />
            </div>
          </div>
          <div className="mt-6 grid gap-2 sm:grid-cols-3">
            <Skeleton className="h-10 rounded-lg" />
            <Skeleton className="h-10 rounded-lg" />
            <Skeleton className="h-10 rounded-lg" />
          </div>
        </div>
      </div>
    </section>
  )
}
