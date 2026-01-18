//apps/life/src/app/login/page.tsx
"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createBrowserClient } from '@supabase/ssr'
import { Button, Input, Label } from "@daily/ui"
import { Loader2, LogIn } from "lucide-react"

// Supabase Client
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// 登入表單元件
function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirect") || "/dashboard"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        if (authError.message.includes("Invalid login")) {
          setError("帳號或密碼錯誤")
        } else {
          setError(authError.message)
        }
        return
      }

      if (data.user) {
        // 登入成功，跳轉到原本要去的頁面
        router.push(redirectTo)
        router.refresh()
      }
    } catch (err) {
      setError("登入失敗，請稍後再試")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo / 標題 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">📅 生活管理</h1>
          <p className="text-gray-600 mt-2">登入以繼續使用</p>
        </div>

        {/* 登入表單 */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">電子郵件</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">密碼</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
              />
            </div>

            {/* 錯誤訊息 */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            {/* 登入按鈕 */}
            <Button
              type="submit"
              className="w-full"
              disabled={loading || !email || !password}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  登入中...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  登入
                </>
              )}
            </Button>
          </form>
        </div>

        {/* 底部連結 */}
        <div className="text-center mt-4 text-sm text-gray-500">
          <p>
            還沒有帳號？請聯繫管理員
          </p>
        </div>
      </div>
    </div>
  )
}

// Loading fallback
function LoginLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

// 主元件（使用 Suspense 包裹）
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginForm />
    </Suspense>
  )
}
