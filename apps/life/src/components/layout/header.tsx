//apps/life/src/components/layout/header.tsx
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@daily/database/client"
import { Button } from "@daily/ui"
import { LogOut, User } from "lucide-react"

export function Header() {
  const router = useRouter()
  const supabase = createClient()
  const [nickname, setNickname] = useState<string | null>(null)

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from("profiles")
        .select("nickname")
        .eq("id", user.id)
        .single<{ nickname: string | null }>()

      if (data?.nickname) {
        setNickname(data.nickname)
      }
    }

    loadProfile()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("http://localhost:3000")
  }

  return (
    <header className="sticky top-0 z-40 bg-white border-b md:hidden">
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold">🌿 生活管理</span>
        </div>

        <div className="flex items-center gap-2">
          {nickname && (
            <span className="text-sm text-gray-600 flex items-center gap-1">
              <User className="w-4 h-4" />
              {nickname}
            </span>
          )}
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  )
}