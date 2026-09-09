import 'server-only'

import type { PostgrestError } from '@supabase/supabase-js'

/**
 * Shared plumbing for the query layer.
 *
 * Two jobs, both about honesty:
 *
 *   1. Casting. `lib/work/types/database.ts` is still the permissive
 *      placeholder, so PostgREST hands back `Record<string, unknown>`. Every
 *      query therefore declares the shape it expects and casts ONCE, here, at
 *      the boundary. When generated types land, these casts become no-ops and
 *      any that were lying start failing to compile.
 *
 *   2. Errors. A failed query throws a QueryError carrying a Thai message safe
 *      to show a user, while the PostgREST detail goes to the server log.
 *      Database errors leak schema: table names, column names, constraint
 *      names, sometimes row values from a check violation. None of that
 *      belongs in a browser.
 */

export class QueryError extends Error {
  readonly code: string | undefined
  readonly userMessage: string

  constructor(userMessage: string, cause?: PostgrestError | null) {
    super(cause ? `${userMessage} (${cause.code}: ${cause.message})` : userMessage)
    this.name = 'QueryError'
    this.code = cause?.code
    this.userMessage = userMessage
  }
}

/** Postgres/PostgREST codes meaning "this table does not exist yet". */
const MISSING_TABLE_CODES = new Set(['42P01', 'PGRST205'])

/** 42703 = undefined_column; PGRST204 is PostgREST's schema-cache equivalent. */
const MISSING_COLUMN_CODES = new Set(['42703', 'PGRST204'])

/**
 * A missing column does not always arrive with a code we recognise: depending
 * on the PostgREST version and whether the failure came from the planner or the
 * schema cache, the only reliable signal is the message text. Match that too,
 * so a query selecting a column from an unapplied migration is diagnosed as a
 * partial schema rather than logged as an opaque `{}`.
 */
const MISSING_COLUMN_MESSAGE =
  /column .* does not exist|could not find the .* column|in the schema cache/i

export function isMissingSchema(error: PostgrestError | null | undefined): boolean {
  return !!error && MISSING_TABLE_CODES.has(error.code)
}

/**
 * A missing COLUMN means a half-applied schema: the table is there, a later
 * migration is not.
 *
 * Deliberately NOT treated as `isMissingSchema`, which returns an empty result
 * and lets the page render. A missing table is a database nobody has migrated
 * yet; a missing column is a database someone migrated PARTWAY, and quietly
 * showing an empty dashboard would hide that. It fails loudly, with a log line
 * naming the fix, because the fix is one command.
 */
export function isPartialSchema(error: PostgrestError | null | undefined): boolean {
  if (!error) return false
  return MISSING_COLUMN_CODES.has(error.code) || MISSING_COLUMN_MESSAGE.test(error.message ?? '')
}

/** Best-effort serialisation for logging an error of unknown shape. */
function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value) ?? String(value)
  } catch {
    return String(value)
  }
}

/**
 * Unwraps a PostgREST result, or throws with a user-safe message.
 *
 * Not exported: `unwrapOr` is the variant every caller wants, and a strict
 * version with no callers is a second way to do the same thing.
 *
 * @param context short description used in the server log, e.g. "โปรเจกต์"
 */
function unwrap<T>(
  result: { data: unknown; error: PostgrestError | null; status?: number },
  context: string,
): T {
  if (result.error) {
    // Spread the fields rather than logging the error object itself. Next's dev
    // overlay serialises a bare error to `{}`, which is what a reader of this
    // log actually got: "[query] การชำระเงิน failed: {}" and nothing to act on.
    const { code, message, details, hint } = result.error
    // PostgREST's error is `JSON.parse(body)` (postgrest-js PostgrestBuilder) —
    // when a proxy or a non-PostgREST response comes back, none of the four
    // fields above exist and spreading them ALSO logs `{}`. Fall back to the
    // raw shape and the HTTP status so there is always something to act on.
    const structured = code ?? message ?? details ?? hint
    const detail = structured != null
      ? { code, message, details, hint, status: result.status }
      : { raw: safeJson(result.error), status: result.status }
    // The fields above cured the "bare error object logs as `{}`" bug, but a
    // SECOND console.error argument runs into the same wall one level up:
    // whatever renders these logs back to a reader — the dev overlay, or a
    // tool relaying its output — only shows the first string argument, and
    // still prints "failed: {}" no matter what the object argument holds.
    // Fold it into the string itself so there is exactly one argument and
    // nowhere left for the payload to get dropped.
    console.error(`[query] ${context} failed: ${safeJson(detail)}`)

    // PostgREST reports status 0 when the request never reached the server, so
    // the "error" is a dead connection, not something the query did wrong. Said
    // plainly here because every other line in this file points at the schema,
    // and reading a network outage as a migration problem wastes an afternoon.
    if (result.status === 0) {
      console.error(
        `[query] ${context}: could not reach the work Supabase project. ` +
          'The query is fine — the request never got there. Check the connection ' +
          'and that NEXT_PUBLIC_WORK_SUPABASE_URL points at a live project.',
      )
    }

    if (isPartialSchema(result.error)) {
      console.error(
        '[query] This looks like a partially applied schema — the table exists but a ' +
          'later migration has not been run. Generate the pending SQL with ' +
          '`npm run work:db:bundle -- --since <timestamp>` and apply it to the ' +
          'work Supabase project.',
      )
    }
    throw new QueryError(`ไม่สามารถโหลดข้อมูล${context}ได้`, result.error)
  }
  return result.data as T
}

/**
 * Like `unwrap`, but returns a fallback when the schema has not been migrated.
 *
 * Used only on read paths that must keep the page renderable before
 * `supabase db push` has run — the layout's schema notice already tells the
 * operator what is wrong, and a stack trace on top of it adds nothing. Real
 * errors still throw.
 */
export function unwrapOr<T>(
  result: { data: unknown; error: PostgrestError | null; status?: number },
  context: string,
  fallback: T,
): T {
  if (isMissingSchema(result.error)) {
    console.warn(`[query] ${context}: schema not migrated — run \`supabase db push\`.`)
    return fallback
  }
  return unwrap<T>(result, context)
}

/** Sums a numeric field, tolerating nulls from optional columns. */
export function sumBy<T>(rows: readonly T[], pick: (row: T) => number | null | undefined): number {
  return rows.reduce((total, row) => total + (pick(row) ?? 0), 0)
}

/**
 * Totals a numeric field per key — the one-query-then-aggregate-in-JS pattern
 * this layer uses wherever PostgREST cannot GROUP BY without a database view.
 *
 * Replaced a `groupBy` that nobody called while three call sites hand-rolled
 * this exact accumulator instead.
 *
 * @param value defaults to counting rows, so tallyBy(rows, r => r.client_id)
 *   answers "how many per client"
 */
export function tallyBy<T, K extends string>(
  rows: readonly T[],
  key: (row: T) => K,
  value: (row: T) => number = () => 1,
): Map<K, number> {
  const totals = new Map<K, number>()
  for (const row of rows) {
    const k = key(row)
    totals.set(k, (totals.get(k) ?? 0) + (value(row) ?? 0))
  }
  return totals
}
