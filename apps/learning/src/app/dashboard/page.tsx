// apps/learning/src/app/dashboard/page.tsx
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@daily/ui"
import {
  BookOpen,
  FileQuestion,
  Lightbulb,
  XCircle,
  BarChart2,
  Timer,
  TrendingUp,
  Calendar,
  Target,
} from "lucide-react"

interface DashboardStats {
  subjectCount: number
  questionCount: number
  deckCount: number
  flashcardCount: number
  mistakeCount: number
  todayStudyMinutes: number
  weeklyStudyMinutes: number
  dueFlashcards: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    subjectCount: 0,
    questionCount: 0,
    deckCount: 0,
    flashcardCount: 0,
    mistakeCount: 0,
    todayStudyMinutes: 0,
    weeklyStudyMinutes: 0,
    dueFlashcards: 0,
  })
  const [loading, setLoading] = useState(true)
  const [nickname, setNickname] = useState("")

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 取得用戶暱稱
      const { data: profile } = await supabase
        .from("profiles")
        .select("nickname")
        .eq("id", user.id)
        .single()
      
      if (profile?.nickname) {
        setNickname(profile.nickname)
      }

      // 取得科目數量
      const { count: subjectCount } = await supabase
        .from("subjects")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)

      // 取得題目數量
      const { count: questionCount } = await supabase
        .from("questions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)

      // 取得牌組數量
      const { count: deckCount } = await supabase
        .from("decks")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)

      // 取得字卡數量
      const { count: flashcardCount } = await supabase
        .from("flashcards")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)

      // 取得錯題數量（連續答對 < 3 的題目）
      const { count: mistakeCount } = await supabase
        .from("questions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .lt("consecutive_correct", 3)  // ← 修正
        .gt("attempt_count", 0)

      // 取得今日學習時間
      const today = new Date().toISOString().split("T")[0]
      const { data: todayStudy } = await supabase
        .from("daily_study_summary")
        .select("study_minutes")
        .eq("user_id", user.id)
        .eq("date", today)
        .maybeSingle() as { data: { study_minutes: number } | null }

      // 取得待複習字卡數量
      const { count: dueFlashcards } = await supabase
        .from("flashcards")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .lte("next_review_at", new Date().toISOString())

      setStats({
        subjectCount: subjectCount || 0,
        questionCount: questionCount || 0,
        deckCount: deckCount || 0,
        flashcardCount: flashcardCount || 0,
        mistakeCount: mistakeCount || 0,
        todayStudyMinutes: todayStudy?.study_minutes || 0,
        weeklyStudyMinutes: 0, // 之後可以加總一週
        dueFlashcards: dueFlashcards || 0,
      })

      setLoading(false)
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 歡迎區塊 */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold">
          {nickname ? `${nickname}，繼續加油！` : "歡迎回來！"}
        </h1>
        <p className="mt-2 text-indigo-100">
          今日學習 {stats.todayStudyMinutes} 分鐘
          {stats.dueFlashcards > 0 && ` · ${stats.dueFlashcards} 張字卡待複習`}
        </p>
      </div>

      {/* 快捷入口 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/dashboard/subjects">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="flex flex-col items-center justify-center py-6">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                <BookOpen className="w-6 h-6 text-blue-600" />
              </div>
              <span className="font-medium text-gray-800">科目筆記</span>
              <span className="text-sm text-gray-500 mt-1">{stats.subjectCount} 科目</span>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/practice">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="flex flex-col items-center justify-center py-6">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                <FileQuestion className="w-6 h-6 text-green-600" />
              </div>
              <span className="font-medium text-gray-800">題庫練習</span>
              <span className="text-sm text-gray-500 mt-1">{stats.questionCount} 題目</span>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/flashcards">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="flex flex-col items-center justify-center py-6">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-3">
                <Lightbulb className="w-6 h-6 text-amber-600" />
              </div>
              <span className="font-medium text-gray-800">字卡複習</span>
              <span className="text-sm text-gray-500 mt-1">{stats.flashcardCount} 字卡</span>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/mistakes">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="flex flex-col items-center justify-center py-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-3">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <span className="font-medium text-gray-800">錯題本</span>
              <span className="text-sm text-gray-500 mt-1">{stats.mistakeCount} 待加強</span>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* 學習統計 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart2 className="w-5 h-5 text-indigo-600" />
              今日學習
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">學習時間</span>
                <span className="font-semibold">{stats.todayStudyMinutes} 分鐘</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">待複習字卡</span>
                <span className="font-semibold text-amber-600">{stats.dueFlashcards} 張</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">待加強題目</span>
                <span className="font-semibold text-red-600">{stats.mistakeCount} 題</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="w-5 h-5 text-green-600" />
              快速開始
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.dueFlashcards > 0 && (
              <Link
                href="/dashboard/flashcards"
                className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 hover:bg-amber-100 transition-colors"
              >
                <Lightbulb className="w-5 h-5 text-amber-600" />
                <span className="text-amber-700">複習 {stats.dueFlashcards} 張待複習字卡</span>
              </Link>
            )}
            {stats.mistakeCount > 0 && (
              <Link
                href="/dashboard/mistakes"
                className="flex items-center gap-3 p-3 rounded-lg bg-red-50 hover:bg-red-100 transition-colors"
              >
                <XCircle className="w-5 h-5 text-red-600" />
                <span className="text-red-700">練習 {stats.mistakeCount} 道錯題</span>
              </Link>
            )}
            <Link
              href="/dashboard/pomodoro"
              className="flex items-center gap-3 p-3 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors"
            >
              <Timer className="w-5 h-5 text-indigo-600" />
              <span className="text-indigo-700">開始番茄鐘專注</span>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
