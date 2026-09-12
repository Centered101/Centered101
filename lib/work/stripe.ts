import 'server-only'

import Stripe from 'stripe'

/**
 * The workspace's OWN Stripe account/keys.
 *
 * Loosely mirrors lib/shop/stripe.ts's shape (a dedicated getXStripe() +
 * getXWebhookSecret() pair) but DELIBERATELY WITHOUT shop's fallback to the
 * shared STRIPE_*: a webhook signing secret is per-ENDPOINT, and
 * work.centered101.com's `/work/api/payments/webhook` is a different endpoint
 * from the main site's `/api/stripe/webhook` — Stripe issues each a distinct
 * `whsec_...`. A fallback here would mean a `/work` deploy that forgot to set
 * WORK_STRIPE_WEBHOOK_SECRET fails SILENTLY against the wrong secret (still
 * verifying, still 200-ing, just never for the events Stripe actually sends
 * to this endpoint) instead of loudly with the 503 below — which is exactly
 * the shape of bug this file exists to fix. Never add `|| process.env.STRIPE_*`
 * back in.
 *
 * `lib/work/payments/stripe.ts` (checkout creation) and the webhook route both
 * import from here rather than `lib/stripe.ts`'s bare `getStripe()`, which is
 * what they used before — WORK_STRIPE_SECRET_KEY and WORK_STRIPE_WEBHOOK_SECRET
 * existed in .env.local unused the whole time.
 */

let _workStripe: Stripe | null = null

export function getWorkStripe(): Stripe {
  if (!_workStripe) {
    const key = process.env.WORK_STRIPE_SECRET_KEY
    if (!key) {
      throw new Error('WORK_STRIPE_SECRET_KEY is not configured')
    }
    _workStripe = new Stripe(key, { apiVersion: '2026-05-27.dahlia' as const })
  }
  return _workStripe
}

export function getWorkWebhookSecret(): string | undefined {
  return process.env.WORK_STRIPE_WEBHOOK_SECRET
}
