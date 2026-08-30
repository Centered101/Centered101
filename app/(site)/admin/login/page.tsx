'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePageTitle } from '@/lib/hooks/use-page-title'
import { useAdminAuth } from '@/components/admin/AdminAuthProvider'

export default function AdminLoginPage() {
  usePageTitle('เข้าสู่ระบบ')
  const router = useRouter()
  const { isAuthenticated, isBooting } = useAdminAuth()

  useEffect(() => {
    if (!isBooting && isAuthenticated) {
      router.replace('/admin')
    }
  }, [isAuthenticated, isBooting, router])

  return null
}
