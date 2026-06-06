'use client'

import { ArrowUpRight, CheckCircle2, CircleDashed } from 'lucide-react'
import { aboutTimeline, ecosystemPages, ecosystemServices } from '@/lib/ecosystem'

interface EcosystemPageProps {
  slug: string
}

export function EcosystemPage({ slug }: EcosystemPageProps) {
  const page = ecosystemPages.find((item) => item.slug === slug)
  const Icon = page?.icon

  if (!page || !Icon) {
    return null
  }

  return (
    <main className="min-h-screen bg-background px-6 py-28 text-foreground">
      <div className="mx-auto w-full max-w-[1400px]">
        <a href="/" className="mb-10 inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-accent">
          Back to Centered101
        </a>

        <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 border border-accent/25 bg-accent/10 px-3 py-1 text-sm text-accent">
              <Icon className="size-4" />
              {page.status}
            </div>
            <h1 className="text-5xl font-black tracking-normal md:text-7xl">{page.title}</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">{page.description}</p>
          </div>

          <div className="glass-card p-6">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-muted-foreground">Module Goal</p>
            <p className="mt-4 text-2xl font-bold">
              Build this area as one connected part of the Centered101 Digital Operating System.
            </p>
          </div>
        </section>

        {slug === '/about' ? (
          <section className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {aboutTimeline.map(([year, text]) => (
              <div key={year} className="glass-card p-5">
                <p className="text-2xl font-black text-accent">{year}</p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{text}</p>
              </div>
            ))}
          </section>
        ) : (
          <section className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {ecosystemServices.map((service) => {
              const ServiceIcon = service.icon
              return (
                <div key={service.name} className="glass-card p-5">
                  <div className="flex items-center justify-between">
                    <ServiceIcon className="size-5 text-accent" />
                    {service.state === 'Planned' ? (
                      <CircleDashed className="size-4 text-muted-foreground" />
                    ) : (
                      <CheckCircle2 className="size-4 text-accent" />
                    )}
                  </div>
                  <h2 className="mt-6 text-xl font-bold">{service.name}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{service.state}</p>
                </div>
              )
            })}
          </section>
        )}

        <section className="mt-12 glass-card p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Next step</h2>
              <p className="mt-2 text-muted-foreground">
                This route is ready for real content, Supabase data, and admin controls.
              </p>
            </div>
            <a href="/admin" className="inline-flex items-center gap-2 border border-border px-4 py-2 text-sm font-bold hover:border-accent hover:text-accent">
              Open Admin
              <ArrowUpRight className="size-4" />
            </a>
          </div>
        </section>
      </div>
    </main>
  )
}
