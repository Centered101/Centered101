'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/work/supabase/server'
import {
  credentialsSchema,
  magicLinkSchema,
  safeRedirectPath,
  signUpSchema,
} from '@/lib/work/validation/auth'
import { resolveHomePath } from './session'

/**
 * Authentication server actions.
 *
 * Every one of these parses its input with Zod before touching Supabase.
 *
 * A note on error messages: sign-in failures deliberately do not distinguish
 * "no such account" from "wrong password". Doing so turns the login form into
 * an account enumeration oracle — an attacker learns which emails are
 * registered without ever signing in.
 */

export type AuthState = {
  error?: string
  message?: string
  fieldErrors?: Record<string, string>
}

/** Absolute origin for OAuth and magic-link redirects. */
async function getOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_WORK_APP_URL
  if (configured) return configured.replace(/\/$/, '')

  const headerList = await headers()
  const host = headerList.get('x-forwarded-host') ?? headerList.get('host') ?? 'localhost:3000'
  const proto = headerList.get('x-forwarded-proto') ?? 'http'
  return `${proto}://${host}`
}

function fieldErrorsFrom(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const fieldErrors: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '')
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message
  }
  return fieldErrors
}

// -----------------------------------------------------------------------------
// Email + password
// -----------------------------------------------------------------------------
export async function signInWithPassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error) }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error) {
    // Intentionally generic — see the note at the top of this file.
    return { error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' }
  }

  const next = safeRedirectPath(formData.get('next') as string | null, '')
  const destination = next || (await resolveHomePath())

  revalidatePath('/', 'layout')
  redirect(destination)
}

export async function signUpWithPassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = signUpSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    fullName: formData.get('fullName'),
  })
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error) }
  }

  const supabase = await createClient()
  const origin = await getOrigin()

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // Read by the on_auth_user_created trigger to populate profiles.
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  // With email confirmation enabled, Supabase returns a user with no session
  // and an empty identities array for an address that already exists — so this
  // branch must not claim the account was created.
  if (data.user && !data.session) {
    return {
      message: 'ส่งลิงก์ยืนยันไปที่อีเมลของคุณแล้ว กรุณาตรวจสอบกล่องจดหมาย',
    }
  }

  revalidatePath('/', 'layout')
  redirect(await resolveHomePath())
}

// -----------------------------------------------------------------------------
// Magic link
// -----------------------------------------------------------------------------
export async function signInWithMagicLink(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = magicLinkSchema.safeParse({ email: formData.get('email') })
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error) }
  }

  const supabase = await createClient()
  const origin = await getOrigin()
  const next = safeRedirectPath(formData.get('next') as string | null, '')

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ''}`,
    },
  })

  if (error) {
    return { error: 'ไม่สามารถส่งลิงก์เข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง' }
  }

  // Always the same response, whether or not the address has an account —
  // otherwise this endpoint reveals which emails are registered.
  return { message: 'ถ้าอีเมลนี้มีบัญชีอยู่ เราได้ส่งลิงก์เข้าสู่ระบบไปให้แล้ว' }
}

// -----------------------------------------------------------------------------
// Google OAuth
// -----------------------------------------------------------------------------
export async function signInWithGoogle(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const supabase = await createClient()
  const origin = await getOrigin()
  const next = safeRedirectPath(formData.get('next') as string | null, '')

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ''}`,
    },
  })

  if (error || !data?.url) {
    // The most likely cause by far is that Google is not enabled for this
    // Supabase project, so say that rather than a generic failure.
    return {
      error:
        'ยังไม่ได้เปิดใช้งาน Google Sign-In — ตั้งค่าที่ Supabase Dashboard → Authentication → Providers',
    }
  }

  redirect(data.url)
}

// -----------------------------------------------------------------------------
// Sign out
// -----------------------------------------------------------------------------
export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/work/login')
}
