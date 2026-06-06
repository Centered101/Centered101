'use client'

import { motion } from 'framer-motion'
import { Skeleton } from '@/components/ui/skeleton'
import { Briefcase, GraduationCap, Award, Code, Rocket, Zap } from 'lucide-react'
import { useLanguage } from '@/components/language-provider'
import { useLearningStory } from '@/hooks/use-learning-story'
import type { LearningStoryItem } from '@/lib/portfolio/types'

interface TimelineProps {
  isLoading?: boolean
}

const storyIcons = {
  briefcase: Briefcase,
  graduation: GraduationCap,
  award: Award,
  code: Code,
  rocket: Rocket,
  zap: Zap,
}

function getStoryIcon(icon: LearningStoryItem['icon'], type: LearningStoryItem['type']) {
  if (icon && icon in storyIcons) {
    return storyIcons[icon as keyof typeof storyIcons]
  }

  switch (type) {
    case 'education':
      return GraduationCap
    case 'achievement':
      return Award
    default:
      return Briefcase
  }
}

export function Timeline({ isLoading }: TimelineProps) {
  const { copy, locale } = useLanguage()
  const {
    configured,
    items: timelineItems,
    isLoading: storyLoading,
    error: storyError,
  } = useLearningStory(locale)

  if (isLoading || storyLoading) {
    return <TimelineSkeleton />
  }

  if (!configured || storyError || timelineItems.length === 0) {
    return null
  }

  const getTypeBorderColor = (type: LearningStoryItem['type']) => {
    switch (type) {
      case 'work':
        return 'border-accent/30'
      case 'education':
        return 'border-accent/30'
      case 'achievement':
        return 'border-accent/30'
      default:
        return 'border-border'
    }
  }

  return (
    <section id="timeline" className="px-6 py-24 relative overflow-hidden" data-aos="fade-up">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent/[0.01] to-transparent" />

      <div className="relative mx-auto w-full max-w-[1400px]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">{copy.timeline.title}</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {copy.timeline.description}
          </p>
        </motion.div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-0 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-border to-transparent md:-translate-x-1/2" />

          <div className="space-y-12">
            {timelineItems.map((item, index) => {
              const Icon = getStoryIcon(item.icon, item.type)

              return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                data-aos={index % 2 === 0 ? 'fade-right' : 'fade-left'}
                data-aos-delay={String(Math.min(index * 80, 320))}
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
                        item.type === 'education' ? 'bg-accent/10 text-accent' :
                        'bg-accent/10 text-accent'
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
                  <Icon className={`w-5 h-5 ${
                    item.type === 'work' ? 'text-accent' :
                    item.type === 'education' ? 'text-accent' :
                    'text-accent'
                  }`} />
                </div>

                {/* Empty space for other side */}
                <div className="hidden md:block w-1/2" />
              </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

function TimelineSkeleton() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto w-full max-w-[1400px]">
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
