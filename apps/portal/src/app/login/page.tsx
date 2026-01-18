// apps/portal/src/app/login/page.tsx
'use client'

import { useState } from 'react'
import { Button } from '@daily/ui'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@daily/ui'
import { login, signup } from './actions'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'login' | 'signup'>('login')

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    setError(null)

    try {
      if (mode === 'login') {
        await login(formData)
      } else {
        await signup(formData)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '發生錯誤，請稍後再試')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/20">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Daily Platform</CardTitle>
          <CardDescription>
            {mode === 'login' ? '登入你的帳號' : '建立新帳號'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                電子郵件
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full px-3 py-2 border rounded-md bg-background"
                placeholder="your@email.com"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                密碼
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                className="w-full px-3 py-2 border rounded-md bg-background"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950/50 rounded-md">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? '處理中...' : mode === 'login' ? '登入' : '註冊'}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            {mode === 'login' ? (
              <>
                還沒有帳號？{' '}
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="text-primary hover:underline"
                >
                  註冊
                </button>
              </>
            ) : (
              <>
                已有帳號？{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-primary hover:underline"
                >
                  登入
                </button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
