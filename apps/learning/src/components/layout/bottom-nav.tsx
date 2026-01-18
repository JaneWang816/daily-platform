// apps/learning/src/components/layout/bottom-nav.tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@daily/utils"
import {
  LayoutDashboard,
  BookOpen,
  FileQuestion,
  Lightbulb,
  Timer,
} from "lucide-react"

const navItems = [
  {
    title: "總覽",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "科目",
    href: "/dashboard/subjects",
    icon: BookOpen,
  },
  {
    title: "題庫",
    href: "/dashboard/practice",
    icon: FileQuestion,
  },
  {
    title: "字卡",
    href: "/dashboard/flashcards",
    icon: Lightbulb,
  },
  {
    title: "番茄鐘",
    href: "/dashboard/pomodoro",
    icon: Timer,
  },
]

export function BottomNav() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard"
    }
    return pathname.startsWith(href)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden z-50">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => (
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
      </div>
    </nav>
  )
}
