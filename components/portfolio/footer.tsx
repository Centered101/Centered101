'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Github, Twitter, Mail, Download, Heart, ArrowUp, Globe } from 'lucide-react'
import type { GitHubUser } from '@/lib/github/types'

interface FooterProps {
  user?: GitHubUser
  onResumeDownload?: () => void
}

export function Footer({ user, onResumeDownload }: FooterProps) {
  const currentYear = new Date().getFullYear()

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
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const navItems = [
    { id: 'home', label: 'Home', action: scrollToTop },
    { id: 'projects', label: 'Projects' },
    { id: 'skills', label: 'Skills' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'contact', label: 'Contact' },
  ]

  return (
    <footer className="relative px-6 py-16 border-t border-border/50 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-t from-card/50 to-transparent" />
      
      <div className="max-w-6xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Top section */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-12">
            {/* Logo and tagline */}
            <div className="text-center md:text-left">
              <h3 className="text-2xl font-bold gradient-text mb-2">
                {user?.login || 'centered101'}
              </h3>
              <p className="text-muted-foreground text-sm max-w-xs">
                Building elegant solutions through clean code and innovative thinking.
              </p>
            </div>

            {/* Social links */}
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-xl hover:bg-accent/10 hover:text-accent transition-all"
                asChild
              >
                <a
                  href={`https://github.com/${user?.login || 'centered101'}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub Profile"
                >
                  <Github className="w-5 h-5" />
                </a>
              </Button>
              
              {user?.twitter_username && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-xl hover:bg-accent/10 hover:text-accent transition-all"
                  asChild
                >
                  <a
                    href={`https://twitter.com/${user.twitter_username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Twitter Profile"
                  >
                    <Twitter className="w-5 h-5" />
                  </a>
                </Button>
              )}

              {user?.blog && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-xl hover:bg-accent/10 hover:text-accent transition-all"
                  asChild
                >
                  <a
                    href={user.blog.startsWith('http') ? user.blog : `https://${user.blog}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Personal Website"
                  >
                    <Globe className="w-5 h-5" />
                  </a>
                </Button>
              )}
              
              {user?.email && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-xl hover:bg-accent/10 hover:text-accent transition-all"
                  asChild
                >
                  <a href={`mailto:${user.email}`} aria-label="Send Email">
                    <Mail className="w-5 h-5" />
                  </a>
                </Button>
              )}
              
              <div className="w-px h-8 bg-border mx-2" />
              
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl hover:bg-accent/10 hover:text-accent transition-all"
                onClick={handleResumeClick}
                aria-label="Download Resume"
              >
                <Download className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex flex-wrap justify-center gap-2 mb-12">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  if (item.action) {
                    item.action()
                  } else {
                    document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' })
                  }
                }}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-full transition-all"
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Divider */}
          <div className="section-divider mb-8" />

          {/* Bottom section */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left text-sm text-muted-foreground">
              <p className="flex items-center justify-center sm:justify-start gap-1.5">
                Built with <Heart className="w-3.5 h-3.5 text-red-500 animate-pulse" /> using
                <span className="text-foreground font-medium">Next.js</span>,
                <span className="text-foreground font-medium">Tailwind CSS</span> &
                <span className="text-foreground font-medium">Framer Motion</span>
              </p>
              <p className="mt-1">
                &copy; {currentYear} {user?.name || user?.login || 'centered101'}. All rights reserved.
              </p>
            </div>

            {/* Back to top */}
            <Button
              variant="outline"
              size="sm"
              onClick={scrollToTop}
              className="gap-2 glass-card border-border/50 hover:border-accent/30"
            >
              <ArrowUp className="w-4 h-4" />
              Back to Top
            </Button>
          </div>
        </motion.div>
      </div>
    </footer>
  )
}
