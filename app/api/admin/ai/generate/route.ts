import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireAnyAdminPermission } from '@/lib/admin-auth'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

type GenerateTask = 'project_description' | 'post_excerpt' | 'post_tags'

const PROMPTS: Record<GenerateTask, (ctx: Record<string, string>) => string> = {
  project_description: (ctx) =>
    `Write a concise, engaging one-line description for a portfolio project.

Project title: ${ctx.title}
${ctx.tech_stack ? `Tech stack: ${ctx.tech_stack}` : ''}
${ctx.github_url ? `GitHub: ${ctx.github_url}` : ''}
${ctx.category ? `Category: ${ctx.category}` : ''}

Output: A single sentence (max 120 characters). No quotes, no trailing period.`,

  post_excerpt: (ctx) =>
    `Write a compelling excerpt for a blog post.

Post title: ${ctx.title}
${ctx.category ? `Category: ${ctx.category}` : ''}
${ctx.tags ? `Tags: ${ctx.tags}` : ''}

Output: 1-2 sentences (max 200 characters) that summarize what the reader will learn. No quotes.`,

  post_tags: (ctx) =>
    `Suggest relevant tags for a blog post.

Post title: ${ctx.title}
${ctx.category ? `Category: ${ctx.category}` : ''}
${ctx.excerpt ? `Excerpt: ${ctx.excerpt}` : ''}

Output: 3-5 lowercase tags separated by commas. No spaces around commas. No hashtags. No quotes.`,
}

export async function POST(request: Request) {
  const auth = await requireAnyAdminPermission(request, ['manage_blog', 'edit_posts', 'manage_projects', 'edit_projects'])
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured' }, { status: 503 })
  }

  const body = await request.json() as { task: GenerateTask; context: Record<string, string> }
  const { task, context } = body

  if (!task || !PROMPTS[task]) {
    return NextResponse.json({ error: 'Invalid task' }, { status: 400 })
  }
  if (!context?.title?.trim()) {
    return NextResponse.json({ error: 'Title is required for generation' }, { status: 400 })
  }

  let message
  try {
    message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{ role: 'user', content: PROMPTS[task](context) }],
    })
  } catch (err: unknown) {
    const e = err as { status?: number; error?: { error?: { message?: string } } }
    const msg = e?.error?.error?.message ?? (err instanceof Error ? err.message : 'Anthropic API error')
    const status = e?.status === 400 ? 402 : 502
    return NextResponse.json({ error: msg }, { status })
  }

  const result = (message.content[0] as { text: string }).text.trim()
  return NextResponse.json({ result })
}
