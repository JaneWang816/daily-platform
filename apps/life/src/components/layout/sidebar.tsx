"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@daily/database/client"
import { cn } from "@daily/utils"
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  BookMarked,
  Heart,
  CheckSquare,
  ListTodo,
  Calendar,
  CalendarClock,
  Compass,
  Dumbbell,
  Wallet,
  Settings,
  ChevronDown,
  Download,
  BarChart2,
  PiggyBank,
  PieChart,
  Target,
  LogOut,
  GraduationCap,
} from "lucide-react"

type ModuleType = 'journal' | 'habits' | 'tasks' | 'schedule' | 'health' | 'finance' | 'study'

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  module?: ModuleType
  children?: NavItem[]
}

const navItems: NavItem[] = [
  { title: "總覽", href: "/dashboard", icon: LayoutDashboard },
  { title: "目標", href: "/dashboard/goals", icon: Target },
  { title: "每日行程", href: "/dashboard/plans", icon: CalendarClock },
  { title: "課表", href: "/dashboard/schedule", icon: Calendar, module: "schedule" },
  { title: "任務", href: "/dashboard/tasks", icon: ListTodo, module: "tasks" },
  { title: "習慣打卡", href: "/dashboard/habits", icon: CheckSquare, module: "habits" },
  {
    title: "日誌",
    href: "/dashboard/journal",
    icon: BookOpen,
    module: "journal",
    children: [
      { title: "生活日誌", href: "/dashboard/journal/life", icon: FileText },
      { title: "學習日誌", href: "/dashboard/journal/learning", icon: BookMarked },
      { title: "閱讀日誌", href: "/dashboard/journal/reading", icon: BookOpen },
      { title: "感恩日誌", href: "/dashboard/journal/gratitude", icon: Heart },
      { title: "遊覽日誌", href: "/dashboard/journal/travel", icon: Compass },
    ],
  },
  {
    title: "健康記錄",
    href: "/dashboard/health",
    icon: Dumbbell,
    module: "health",
    children: [
      { title: "運動與數據", href: "/dashboard/health", icon: Dumbbell },
      { title: "健康統計", href: "/dashboard/health/stats", icon: BarChart2 },
    ],
  },
  {
    title: "收支記錄",
    href: "/dashboard/finance",
    icon: Wallet,
    module: "finance",
    children: [
      { title: "收支明細", href: "/dashboard/finance", icon: Wallet },
      { title: "預算管理", href: "/dashboard/finance/budget", icon: PiggyBank },
      { title: "財務統計", href: "/dashboard/finance/stats", icon: PieChart },
    ],
  },
  { title: "資料匯出", href: "/dashboard/export", icon: Download },
  { title: "設定", href: "/dashboard/settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [enabledModules, setEnabledModules] = useState<ModuleType[]>([])
  const [expandedItems, setExpandedItems] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || "http://localhost:3000"
  const learningUrl = process.env.NEXT_PUBLIC_LEARNING_URL || "http://localhost:3002"

  useEffect(() => {
    const loadEnabledModules = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("enabled_modules")
        .eq("id", user.id)
        .single<{ enabled_modules: string[] | null }>()

      if (profile?.enabled_modules) {
        setEnabledModules(profile.enabled_modules as ModuleType[])
      }
      setLoading(false)
    }

    loadEnabledModules()
  }, [])

  useEffect(() => {
    navItems.forEach((item) => {
      if (item.children) {
        const isChildActive = item.children.some((child) =>
          pathname.startsWith(child.href)
        )
        if (isChildActive && !expandedItems.includes(item.href)) {
          setExpandedItems((prev) => [...prev, item.href])
        }
      }
    })
  }, [pathname])

  const toggleExpand = (href: string) => {
    setExpandedItems((prev) =>
      prev.includes(href)
        ? prev.filter((item) => item !== href)
        : [...prev, href]
    )
  }

  const filteredNavItems = navItems.filter((item) => {
    if (!item.module) return true
    return enabledModules.includes(item.module)
  })

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard"
    return pathname === href || pathname.startsWith(href + "/")
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = portalUrl
  }

  // 切換到學習平台（使用 token transfer）
  const handleSwitchToLearning = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      window.location.href = portalUrl
      return
    }

    const transferUrl = `${learningUrl}/auth/transfer?access_token=${session.access_token}&refresh_token=${session.refresh_token}`
    window.location.href = transferUrl
  }

  return (
    <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 bg-white border-r">
      <div className="flex items-center h-16 px-6 border-b">
        <span className="text-xl font-bold text-gray-800">🌿 生活管理</span>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          filteredNavItems.map((item) => {
            const active = isActive(item.href)
            const expanded = expandedItems.includes(item.href)
            const hasChildren = item.children && item.children.length > 0

            return (
              <div key={item.href}>
                {hasChildren ? (
                  <button
                    onClick={() => toggleExpand(item.href)}
                    className={cn(
                      "flex items-center justify-between w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                      active ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100"
                    )}
                  >
                    <div className="flex items-center">
                      <item.icon className={cn("w-5 h-5 mr-3", active ? "text-blue-700" : "text-gray-400")} />
                      {item.title}
                    </div>
                    <ChevronDown className={cn("w-4 h-4 transition-transform", expanded ? "rotate-180" : "")} />
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                      active ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100"
                    )}
                  >
                    <item.icon className={cn("w-5 h-5 mr-3", active ? "text-blue-700" : "text-gray-400")} />
                    {item.title}
                  </Link>
                )}

                {hasChildren && expanded && (
                  <div className="ml-4 mt-1 space-y-1">
                    {item.children!.map((child) => {
                      const childActive = isActive(child.href)
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            "flex items-center px-4 py-2 text-sm rounded-lg transition-colors",
                            childActive ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:bg-gray-100"
                          )}
                        >
                          <child.icon className={cn("w-4 h-4 mr-3", childActive ? "text-blue-700" : "text-gray-400")} />
                          {child.title}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        )}
      </nav>

      {/* 底部：切換平台 + 登出 */}
      <div className="p-4 border-t space-y-1">
        {/* 切換到學習平台 */}
        <button
          onClick={handleSwitchToLearning}
          className="flex items-center w-full px-4 py-3 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-100"
        >
          <GraduationCap className="w-5 h-5 mr-3 text-indigo-600" />
          切換到學習平台
        </button>

        {/* 登出 */}
        <button
          onClick={handleLogout}
          className="flex items-center w-full px-4 py-3 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-100"
        >
          <LogOut className="w-5 h-5 mr-3 text-gray-400" />
          登出
        </button>
      </div>
    </aside>
  )
}
