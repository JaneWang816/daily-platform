// apps/portal/src/app/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardDescription, CardHeader, CardTitle } from '@daily/ui'
import { createClient } from '@daily/database/client'
import { LogoutButton } from './logout-button'

export default function HomePage() {
  const router = useRouter()
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }
      
      setUser(user)
      setLoading(false)
    }
    
    checkUser()
  }, [router])

  const handleNavigate = async (platform: 'life' | 'learning') => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      router.push('/login')
      return
    }

    const baseUrl = platform === 'life' 
      ? (process.env.NEXT_PUBLIC_LIFE_URL || 'http://localhost:3001')
      : (process.env.NEXT_PUBLIC_LEARNING_URL || 'http://localhost:3002')

    // 跳轉到目標平台的 auth/transfer 頁面，帶上 token
    const transferUrl = `${baseUrl}/auth/transfer?access_token=${session.access_token}&refresh_token=${session.refresh_token}`
    
    window.location.href = transferUrl
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold">Daily Platform</h1>
          <p className="text-muted-foreground mt-2">選擇要進入的平台</p>
        </div>

        {/* 平台選擇卡片 */}
        <div className="grid gap-4">
          <button onClick={() => handleNavigate('life')} className="text-left">
            <Card className="cursor-pointer hover:border-primary transition-colors">
              <CardHeader>
                <CardTitle>🌿 生活管理</CardTitle>
                <CardDescription>
                  習慣追蹤、任務管理、目標設定、財務記錄
                </CardDescription>
              </CardHeader>
            </Card>
          </button>

          <button onClick={() => handleNavigate('learning')} className="text-left">
            <Card className="cursor-pointer hover:border-primary transition-colors">
              <CardHeader>
                <CardTitle>📚 學習平台</CardTitle>
                <CardDescription>
                  字卡複習、題庫練習、學習進度追蹤
                </CardDescription>
              </CardHeader>
            </Card>
          </button>
        </div>

        {/* 用戶資訊 & 登出 */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground truncate">
              {user?.email}
            </p>
            <LogoutButton />
          </div>
        </div>
      </div>
    </main>
  )
}
