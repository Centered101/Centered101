'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { createClient as createBrowserClient } from '@/lib/supabase/client'

export type AdminAuthInfo = {
  source: string
  authUserId?: string
  adminUserId?: string
  email?: string
  githubUsername?: string
  displayName?: string
  avatarUrl?: string
  roles: string[]
  permissions: string[]
}

type AdminAuthContextValue = {
  isAuthenticated: boolean
  isBooting: boolean
  isLoading: boolean
  authMode: 'token' | 'github'
  authInfo: AdminAuthInfo | null
  token: string
  adminUsername: string
  setAdminUsername: (v: string) => void
  setToken: (v: string) => void
  setAuthMode: (v: 'token' | 'github') => void
  getAdminHeaders: (nextToken?: string, mode?: 'token' | 'github', username?: string) => Record<string, string>
  unlockDashboard: (nextToken?: string, mode?: 'token' | 'github', username?: string) => Promise<void>
  loginWithGitHub: (next?: string) => Promise<void>
  logout: () => Promise<void>
}

const TOKEN_KEY = 'centered101_admin_token'
const USERNAME_KEY = 'centered101_admin_username'

export const AdminAuthContext = createContext<AdminAuthContextValue | null>(null)

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [adminUsername, setAdminUsername] = useState('')
  const [token, setToken] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isBooting, setIsBooting] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [authMode, setAuthMode] = useState<'token' | 'github'>('token')
  const [authInfo, setAuthInfo] = useState<AdminAuthInfo | null>(null)

  function getAdminHeaders(
    nextToken = token,
    mode = authMode,
    username = adminUsername
  ): Record<string, string> {
    return {
      'x-admin-username': mode === 'token' ? username : '',
      'x-admin-token': mode === 'token' ? nextToken : '',
      Authorization: mode === 'github' ? `Bearer ${nextToken}` : '',
    }
  }

  async function fetchAdminProfile(
    nextToken: string,
    mode: 'token' | 'github',
    username: string
  ): Promise<AdminAuthInfo> {
    const headers: Record<string, string> = {
      'x-admin-username': mode === 'token' ? username : '',
      'x-admin-token': mode === 'token' ? nextToken : '',
      Authorization: mode === 'github' ? `Bearer ${nextToken}` : '',
    }
    const response = await fetch('/api/admin/auth/me', { headers })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'ตรวจสอบสิทธิ์ admin ไม่สำเร็จ')
    return data.admin as AdminAuthInfo
  }

  async function restoreGitHubSession(): Promise<boolean> {
    try {
      const response = await fetch('/api/admin/auth/session', {
        cache: 'no-store',
        credentials: 'same-origin',
      })
      if (!response.ok) return false
      const data = await response.json()
      const accessToken = String(data.accessToken || '')
      const nextAuthInfo = data.admin as AdminAuthInfo
      if (!accessToken || !nextAuthInfo) return false
      setToken(accessToken)
      setAuthMode('github')
      setAuthInfo(nextAuthInfo)
      setIsAuthenticated(true)
      return true
    } catch {
      return false
    }
  }

  useEffect(() => {
    async function boot() {
      const authError = new URLSearchParams(window.location.search).get('auth_error')
      if (authError) toast.error(`GitHub login failed: ${authError}`)

      const restored = await restoreGitHubSession()
      if (!restored) {
        const savedUsername = window.localStorage.getItem(USERNAME_KEY) || ''
        const savedToken = window.localStorage.getItem(TOKEN_KEY) || ''
        if (savedUsername && savedToken) {
          setAdminUsername(savedUsername)
          setToken(savedToken)
          try {
            const nextAuthInfo = await fetchAdminProfile(savedToken, 'token', savedUsername)
            setAuthInfo(nextAuthInfo)
            setIsAuthenticated(true)
          } catch {
            window.localStorage.removeItem(USERNAME_KEY)
            window.localStorage.removeItem(TOKEN_KEY)
          }
        }
      }
      setIsBooting(false)
    }
    boot()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function unlockDashboard(
    nextToken = token,
    mode: 'token' | 'github' = authMode,
    username = adminUsername
  ) {
    if (!nextToken || (mode === 'token' && !username)) {
      toast.warning('เข้าสู่ระบบด้วย GitHub หรือใส่ username/password ก่อน')
      return
    }
    setIsLoading(true)
    const toastId = toast.loading('กำลังโหลด dashboard...')
    try {
      const nextAuthInfo = await fetchAdminProfile(nextToken, mode, username)
      if (mode === 'token') {
        window.localStorage.setItem(USERNAME_KEY, username)
        window.localStorage.setItem(TOKEN_KEY, nextToken)
      }
      setAuthMode(mode)
      setAuthInfo(nextAuthInfo)
      setIsAuthenticated(true)
      toast.success('เข้าสู่ระบบแล้ว', { id: toastId })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด'
      toast.error(message, { id: toastId })
    } finally {
      setIsLoading(false)
    }
  }

  async function loginWithGitHub(next?: string) {
    setIsLoading(true)
    try {
      const supabase = createBrowserClient()
      const origin = window.location.origin
      const redirectNext = next ?? window.location.pathname
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(redirectNext)}` },
      })
      if (error) throw error
    } catch (error) {
      const message = error instanceof Error ? error.message : 'GitHub login failed'
      toast.error(message)
      setIsLoading(false)
    }
  }

  async function logout() {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    window.localStorage.removeItem(USERNAME_KEY)
    window.localStorage.removeItem(TOKEN_KEY)
    setAdminUsername('')
    setToken('')
    setIsAuthenticated(false)
    setAuthMode('token')
    setAuthInfo(null)
    toast.info('ออกจากระบบ admin แล้ว')
  }

  return (
    <AdminAuthContext.Provider
      value={{
        isAuthenticated,
        isBooting,
        isLoading,
        authMode,
        authInfo,
        token,
        adminUsername,
        setAdminUsername,
        setToken,
        setAuthMode,
        getAdminHeaders,
        unlockDashboard,
        loginWithGitHub,
        logout,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth(): AdminAuthContextValue {
  const context = useContext(AdminAuthContext)
  if (!context) throw new Error('useAdminAuth must be used within AdminAuthProvider')
  return context
}
