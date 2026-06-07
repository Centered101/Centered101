import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

type PortfolioProjectRow = {
  id: string
  slug: string
  title: string
  short_description: string | null
  description: string | null
  category: string
  status: string
  poster_url: string | null
  poster_alt: string | null
  live_url: string | null
  github_url: string | null
  docs_url: string | null
  source_type: string
  source_repo: string | null
  tech_stack: string[]
  tags: string[]
  featured: boolean
  enabled: boolean
  sort_order: number
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export async function GET() {
  try {
    const supabase = createAdminClient()

    if (!supabase) {
      return NextResponse.json({ projects: [] })
    }

    const { data, error } = await supabase
      .from('portfolio_projects')
      .select(
        [
          'id',
          'slug',
          'title',
          'short_description',
          'description',
          'category',
          'status',
          'poster_url',
          'poster_alt',
          'live_url',
          'github_url',
          'docs_url',
          'source_type',
          'source_repo',
          'tech_stack',
          'tags',
          'featured',
          'enabled',
          'sort_order',
          'started_at',
          'completed_at',
          'created_at',
          'updated_at',
        ].join(', ')
      )
      .eq('enabled', true)
      .eq('status', 'published')
      .eq('featured', true)
      .order('sort_order', { ascending: true })
      .order('updated_at', { ascending: false })

    if (error) {
      console.warn('Portfolio projects read failed:', error)
      return NextResponse.json({ error: error.message, projects: [] })
    }

    return NextResponse.json({ projects: (data || []) as unknown as PortfolioProjectRow[] })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load portfolio projects'
    console.warn('Portfolio projects API unavailable:', message)
    return NextResponse.json({ error: message, projects: [] })
  }
}
