import 'server-only'

/**
 * True when `error` is a dropped connection to Supabase rather than a real
 * rejection.
 *
 * supabase-js normalises most failed fetches into an `AuthRetryableFetchError`
 * it returns in `error` like any other result — but a Server Action that
 * awaits a Postgrest or Auth call can still see the raw `TypeError: fetch
 * failed` Node's own `fetch` throws when the network drops mid-request. Both
 * land here so either shape gets the same "try again" message instead of a
 * generic failure that blames the wrong thing.
 *
 * Anything that is NOT a network error must be left alone. In particular, a
 * Server Action's `catch` block should call `unstable_rethrow(error)` first —
 * see `lib/work/services/identities.ts` — so a `redirect()` / `notFound()`
 * control-flow throw from a permission check is never mistaken for either.
 * Left genuinely uncaught, a network error breaks a Server Action's response
 * in a way the client cannot parse: React shows a generic
 * "An unexpected response was received from the server." overlay instead of
 * the friendly message the form was built to show.
 */
export function isNetworkError(error: unknown): boolean {
  const { name, message } = (error ?? {}) as { name?: string; message?: string }
  return name === 'AuthRetryableFetchError' || message === 'fetch failed'
}
