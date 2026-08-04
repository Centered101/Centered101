'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAdminAuth } from '@/components/admin/AdminAuthProvider'

export type ApiState<T> = {
  data: T | null
  loading: boolean
  error: string | null
}

function getApiErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด'
  const normalized = message.toLowerCase()
  if (normalized.includes('failed to fetch') || normalized.includes('fetch failed') || normalized.includes('networkerror')) {
    return 'เชื่อมต่อ API ไม่สำเร็จ กรุณาตรวจสอบว่า dev server ยังทำงานอยู่ แล้วลองใหม่อีกครั้ง'
  }
  return message
}

export function useAdminApi<T>(path: string) {
  const auth = useAdminAuth()
  const [state, setState] = useState<ApiState<T>>({ data: null, loading: true, error: null })
  const pathRef = useRef(path)
  pathRef.current = path

  async function readJsonResponse(response: Response) {
    try {
      return await response.json()
    } catch {
      return { error: response.statusText || `HTTP ${response.status}` }
    }
  }

  const load = useCallback(async () => {
    if (!auth.isAuthenticated) {
      setState((s) => ({ ...s, loading: false, error: 'กรุณาเข้าสู่ระบบ admin ก่อน' }))
      return
    }

    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      let res = await fetch(pathRef.current, { headers: auth.getAdminHeaders() })
      if (res.status === 401) {
        const freshHeaders = await auth.refreshAdminHeaders()
        if (freshHeaders) {
          res = await fetch(pathRef.current, { headers: freshHeaders })
        } else {
          throw new Error('Session admin หมดอายุ กรุณาเข้าสู่ระบบใหม่')
        }
      }
      const json = await readJsonResponse(res)
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)
      setState({ data: json as T, loading: false, error: null })
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: getApiErrorMessage(err) }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isAuthenticated])

  useEffect(() => {
    if (auth.isAuthenticated) {
      load()
    } else {
      setState((s) => ({ ...s, loading: false, error: null }))
    }
  }, [auth.isAuthenticated, load, path])

  return { ...state, refetch: load }
}

export function useAdminMutation<TInput, TResult = unknown>(
  path: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'POST'
) {
  const { getAdminHeaders, refreshAdminHeaders } = useAdminAuth()
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
        let res = await fetch(url, init)
        if (res.status === 401) {
          const freshHeaders = await refreshAdminHeaders()
          if (freshHeaders) {
            res = await fetch(url, {
              ...init,
              headers: { ...freshHeaders, 'Content-Type': 'application/json' },
            })
          }
        }
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)
        return json as TResult
      } catch (err) {
        const msg = getApiErrorMessage(err)
        setError(msg)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [path, method, getAdminHeaders, refreshAdminHeaders]
  )

  return { mutate, loading, error }
}
