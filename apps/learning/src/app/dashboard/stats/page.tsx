// apps/learning/src/app/dashboard/stats/page.tsx
"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@daily/ui"
import {
  TrendingUp,
  Calendar,
  Clock,
  Target,
  Award,
  Flame,
  BookOpen,
  FileQuestion,
  Lightbulb,
} from "lucide-react"

interface StudyStats {
  // 總覽
  totalSubjects: number
  totalQuestions: number
  totalFlashcards: number
  totalNotes: number
  
  // 練習統計
  questionsAnswered: number
  questionsMastered: number
  
  // 字卡統計
  flashcardsDue: number
  flashcardsMastered: number
  
  // 連續學習
  currentStreak: number
  longestStreak: number
  
  // 今日統計
  todayQuestions: number
  todayFlashcards: number
  todayStudyTime: number
}

interface WeeklyData {
  day: string
  questions: number
  flashcards: number
}

const DAYS = ["日", "一", "二", "三", "四", "五", "六"]

// 取得本地日期字串 YYYY-MM-DD
const getLocalDateString = (date: Date = new Date()) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// 解析日期字串為本地日期（避免時區問題）
const parseLocalDate = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export default function StatsPage() {
  const [stats, setStats] = useState<StudyStats | null>(null)
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([])
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 取得科目數
    const { count: totalSubjects } = await supabase
      .from("subjects")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)

    // 取得題目統計
    const { data: questionsData } = await supabase
      .from("questions")
      .select("attempt_count, consecutive_correct")
      .eq("user_id", user.id)

    const totalQuestions = questionsData?.length || 0
    const questionsAnswered = questionsData?.reduce((sum, q) => sum + (q.attempt_count || 0), 0) || 0
    const questionsMastered = questionsData?.filter((q) => (q.consecutive_correct || 0) >= 3).length || 0

    // 取得字卡統計
    const { data: flashcardsData } = await supabase
      .from("flashcards")
      .select("next_review_at, repetition_count")
      .eq("user_id", user.id)

    const totalFlashcards = flashcardsData?.length || 0
    const now = new Date().toISOString()
    const flashcardsDue = flashcardsData?.filter((f) => (f.next_review_at || now) <= now).length || 0
    const flashcardsMastered = flashcardsData?.filter((f) => (f.repetition_count || 0) >= 5).length || 0

    // 取得筆記數
    const { count: totalNotes } = await supabase
      .from("unit_notes")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)

    // 取得學習紀錄（使用 study_logs）
    const { data: studyLogs } = await supabase
      .from("study_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("study_date", { ascending: false })
      .limit(30)

    // 計算連續學習天數
    let currentStreak = 0
    let longestStreak = 0
    let tempStreak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (studyLogs && studyLogs.length > 0) {
      const sortedLogs = [...studyLogs].sort(
        (a, b) => parseLocalDate(b.study_date).getTime() - parseLocalDate(a.study_date).getTime()
      )

      // 檢查今天或昨天是否有學習
      const latestDate = parseLocalDate(sortedLogs[0].study_date)
      latestDate.setHours(0, 0, 0, 0)
      const diffDays = Math.floor((today.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24))

      if (diffDays <= 1) {
        currentStreak = 1
        let prevDate = latestDate

        for (let i = 1; i < sortedLogs.length; i++) {
          const logDate = parseLocalDate(sortedLogs[i].study_date)
          logDate.setHours(0, 0, 0, 0)
          const dayDiff = Math.floor((prevDate.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24))

          if (dayDiff === 1) {
            currentStreak++
            prevDate = logDate
          } else if (dayDiff > 1) {
            break
          }
        }
      }

      // 計算最長連續
      tempStreak = 1
      for (let i = 0; i < sortedLogs.length - 1; i++) {
        const currDate = parseLocalDate(sortedLogs[i].study_date)
        const nextDate = parseLocalDate(sortedLogs[i + 1].study_date)
        currDate.setHours(0, 0, 0, 0)
        nextDate.setHours(0, 0, 0, 0)
        const diff = Math.floor((currDate.getTime() - nextDate.getTime()) / (1000 * 60 * 60 * 24))

        if (diff === 1) {
          tempStreak++
        } else {
          longestStreak = Math.max(longestStreak, tempStreak)
          tempStreak = 1
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak, currentStreak)
    }

    // 今日統計（使用本地日期）
    const todayStr = getLocalDateString()
    const todayLog = studyLogs?.find((log) => log.study_date === todayStr)

    // 每週統計
    const weekData: WeeklyData[] = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = getLocalDateString(date)
      const log = studyLogs?.find((l) => l.study_date === dateStr)
      
      weekData.push({
        day: DAYS[date.getDay()],
        questions: log?.questions_practiced || 0,
        flashcards: log?.flashcards_reviewed || 0,
      })
    }
    setWeeklyData(weekData)

    setStats({
      totalSubjects: totalSubjects || 0,
      totalQuestions,
      totalFlashcards,
      totalNotes: totalNotes || 0,
      questionsAnswered,
      questionsMastered,
      flashcardsDue,
      flashcardsMastered,
      currentStreak,
      longestStreak,
      todayQuestions: todayLog?.questions_practiced || 0,
      todayFlashcards: todayLog?.flashcards_reviewed || 0,
      todayStudyTime: todayLog?.study_minutes || 0,
    })

    setLoading(false)
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!stats) return null

  const maxWeeklyValue = Math.max(
    ...weeklyData.map((d) => d.questions + d.flashcards),
    1
  )

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">學習統計</h1>
        <p className="text-gray-600 mt-1">追蹤你的學習進度</p>
      </div>

      {/* 今日統計 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <FileQuestion className="w-5 h-5" />
              </div>
              <div>
                <p className="text-indigo-100 text-sm">今日題目</p>
                <p className="text-2xl font-bold">{stats.todayQuestions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Lightbulb className="w-5 h-5" />
              </div>
              <div>
                <p className="text-amber-100 text-sm">今日字卡</p>
                <p className="text-2xl font-bold">{stats.todayFlashcards}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-green-100 text-sm">學習時間</p>
                <p className="text-2xl font-bold">{stats.todayStudyTime}<span className="text-sm ml-1">分</span></p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-red-500 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <p className="text-orange-100 text-sm">連續學習</p>
                <p className="text-2xl font-bold">{stats.currentStreak}<span className="text-sm ml-1">天</span></p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 每週趨勢 */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-500" />
              本週學習趨勢
            </h2>
          </div>

          <div className="flex items-end justify-between gap-2 h-40">
            {weeklyData.map((data, index) => (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div className="w-full flex flex-col gap-1 mb-2" style={{ height: "120px" }}>
                  {/* 字卡柱 */}
                  <div
                    className="w-full bg-amber-400 rounded-t transition-all"
                    style={{
                      height: `${(data.flashcards / maxWeeklyValue) * 100}%`,
                      minHeight: data.flashcards > 0 ? "4px" : "0",
                    }}
                  />
                  {/* 題目柱 */}
                  <div
                    className="w-full bg-indigo-500 rounded-b transition-all"
                    style={{
                      height: `${(data.questions / maxWeeklyValue) * 100}%`,
                      minHeight: data.questions > 0 ? "4px" : "0",
                    }}
                  />
                </div>
                <span className="text-xs text-gray-500">{data.day}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-indigo-500 rounded" />
              <span className="text-sm text-gray-600">題目</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-amber-400 rounded" />
              <span className="text-sm text-gray-600">字卡</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 總覽統計 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <BookOpen className="w-6 h-6 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-800">{stats.totalSubjects}</p>
            <p className="text-sm text-gray-500">科目</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <FileQuestion className="w-6 h-6 text-indigo-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-800">{stats.totalQuestions}</p>
            <p className="text-sm text-gray-500">題目</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Lightbulb className="w-6 h-6 text-amber-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-800">{stats.totalFlashcards}</p>
            <p className="text-sm text-gray-500">字卡</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Calendar className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-800">{stats.totalNotes}</p>
            <p className="text-sm text-gray-500">筆記</p>
          </CardContent>
        </Card>
      </div>

      {/* 詳細統計 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 題目練習 */}
        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2 mb-4">
              <FileQuestion className="w-5 h-5 text-indigo-500" />
              題目練習
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">已作答</span>
                <span className="font-semibold">{stats.questionsAnswered} 次</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">熟練進度</span>
                <span className="font-semibold">
                  {stats.totalQuestions > 0
                    ? Math.round((stats.questionsMastered / stats.totalQuestions) * 100)
                    : 0}%
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 transition-all"
                  style={{
                    width: `${
                      stats.totalQuestions > 0
                        ? (stats.questionsMastered / stats.totalQuestions) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-gray-600">已熟練</span>
                <span className="font-semibold text-indigo-600">
                  {stats.questionsMastered} / {stats.totalQuestions} 題
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 字卡複習 */}
        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2 mb-4">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              字卡複習
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">待複習</span>
                <span className="font-semibold text-amber-600">{stats.flashcardsDue} 張</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">熟練進度</span>
                <span className="font-semibold">
                  {stats.totalFlashcards > 0
                    ? Math.round((stats.flashcardsMastered / stats.totalFlashcards) * 100)
                    : 0}%
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 transition-all"
                  style={{
                    width: `${
                      stats.totalFlashcards > 0
                        ? (stats.flashcardsMastered / stats.totalFlashcards) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-gray-600">已熟練</span>
                <span className="font-semibold text-amber-600">
                  {stats.flashcardsMastered} / {stats.totalFlashcards} 張
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 成就區塊 */}
      <Card>
        <CardContent className="p-6">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-yellow-500" />
            學習成就
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`p-4 rounded-lg text-center ${stats.currentStreak >= 7 ? "bg-orange-100" : "bg-gray-100"}`}>
              <Flame className={`w-8 h-8 mx-auto mb-2 ${stats.currentStreak >= 7 ? "text-orange-500" : "text-gray-400"}`} />
              <p className="font-medium text-sm">連續 7 天</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.currentStreak >= 7 ? "已達成！" : `${stats.currentStreak}/7`}
              </p>
            </div>
            <div className={`p-4 rounded-lg text-center ${stats.questionsMastered >= 50 ? "bg-indigo-100" : "bg-gray-100"}`}>
              <Target className={`w-8 h-8 mx-auto mb-2 ${stats.questionsMastered >= 50 ? "text-indigo-500" : "text-gray-400"}`} />
              <p className="font-medium text-sm">熟練 50 題</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.questionsMastered >= 50 ? "已達成！" : `${stats.questionsMastered}/50`}
              </p>
            </div>
            <div className={`p-4 rounded-lg text-center ${stats.flashcardsMastered >= 100 ? "bg-amber-100" : "bg-gray-100"}`}>
              <Lightbulb className={`w-8 h-8 mx-auto mb-2 ${stats.flashcardsMastered >= 100 ? "text-amber-500" : "text-gray-400"}`} />
              <p className="font-medium text-sm">熟練 100 卡</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.flashcardsMastered >= 100 ? "已達成！" : `${stats.flashcardsMastered}/100`}
              </p>
            </div>
            <div className={`p-4 rounded-lg text-center ${stats.longestStreak >= 30 ? "bg-green-100" : "bg-gray-100"}`}>
              <Award className={`w-8 h-8 mx-auto mb-2 ${stats.longestStreak >= 30 ? "text-green-500" : "text-gray-400"}`} />
              <p className="font-medium text-sm">連續 30 天</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.longestStreak >= 30 ? "已達成！" : `最高 ${stats.longestStreak} 天`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
