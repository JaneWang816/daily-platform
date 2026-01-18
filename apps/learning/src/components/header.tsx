"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@daily/database"
import { Button } from "@daily/ui"
import { User, LogOut, Settings, Bell } from "lucide-react"

export function Header() {
  const router = useRouter()
  const [user, setUser] = useState<{ email?: string; nickname?: string } | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser({
          email: user.email,
          nickname: user.user_metadata?.nickname,
        })
      }
    }
    fetchUser()
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    // 登出後跳轉到 Portal
    const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3000'
    window.location.href = portalUrl
  }

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      {/* 左側空間（可放麵包屑或搜尋） */}
      <div className="flex-1">
        {/* 可以加搜尋框 */}
      </div>

      {/* 右側：通知 + 用戶 */}
      <div className="flex items-center gap-4">
        {/* 通知按鈕 */}
        <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 relative">
          <Bell className="w-5 h-5" />
          {/* 未讀通知點點 */}
          {/* <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span> */}
        </button>

        {/* 用戶選單 */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100"
          >
            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-indigo-600" />
            </div>
            <span className="text-sm font-medium text-gray-700 max-w-[120px] truncate">
              {user?.nickname || user?.email?.split("@")[0] || "用戶"}
            </span>
          </button>

          {showDropdown && (
            <>
              {/* 點擊外部關閉 */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowDropdown(false)}
              />
              {/* 下拉選單 */}
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {user?.nickname || "用戶"}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
                <button
                  onClick={() => {
                    setShowDropdown(false)
                    router.push("/dashboard/settings")
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Settings className="w-4 h-4" />
                  設定
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4" />
                  登出
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
