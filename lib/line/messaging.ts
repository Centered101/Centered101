type LineTextMessage = {
  type: 'text'
  text: string
}

function cleanEnv(value: string | undefined) {
  return value?.trim().replace(/^['"]|['"]$/g, '')
}

function getLineConfig() {
  const channelAccessToken = cleanEnv(process.env.LINE_CHANNEL_ACCESS_TOKEN)
  const to = cleanEnv(
    process.env.LINE_USER_ADMIN ||
      process.env.LINE_USER_ID ||
      process.env.LINE_TO
  )

  if (!channelAccessToken || !to) {
    return null
  }

  return { channelAccessToken, to }
}

export async function pushLineMessage(messages: LineTextMessage[]) {
  const config = getLineConfig()

  if (!config) {
    return { configured: false, ok: false }
  }

  const response = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.channelAccessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: config.to,
      messages,
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`LINE push failed: ${response.status} ${body}`)
  }

  return { configured: true, ok: true }
}

export function buildContactLineMessage(input: {
  name: string
  email: string
  subject?: string | null
  message: string
}) {
  const subject = input.subject?.trim() || 'No subject'

  return [
    {
      type: 'text' as const,
      text: [
        'New portfolio message',
        `Name: ${input.name}`,
        `Email: ${input.email}`,
        `Subject: ${subject}`,
        '',
        input.message,
      ].join('\n'),
    },
  ]
}
