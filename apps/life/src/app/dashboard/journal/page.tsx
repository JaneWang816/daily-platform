//apps/life/src/app/dashboard/journal/page.tsx
"use client"

import Link from "next/link"
import { Button, Card, CardContent } from "@daily/ui"
import {
  ArrowLeft,
  FileText,
  BookMarked,
  BookOpen,
  Heart,
  Compass,
} from "lucide-react"

const JOURNAL_TYPES = [
  {
    key: "life",
    title: "生活日誌",
    description: "記錄每天的生活點滴與心情",
    icon: FileText,
    color: "pink",
    href: "/dashboard/journal/life",
  },
  {
    key: "learning",
    title: "學習日誌",
    description: "記錄學習內容與心得",
    icon: BookMarked,
    color: "purple",
    href: "/dashboard/journal/learning",
  },
  {
    key: "reading",
    title: "閱讀日誌",
    description: "記錄讀書進度與感想",
    icon: BookOpen,
    color: "green",
    href: "/dashboard/journal/reading",
  },
  {
    key: "gratitude",
    title: "感恩日誌",
    description: "記錄每天感恩的事情",
    icon: Heart,
    color: "rose",
    href: "/dashboard/journal/gratitude",
  },
  {
    key: "travel",
    title: "遊覽日誌",
    description: "記錄旅行與探索的足跡",
    icon: Compass,
    color: "sky",
    href: "/dashboard/journal/travel",
  },
]

const colorMap: Record<string, { bg: string; border: string; iconBg: string; text: string }> = {
  pink: { bg: "bg-pink-50", border: "border-pink-200", iconBg: "bg-pink-100", text: "text-pink-600" },
  purple: { bg: "bg-purple-50", border: "border-purple-200", iconBg: "bg-purple-100", text: "text-purple-600" },
  green: { bg: "bg-green-50", border: "border-green-200", iconBg: "bg-green-100", text: "text-green-600" },
  rose: { bg: "bg-rose-50", border: "border-rose-200", iconBg: "bg-rose-100", text: "text-rose-600" },
  sky: { bg: "bg-sky-50", border: "border-sky-200", iconBg: "bg-sky-100", text: "text-sky-600" },
}

export default function JournalIndexPage() {
  return (
    <div className="space-y-6">
      {/* 返回按鈕 */}
      <Link href="/dashboard">
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          返回總覽
        </Button>
      </Link>

      {/* 頁面標題 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">📝 日誌</h1>
        <p className="text-gray-600 mt-1">選擇要記錄的日誌類型</p>
      </div>

      {/* 日誌類型卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {JOURNAL_TYPES.map((type) => {
          const Icon = type.icon
          const colors = colorMap[type.color]

          return (
            <Link key={type.key} href={type.href}>
              <Card className={`${colors.border} border-2 hover:shadow-md transition-all cursor-pointer h-full`}>
                <CardContent className={`p-6 ${colors.bg}`}>
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${colors.iconBg}`}>
                      <Icon className={`w-6 h-6 ${colors.text}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-semibold text-lg ${colors.text}`}>{type.title}</h3>
                      <p className="text-gray-600 text-sm mt-1">{type.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
