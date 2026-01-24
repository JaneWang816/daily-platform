//apps/life/src/components/layout/bottom-nav.tsx
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { createClient } from "@daily/database/client"
import { cn } from "@daily/utils"
import {
  LayoutDashboard,
  BookOpen,
  CheckSquare,
  ListTodo,
  Calendar,
  CalendarClock,
  MoreHorizontal,
  Dumbbell,
  Wallet,
  Settings,
  Download,
  Target,
  GraduationCap,
  LogOut,
} from "lucide-react"

type ModuleType = 'journal' | 'habits' | 'tasks' | 'schedule' | 'health' | 'finance' | 'study'

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  module?: ModuleType
  priority: number
}

const allNavItems: NavItem[] = [
  { title: "總覽", href: "/dashboard", icon: LayoutDashboard, priority: 0 },
  { title: "行程", href: "/dashboard/plans", icon: CalendarClock, priority: 1 },
  { title: "日誌", href: "/dashboard/journal/life", icon: BookOpen, module: "journal", priority: 2 },
  { title: "習慣", href: "/dashboard/habits", icon: CheckSquare, module: "habits", priority: 3 },
  { title: "任務", href: "/dashboard/tasks", icon: ListTodo, module: "tasks", priority: 4 },
  { title: "課表", href: "/dashboard/schedule", icon: Calendar, module: "schedule", priority: 5 },
  { title: "目標", href: "/dashboard/goals", icon: Target, priority: 6 },
  { title: "健康", href: "/dashboard/health", icon: Dumbbell, module: "health", priority: 7 },
  { title: "收支", href: "/dashboard/finance", icon: Wallet, module: "finance", priority: 8 },
  { title: "匯出", href: "/dashboard/export", icon: Download, priority: 9 },
  { title: "設定", href: "/dashboard/settings", icon: Settings, priority: 10 },
]

const MAX_VISIBLE_ITEMS = 5

export function BottomNav() {
  const pathname = usePathname()
  const supabase = createClient()
  const [enabledModules, setEnabledModules] = useState<ModuleType[]>([])
  const [showMore, setShowMore] = useState(false)

  const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || "http://localhost:3000"
  const learningUrl = process.env.NEXT_PUBLIC_LEARNING_URL || "http://localhost:3002"

  useEffect(() => {
    const loadEnabledModules = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from("profiles")
        .select("enabled_modules")
        .eq("id", user.id)
        .single<{ enabled_modules: string[] | null }>()

      if (profile?.enabled_modules) {
        setEnabledModules(profile.enabled_modules as ModuleType[])
      }
    }

    loadEnabledModules()
  }, [])

  const filteredItems = allNavItems
    .filter((item) => {
      if (!item.module) return true
      return enabledModules.includes(item.module)
    })
    .sort((a, b) => a.priority - b.priority)

  const needsMoreMenu = filteredItems.length > MAX_VISIBLE_ITEMS
  const visibleItems = needsMoreMenu ? filteredItems.slice(0, MAX_VISIBLE_ITEMS - 1) : filteredItems
  const moreItems = needsMoreMenu ? filteredItems.slice(MAX_VISIBLE_ITEMS - 1) : []

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard"
    return pathname === href || pathname.startsWith(href + "/")
  }

  const isMoreActive = moreItems.some((item) => isActive(item.href))

  // 切換到學習平台
  const handleSwitchToLearning = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      window.location.href = portalUrl
      return
    }

    const transferUrl = `${learningUrl}/auth/transfer?access_token=${session.access_token}&refresh_token=${session.refresh_token}`
    window.location.href = transferUrl
  }

  // 登出
  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = portalUrl
  }

  return (
    <>
      {showMore && (
        <>
          <div 
            className="fixed inset-0 bg-black/20 z-40" 
            onClick={() => setShowMore(false)} 
          />
          <div className="fixed bottom-16 left-0 right-0 bg-white border-t rounded-t-xl shadow-lg z-50 p-4">
            {/* 功能項目 */}
            <div className="grid grid-cols-4 gap-4 mb-4">
              {moreItems.map((item) => {
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMore(false)}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-lg transition-colors",
                      active ? "bg-blue-50 text-blue-600" : "text-gray-500 hover:bg-gray-100"
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
                {/* 切換到學習平台 */}
                <button
                  onClick={handleSwitchToLearning}
                  className="flex flex-col items-center justify-center p-3 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  <GraduationCap className="w-6 h-6 text-indigo-600" />
                  <span className="mt-1 text-xs">學習平台</span>
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

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t z-50">
        <div className="flex items-center justify-around h-16">
          {visibleItems.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full transition-colors",
                  active ? "text-blue-600" : "text-gray-500 hover:text-gray-700"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="mt-1 text-xs">{item.title}</span>
              </Link>
            )
          })}

          {needsMoreMenu && (
            <button
              onClick={() => setShowMore(!showMore)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full transition-colors",
                isMoreActive || showMore ? "text-blue-600" : "text-gray-500 hover:text-gray-700"
              )}
            >
              <MoreHorizontal className="w-5 h-5" />
              <span className="mt-1 text-xs">更多</span>
            </button>
          )}
        </div>
      </nav>
    </>
  )
}
