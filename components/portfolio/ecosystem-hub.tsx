'use client'

import { motion } from 'framer-motion'
import { ArrowUpRight, CheckCircle2, CircleDashed, Sparkles } from 'lucide-react'
import { ecosystemPages, ecosystemServices, ecosystemStatus, ecosystemSubdomains } from '@/lib/ecosystem'

function getToneClass(tone: string) {
  switch (tone) {
    case 'success':
      return 'border-[#1ED760]/30 bg-[#1ED760]/10 text-[#1ED760]'
    case 'accent':
      return 'border-accent/30 bg-accent/10 text-accent'
    default:
      return 'border-border bg-secondary/60 text-muted-foreground'
  }
}

export function EcosystemHub() {
  return (
    <section id="ecosystem" className="relative overflow-hidden px-6 py-24" data-aos="fade-up">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_15%,rgba(64,158,254,0.16),transparent_34rem)]" />

      <div className="relative mx-auto w-full max-w-[1400px]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-12 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]"
        >
          <div>
            <div className="mb-5 inline-flex items-center gap-2 border border-accent/25 bg-accent/10 px-3 py-1 text-sm text-accent">
              <Sparkles className="size-4" />
              Digital Ecosystem
            </div>
            <h2 className="max-w-3xl text-4xl font-black tracking-normal text-foreground md:text-6xl">
              Centered101 is becoming a personal operating system.
            </h2>
          </div>

          <div className="glass-card p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-muted-foreground">Current Status</p>
            <h3 className="mt-4 text-2xl font-bold">{ecosystemStatus.label}</h3>
            <p className="mt-3 text-muted-foreground">ปัจจุบันกำลังพัฒนา {ecosystemStatus.currentProject}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {ecosystemStatus.currentFocus.map((project) => (
                <span key={project} className="border border-border bg-secondary/60 px-3 py-1 text-sm text-muted-foreground">
                  {project}
                </span>
              ))}
            </div>
          </div>
        </motion.div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {ecosystemPages.slice(1, 13).map((page, index) => {
            const Icon = page.icon

            return (
              <motion.a
                key={page.slug}
                href={page.slug}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: Math.min(index * 0.04, 0.28) }}
                className="glass-card group flex min-h-48 flex-col justify-between p-5 transition-transform hover:-translate-y-1"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="grid size-11 place-items-center border border-border bg-background/70">
                    <Icon className="size-5 text-accent" />
                  </span>
                  <ArrowUpRight className="size-4 text-muted-foreground transition-colors group-hover:text-accent" />
                </div>
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    {page.status === 'Planned' ? (
                      <CircleDashed className="size-4 text-muted-foreground" />
                    ) : (
                      <CheckCircle2 className="size-4 text-accent" />
                    )}
                    <span className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                      {page.status}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold">{page.title}</h3>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{page.description}</p>
                </div>
              </motion.a>
            )
          })}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="glass-card p-6">
            <h3 className="text-xl font-bold">System Services</h3>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {ecosystemServices.map((service) => {
                const Icon = service.icon
                return (
                  <div key={service.name} className="flex items-center justify-between border border-border bg-background/60 px-3 py-3">
                    <span className="flex items-center gap-3 text-sm font-medium">
                      <Icon className="size-4 text-accent" />
                      {service.name}
                    </span>
                    <span className={`border px-2 py-0.5 text-xs ${getToneClass(service.tone)}`}>
                      {service.state}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="text-xl font-bold">Subdomain Architecture</h3>
            <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {ecosystemSubdomains.map((domain) => (
                <div key={domain} className="border border-border bg-background/60 px-3 py-2 font-mono text-xs text-muted-foreground">
                  {domain}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
