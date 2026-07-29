import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildContactFlexMessage, buildContactLineMessage, pushLineMessage } from '@/lib/line/messaging'

const BOT_CHECK_LIMIT = 6
const contactAttemptStore = new Map<string, { count: number; resetAt: number }>()

function isTurnstileTestMode() {
  return process.env.CONTACT_TURNSTILE_TEST_MODE === 'true' || process.env.TURNSTILE_TEST_MODE === 'true'
}

function isTurnstileDebugMode() {
  return process.env.CONTACT_TURNSTILE_DEBUG === 'true'
}

function getClientKey(request: NextRequest) {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwardedFor || request.headers.get('x-real-ip') || 'unknown'
}

function getAttemptCount(key: string) {
  const now = Date.now()
  const current = contactAttemptStore.get(key)
  if (!current || current.resetAt < now) {
    const fresh = { count: 0, resetAt: now + 24 * 60 * 60 * 1000 }
    contactAttemptStore.set(key, fresh)
    return fresh
  }
  return current
}

async function verifyTurnstile(token: unknown, remoteIp: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    return { ok: false, error: 'Turnstile secret is not configured' }
  }

  if (typeof token !== 'string' || !token.trim()) {
    return { ok: false, error: 'Turnstile token is required' }
  }

  const formData = new FormData()
  formData.append('secret', secret)
  formData.append('response', token)
  if (remoteIp && remoteIp !== 'unknown') formData.append('remoteip', remoteIp)

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: formData,
  })
  const result = await response.json() as { success?: boolean; 'error-codes'?: string[] }

  return {
    ok: Boolean(result.success),
    error: result['error-codes']?.join(', ') || 'Turnstile verification failed',
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, subject, message, source, turnstileToken } = body
    const clientKey = getClientKey(request)
    const attempts = getAttemptCount(clientKey)

    if (isTurnstileTestMode() || attempts.count >= BOT_CHECK_LIMIT) {
      const verification = await verifyTurnstile(turnstileToken, clientKey)
      if (!verification.ok) {
        attempts.count += 1
        return NextResponse.json(
          {
            error: isTurnstileDebugMode()
              ? `Bot check failed: ${verification.error}`
              : 'กรุณาผ่านการตรวจสอบก่อนส่งข้อความ',
          },
          { status: process.env.TURNSTILE_SECRET_KEY ? 403 : 503 }
        )
      }
    }

    // Validation
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
        { status: 400 }
      )
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    let savedToDatabase = false
    let sentToLine = false

    // Where the message came from: an explicit form label, else the page host.
    let pageHost = ''
    try {
      const referer = request.headers.get('referer')
      if (referer) pageHost = new URL(referer).host
    } catch {
      // ignore malformed referer
    }
    const rawSource = typeof source === 'string' && source.trim() ? source.trim() : pageHost
    const messageSource = rawSource ? rawSource.slice(0, 120) : null

    try {
      const supabase = createAdminClient() || await createClient()

      const base = { name, email, subject: subject || null, message }
      let insertError = (await supabase.from('contact_messages').insert({ ...base, source: messageSource })).error

      // Gracefully handle databases where the `source` column hasn't been added yet.
      if (insertError && /source/i.test(insertError.message || '')) {
        insertError = (await supabase.from('contact_messages').insert(base)).error
      }

      if (insertError) {
        console.warn('Contact message database save skipped:', insertError)
      } else {
        savedToDatabase = true
      }
    } catch (databaseError) {
      console.warn('Contact message database unavailable:', databaseError)
    }

    try {
      // Prefer the rich giga Flex card; fall back to plain text if LINE rejects it.
      let lineResult
      try {
        lineResult = await pushLineMessage(buildContactFlexMessage({
          name,
          email,
          subject: subject || null,
          message,
          source: messageSource,
        }))
      } catch (flexError) {
        console.warn('LINE Flex push failed, falling back to text:', flexError)
        lineResult = await pushLineMessage(buildContactLineMessage({
          name,
          email,
          subject: subject || null,
          message,
        }))
      }
      sentToLine = lineResult.ok
    } catch (lineError) {
      console.warn('LINE notification skipped:', lineError)
    }

    if (!savedToDatabase && !sentToLine) {
      return NextResponse.json(
        { error: 'Failed to send message' },
        { status: 500 }
      )
    }

    attempts.count = attempts.count >= BOT_CHECK_LIMIT ? 0 : attempts.count + 1

    return NextResponse.json({
      success: true,
      message: 'Message sent successfully',
      delivered: {
        database: savedToDatabase,
        line: sentToLine,
      },
    })
  } catch (error) {
    console.error('Contact API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
