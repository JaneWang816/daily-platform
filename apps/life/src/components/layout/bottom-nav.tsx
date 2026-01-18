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

  return (
    <>
      {showMore && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setShowMore(false)} />
          <div className="fixed bottom-16 left-0 right-0 bg-white border-t rounded-t-xl shadow-lg z-50 p-4">
            <div className="grid grid-cols-4 gap-4">
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