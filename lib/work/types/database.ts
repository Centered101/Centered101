/**
 * Supabase database types.
 *
 * PLACEHOLDER — regenerate once the migrations have been applied to the remote
 * project:
 *
 *   npx supabase link --project-ref tsllijdpxshvvwkyorzq
 *   npx supabase db push
 *   npx supabase gen types typescript --linked > lib/types/database.ts
 *
 * Do not hand-edit the generated output.
 *
 * Until then this describes the SHAPE Supabase expects without claiming to
 * know any particular table, so queries type-check and return
 * `Record<string, unknown>` rows rather than `never`. It is deliberately
 * permissive but not `any`: field access still has to be justified with an
 * explicit cast, so unverified reads are visible in the code exactly where
 * they happen.
 *
 * The enum unions in `./enums.ts` ARE authoritative — `npm run db:validate`
 * diffs them against pg_enum in a real database on every run.
 */

export type Json =
  string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type GenericTable = {
  Row: Record<string, unknown>
  Insert: Record<string, unknown>
  Update: Record<string, unknown>
  Relationships: []
}

type GenericFunction = {
  Args: Record<string, unknown>
  Returns: unknown
}

export type Database = {
  public: {
    Tables: Record<string, GenericTable>
    Views: Record<string, GenericTable>
    Functions: Record<string, GenericFunction>
    Enums: Record<string, string>
    CompositeTypes: Record<string, Record<string, unknown>>
  }
}
