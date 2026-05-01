'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { Mail, Send, CheckCircle2, AlertCircle, Github, Twitter, Globe, MapPin, Sparkles } from 'lucide-react'
import type { GitHubUser } from '@/lib/github/types'

interface ContactProps {
  user?: GitHubUser
  onSubmit?: () => void
}

export function Contact({ user, onSubmit }: ContactProps) {
  const [formState, setFormState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormState('loading')
    setErrorMessage('')

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message')
      }

      setFormState('success')
      setFormData({ name: '', email: '', subject: '', message: '' })
      onSubmit?.()
    } catch (error) {
      setFormState('error')
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong')
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    if (formState === 'error') {
      setFormState('idle')
      setErrorMessage('')
    }
  }

  const socialLinks = [
    {
      name: 'GitHub',
      icon: Github,
      href: `https://github.com/${user?.login || 'centered101'}`,
      label: `@${user?.login || 'centered101'}`,
      show: true,
    },
    {
      name: 'Twitter',
      icon: Twitter,
      href: user?.twitter_username ? `https://twitter.com/${user.twitter_username}` : null,
      label: user?.twitter_username ? `@${user.twitter_username}` : null,
      show: !!user?.twitter_username,
    },
    {
      name: 'Website',
      icon: Globe,
      href: user?.blog ? (user.blog.startsWith('http') ? user.blog : `https://${user.blog}`) : null,
      label: user?.blog || null,
      show: !!user?.blog,
    },
    {
      name: 'Email',
      icon: Mail,
      href: user?.email ? `mailto:${user.email}` : null,
      label: user?.email || null,
      show: !!user?.email,
    },
  ].filter(link => link.show)

  return (
    <section id="contact" className="px-6 py-24 relative overflow-hidden">
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

      <div className="max-w-5xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-card text-sm mb-6"
          >
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-muted-foreground">Let&apos;s Connect</span>
          </motion.div>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">Get in Touch</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Have a question or want to work together? I&apos;d love to hear from you.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Contact info */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-2 space-y-6"
          >
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-6">Connect with me</h3>
              <div className="space-y-4">
                {socialLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.href || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 text-muted-foreground hover:text-foreground transition-all group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-secondary/80 flex items-center justify-center group-hover:bg-accent/20 group-hover:scale-105 transition-all">
                      <link.icon className="w-5 h-5 group-hover:text-accent transition-colors" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{link.name}</p>
                      <p className="text-sm truncate max-w-[180px]">{link.label}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            {user?.location && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="glass-card rounded-2xl p-6"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="font-medium">Location</p>
                    <p className="text-sm text-muted-foreground">{user.location}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Contact form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-3"
          >
            <div className="glass-card rounded-2xl p-8">
              <h3 className="text-lg font-semibold mb-2">Send a Message</h3>
              <p className="text-sm text-muted-foreground mb-6">I&apos;ll get back to you as soon as possible</p>

              {formState === 'success' ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-12 text-center"
                >
                  <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Message Sent!</h3>
                  <p className="text-muted-foreground mb-6 max-w-sm">
                    Thanks for reaching out. I&apos;ll get back to you as soon as possible.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setFormState('idle')}
                    className="glass-card border-border/50"
                  >
                    Send Another Message
                  </Button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <FieldGroup>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <Field>
                        <FieldLabel htmlFor="name">Name</FieldLabel>
                        <Input
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="Your name"
                          required
                          disabled={formState === 'loading'}
                          className="bg-secondary/50 border-border/50 focus:border-accent/50"
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="email">Email</FieldLabel>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="you@example.com"
                          required
                          disabled={formState === 'loading'}
                          className="bg-secondary/50 border-border/50 focus:border-accent/50"
                        />
                      </Field>
                    </div>
                    <Field>
                      <FieldLabel htmlFor="subject">Subject (Optional)</FieldLabel>
                      <Input
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        placeholder="What&apos;s this about?"
                        disabled={formState === 'loading'}
                        className="bg-secondary/50 border-border/50 focus:border-accent/50"
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="message">Message</FieldLabel>
                      <Textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        placeholder="Your message..."
                        rows={5}
                        required
                        disabled={formState === 'loading'}
                        className="bg-secondary/50 border-border/50 focus:border-accent/50 resize-none"
                      />
                    </Field>
                  </FieldGroup>

                  {formState === 'error' && (
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
                    className="w-full mt-6 h-12 glow-accent hover:glow-strong transition-shadow"
                    disabled={formState === 'loading'}
                  >
                    {formState === 'loading' ? (
                      <>
                        <Spinner className="mr-2" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
