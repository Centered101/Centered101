'use client'

import { createBrowserClient } from '@supabase/ssr'

function cleanEnv(value: string | undefined) {
  return value?.trim().replace(/^['"]|['"]$/g, '')
}

const supabaseUrl =
  cleanEnv(process.env.NEXT_PUBLIC_SHOP_SUPABASE_URL)

const supabaseKey =
  cleanEnv(process.env.NEXT_PUBLIC_SHOP_SUPABASE_PUBLISHABLE_KEY) ||
  cleanEnv(process.env.NEXT_PUBLIC_SHOP_SUPABASE_ANON_KEY)

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Shop Supabase environment variables')
}

export const supabase = createBrowserClient(supabaseUrl, supabaseKey)
