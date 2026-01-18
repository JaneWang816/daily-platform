// apps/learning/src/app/dashboard/layout.tsx
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Sidebar, BottomNav, Header } from "@/components/layout"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        // 未登入跳轉到 Portal
        const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3000'
        window.location.href = portalUrl
      } else {
        setAuthenticated(true)
      }
      setLoading(false)
    }

    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "SIGNED_OUT") {
          const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3000'
          window.location.href = portalUrl
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600">載入中...</p>
        </div>
      </div>
    )
  }

  if (!authenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 側邊欄（桌面版） */}
      <div className="hidden md:block fixed inset-y-0 left-0 z-50">
        <Sidebar />
      </div>

      {/* 主內容區 */}
      <div className="md:pl-64">
        {/* 頂部導航 */}
        <Header />

        {/* 頁面內容 */}
        <main className="p-4 md:p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>

      {/* 底部導航（手機版） */}
      <BottomNav />
    </div>
  )
}
