import 'server-only'

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

/**
 * Share-link tokens.
 *
 * Rules this module exists to enforce (docs/ARCHITECTURE.md §11):
 *  - tokens are cryptographically random, never sequential or derived
 *  - the token encodes nothing — no project id, no client name, no metadata
 *  - only the SHA-256 hash is stored; the plaintext is shown once at creation
 *
 * The storage and validation half arrives with `share_links` in Phase 13.
 * This is the primitive those rows are built on.
 */

/** 32 random bytes, base64url — 256 bits of entropy. */
export function generateShareToken(): string {
  return randomBytes(32).toString('base64url')
}

export function hashShareToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/** Constant-time comparison, so a hash cannot be recovered by timing. */
export function shareTokenMatches(token: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashShareToken(token), 'hex')
  const expected = Buffer.from(expectedHash, 'hex')
  if (actual.length !== expected.length) return false
  return timingSafeEqual(actual, expected)
}

/**
 * Cheap shape check before touching the database, so obviously malformed
 * tokens never become a query. Not a security control on its own.
 */
export function isPlausibleShareToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(token)
}
