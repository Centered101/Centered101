import { NextResponse, type NextRequest } from 'next/server'
import type Stripe from 'stripe'

import { getStripe } from '@/lib/stripe'
import { advanceProjectOnStartPayment, settleMilestoneIfCovered } from '@/lib/work/payments/settle'
import { createAdminClient } from '@/lib/work/supabase/admin'
import type { Json } from '@/lib/work/types/database'
import type { PaymentMethod } from '@/lib/work/types/enums'

/**
 * The Stripe webhook — the ONLY writer of `status = 'PAID'` in this codebase.
 *
 * Three properties make this safe, and all three are load-bearing:
 *
 *   1. AUTHENTICITY. The body is verified against `STRIPE_WEBHOOK_SECRET`
 *      before anything is read from it. Without that check this route is an
 *      unauthenticated endpoint that marks invoices paid on request.
 *   2. RAW BODY. `request.text()`, never `request.json()` — the signature is
 *      over the exact bytes, and a re-serialised object will not verify.
 *   3. IDEMPOTENCE, at the data layer. The event id is inserted into
 *      `payment_provider_events` FIRST; its primary key rejects a duplicate,
 *      and a duplicate means "already handled" so we return 200 and stop.
 *      Stripe retries on any non-2xx, and it retries more often than people
 *      expect.
 *
 * It uses the privileged client throughout because the caller is Stripe: there
 * is no user session to run under, and no RLS policy could describe one.
 *
 * A 200 with a line in the log beats a 500 for anything we cannot act on — an
 * event we do not handle is not a failure, and asking Stripe to retry it
 * forever accomplishes nothing.
 */

const PROVIDER = 'stripe'

/** Postgres' unique_violation — here, "this event was already processed". */
const UNIQUE_VIOLATION = '23505'

const METHOD_FROM_STRIPE: Record<string, PaymentMethod> = {
  card: 'CARD',
  promptpay: 'PROMPTPAY',
}

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    console.error('[payments] STRIPE_WEBHOOK_SECRET is not configured')
    return NextResponse.json({ error: 'not configured' }, { status: 503 })
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'missing signature' }, { status: 400 })
  }

  const raw = await request.text()

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(raw, signature, secret)
  } catch (error) {
    // Never log the body here: an unverified payload is attacker-controlled.
    console.error('[payments] webhook signature verification failed', error)
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { error: ledgerError } = await admin.from('payment_provider_events').insert({
    id: event.id,
    provider: PROVIDER,
    event_type: event.type,
    payload: event as unknown as Json,
  })

  if (ledgerError) {
    if (ledgerError.code === UNIQUE_VIOLATION) {
      return NextResponse.json({ received: true, duplicate: true })
    }
    // The ledger is what makes replay safe, so a ledger we cannot write to is
    // a reason to ask for a retry rather than to process blind.
    console.error('[payments] failed to record provider event', ledgerError)
    return NextResponse.json({ error: 'ledger unavailable' }, { status: 500 })
  }

  try {
    await handle(admin, event)
  } catch (error) {
    // Leave `processed_at` null. The row stands as the record that the event
    // arrived and did not complete, which the unprocessed-events index exists
    // to surface; Stripe's own retry comes back as a duplicate, so the
    // recovery path is a person reading that index, not an automatic replay.
    console.error('[payments] failed to handle', event.type, event.id, error)
    return NextResponse.json({ error: 'handler failed' }, { status: 500 })
  }

  await admin
    .from('payment_provider_events')
    .update({ processed_at: new Date().toISOString() })
    .eq('id', event.id)

  return NextResponse.json({ received: true })
}

type Admin = ReturnType<typeof createAdminClient>

async function handle(admin: Admin, event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object
      // Card sessions arrive already paid. PromptPay completes the session
      // while the payment is still `unpaid` and confirms minutes later as
      // async_payment_succeeded — treating "completed" as "paid" here would be
      // exactly the fake success this phase exists to remove.
      if (session.payment_status === 'paid') await markPaid(admin, session)
      return
    }

    case 'checkout.session.async_payment_succeeded':
      await markPaid(admin, event.data.object)
      return

    case 'checkout.session.async_payment_failed':
      await markFailed(admin, event.data.object, 'ผู้ให้บริการแจ้งว่าการชำระเงินไม่สำเร็จ')
      return

    case 'checkout.session.expired':
      await markExpired(admin, event.data.object)
      return

    default:
      // Subscribed to more than we act on, on purpose: the ledger keeps the
      // full payload, so an event we do not handle today stays recoverable.
      return
  }
}

/**
 * Our `payments.id` for a session.
 *
 * Metadata first, then `client_reference_id`, then the checkout id stored when
 * the session was created. Three routes to the same row because the cost of
 * not finding it is money received against no record.
 */
async function findPaymentId(admin: Admin, session: Stripe.Checkout.Session) {
  const fromSession = session.metadata?.paymentId || session.client_reference_id
  if (fromSession) return fromSession

  const { data } = await admin
    .from('payments')
    .select('id')
    .eq('provider', PROVIDER)
    .eq('provider_checkout_id', session.id)
    .maybeSingle<{ id: string }>()

  return data?.id ?? null
}

async function markPaid(admin: Admin, session: Stripe.Checkout.Session): Promise<void> {
  const paymentId = await findPaymentId(admin, session)
  if (!paymentId) {
    console.error('[payments] no payment row for session', session.id)
    return
  }

  const { data: payment } = await admin
    .from('payments')
    .select('id, project_id, milestone_id, amount, status')
    .eq('id', paymentId)
    .maybeSingle<{
      id: string
      project_id: string
      milestone_id: string | null
      amount: number
      status: string
    }>()

  if (!payment) {
    console.error('[payments] payment row vanished', paymentId)
    return
  }

  // A second guard beside the event ledger. The ledger stops the same event
  // arriving twice; this stops two DIFFERENT events that both mean "paid" from
  // rewriting `paid_at` and moving the timestamp the unlock rules read.
  if (payment.status === 'PAID') return

  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : (session.payment_intent?.id ?? null)

  const methodType = session.payment_method_types?.[0]
  const method = methodType ? METHOD_FROM_STRIPE[methodType] : undefined

  const { error } = await admin
    .from('payments')
    .update({
      status: 'PAID',
      paid_at: new Date().toISOString(),
      provider: PROVIDER,
      provider_payment_id: paymentIntentId,
      provider_checkout_id: session.id,
      ...(method ? { method } : {}),
    })
    .eq('id', payment.id)

  if (error) throw new Error(`failed to mark payment paid: ${error.message}`)

  await logPaymentReceived(admin, payment.project_id, payment.id, payment.amount, payment.milestone_id)

  if (payment.milestone_id) {
    await settleMilestoneIfCovered(admin, payment.milestone_id)
    // The ฿250 rule: a settled start-payment milestone advances the project
    // out of WAITING_FOR_DEPOSIT. No-op for every other milestone. Runs with
    // the admin client — there is no session here.
    await advanceProjectOnStartPayment(admin, payment.milestone_id)
  }
}

/** `payment.received` audit line for a Stripe-settled payment — there is no session, so this writes straight to activity_logs (actor_id null = system-originated, migration 0012). */
async function logPaymentReceived(
  admin: Admin,
  projectId: string,
  paymentId: string,
  amount: number,
  milestoneId: string | null,
): Promise<void> {
  const { data: project } = await admin
    .from('projects')
    .select('organization_id')
    .eq('id', projectId)
    .maybeSingle<{ organization_id: string }>()
  if (!project) return

  const { error } = await admin.from('activity_logs').insert({
    organization_id: project.organization_id,
    project_id: projectId,
    actor_id: null,
    action: 'payment.received',
    entity_type: 'payment',
    entity_id: paymentId,
    metadata: { amount, milestoneId, provider: PROVIDER },
  })
  if (error) console.error('[payments] failed to log payment.received', error)
}

async function markFailed(
  admin: Admin,
  session: Stripe.Checkout.Session,
  reason: string,
): Promise<void> {
  const paymentId = await findPaymentId(admin, session)
  if (!paymentId) return

  // The `.neq` rather than a read-then-write: a late failure event must never
  // undo a payment that already settled.
  const { error } = await admin
    .from('payments')
    .update({ status: 'FAILED', failed_at: new Date().toISOString(), failure_reason: reason })
    .eq('id', paymentId)
    .neq('status', 'PAID')

  if (error) throw new Error(`failed to mark payment failed: ${error.message}`)
}

async function markExpired(admin: Admin, session: Stripe.Checkout.Session): Promise<void> {
  const paymentId = await findPaymentId(admin, session)
  if (!paymentId) return

  // An expired session for an already-paid or already-failed payment is noise;
  // only an outstanding attempt expires.
  const { error } = await admin
    .from('payments')
    .update({ status: 'EXPIRED' })
    .eq('id', paymentId)
    .in('status', ['PENDING', 'PROCESSING'])

  if (error) throw new Error(`failed to expire payment: ${error.message}`)
}
