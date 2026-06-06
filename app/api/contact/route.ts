import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildContactLineMessage, pushLineMessage } from '@/lib/line/messaging'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, subject, message } = body

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

    try {
      const supabase = createAdminClient() || await createClient()

      const { error } = await supabase.from('contact_messages').insert({
        name,
        email,
        subject: subject || null,
        message,
      })

      if (error) {
        console.warn('Contact message database save skipped:', error)
      } else {
        savedToDatabase = true
      }
    } catch (databaseError) {
      console.warn('Contact message database unavailable:', databaseError)
    }

    try {
      const lineResult = await pushLineMessage(buildContactLineMessage({
        name,
        email,
        subject: subject || null,
        message,
      }))
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
