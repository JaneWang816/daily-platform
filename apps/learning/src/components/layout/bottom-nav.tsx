// apps/learning/src/components/layout/bottom-nav.tsx
"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { createClient } from "@daily/database/client"
import { cn } from "@daily/utils"
import {
  LayoutDashboard,
  BookOpen,
  FileQuestion,
  Lightbulb,
  MoreHorizontal,
  Timer,
  BarChart2,
  XCircle,
  Settings,
  Leaf,
  LogOut,
  FolderOpen,  // 新增：學習歷程圖示
} from "lucide-react"

const mainNavItems = [
  { title: "總覽", href: "/dashboard", icon: LayoutDashboard },
  { title: "科目", href: "/dashboard/subjects", icon: BookOpen },
  { title: "題庫", href: "/dashboard/practice", icon: FileQuestion },
  { title: "字卡", href: "/dashboard/flashcards", icon: Lightbulb },
]

const moreNavItems = [
  { title: "學習歷程", href: "/dashboard/portfolio", icon: FolderOpen },  // 新增
  { title: "番茄鐘", href: "/dashboard/pomodoro", icon: Timer },
  { title: "錯題本", href: "/dashboard/mistakes", icon: XCircle },
  { title: "統計", href: "/dashboard/stats", icon: BarChart2 },
  { title: "設定", href: "/dashboard/settings", icon: Settings },
]

export function BottomNav() {
  const pathname = usePathname()
  const [showMore, setShowMore] = useState(false)

  const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || "http://localhost:3000"
  const lifeUrl = process.env.NEXT_PUBLIC_LIFE_URL || "http://localhost:3001"

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard"
    }
    return pathname.startsWith(href)
  }

  const isMoreActive = moreNavItems.some((item) => isActive(item.href))

  // 切換到生活平台
  const handleSwitchToLife = async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      window.location.href = portalUrl
      return
    }

    const transferUrl = `${lifeUrl}/auth/transfer?access_token=${session.access_token}&refresh_token=${session.refresh_token}`
    window.location.href = transferUrl
  }

  // 登出
  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = portalUrl
  }

  return (
    <>
      {/* 更多選單 */}
      {showMore && (
        <>
          <div 
            className="fixed inset-0 bg-black/20 z-40" 
            onClick={() => setShowMore(false)} 
          />
          <div className="fixed bottom-16 left-0 right-0 bg-white border-t rounded-t-xl shadow-lg z-50 p-4">
            {/* 功能項目 */}
            <div className="grid grid-cols-4 gap-4 mb-4">
              {moreNavItems.map((item) => {
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMore(false)}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-lg transition-colors",
                      active ? "bg-indigo-50 text-indigo-600" : "text-gray-500 hover:bg-gray-100"
                    )}
                  >
                    <item.icon className="w-6 h-6" />
                    <span className="mt-1 text-xs">{item.title}</span>
                  </Link>
                )
              })}
            </div>

            {/* 分隔線 */}
            <div className="border-t border-gray-200 pt-4">
              <div className="grid grid-cols-2 gap-4">
                {/* 切換到生活平台 */}
                <button
                  onClick={handleSwitchToLife}
                  className="flex flex-col items-center justify-center p-3 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  <Leaf className="w-6 h-6 text-green-600" />
                  <span className="mt-1 text-xs">生活平台</span>
                </button>

                {/* 登出 */}
                <button
                  onClick={handleLogout}
                  className="flex flex-col items-center justify-center p-3 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  <LogOut className="w-6 h-6 text-gray-400" />
                  <span className="mt-1 text-xs">登出</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 底部導航 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden z-50">
        <div className="flex items-center justify-around h-16">
          {mainNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full text-xs transition-colors",
                isActive(item.href)
                  ? "text-indigo-600"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5 mb-1",
                isActive(item.href) && "text-indigo-600"
              )} />
              <span className={cn(
                isActive(item.href) && "font-medium"
              )}>{item.title}</span>
            </Link>
          ))}

          {/* 更多按鈕 */}
          <button
            onClick={() => setShowMore(!showMore)}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full text-xs transition-colors",
              isMoreActive || showMore
                ? "text-indigo-600"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <MoreHorizontal className={cn(
              "w-5 h-5 mb-1",
              (isMoreActive || showMore) && "text-indigo-600"
            )} />
            <span className={cn(
              (isMoreActive || showMore) && "font-medium"
            )}>更多</span>
          </button>
        </div>
      </nav>
    </>
  )
}
