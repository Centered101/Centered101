import { NextResponse } from 'next/server'

function cleanEnv(value: string | undefined) {
  return value?.trim().replace(/^['"]|['"]$/g, '')
}

function normalizeOrcidId(value: string | undefined) {
  const cleaned = cleanEnv(value)
  if (!cleaned) {
    return null
  }

  return cleaned
    .replace(/^https?:\/\/(www\.)?orcid\.org\//i, '')
    .replace(/^\/|\/$/g, '')
}

export async function GET() {
  const orcidId = normalizeOrcidId(
    process.env.ORCID_ID ||
      process.env.NEXT_PUBLIC_ORCID_ID
  )

  if (!orcidId) {
    return NextResponse.json({ configured: false, orcidId: null, record: null })
  }

  try {
    const response = await fetch(`https://pub.orcid.org/v3.0/${orcidId}/record`, {
      headers: {
        Accept: 'application/json',
      },
      next: { revalidate: 3600 },
    })

    if (!response.ok) {
      return NextResponse.json({
        configured: true,
        orcidId,
        record: null,
      })
    }

    const record = await response.json()

    return NextResponse.json({
      configured: true,
      orcidId,
      record,
    })
  } catch (error) {
    console.warn('ORCID API unavailable:', error)
    return NextResponse.json({
      configured: true,
      orcidId,
      record: null,
    })
  }
}
