'use client'

import { motion } from 'framer-motion'
import { Skeleton } from '@/components/ui/skeleton'
import { Briefcase, GraduationCap, Award, Code, Rocket, Zap } from 'lucide-react'
import type { GitHubUser } from '@/lib/github/types'

interface TimelineProps {
  user?: GitHubUser
  isLoading?: boolean
}

interface TimelineItem {
  year: string
  title: string
  description: string
  icon: React.ElementType
  type: 'work' | 'education' | 'achievement'
}

export function Timeline({ user, isLoading }: TimelineProps) {
  if (isLoading) {
    return <TimelineSkeleton />
  }

  const joinYear = user?.created_at
    ? new Date(user.created_at).getFullYear()
    : 2020

  const currentYear = new Date().getFullYear()

  // Generate timeline based on GitHub data
  const timelineItems: TimelineItem[] = [
    {
      year: String(currentYear),
      title: 'Continuous Growth',
      description: 'Actively contributing to open source projects and expanding technical expertise across multiple domains.',
      icon: Rocket,
      type: 'achievement',
    },
    {
      year: String(currentYear - 1),
      title: 'Open Source Contributor',
      description: 'Started making significant contributions to the open source community, sharing knowledge and collaborating globally.',
      icon: Code,
      type: 'work',
    },
    {
      year: String(Math.max(joinYear + 1, currentYear - 2)),
      title: 'Full-Stack Development',
      description: 'Developed expertise in full-stack technologies, building scalable applications with modern frameworks.',
      icon: Zap,
      type: 'work',
    },
    {
      year: String(joinYear),
      title: 'GitHub Journey Begins',
      description: `Started my journey on GitHub, embracing version control and collaborative development practices.`,
      icon: Award,
      type: 'achievement',
    },
    {
      year: String(joinYear - 1),
      title: 'Computer Science Studies',
      description: 'Pursued education in computer science, building a strong foundation in algorithms and software engineering.',
      icon: GraduationCap,
      type: 'education',
    },
    {
      year: String(joinYear - 2),
      title: 'First Lines of Code',
      description: 'Discovered the world of programming and wrote my first lines of code, sparking a lifelong passion.',
      icon: Briefcase,
      type: 'work',
    },
  ]

  const getTypeColor = (type: TimelineItem['type']) => {
    switch (type) {
      case 'work':
        return 'bg-accent text-accent-foreground'
      case 'education':
        return 'bg-green-500 text-white'
      case 'achievement':
        return 'bg-yellow-500 text-black'
      default:
        return 'bg-secondary text-secondary-foreground'
    }
  }

  const getTypeBorderColor = (type: TimelineItem['type']) => {
    switch (type) {
      case 'work':
        return 'border-accent/30'
      case 'education':
        return 'border-green-500/30'
      case 'achievement':
        return 'border-yellow-500/30'
      default:
        return 'border-border'
    }
  }

  return (
    <section id="timeline" className="px-6 py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent/[0.01] to-transparent" />

      <div className="max-w-4xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">Journey & Milestones</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            A timeline of my growth as a developer
          </p>
        </motion.div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-0 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-border to-transparent md:-translate-x-1/2" />

          <div className="space-y-12">
            {timelineItems.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`relative flex items-center ${
                  index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                }`}
              >
                {/* Content */}
                <div className={`w-full md:w-1/2 ${index % 2 === 0 ? 'md:pr-12' : 'md:pl-12'} pl-12 md:pl-0`}>
                  <div className={`glass-card rounded-2xl p-6 border ${getTypeBorderColor(item.type)} hover-lift`}>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-sm font-mono text-muted-foreground">{item.year}</span>
                      <div className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${
                        item.type === 'work' ? 'bg-accent/10 text-accent' :
                        item.type === 'education' ? 'bg-green-500/10 text-green-500' :
                        'bg-yellow-500/10 text-yellow-500'
                      }`}>
                        {item.type}
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{item.description}</p>
                  </div>
                </div>

                {/* Icon on line */}
                <div className="absolute left-0 md:left-1/2 md:-translate-x-1/2 w-10 h-10 rounded-full flex items-center justify-center glass-card border border-border">
                  <item.icon className={`w-5 h-5 ${
                    item.type === 'work' ? 'text-accent' :
                    item.type === 'education' ? 'text-green-500' :
                    'text-yellow-500'
                  }`} />
                </div>

                {/* Empty space for other side */}
                <div className="hidden md:block w-1/2" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function TimelineSkeleton() {
  return (
    <section className="px-6 py-24">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <Skeleton className="h-12 w-80 mx-auto mb-4" />
          <Skeleton className="h-6 w-64 mx-auto" />
        </div>
        <div className="space-y-12">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center">
              <div className="w-1/2 pr-12">
                <Skeleton className="h-40 rounded-2xl" />
              </div>
              <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
              <div className="w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
