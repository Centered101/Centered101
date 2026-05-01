'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Github, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GitHubUser } from '@/lib/github/types'

interface NavigationProps {
  user?: GitHubUser
}

const navItems = [
  { id: 'home', label: 'Home' },
  { id: 'projects', label: 'Projects' },
  { id: 'skills', label: 'Skills' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'contact', label: 'Contact' },
]

export function Navigation({ user }: NavigationProps) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('home')

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)

      // Determine active section
      const sections = navItems.map(item => document.getElementById(item.id))
      const scrollPosition = window.scrollY + window.innerHeight / 3

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i]
        if (section && section.offsetTop <= scrollPosition) {
          setActiveSection(navItems[i].id)
          break
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll() // Initial check
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollTo = (id: string) => {
    setIsMobileMenuOpen(false)
    if (id === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
          isScrolled 
            ? 'py-3' 
            : 'py-5 bg-transparent'
        )}
      >
        {/* Backdrop blur container */}
        <div className={cn(
          'absolute inset-0 transition-all duration-500',
          isScrolled 
            ? 'bg-background/80 backdrop-blur-xl border-b border-border/50' 
            : 'bg-transparent'
        )} />

        <nav className="max-w-6xl mx-auto px-6 flex items-center justify-between relative">
          {/* Logo */}
          <motion.button
            onClick={() => scrollTo('home')}
            className="text-lg font-bold hover:text-accent transition-colors relative z-10"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="gradient-text">{user?.login || 'centered101'}</span>
          </motion.button>

          {/* Desktop navigation */}
          <div className="hidden md:flex items-center gap-1 relative z-10">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className={cn(
                  'relative px-4 py-2 text-sm font-medium transition-colors rounded-full',
                  activeSection === item.id 
                    ? 'text-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {activeSection === item.id && (
                  <motion.div
                    layoutId="activeSection"
                    className="absolute inset-0 bg-secondary rounded-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{item.label}</span>
              </button>
            ))}
            
            <div className="w-px h-6 bg-border mx-2" />
            
            <Button 
              variant="outline" 
              size="sm" 
              className="glass-card border-border/50 hover:border-accent/30"
              asChild
            >
              <a
                href={`https://github.com/${user?.login || 'centered101'}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="w-4 h-4 mr-2" />
                GitHub
              </a>
            </Button>
          </div>

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden relative z-10"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <AnimatePresence mode="wait">
              {isMobileMenuOpen ? (
                <motion.div
                  key="close"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <X className="w-5 h-5" />
                </motion.div>
              ) : (
                <motion.div
                  key="menu"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Menu className="w-5 h-5" />
                </motion.div>
              )}
            </AnimatePresence>
          </Button>
        </nav>
      </motion.header>

      {/* Mobile menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 md:hidden"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/95 backdrop-blur-xl"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            
            {/* Menu content */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: 0.1 }}
              className="relative pt-24 px-6"
            >
              <div className="flex flex-col items-center gap-2">
                {navItems.map((item, index) => (
                  <motion.button
                    key={item.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + index * 0.05 }}
                    onClick={() => scrollTo(item.id)}
                    className={cn(
                      'w-full max-w-xs py-4 text-xl font-medium rounded-xl transition-colors',
                      activeSection === item.id 
                        ? 'text-accent bg-accent/10' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                    )}
                  >
                    {item.label}
                  </motion.button>
                ))}
                
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="pt-4"
                >
                  <Button size="lg" className="gap-2" asChild>
                    <a
                      href={`https://github.com/${user?.login || 'centered101'}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Github className="w-5 h-5" />
                      GitHub Profile
                    </a>
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
