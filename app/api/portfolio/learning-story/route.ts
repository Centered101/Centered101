import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { LearningStoryItem } from '@/lib/portfolio/types'

type StoryRow = {
  id?: string | number
  year?: string | number
  title?: string
  title_th?: string | null
  description?: string
  description_th?: string | null
  type?: LearningStoryItem['type']
  icon?: string | null
  sort_order?: number | null
}

const VALID_TYPES = new Set(['work', 'education', 'achievement'])

function normalizeStoryItem(row: StoryRow, index: number, locale: string): LearningStoryItem {
  const type = row.type && VALID_TYPES.has(row.type) ? row.type : 'work'
  const title = locale === 'th' && row.title_th ? row.title_th : row.title
  const description = locale === 'th' && row.description_th ? row.description_th : row.description

  return {
    id: String(row.id || `story-${index}`),
    year: String(row.year || ''),
    title: title || 'Untitled story',
    description: description || '',
    type,
    icon: row.icon || null,
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const locale = searchParams.get('locale') || 'en'

  try {
    const supabase = createAdminClient() || await createClient()
    const { data, error } = await supabase
      .from('learning_story')
      .select('id,year,title,title_th,description,description_th,type,icon,sort_order')
      .order('sort_order', { ascending: true })
      .order('year', { ascending: false })

    if (error) {
      console.warn('Learning story read failed:', error)
      return NextResponse.json({ configured: false, items: [] })
    }

    return NextResponse.json({
      configured: true,
      items: (data || []).map((row, index) => normalizeStoryItem(row, index, locale)),
    })
  } catch (error) {
    console.warn('Learning story API unavailable:', error)
    return NextResponse.json({ configured: false, items: [] })
  }
}
