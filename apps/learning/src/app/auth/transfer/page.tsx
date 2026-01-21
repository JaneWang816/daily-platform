// apps/learning/src/app/auth/transfer/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@daily/database/client'

export default function AuthTransferPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const transferSession = async () => {
      const accessToken = searchParams.get('access_token')
      const refreshToken = searchParams.get('refresh_token')

      if (!accessToken || !refreshToken) {
        setError('缺少認證資訊')
        // 導向 Portal 重新登入
        setTimeout(() => {
          const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3000'
          window.location.href = `${portalUrl}/login`
        }, 2000)
        return
      }

      const supabase = createClient()

      // 使用 token 建立 session
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })

      if (error) {
        console.error('Session transfer error:', error)
        setError('登入失敗，請重新登入')
        setTimeout(() => {
          const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3000'
          window.location.href = `${portalUrl}/login`
        }, 2000)
        return
      }

      // 成功，導向 dashboard
      router.replace('/dashboard')
    }

    transferSession()
  }, [searchParams, router])

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        {error ? (
          <div className="space-y-4">
            <p className="text-red-600">{error}</p>
            <p className="text-sm text-gray-500">正在重新導向...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-gray-600">正在登入學習平台...</p>
          </div>
        )}
      </div>
    </main>
  )
}
