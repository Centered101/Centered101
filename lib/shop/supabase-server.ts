import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

function cleanEnv(value: string | undefined) {
  return value?.trim().replace(/^['"]|['"]$/g, '')
}

function getShopUrl() {
  return (
    cleanEnv(process.env.SHOP_SUPABASE_URL) ||
    cleanEnv(process.env.NEXT_PUBLIC_SHOP_SUPABASE_URL)
  )
}

function getShopPublicKey() {
  return (
    cleanEnv(process.env.NEXT_PUBLIC_SHOP_SUPABASE_PUBLISHABLE_KEY) ||
    cleanEnv(process.env.NEXT_PUBLIC_SHOP_SUPABASE_ANON_KEY)
  )
}

export async function createShopServerClient() {
  const cookieStore = await cookies()
  const supabaseUrl = getShopUrl()
  const supabaseKey = getShopPublicKey()

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Shop Supabase environment variables')
  }

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          )
        } catch {
          // Called from a Server Component. Safe to ignore.
        }
      },
    },
  })
}

export function createShopAdminClient() {
  const supabaseUrl = getShopUrl()
  const serviceRoleKey = cleanEnv(process.env.SHOP_SUPABASE_SECRET_KEY)

  if (!supabaseUrl || !serviceRoleKey) {
    return null
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
