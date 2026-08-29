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
import { resolveLandingPath } from './permissions'

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

const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$|\.localhost(:\d+)?$/i

/**
 * Absolute origin for OAuth and magic-link redirects.
 *
 * NEXT_PUBLIC_WORK_APP_URL is deliberately ignored for a local request. It
 * holds the production origin, and honouring it in dev sends the browser to
 * work.centered101.com/... — a URL the local Supabase project has no redirect
 * entry for, so Supabase silently falls back to its Site URL and the code
 * lands on the wrong host with the wrong project's PKCE verifier.
 */
async function getOrigin(): Promise<string> {
  const headerList = await headers()
  const host = headerList.get('x-forwarded-host') ?? headerList.get('host') ?? 'localhost:3000'
  const isLocal = LOCAL_HOST.test(host)

  const configured = process.env.NEXT_PUBLIC_WORK_APP_URL
  if (configured && !isLocal) return configured.replace(/\/$/, '')

  const proto = headerList.get('x-forwarded-proto') ?? (isLocal ? 'http' : 'https')
  return `${proto}://${host}`
}

/**
 * Absolute URL of the flowstate auth callback.
 *
 * The path depends on how the visitor reached the app. On work.<root> the
 * proxy rewrites /auth/* into /work/auth/*, so the prefix is invisible; on the
 * apex host the route only exists at /work/auth/callback, and a bare
 * /auth/callback there is the MAIN site's callback, which would exchange this
 * code against the wrong Supabase project.
 */
async function getCallbackUrl(next = ''): Promise<string> {
  const origin = await getOrigin()
  const prefix = /:\/\/work\./i.test(origin) ? '' : '/work'
  const query = next ? `?next=${encodeURIComponent(next)}` : ''
  return `${origin}${prefix}/auth/callback${query}`
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
  const destination = next || (await resolveLandingPath())

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
  const emailRedirectTo = await getCallbackUrl()

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // Read by the on_auth_user_created trigger to populate profiles.
      data: { full_name: parsed.data.fullName },
      emailRedirectTo,
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
  redirect(await resolveLandingPath())
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
  const next = safeRedirectPath(formData.get('next') as string | null, '')

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: await getCallbackUrl(next),
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
  const next = safeRedirectPath(formData.get('next') as string | null, '')

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: await getCallbackUrl(next),
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
