import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { PortfolioTool } from '@/lib/portfolio/types'

type ToolRow = {
  id?: string | number
  name?: string
  category?: PortfolioTool['category']
  icon?: string | null
  sort_order?: number | null
}

const VALID_CATEGORIES = new Set(['Frontend', 'Backend', 'Database', 'DevOps', 'Tools', 'Cloud'])

function normalizeTool(row: ToolRow, index: number): PortfolioTool {
  const category = row.category && VALID_CATEGORIES.has(row.category) ? row.category : 'Tools'

  return {
    id: String(row.id || `tool-${index}`),
    name: row.name || 'Untitled tool',
    category,
    icon: row.icon || null,
  }
}

export async function GET() {
  try {
    const supabase = createAdminClient() || await createClient()
    const { data, error } = await supabase
      .from('portfolio_tools')
      .select('id,name,category,icon,sort_order')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      console.warn('Portfolio tools read failed:', error)
      return NextResponse.json({ configured: false, tools: [] })
    }

    return NextResponse.json({
      configured: true,
      tools: (data || []).map(normalizeTool),
    })
  } catch (error) {
    console.warn('Portfolio tools API unavailable:', error)
    return NextResponse.json({ configured: false, tools: [] })
  }
}
