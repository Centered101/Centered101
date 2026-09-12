import 'server-only'

import type { PaymentMethod } from '@/lib/work/types/enums'

/**
 * The payment provider boundary (docs/ARCHITECTURE.md §8).
 *
 * The UI and the server actions depend on THIS FILE and never on the Stripe
 * SDK, which is why swapping providers touches one directory. It is also why
 * the "unconfigured" case is a first-class result rather than a thrown error:
 * a workspace without Stripe keys must still render its payments page and say
 * plainly that online payment is not available — not crash, and above all not
 * pretend the payment went through.
 *
 * WHAT THIS INTERFACE CANNOT DO, deliberately: mark anything PAID. It opens a
 * checkout and reports where to send the browser. The only writer of `PAID` in
 * the entire codebase is the webhook handler, after verifying the provider's
 * signature (migration 0010).
 */

/** The two methods the checkout modal offers. Maps onto `payment_method`. */
export type CheckoutMethod = Extract<PaymentMethod, 'CARD' | 'PROMPTPAY'>

export type CheckoutRequest = {
  /** Our own `payments.id`, created before the provider is called. */
  paymentId: string
  projectId: string
  milestoneId: string | null
  /** Minor units — satang for THB. Never a decimal amount. */
  amount: number
  currency: string
  method: CheckoutMethod
  /** Shown on the provider's own checkout page. */
  description: string
  successUrl: string
  cancelUrl: string
  customerEmail?: string
}

export type CheckoutResult =
  | { ok: true; provider: string; checkoutId: string; url: string }
  | { ok: false; reason: 'unconfigured' | 'provider_error'; message: string }

export interface PaymentService {
  /** Stored in `payments.provider`. */
  readonly provider: string
  createCheckout(request: CheckoutRequest): Promise<CheckoutResult>
}

/**
 * Which adapter is in play, decided by configuration alone.
 *
 * Resolved per call rather than cached in a module variable: the adapters hold
 * no connection of their own (the Stripe client is memoised in
 * lib/work/stripe.ts, /work's OWN client — never the shared lib/stripe.ts),
 * and a cached choice would survive an env change in dev and quietly report
 * the wrong provider.
 *
 * Gated on WORK_STRIPE_SECRET_KEY, not the shared STRIPE_SECRET_KEY: this was
 * reading the wrong var before (found in the same audit that fixed the
 * webhook secret mismatch) — a deployment with a WORK-only Stripe account
 * would have silently fallen through to MockPaymentService here even though
 * StripePaymentService (lib/work/payments/stripe.ts) was fully configured
 * and ready.
 */
export async function getPaymentService(): Promise<PaymentService> {
  if (process.env.WORK_STRIPE_SECRET_KEY) {
    const { StripePaymentService } = await import('./stripe')
    return new StripePaymentService()
  }

  const { MockPaymentService } = await import('./mock')
  return new MockPaymentService()
}
