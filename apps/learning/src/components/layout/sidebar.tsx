"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@daily/database/client"
import { cn } from "@daily/utils"
import {
  LayoutDashboard,
  BookOpen,
  FileQuestion,
  XCircle,
  Lightbulb,
  BarChart2,
  Timer,
  Settings,
  ChevronDown,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Leaf,
} from "lucide-react"

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  children?: NavItem[]
}

const navItems: NavItem[] = [
  {
    title: "總覽",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "科目管理",
    href: "/dashboard/subjects",
    icon: BookOpen,
  },
  {
    title: "題庫練習",
    href: "/dashboard/practice",
    icon: FileQuestion,
  },
  {
    title: "錯題本",
    href: "/dashboard/mistakes",
    icon: XCircle,
  },
  {
    title: "字卡系統",
    href: "/dashboard/flashcards",
    icon: Lightbulb,
  },
  {
    title: "學習統計",
    href: "/dashboard/stats",
    icon: BarChart2,
  },
  {
    title: "番茄鐘",
    href: "/dashboard/pomodoro",
    icon: Timer,
  },
  {
    title: "設定",
    href: "/dashboard/settings",
    icon: Settings,
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  const toggleExpand = (title: string) => {
    setExpandedItems((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    )
  }

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard"
    }
    return pathname.startsWith(href)
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("http://localhost:3000")
  }

  return (
    <aside
      className={cn(
        "h-screen bg-white border-r border-gray-200 flex flex-col transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-indigo-600" />
            </div>
            <span className="font-bold text-gray-800">學習平台</span>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => (
            <li key={item.title}>
              {item.children ? (
                // 有子項目
                <div>
                  <button
                    onClick={() => toggleExpand(item.title)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive(item.href)
                        ? "bg-indigo-50 text-indigo-600"
                        : "text-gray-600 hover:bg-gray-100"
                    )}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left">{item.title}</span>
                        <ChevronDown
                          className={cn(
                            "w-4 h-4 transition-transform",
                            expandedItems.includes(item.title) && "rotate-180"
                          )}
                        />
                      </>
                    )}
                  </button>
                  {!collapsed && expandedItems.includes(item.title) && (
                    <ul className="mt-1 ml-4 space-y-1">
                      {item.children.map((child) => (
                        <li key={child.title}>
                          <Link
                            href={child.href}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                              isActive(child.href)
                                ? "bg-indigo-50 text-indigo-600 font-medium"
                                : "text-gray-500 hover:bg-gray-100"
                            )}
                          >
                            <child.icon className="w-4 h-4" />
                            <span>{child.title}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                // 無子項目
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive(item.href)
                      ? "bg-indigo-50 text-indigo-600"
                      : "text-gray-600 hover:bg-gray-100"
                  )}
                  title={collapsed ? item.title : undefined}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && <span>{item.title}</span>}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* 底部：切換平台 + 登出 */}
      <div className="border-t border-gray-200 p-2 space-y-1">
        {/* 切換到生活平台 */}
        <Link
          href="http://localhost:3001/dashboard"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors",
            collapsed && "justify-center"
          )}
          title={collapsed ? "切換到生活平台" : undefined}
        >
          <Leaf className="w-5 h-5 text-green-600 flex-shrink-0" />
          {!collapsed && <span>切換到生活平台</span>}
        </Link>

        {/* 登出 */}
        <button
          onClick={handleLogout}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors w-full",
            collapsed && "justify-center"
          )}
          title={collapsed ? "登出" : undefined}
        >
          <LogOut className="w-5 h-5 text-gray-400 flex-shrink-0" />
          {!collapsed && <span>登出</span>}
        </button>
      </div>
    </aside>
  )
}
