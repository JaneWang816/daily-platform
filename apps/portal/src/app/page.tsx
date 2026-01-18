// apps/portal/src/app/page.tsx
import { Button } from '@daily/ui'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@daily/ui'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LogoutButton } from './logout-button'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

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
          <Link href={process.env.NEXT_PUBLIC_LIFE_URL || 'http://localhost:3001'}>
            <Card className="cursor-pointer hover:border-primary transition-colors">
              <CardHeader>
                <CardTitle>🌿 生活管理</CardTitle>
                <CardDescription>
                  習慣追蹤、任務管理、目標設定、財務記錄
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href={process.env.NEXT_PUBLIC_LEARNING_URL || 'http://localhost:3002'}>
            <Card className="cursor-pointer hover:border-primary transition-colors">
              <CardHeader>
                <CardTitle>📚 學習平台</CardTitle>
                <CardDescription>
                  字卡複習、題庫練習、學習進度追蹤
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
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
