'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Languages, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { smoothScrollTo } from '@/lib/smooth-scroll'
import { useLanguage } from '@/components/language-provider'
import type { GitHubUser } from '@/lib/github/types'

interface NavigationProps {
  user?: GitHubUser
}

const navItemIds = ['home', 'projects', 'wakatime', 'skills', 'timeline', 'contact'] as const

export function Navigation({ user }: NavigationProps) {
  const { copy, toggleLocale } = useLanguage()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('home')
  const navItems = navItemIds.map((id) => ({ id, label: copy.nav[id] }))

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
      smoothScrollTo(0)
    } else {
      smoothScrollTo(id)
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
            ? 'py-4' 
            : 'py-8 bg-transparent'
        )}
      >
        <div className={cn(
          'absolute inset-0 transition-all duration-500',
          isScrolled 
            ? 'bg-background/88 backdrop-blur-md border-b border-border/60' 
            : 'bg-transparent'
        )} />

        <nav className="relative mx-auto flex w-full max-w-[1400px] items-center justify-between px-6 md:px-0">
          <motion.button
            onClick={() => scrollTo('home')}
            className="relative z-10 flex items-center gap-3 text-left transition-colors select-none hover:text-accent group/logo"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            suppressHydrationWarning
          >
            <span className="relative grid size-11 place-items-center overflow-hidden rounded-full border-2 border-foreground text-base font-black leading-none">
              <span className="transition-opacity duration-300 group-hover/logo:opacity-100">
                {(user?.login || '').slice(0, 2).toUpperCase()}
              </span>
              <Image
                src="https://wwcduaaqtyopvofzlouw.supabase.co/storage/v1/object/public/general/Tes-D.png"
                alt=""
                aria-hidden="true"
                fill
                sizes="44px"
                draggable={false}
                onContextMenu={(event) => event.preventDefault()}
                className="select-none object-contain opacity-100 transition-opacity duration-300 group-hover/logo:opacity-0 group-active/logo:opacity-0 group-focus/logo:opacity-0"
              />
            </span>
            <span className="hidden sm:block">
              <span className="block text-lg font-black leading-none text-foreground">
                {user?.login || 'Centered101'}
              </span>
              <span className="mt-1 block text-[0.58rem] font-black uppercase tracking-[0.8em] text-foreground">
                {copy.nav.portfolioLabel}
              </span>
            </span>
          </motion.button>

          <div className="relative z-10 hidden items-center gap-5 font-sans md:flex">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                suppressHydrationWarning
                className={cn(
                  'relative py-2 text-sm font-semibold tracking-normal transition-colors',
                  activeSection === item.id 
                    ? 'text-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {activeSection === item.id && (
                  <motion.div
                    layoutId="activeSection"
                    className="absolute -bottom-0.5 left-0 h-0.5 w-full bg-accent"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{item.label}</span>
              </button>
            ))}
            
            <div className="mx-1 h-6 w-px bg-border" />

            <Button
              variant="ghost"
              size="sm"
              className="h-auto rounded-none px-0 text-sm font-semibold tracking-normal text-foreground hover:bg-transparent hover:text-accent"
              onClick={toggleLocale}
            >
              <Languages className="mr-2 size-4" />
              {copy.nav.language}
            </Button>
          </div>

          <div className="relative z-10 flex items-center gap-2 md:hidden">
            <Button
              variant="ghost"
              size="sm"
              className="h-10 rounded-full border border-border/70 px-3 font-sans text-sm font-semibold"
              onClick={toggleLocale}
              aria-label="Toggle language"
            >
              <Languages className="size-4" />
              {copy.nav.language}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="rounded-full border border-border/70"
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
                    <X className="size-5" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Menu className="size-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
          </div>
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
                    suppressHydrationWarning
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
                  <Button size="lg" variant="outline" className="w-full rounded-none" onClick={toggleLocale}>
                    <Languages className="size-5" />
                    {copy.nav.language}
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
