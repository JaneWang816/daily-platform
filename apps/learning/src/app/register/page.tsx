"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@daily/database"
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, CardDescription } from "@daily/ui"
import { GraduationCap, Loader2 } from "lucide-react"

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [nickname, setNickname] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError("密碼與確認密碼不符")
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError("密碼至少需要 6 個字元")
      setLoading(false)
      return
    }

    const supabase = createClient()
    
    // 註冊
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nickname: nickname || email.split("@")[0],
        },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    // 如果需要驗證信
    if (data.user && !data.session) {
      setSuccess(true)
      setLoading(false)
      return
    }

    // 直接登入成功
    router.push("/dashboard")
    router.refresh()
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <GraduationCap className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">註冊成功！</CardTitle>
            <CardDescription>
              我們已寄送驗證信到 {email}，請查收並點擊連結完成驗證。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login">
              <Button className="w-full">返回登入頁面</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
            <GraduationCap className="w-8 h-8 text-indigo-600" />
          </div>
          <CardTitle className="text-2xl">建立帳號</CardTitle>
          <CardDescription>開始你的學習之旅</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nickname">暱稱（選填）</Label>
              <Input
                id="nickname"
                type="text"
                placeholder="你的暱稱"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">電子郵件</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密碼</Label>
              <Input
                id="password"
                type="password"
                placeholder="至少 6 個字元"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">確認密碼</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="再輸入一次密碼"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  註冊中...
                </>
              ) : (
                "註冊"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            已經有帳號？{" "}
            <Link href="/login" className="text-indigo-600 hover:underline font-medium">
              登入
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
