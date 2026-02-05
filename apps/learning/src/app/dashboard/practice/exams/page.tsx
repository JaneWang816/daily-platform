// apps/learning/src/app/dashboard/practice/exams/page.tsx
"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, Button } from "@daily/ui"
import {
  ChevronLeft,
  FileText,
  Clock,
  Trophy,
  CheckCircle,
  XCircle,
  PlayCircle,
  Trash2,
  AlertCircle,
  Loader2,
  Calendar,
  Target,
} from "lucide-react"

interface Exam {
  id: string
  exam_code: string
  subject_id: string
  total_score: number
  earned_score: number | null
  question_count: number
  correct_count: number | null
  time_spent_seconds: number | null
  status: "draft" | "in_progress" | "completed"
  started_at: string | null
  completed_at: string | null
  created_at: string
  subjects?: { id: string; title: string }
}

export default function ExamsHistoryPage() {
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  // 統計
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    avgScore: 0,
    avgAccuracy: 0,
  })

  const fetchExams = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from("exams")
      .select("*, subjects (id, title)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (data) {
      const examList = data as unknown as Exam[]
      setExams(examList)

      // 計算統計
      const completed = examList.filter(e => e.status === "completed")
      const totalScore = completed.reduce((sum, e) => sum + (e.earned_score || 0), 0)
      const totalQuestions = completed.reduce((sum, e) => sum + e.question_count, 0)
      const totalCorrect = completed.reduce((sum, e) => sum + (e.correct_count || 0), 0)

      setStats({
        total: examList.length,
        completed: completed.length,
        avgScore: completed.length > 0 ? Math.round(totalScore / completed.length) : 0,
        avgAccuracy: totalQuestions > 0 ? Math.round(totalCorrect / totalQuestions * 100) : 0,
      })
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    fetchExams()
  }, [fetchExams])

  const handleDelete = async (examId: string) => {
    if (!confirm("確定要刪除這份試卷嗎？")) return

    setDeleting(examId)

    try {
      const supabase = createClient()

      // 先刪除 exam_answers
      await supabase
        .from("exam_answers")
        .delete()
        .eq("exam_id", examId)

      // 再刪除 exam
      await supabase
        .from("exams")
        .delete()
        .eq("id", examId)

      setExams(prev => prev.filter(e => e.id !== examId))
    } catch (err) {
      console.error("Delete error:", err)
      alert("刪除失敗")
    } finally {
      setDeleting(null)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
            <CheckCircle className="w-3 h-3" />
            已完成
          </span>
        )
      case "in_progress":
        return (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded">
            <PlayCircle className="w-3 h-3" />
            作答中
          </span>
        )
      default:
        return (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
            <FileText className="w-3 h-3" />
            草稿
          </span>
        )
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      {/* 頁首 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/practice"
            className="text-gray-600 hover:text-gray-800"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-gray-800">試卷記錄</h1>
            <p className="text-sm text-gray-500">共 {stats.total} 份試卷</p>
          </div>
        </div>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <FileText className="w-6 h-6 text-indigo-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
            <p className="text-xs text-gray-500">總試卷數</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-800">{stats.completed}</p>
            <p className="text-xs text-gray-500">已完成</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Trophy className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-800">{stats.avgScore}</p>
            <p className="text-xs text-gray-500">平均分數</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Target className="w-6 h-6 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-800">{stats.avgAccuracy}%</p>
            <p className="text-xs text-gray-500">平均正確率</p>
          </CardContent>
        </Card>
      </div>

      {/* 試卷列表 */}
      {exams.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-lg font-medium text-gray-800 mb-2">尚無試卷</h2>
            <p className="text-gray-500 mb-4">前往題庫產生第一份試卷吧！</p>
            <Link href="/dashboard/practice">
              <Button>前往題庫</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {exams.map(exam => {
            const percentage = exam.status === "completed" && exam.earned_score !== null
              ? Math.round(exam.earned_score / exam.total_score * 100)
              : null

            return (
              <Card
                key={exam.id}
                className={`hover:shadow-md transition-shadow ${
                  exam.status === "completed"
                    ? percentage !== null && percentage >= 60
                      ? "border-l-4 border-l-green-500"
                      : "border-l-4 border-l-red-500"
                    : ""
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* 分數/狀態圖示 */}
                      <div className={`w-14 h-14 rounded-lg flex items-center justify-center ${
                        exam.status === "completed"
                          ? percentage !== null && percentage >= 60
                            ? "bg-green-100"
                            : "bg-red-100"
                          : "bg-gray-100"
                      }`}>
                        {exam.status === "completed" ? (
                          <span className={`text-xl font-bold ${
                            percentage !== null && percentage >= 60
                              ? "text-green-700"
                              : "text-red-700"
                          }`}>
                            {exam.earned_score}
                          </span>
                        ) : (
                          <FileText className="w-6 h-6 text-gray-400" />
                        )}
                      </div>

                      {/* 試卷資訊 */}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-800">
                            {exam.subjects?.title}
                          </span>
                          {getStatusBadge(exam.status)}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(exam.created_at)}
                          </span>
                          <span>{exam.question_count} 題</span>
                          {exam.status === "completed" && exam.time_spent_seconds && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTime(exam.time_spent_seconds)}
                            </span>
                          )}
                        </div>
                        {exam.status === "completed" && (
                          <p className="text-sm text-gray-500 mt-1">
                            答對 {exam.correct_count} / {exam.question_count} 題
                            （{Math.round((exam.correct_count || 0) / exam.question_count * 100)}%）
                          </p>
                        )}
                      </div>
                    </div>

                    {/* 操作按鈕 */}
                    <div className="flex items-center gap-2">
                      <Link href={`/dashboard/practice/exam/${exam.id}`}>
                        <Button variant="outline" size="sm">
                          {exam.status === "completed" ? "查看" : "繼續作答"}
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(exam.id)}
                        disabled={deleting === exam.id}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        {deleting === exam.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
