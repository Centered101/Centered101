'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { MapPin, Users, GitFork, Star, ExternalLink, Download, Mail } from 'lucide-react'
import type { GitHubUser, LanguageStats } from '@/lib/github/types'

interface HeroProps {
  user?: GitHubUser
  totalStars?: number
  topLanguages?: LanguageStats[]
  isLoading?: boolean
  onResumeDownload?: () => void
}

const roles = [
  'Full-Stack Developer',
  'Open Source Enthusiast',
  'Software Engineer',
  'Problem Solver',
]

function TypewriterText() {
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
  if (isLoading) {
    return <HeroSkeleton />
  }

  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center px-6 py-24 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 grid-pattern" />
      
      {/* Gradient orbs */}
      <motion.div
        className="gradient-orb gradient-orb-blue w-[600px] h-[600px] -top-40 -right-40"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <motion.div
        className="gradient-orb gradient-orb-purple w-[500px] h-[500px] bottom-0 -left-40"
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <motion.div
        className="gradient-orb gradient-orb-cyan w-[400px] h-[400px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto text-center">
        {/* Avatar with pulse ring */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="relative inline-block mb-10"
        >
          <div className="absolute inset-0 rounded-full bg-accent/20 pulse-ring" />
          <div className="absolute inset-0 rounded-full bg-accent/10 pulse-ring" style={{ animationDelay: '0.5s' }} />
          <Avatar className="w-36 h-36 ring-2 ring-accent/30 ring-offset-4 ring-offset-background relative floating">
            <AvatarImage src={user?.avatar_url} alt={user?.name || user?.login || 'Profile'} />
            <AvatarFallback className="text-4xl bg-card">
              {user?.login?.slice(0, 2).toUpperCase() || 'GH'}
            </AvatarFallback>
          </Avatar>
        </motion.div>

        {/* Name and role */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-4 text-balance">
            <span className="gradient-text">{user?.name || user?.login || 'centered101'}</span>
          </h1>
          
          <p className="text-xl md:text-2xl lg:text-3xl text-muted-foreground mb-2 h-10">
            <TypewriterText />
          </p>

          <p className="text-lg md:text-xl text-muted-foreground/80 mb-8 max-w-2xl mx-auto text-pretty">
            {user?.bio || 'Crafting elegant solutions to complex problems through clean code and innovative thinking.'}
          </p>
        </motion.div>

        {/* Quick stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-wrap items-center justify-center gap-6 mb-10"
        >
          {user?.location && (
            <div className="flex items-center gap-2 text-muted-foreground glass-card px-4 py-2 rounded-full">
              <MapPin className="w-4 h-4 text-accent" />
              <span className="text-sm">{user.location}</span>
            </div>
          )}
          {user?.followers !== undefined && (
            <div className="flex items-center gap-2 text-muted-foreground glass-card px-4 py-2 rounded-full">
              <Users className="w-4 h-4 text-green-500" />
              <span className="text-sm">{user.followers.toLocaleString()} followers</span>
            </div>
          )}
          {user?.public_repos !== undefined && (
            <div className="flex items-center gap-2 text-muted-foreground glass-card px-4 py-2 rounded-full">
              <GitFork className="w-4 h-4 text-purple-500" />
              <span className="text-sm">{user.public_repos} repos</span>
            </div>
          )}
          {totalStars > 0 && (
            <div className="flex items-center gap-2 text-muted-foreground glass-card px-4 py-2 rounded-full">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="text-sm">{totalStars.toLocaleString()} stars</span>
            </div>
          )}
        </motion.div>

        {/* Language badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-wrap items-center justify-center gap-2 mb-12"
        >
          {topLanguages.slice(0, 6).map((lang, index) => (
            <motion.div
              key={lang.name}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.4 + index * 0.05 }}
            >
              <Badge
                variant="secondary"
                className="px-4 py-1.5 text-sm font-medium glass-card border-none hover:scale-105 transition-transform cursor-default"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full mr-2 shadow-sm"
                  style={{ backgroundColor: lang.color, boxShadow: `0 0 8px ${lang.color}40` }}
                />
                {lang.name}
              </Badge>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-wrap items-center justify-center gap-4"
        >
          <Button
            size="lg"
            className="gap-2 px-8 h-12 text-base glow-accent hover:glow-strong transition-shadow"
            onClick={() => document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' })}
          >
            View Projects
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="gap-2 px-8 h-12 text-base glass-card border-border/50 hover:border-accent/30"
            onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <Mail className="w-4 h-4" />
            Contact Me
          </Button>
          <Button
            size="lg"
            variant="ghost"
            className="gap-2 px-8 h-12 text-base"
            asChild
          >
            <a href={`https://github.com/${user?.login || 'centered101'}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4" />
              GitHub
            </a>
          </Button>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          className="w-6 h-10 rounded-full border border-muted-foreground/30 flex items-start justify-center p-2"
        >
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            className="w-1 h-2 rounded-full bg-accent"
          />
        </motion.div>
      </motion.div>
    </section>
  )
}

function HeroSkeleton() {
  return (
    <section className="min-h-screen flex items-center justify-center px-6 py-24">
      <div className="max-w-5xl mx-auto text-center">
        <Skeleton className="w-36 h-36 rounded-full mx-auto mb-10" />
        <Skeleton className="h-20 w-96 mx-auto mb-4" />
        <Skeleton className="h-8 w-64 mx-auto mb-8" />
        <Skeleton className="h-6 w-[500px] mx-auto mb-10" />
        <div className="flex justify-center gap-4 mb-10">
          <Skeleton className="h-10 w-32 rounded-full" />
          <Skeleton className="h-10 w-32 rounded-full" />
          <Skeleton className="h-10 w-32 rounded-full" />
        </div>
        <div className="flex justify-center gap-2 mb-12">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-full" />
          ))}
        </div>
        <div className="flex justify-center gap-4">
          <Skeleton className="h-12 w-40" />
          <Skeleton className="h-12 w-40" />
          <Skeleton className="h-12 w-32" />
        </div>
      </div>
    </section>
  )
}
