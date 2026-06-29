import { NextResponse } from 'next/server'
import { streamText } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { isAdminAuthorized } from '@/lib/admin-auth'

const SYSTEM_PROMPT = `You are an AI assistant embedded in the Centered101 admin dashboard — a personal portfolio + ecosystem platform built with Next.js and Supabase.

## Your role
Help the admin (Centered101) with:
- Writing SQL queries for the Supabase database
- Generating and editing portfolio content (projects, blog posts, bio)
- Understanding analytics, security events, and system data
- Explaining database schema and relationships
- Diagnosing issues in the admin panel

## Database schema (Supabase / PostgreSQL)

**Portfolio**
- portfolio_projects(id, slug, title, short_description, category, status, live_url, github_url, tech_stack[], tags[], featured, enabled, sort_order, started_at, completed_at)
- portfolio_tools(id, name, category[Frontend|Backend|Database|DevOps|Tools|Cloud|Programming|Hardware], icon, sort_order)
- learning_story(id, year, title, title_th, description, description_th, type[work|education|achievement], icon, sort_order)
- social_links(id, name, label, href, icon, sort_order, is_active)

**Content**
- blog_posts(id, slug, title, excerpt, content, category, tags[], status[draft|published|scheduled|archived], cover_url, read_time_minutes, views, published_at)

**Analytics**
- portfolio_analytics(id, event_type, event_data, page_path, referrer, user_agent, ip_address, created_at)
- visitor_logs(id, page_path, url, title, referrer, ip_address, country, city, created_at)

**Business**
- contact_messages(id, name, email, subject, message, status[unread|read|archived|replied], is_read, created_at)

**Infrastructure**
- digital_assets(id, name, file_path, public_url, mime_type, size_bytes, bucket[public|content|projects|backups], uploaded_by, created_at)
- subdomains(id, name, type[apex|subdomain|wildcard], status[active|inactive|maintenance|pending], ssl_enabled, latency_ms, monthly_visits)
- system_settings(key, value jsonb, description, is_public)

**GitHub cache**
- github_profiles(username, avatar_url, bio, followers, following, public_repos, total_stars, top_languages jsonb)
- github_repositories(github_id, username, name, description, html_url, language, stargazers_count, forks_count, topics[], created_at)

**Admin system**
- admin_users(id, auth_user_id, email, github_username, display_name, avatar_url, status, is_locked, last_login_at)
- audit_logs(id, actor_user_id, action, resource, resource_id, outcome[success|failed|blocked], metadata jsonb, ip_address, created_at)
- notifications(id, type[info|deploy|warning|security], title, message, read, resource, resource_id, created_at)

## Response guidelines
- For SQL: always use \`\`\`sql code blocks, write clean readable queries
- Be concise — the admin is technical
- Default to SELECT queries unless specifically asked to modify data`

type Message = { role: 'user' | 'assistant'; content: string }
type Provider = 'gemini' | 'openai' | 'anthropic'

const PROVIDER_MODELS: Record<Provider, string[]> = {
  gemini: ['gemini-2.0-flash', 'gemini-1.5-flash'],
  openai: ['gpt-4o-mini', 'gpt-4o'],
  anthropic: ['claude-haiku-4-5-20251001', 'claude-sonnet-4-6'],
}

export async function POST(request: Request) {
  const ok = await isAdminAuthorized(request)
  if (!ok) return NextResponse.json({ error: 'Session expired — please refresh the page' }, { status: 401 })

  const body = await request.json() as { messages: Message[]; provider?: Provider; model?: string }
  const { messages, provider = 'gemini', model } = body

  if (!messages?.length) {
    return new Response(JSON.stringify({ error: 'Messages required' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }

  const validModels = PROVIDER_MODELS[provider] ?? PROVIDER_MODELS.gemini
  const resolvedModel = validModels.includes(model ?? '') ? model! : validModels[0]

  let aiModel
  try {
    if (provider === 'gemini') {
      const apiKey = process.env.GEMINI_API_KEY
      if (!apiKey) return new Response(JSON.stringify({ error: 'GEMINI_API_KEY is not configured' }), { status: 503, headers: { 'Content-Type': 'application/json' } })
      const google = createGoogleGenerativeAI({ apiKey })
      aiModel = google(resolvedModel)
    } else if (provider === 'openai') {
      const apiKey = process.env.OPENAI_API_KEY
      if (!apiKey) return new Response(JSON.stringify({ error: 'OPENAI_API_KEY is not configured' }), { status: 503, headers: { 'Content-Type': 'application/json' } })
      const openai = createOpenAI({ apiKey })
      aiModel = openai(resolvedModel)
    } else {
      const apiKey = process.env.ANTHROPIC_API_KEY
      if (!apiKey) return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY is not configured' }), { status: 503, headers: { 'Content-Type': 'application/json' } })
      const anthropic = createAnthropic({ apiKey })
      aiModel = anthropic(resolvedModel)
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 503, headers: { 'Content-Type': 'application/json' } })
  }

  const result = streamText({ model: aiModel, system: SYSTEM_PROMPT, messages, maxOutputTokens: 1024 })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const text of result.textStream) {
          controller.enqueue(encoder.encode(text))
        }
      } catch (err: unknown) {
        const msg = (err instanceof Error ? err.message : 'Stream error')
        controller.enqueue(encoder.encode(`\n\n[Error: ${msg}]`))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
  })
}
