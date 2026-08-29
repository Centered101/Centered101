import 'server-only'

import { cache } from 'react'
import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

import { createClient } from '@/lib/work/supabase/server'

/**
 * Server-side session access.
 *
 * Everything here uses `getUser()`, never `getSession()`. `getSession()` reads
 * the cookie and trusts it; `getUser()` revalidates the token against the auth
 * server, so a forged or revoked cookie does not pass. On the server that
 * distinction is the whole point.
 *
 * WHO the user is, and WHAT they may do, are answered next door in
 * `./permissions.ts`. This file only establishes that there is a user at all.
 * The membership lookup that used to live here (`getSessionContext`) was doing
 * the same query as `getAccessContext()`, so every guarded page ran it twice;
 * it now lives there once.
 */

/**
 * The signed-in user, or null.
 *
 * MEMOISED PER REQUEST with React's `cache()`. Without it this is a network
 * round trip to the auth server, and it is called several times on every page:
 * once by the layout's guard, again by the page's own guard, again by whatever
 * the page loads. Next dedupes `fetch()` automatically but not arbitrary async
 * functions, so the deduping has to be asked for.
 *
 * The cache is scoped to a single request — it is not a shared cache and
 * cannot leak one user's session into another's render.
 */
export const getUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
})

/**
 * Requires a signed-in user, redirecting to /login otherwise.
 *
 * `next` preserves where they were heading so they land there after signing
 * in rather than being dumped on a dashboard.
 */
export async function requireUser(next?: string): Promise<User> {
  const user = await getUser()
  if (!user) {
    redirect(next ? `/work/login?next=${encodeURIComponent(next)}` : '/work/login')
  }
  return user
}

/**
 * Whether this account can sign in with a password at all.
 *
 * Supabase records one identity per sign-in method. An account created through
 * Google has only a `google` identity and no password to change — so the UI
 * must offer to SET one rather than to change one, and the server must decide
 * which of those it is. Reading it from the session is the only way to keep
 * that decision out of the browser's hands.
 */
export function hasPasswordIdentity(user: User): boolean {
  return (user.identities ?? []).some((identity) => identity.provider === 'email')
}

/**
 * Display name for a user, from their auth metadata.
 *
 * Falls back through OAuth's `full_name`, then `name`, then the local part of
 * the email — a signed-in person always has SOMETHING to be called, and
 * "ผู้ใช้" is the last resort rather than the common case.
 */
export function displayNameFor(user: User): string {
  const metadata = user.user_metadata as { full_name?: string; name?: string } | undefined
  return metadata?.full_name || metadata?.name || (user.email ?? '').split('@')[0] || 'ผู้ใช้'
}

/**
 * The account's profile picture, or null.
 *
 * READ FROM user_metadata, NOT from `profiles.avatar_url`. The
 * `handle_new_auth_user` trigger copies the picture into `profiles` once, at
 * signup — so an account created with a password and linked to Google
 * afterwards has a picture in the session and nothing in the table. The
 * session is the only source that is right in both cases.
 *
 * Google fills `avatar_url`; `picture` is the raw OIDC claim other providers
 * send. Both are checked so linking a second provider later does not
 * silently stop working.
 */
export function avatarUrlFor(user: User): string | null {
  const metadata = user.user_metadata as { avatar_url?: string; picture?: string } | undefined
  const url = metadata?.avatar_url || metadata?.picture
  // Only https: a metadata field is provider-supplied data, and it renders in
  // an <img> — nothing else belongs in there.
  return url && url.startsWith('https://') ? url : null
}

/**
 * WHERE A USER BELONGS AFTER SIGNING IN lives in `./permissions.ts` as
 * `resolveLandingPath()`, with the other role decisions. It is deliberately
 * not re-exported from here: permissions.ts imports this file, and a re-export
 * would make the two modules circular for no gain.
 */
