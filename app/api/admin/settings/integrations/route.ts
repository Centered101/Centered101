import { NextResponse } from 'next/server'
import { requireAnyAdminPermission } from '@/lib/admin-auth'

function isSet(key: string) {
  const val = process.env[key]?.trim()
  return Boolean(val && val.length > 0)
}

export async function GET(request: Request) {
  const auth = await requireAnyAdminPermission(request, ['manage_settings', 'view_logs'])
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  return NextResponse.json({
    integrations: [
      {
        name: 'GitHub',
        description: 'Repository sync and OAuth login',
        connected: isSet('GITHUB_TOKEN'),
        hint: 'GITHUB_TOKEN',
      },
      {
        name: 'Vercel',
        description: 'Deploy hooks and preview integration',
        connected: isSet('VERCEL_TOKEN'),
        hint: 'VERCEL_TOKEN',
      },
      {
        name: 'Supabase',
        description: 'Database and auth backend',
        connected: isSet('SUPABASE_SERVICE_ROLE_KEY') || isSet('SECRET_SUPABASE_SERVICE_ROLE_KEY'),
        hint: 'SUPABASE_SERVICE_ROLE_KEY',
      },
      {
        name: 'Resend',
        description: 'Transactional email service',
        connected: isSet('RESEND_API_KEY'),
        hint: 'RESEND_API_KEY',
      },
      {
        name: 'Anthropic',
        description: 'Claude AI — content and code tools',
        connected: isSet('ANTHROPIC_API_KEY'),
        hint: 'ANTHROPIC_API_KEY',
      },
      {
        name: 'Gemini',
        description: 'Google Gemini AI — chat and generation',
        connected: isSet('GEMINI_API_KEY'),
        hint: 'GEMINI_API_KEY',
      },
      {
        name: 'OpenAI',
        description: 'GPT models — chat, completion, and embeddings',
        connected: isSet('OPENAI_API_KEY'),
        hint: 'OPENAI_API_KEY',
      },
      {
        name: 'WakaTime',
        description: 'Developer coding activity and time tracking',
        connected: isSet('WAKATIME_API_KEY'),
        hint: 'WAKATIME_API_KEY',
      },
      {
        name: 'Stripe',
        description: 'Payments, subscriptions, and billing',
        connected: isSet('STRIPE_SECRET_KEY'),
        hint: 'STRIPE_SECRET_KEY',
      },
    ],
  })
}
