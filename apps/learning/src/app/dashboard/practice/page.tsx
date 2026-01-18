// apps/learning/src/app/dashboard/practice/page.tsx
"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, Button } from "@daily/ui"
import {
  FileQuestion,
  FolderOpen,
  Play,
  Target,
  CheckCircle,
  XCircle,
} from "lucide-react"

interface Subject {
  id: string
  title: string
  description: string | null
  cover_url: string | null
}

interface SubjectWithStats extends Subject {
  questionCount: number
  mistakeCount: number
  masteredCount: number
}

export default function PracticePage() {
  const [subjects, setSubjects] = useState<SubjectWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [totalStats, setTotalStats] = useState({
    questions: 0,
    mistakes: 0,
    mastered: 0,
  })

  const fetchData = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 取得所有科目
    const { data: subjectsData } = await supabase
      .from("subjects")
      .select("id, title, description, cover_url")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (subjectsData) {
      // 取得每個科目的題目統計
      const subjectsWithStats = await Promise.all(
        (subjectsData as Subject[]).map(async (subject) => {
          // 總題目數
          const { count: questionCount } = await supabase
            .from("questions")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("subject_id", subject.id)

          // 錯題數（consecutive_correct < 3 且有練習過）
          const { count: mistakeCount } = await supabase
            .from("questions")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("subject_id", subject.id)
            .lt("consecutive_correct", 3)
            .gt("attempt_count", 0)

          // 已熟練（consecutive_correct >= 3）
          const { count: masteredCount } = await supabase
            .from("questions")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("subject_id", subject.id)
            .gte("consecutive_correct", 3)

          return {
            ...subject,
            questionCount: questionCount || 0,
            mistakeCount: mistakeCount || 0,
            masteredCount: masteredCount || 0,
          }
        })
      )

      setSubjects(subjectsWithStats)

      // 計算總統計
      const totals = subjectsWithStats.reduce(
        (acc, s) => ({
          questions: acc.questions + s.questionCount,
          mistakes: acc.mistakes + s.mistakeCount,
          mastered: acc.mastered + s.masteredCount,
        }),
        { questions: 0, mistakes: 0, mastered: 0 }
      )
      setTotalStats(totals)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">題庫練習</h1>
          <p className="text-gray-600 mt-1">選擇科目開始練習</p>
        </div>
        {totalStats.mistakes > 0 && (
          <Link href="/dashboard/mistakes">
            <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
              <XCircle className="w-4 h-4 mr-2" />
              錯題本 ({totalStats.mistakes})
            </Button>
          </Link>
        )}
      </div>

      {/* 總統計 */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <FileQuestion className="w-6 h-6 text-indigo-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-800">{totalStats.questions}</p>
            <p className="text-sm text-gray-500">總題目</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <XCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-red-600">{totalStats.mistakes}</p>
            <p className="text-sm text-gray-500">待加強</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-600">{totalStats.mastered}</p>
            <p className="text-sm text-gray-500">已熟練</p>
          </CardContent>
        </Card>
      </div>

      {/* 科目列表 */}
      {subjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <FileQuestion className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 mb-4">還沒有任何科目</p>
            <Link href="/dashboard/subjects">
              <Button variant="outline">
                前往建立科目
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {subjects.map((subject) => (
            <Card
              key={subject.id}
              className="hover:shadow-md transition-shadow"
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  {/* 圖標 */}
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 bg-indigo-100">
                    <FolderOpen className="w-6 h-6 text-indigo-600" />
                  </div>

                  {/* 內容 */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-800">{subject.title}</h3>
                    {subject.description && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-1">{subject.description}</p>
                    )}

                    {/* 統計 */}
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="text-gray-500">
                        {subject.questionCount} 題
                      </span>
                      {subject.mistakeCount > 0 && (
                        <span className="text-red-500">
                          {subject.mistakeCount} 待加強
                        </span>
                      )}
                      {subject.masteredCount > 0 && (
                        <span className="text-green-500">
                          {subject.masteredCount} 已熟練
                        </span>
                      )}
                    </div>

                    {/* 進度條 */}
                    {subject.questionCount > 0 && (
                      <div className="mt-3">
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 transition-all"
                            style={{
                              width: `${(subject.masteredCount / subject.questionCount) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 操作按鈕 */}
                <div className="flex gap-2 mt-4">
                  <Link href={`/dashboard/practice/${subject.id}`} className="flex-1">
                    <Button variant="outline" className="w-full" size="sm">
                      <Target className="w-4 h-4 mr-2" />
                      管理題目
                    </Button>
                  </Link>
                  {subject.questionCount > 0 && (
                    <Link
                      href={`/dashboard/practice/session?subject=${subject.id}`}
                      className="flex-1"
                    >
                      <Button className="w-full bg-indigo-600 hover:bg-indigo-700" size="sm">
                        <Play className="w-4 h-4 mr-2" />
                        開始練習
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 快速練習入口 */}
      {totalStats.questions > 0 && (
        <Card className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">隨機練習</h3>
                <p className="text-indigo-100 text-sm mt-1">
                  從所有科目隨機抽取題目練習
                </p>
              </div>
              <Link href="/dashboard/practice/session">
                <Button variant="secondary" size="lg">
                  <Play className="w-5 h-5 mr-2" />
                  開始
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
