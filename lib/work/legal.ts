/**
 * Operator details and revision dates for the legal pages.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THESE ARE PLACEHOLDERS. FILL THEM IN BEFORE THE WORKSPACE IS USED WITH REAL
 * CLIENTS, AND HAVE THE TWO DOCUMENTS REVIEWED BY SOMEONE QUALIFIED.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The pages that consume this file describe accurately what the application
 * actually does — which data it stores, which cookies it sets, who can read
 * what. That part is true and was checked against the code. What they cannot
 * know is who is legally responsible for it: the operating entity, its
 * registered address, its tax id, and the address complaints go to. Those are
 * the values below, and a policy that names the wrong party protects nobody.
 *
 * PDPA note (Thailand): a controller must identify itself and provide a real
 * contact channel for data-subject requests. `contactEmail` is that channel —
 * it needs to be an address someone monitors, not a forward to a black hole.
 *
 * Nothing here is legal advice.
 */

export const LEGAL = {
  /** TODO: the legal name of the operating entity, not the brand name. */
  entityName: 'Centered101',
  /** TODO: registered address. Required for a PDPA privacy notice. */
  address: '—',
  /** TODO: an inbox that is actually monitored for data-subject requests. */
  contactEmail: 'contact@centered101.com',
  /** The service these documents cover, as users know it. */
  serviceName: "Centered101's Work",
  serviceUrl: 'work.centered101.com',
} as const

/**
 * When each document last changed.
 *
 * Update these by hand when the text changes — deriving them from file
 * modification time would move the date on every deploy and make "last
 * updated" meaningless, which is the one thing the field is for.
 */
export const LEGAL_UPDATED = {
  privacy: '2026-08-29',
  terms: '2026-08-29',
} as const
