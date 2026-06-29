'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAdminAuth } from '@/components/admin/AdminAuthProvider'

export type ApiState<T> = {
  data: T | null
  loading: boolean
  error: string | null
}

export function useAdminApi<T>(path: string) {
  const auth = useAdminAuth()
  const [state, setState] = useState<ApiState<T>>({ data: null, loading: true, error: null })
  const pathRef = useRef(path)
  pathRef.current = path

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const res = await fetch(pathRef.current, { headers: auth.getAdminHeaders() })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)
      setState({ data: json as T, loading: false, error: null })
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: (err as Error).message }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isAuthenticated])

  useEffect(() => {
    if (auth.isAuthenticated) load()
  }, [auth.isAuthenticated, load])

  return { ...state, refetch: load }
}

export function useAdminMutation<TInput, TResult = unknown>(
  path: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'POST'
) {
  const { getAdminHeaders } = useAdminAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = useCallback(
    async (body?: TInput, params?: Record<string, string>): Promise<TResult> => {
      setLoading(true)
      setError(null)
      try {
        const qs = params ? '?' + new URLSearchParams(params).toString() : ''
        const url = `${path}${qs}`
        const init: RequestInit = {
          method,
          headers: { ...getAdminHeaders(), 'Content-Type': 'application/json' },
        }
        if (body !== undefined) init.body = JSON.stringify(body)
        const res = await fetch(url, init)
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)
        return json as TResult
      } catch (err) {
        const msg = (err as Error).message
        setError(msg)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [path, method, getAdminHeaders]
  )

  return { mutate, loading, error }
}
