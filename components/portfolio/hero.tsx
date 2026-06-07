'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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

export function Hero({ user, totalStars = 0, isLoading, onResumeDownload }: HeroProps) {
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

  const profileName = user?.name || user?.login || 'Centered101'
  const username = user?.login || 'Centered101'
  const joinedDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null
  const resumeHref = '/porfilio/resume/Centered101-resume.pdf'

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
    const toastId = toast.loading('กำลังส่งข้อความ...')

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
      toast.success('ส่งข้อความแล้ว', { id: toastId })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong'
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
    <section id="home" className="relative flex min-h-screen items-end overflow-hidden px-4 pb-16 pt-28 sm:px-6 sm:pb-24 lg:pb-28">
      <div className="absolute inset-0 z-0 grid-pattern" />
      <div className="pointer-events-none absolute inset-0 z-0 bg-[url('/porfilio/images/bg-portfolio.png')] bg-cover bg-center opacity-75" />
      <div className="pointer-events-none absolute inset-0 z-0 bg-background/62" />
      <motion.img
        src="/porfilio/images/bg-avatar-hero.png"
        alt=""
        aria-hidden="true"
        draggable={false}
        onContextMenu={(event) => event.preventDefault()}
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 0.95, y: 0 }}
        transition={{ duration: 1.1, delay: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
        className="pointer-events-none absolute bottom-0 right-64 z-0 hidden h-[min(82vh,760px)] w-[54vw] max-w-[820px] select-none object-contain object-right-bottom opacity-95 lg:block"
      />
      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 0.1, y: 0 }}
        transition={{ duration: 1, delay: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
        className="pointer-events-none absolute bottom-0 right-[-36%] z-0 h-[58vh] w-[92vw] bg-[url('/porfilio/images/bg-avatar-hero.png')] bg-contain bg-right-bottom bg-no-repeat sm:right-[-24%] lg:hidden"
      />
      <div className="z-10 mx-auto w-full max-w-[1400px]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          data-aos="fade-up"
          className="mx-auto w-full px-0"
        >
          <div className="grid gap-5 sm:grid-cols-[128px_1fr] sm:gap-8 lg:grid-cols-[160px_1fr]">
            <div className="flex items-start justify-center sm:justify-start">
              <div className="relative">
                <div className="absolute inset-1.5 rounded-3xl bg-accent/35 opacity-80 blur-xl" />
                <Avatar className="relative size-64 rounded border border-primary bg-card sm:size-32 lg:size-36">
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

            </div>
          </div>

          <div className="mt-8 flex items-center justify-between *:w-full sm:grid gap-2 sm:grid-cols-3 lg:w-max">
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
                  <div className="mt-8 rounded-xl border border-accent/20 bg-accent/10 p-5 text-center">
                    <CheckCircle2 className="mx-auto mb-3 size-8 text-accent" />
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
              <a href={resumeHref} download="Centered101-resume.pdf">
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
    <section className="relative flex min-h-screen items-end overflow-hidden px-4 pb-16 pt-28 sm:px-6 sm:pb-24 lg:pb-28">
      <div className="absolute inset-0 z-0 grid-pattern" />
      <div className="pointer-events-none absolute inset-0 z-0 bg-[url('/porfilio/images/bg-portfolio.png')] bg-cover bg-center opacity-75" />
      <div className="pointer-events-none absolute inset-0 z-0 bg-background/62" />
      <img
        src="/porfilio/images/bg-avatar-hero.png"
        alt=""
        aria-hidden="true"
        draggable={false}
        onContextMenu={(event) => event.preventDefault()}
        className="pointer-events-none absolute bottom-0 right-64 z-0 hidden h-[min(82vh,760px)] w-[54vw] max-w-[820px] select-none object-contain object-right-bottom opacity-95 lg:block"
      />
      <div className="pointer-events-none absolute bottom-0 right-[-36%] z-0 h-[58vh] w-[92vw] bg-[url('/porfilio/images/bg-avatar-hero.png')] bg-contain bg-right-bottom bg-no-repeat opacity-10 sm:right-[-24%] lg:hidden" />
      <div className="relative z-10 mx-auto w-full max-w-[1400px]">
        <div className="mx-auto w-full px-0">
          <div className="grid gap-5 sm:grid-cols-[128px_1fr] sm:gap-8 lg:grid-cols-[160px_1fr]">
            <div className="flex items-start justify-center sm:justify-start">
              <div className="relative">
                <div className="absolute inset-1.5 rounded bg-accent/35 opacity-80 blur-xl" />
                <Skeleton className="relative mx-auto size-64 rounded-3xl border border-primary bg-card sm:mx-0 sm:size-32 lg:size-36" />
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
          <div className="mt-8 flex items-center justify-between gap-2 *:w-full sm:grid sm:grid-cols-3 lg:w-max">
            <Skeleton className="h-10 rounded-lg" />
            <Skeleton className="h-10 rounded-lg" />
            <Skeleton className="h-10 rounded-lg" />
          </div>
        </div>
      </div>
    </section>
  )
}
