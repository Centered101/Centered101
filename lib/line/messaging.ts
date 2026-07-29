type LineTextMessage = {
  type: 'text'
  text: string
}

type LineFlexMessage = {
  type: 'flex'
  altText: string
  contents: Record<string, unknown>
}

export type LineMessage = LineTextMessage | LineFlexMessage

// Canonical subdomain bases. The proxy maps `admin.` -> /admin and
// `shop.` -> /shop, so deep links use the subdomain form (NOT apex + /admin).
const ADMIN_BASE = 'https://admin.centered101.com' // e.g. ${ADMIN_BASE}/business -> /admin/business
const SHOP_ADMIN_URL = 'https://shop.centered101.com/shop/admin'

// Brand palette (matches Centered101 / shop).
const COLOR = {
  ink: '#0B1018',
  blue: '#409EFE',
  cyan: '#84D4FA',
  green: '#00CC4F',
  label: '#9CA3AF',
  value: '#111827',
  body: '#374151',
  hairline: '#E5E7EB',
  white: '#FFFFFF',
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

export async function pushLineMessage(messages: LineMessage[]) {
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

// ─── helpers ────────────────────────────────────────────────────────────────

function bangkokNow() {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok',
  }).format(new Date())
}

function truncate(text: string, max = 900) {
  const clean = (text || '').trim()
  return clean.length > max ? `${clean.slice(0, max)}…` : clean
}

function infoRow(label: string, value: string) {
  return {
    type: 'box',
    layout: 'baseline',
    spacing: 'sm',
    contents: [
      { type: 'text', text: label, size: 'sm', color: COLOR.label, flex: 2 },
      { type: 'text', text: value || '—', size: 'sm', color: COLOR.value, weight: 'bold', flex: 5, wrap: true },
    ],
  }
}

function gigaHeader(emoji: string, title: string, subtitle: string, accent: string) {
  return {
    type: 'box',
    layout: 'vertical',
    backgroundColor: COLOR.ink,
    paddingAll: '20px',
    contents: [
      {
        type: 'box',
        layout: 'horizontal',
        contents: [
          { type: 'text', text: emoji, size: 'xxl', flex: 0, gravity: 'center' },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'md',
            contents: [
              { type: 'text', text: title, weight: 'bold', size: 'lg', color: COLOR.white, wrap: true },
              { type: 'text', text: subtitle, size: 'xs', color: accent, margin: 'xs', wrap: true },
            ],
          },
        ],
      },
    ],
  }
}

// ─── Contact form notification (giga Flex) ───────────────────────────────────

export function buildContactFlexMessage(input: {
  name: string
  email: string
  subject?: string | null
  message: string
  source?: string | null
}): LineFlexMessage[] {
  const subject = input.subject?.trim() || 'No subject'
  const source = input.source?.trim() || 'Portfolio · Contact'

  const bubble = {
    type: 'bubble',
    size: 'giga',
    header: gigaHeader('📩', 'New Portfolio Message', source, COLOR.cyan),
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'md',
      paddingAll: '20px',
      contents: [
        infoRow('From', input.name),
        infoRow('Email', input.email),
        infoRow('Subject', subject),
        infoRow('Received', bangkokNow()),
        { type: 'separator', margin: 'lg', color: COLOR.hairline },
        { type: 'text', text: 'MESSAGE', weight: 'bold', size: 'xs', color: COLOR.blue, margin: 'lg' },
        { type: 'text', text: truncate(input.message), wrap: true, size: 'sm', color: COLOR.body, margin: 'sm' },
      ],
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      paddingAll: '16px',
      contents: [
        {
          type: 'button',
          style: 'primary',
          color: COLOR.blue,
          height: 'sm',
          action: { type: 'uri', label: 'Open Admin Inbox', uri: `${ADMIN_BASE}/business` },
        },
        {
          type: 'text',
          text: 'Reply to: ' + input.email,
          size: 'xxs',
          color: COLOR.label,
          align: 'center',
          wrap: true,
        },
      ],
    },
    styles: { footer: { separator: true } },
  }

  return [
    {
      type: 'flex',
      altText: `📩 ${input.name}: ${subject}`,
      contents: bubble,
    },
  ]
}

// Plain-text fallback (used if the Flex push is rejected).
export function buildContactLineMessage(input: {
  name: string
  email: string
  subject?: string | null
  message: string
}): LineTextMessage[] {
  const subject = input.subject?.trim() || 'No subject'
  return [
    {
      type: 'text',
      text: [
        '📩 New portfolio message',
        `Name: ${input.name}`,
        `Email: ${input.email}`,
        `Subject: ${subject}`,
        '',
        input.message,
      ].join('\n'),
    },
  ]
}

// ─── Shop order notification (giga Flex) ─────────────────────────────────────

export function buildShopOrderFlexMessage(order: {
  id: string
  customerName?: string | null
  customerEmail?: string | null
  total: number
  currency?: string | null
  items?: { name: string; price: number; quantity: number }[] | null
}): LineFlexMessage[] {
  const currency = (order.currency || 'THB').toUpperCase()
  const symbol = currency === 'THB' ? '฿' : ''
  const items = (order.items || []).slice(0, 12)
  const fmt = (n: number) => `${symbol}${Number(n || 0).toLocaleString()}`

  const itemRows = items.map((i) => ({
    type: 'box',
    layout: 'horizontal',
    contents: [
      { type: 'text', text: `${i.name} ×${i.quantity}`, size: 'sm', color: COLOR.value, flex: 5, wrap: true },
      { type: 'text', text: fmt(i.price * i.quantity), size: 'sm', color: COLOR.value, weight: 'bold', align: 'end', flex: 2 },
    ],
  }))

  const bubble = {
    type: 'bubble',
    size: 'giga',
    header: gigaHeader('🛒', 'New Paid Order', 'shop.centered101.com', '#5CD4A0'),
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'md',
      paddingAll: '20px',
      contents: [
        infoRow('Order', order.id.slice(0, 8).toUpperCase()),
        infoRow('Customer', order.customerName || '—'),
        infoRow('Email', order.customerEmail || '—'),
        infoRow('Paid at', bangkokNow()),
        { type: 'separator', margin: 'lg', color: COLOR.hairline },
        { type: 'text', text: 'ITEMS', weight: 'bold', size: 'xs', color: COLOR.green, margin: 'lg' },
        ...(itemRows.length
          ? itemRows
          : [{ type: 'text', text: 'No items', size: 'sm', color: COLOR.label }]),
        { type: 'separator', margin: 'lg', color: COLOR.hairline },
        {
          type: 'box',
          layout: 'horizontal',
          margin: 'md',
          contents: [
            { type: 'text', text: 'TOTAL', size: 'md', weight: 'bold', color: COLOR.value, flex: 0 },
            { type: 'text', text: fmt(order.total), size: 'xl', weight: 'bold', color: COLOR.green, align: 'end' },
          ],
        },
      ],
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      paddingAll: '16px',
      contents: [
        {
          type: 'button',
          style: 'primary',
          color: '#2DB87A',
          height: 'sm',
          action: { type: 'uri', label: 'Open Shop Admin', uri: SHOP_ADMIN_URL },
        },
      ],
    },
    styles: { footer: { separator: true } },
  }

  return [
    {
      type: 'flex',
      altText: `🛒 New order ${order.id.slice(0, 8)} — ${fmt(order.total)}`,
      contents: bubble,
    },
  ]
}
