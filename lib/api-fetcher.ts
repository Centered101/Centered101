export async function fetchJson<T>(url: string, fallback: T, errorMessage: string): Promise<T> {
  const response = await fetch(url)
  const contentType = response.headers.get('content-type') || ''
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : null

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload
        ? String(payload.error)
        : `${errorMessage} (${response.status})`

    if (process.env.NODE_ENV !== 'production') {
      console.warn(message)
    }

    return fallback
  }

  return (payload ?? fallback) as T
}
