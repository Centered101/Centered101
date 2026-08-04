'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Script from 'next/script'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { Send, CheckCircle2, AlertCircle, MapPin, Sparkles } from 'lucide-react'
import { useLanguage } from '@/components/language-provider'
import { useSocialLinks } from '@/hooks/use-social-links'
import { TheSvgIcon } from '@/components/the-svg-icon'
import type { GitHubUser } from '@/lib/github/types'

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string
          theme?: 'light' | 'dark' | 'auto'
          callback?: (token: string) => void
          'expired-callback'?: () => void
          'error-callback'?: () => void
          language?: string
          size?: 'normal' | 'compact' | 'flexible'
        }
      ) => string
      reset: (widgetId?: string) => void
      remove: (widgetId?: string) => void
    }
  }
}

interface ContactProps {
  user?: GitHubUser
  onSubmit?: () => void
}

export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '0x4AAAAAADIdsIUovLuqQ8sL'
export const TURNSTILE_TEST_MODE =
  process.env.NEXT_PUBLIC_CONTACT_TURNSTILE_TEST_MODE === 'true' ||
  process.env.NEXT_PUBLIC_TURNSTILE_TEST_MODE === 'true'
export const TURNSTILE_DEBUG = process.env.NEXT_PUBLIC_CONTACT_TURNSTILE_DEBUG === 'true'

export function TurnstileBox({
  ready,
  failed,
  siteKey,
  loadingText,
  failedText,
  onVerify,
  onReset,
}: {
  ready: boolean
  failed: boolean
  siteKey: string
  loadingText: string
  failedText: string
  onVerify: (token: string) => void
  onReset: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!ready || !containerRef.current || widgetIdRef.current || !window.turnstile) return

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      theme: 'light',
      language: 'th',
      size: 'flexible',
      callback: onVerify,
      'expired-callback': onReset,
      'error-callback': onReset,
    })

    return () => {
      if (widgetIdRef.current) {
        window.turnstile?.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
  }, [ready, siteKey, onVerify, onReset])

  return (
    <div className="w-full">
      <div ref={containerRef} className="min-h-[65px] w-full" />
      {!ready || failed ? (
        <div className="flex h-[65px] w-full items-center gap-3 rounded-md border border-border bg-background px-4 text-sm font-semibold text-muted-foreground">
          {failed ? <AlertCircle className="size-5 text-destructive" /> : <Spinner className="size-5" />}
          {failed ? failedText : loadingText}
        </div>
      ) : null}
    </div>
  )
}

export function Contact({ user, onSubmit }: ContactProps) {
  const { copy } = useLanguage()
  const { links: socialLinks } = useSocialLinks()
  const [formState, setFormState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [submitCount, setSubmitCount] = useState(0)
  const [turnstileReady, setTurnstileReady] = useState(false)
  const [turnstileFailed, setTurnstileFailed] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')
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
    if (!needsBotCheck || turnstileReady || turnstileFailed) return

    const timeoutId = window.setTimeout(() => {
      setTurnstileFailed(true)
      if (TURNSTILE_DEBUG) setErrorMessage(copy.contact.botCheckTimeoutDebug)
    }, 20000)

    return () => window.clearTimeout(timeoutId)
  }, [needsBotCheck, turnstileReady, turnstileFailed])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, source: 'Portfolio · Contact', turnstileToken }),
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
      onSubmit?.()
    } catch (error) {
      setFormState('error')
      setErrorMessage(error instanceof Error ? error.message : copy.contact.unknownError)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    if (formState === 'error') {
      setFormState('idle')
      setErrorMessage('')
    }
  }

  return (
    <section id="contact" className="px-4 py-16 sm:px-6 sm:py-24 relative overflow-hidden" data-aos="fade-up">
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => {
          setTurnstileReady(true)
          setTurnstileFailed(false)
        }}
        onError={() => setTurnstileFailed(true)}
      />
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-accent/[0.03] to-transparent" />
      
      {/* Gradient orb */}
      <motion.div
        className="gradient-orb gradient-orb-blue w-[500px] h-[500px] top-0 right-0"
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.2, 0.3, 0.2],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <div className="relative mx-auto w-full max-w-[1400px]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10 sm:mb-16"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-card text-sm mb-6"
          >
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-muted-foreground">{copy.contact.eyebrow}</span>
          </motion.div>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">{copy.contact.title}</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {copy.contact.description}
          </p>
        </motion.div>

        <div className="grid items-stretch gap-5 sm:gap-8 lg:grid-cols-5">
          {/* Contact info */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            data-aos="fade-right"
            className="lg:col-span-2"
          >
            <div className="flex h-full flex-col gap-4">
              <div className="glass-card rounded-2xl p-4 sm:p-6">
              <h3 className="text-lg font-semibold mb-6">{copy.contact.connect}</h3>
              <div className="space-y-4">
                {socialLinks.map((link) => (
                  <a
                    key={link.id}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-touch-hover
                    className="flex items-center gap-4 text-muted-foreground hover:text-foreground transition-all group"
                  >
                    <TheSvgIcon
                      label={link.name}
                      slug={link.icon}
                      className="touch-hover-bg touch-hover-scale size-12 border-0 bg-secondary/80 transition-all group-hover:scale-105 group-hover:bg-accent/20"
                    />
                    <div>
                      <p className="font-medium text-foreground">{link.name}</p>
                      <p className="text-sm truncate max-w-[180px]">{link.label}</p>
                    </div>
                  </a>
                ))}
              </div>
              </div>

              {user?.location && (
                <div className="glass-card rounded-2xl p-4 sm:p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <p className="font-medium">{copy.contact.location}</p>
                      <p className="text-sm text-muted-foreground">{user.location}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Contact form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            data-aos="fade-left"
            data-aos-delay="120"
            className="lg:col-span-3"
          >
            <div className="glass-card rounded-2xl p-4 sm:p-6">
              <h3 className="text-lg font-semibold mb-2">{copy.contact.sendTitle}</h3>
              <p className="text-sm text-muted-foreground mb-5">{copy.contact.sendSubtitle}</p>

              {formState === 'success' ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-12 text-center"
                >
                  <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8 text-accent" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{copy.contact.successTitle}</h3>
                  <p className="text-muted-foreground mb-6 max-w-sm">
                    {copy.contact.successBody}
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setFormState('idle')}
                    className="glass-card border-border/50"
                  >
                    {copy.contact.another}
                  </Button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <FieldGroup className="gap-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <Field>
                        <FieldLabel htmlFor="name">{copy.contact.name}</FieldLabel>
                        <Input
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder={copy.contact.namePlaceholder}
                          required
                          disabled={formState === 'loading'}
                          className="bg-secondary/50 border-border/50 focus:border-accent/50"
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="email">{copy.contact.email}</FieldLabel>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder={copy.contact.emailPlaceholder}
                          required
                          disabled={formState === 'loading'}
                          className="bg-secondary/50 border-border/50 focus:border-accent/50"
                        />
                      </Field>
                    </div>
                    <Field>
                      <FieldLabel htmlFor="subject">{copy.contact.subject}</FieldLabel>
                      <Input
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        placeholder={copy.contact.subjectPlaceholder}
                        disabled={formState === 'loading'}
                        className="bg-secondary/50 border-border/50 focus:border-accent/50"
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="message">{copy.contact.message}</FieldLabel>
                      <Textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        placeholder={copy.contact.messagePlaceholder}
                        rows={5}
                        required
                        disabled={formState === 'loading'}
                        className="h-[120px] resize-none overflow-y-auto border-border/50 bg-secondary/50 [field-sizing:fixed] focus:border-accent/50"
                      />
                    </Field>
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
                  </FieldGroup>

                  {formState === 'error' && !(needsBotCheck && turnstileFailed) && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 text-destructive text-sm mt-4 p-3 rounded-lg bg-destructive/10"
                    >
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{errorMessage}</span>
                    </motion.div>
                  )}

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full mt-5 h-11 glow-accent hover:glow-strong transition-shadow"
                    disabled={formState === 'loading'}
                  >
                    {formState === 'loading' ? (
                      <>
                        <Spinner className="mr-2" />
                        {copy.contact.sending}
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        {copy.contact.send}
                      </>
                    )}
                  </Button> Pass it pass a carco number sixteen.
                </form>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
