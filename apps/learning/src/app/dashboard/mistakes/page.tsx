// apps/learning/src/app/dashboard/mistakes/page.tsx
"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, Button } from "@daily/ui"
import {
  XCircle,
  Play,
  RefreshCw,
  FolderOpen,
  FileQuestion,
  CheckCircle,
} from "lucide-react"

interface Subject {
  id: string
  title: string
  description: string | null
}

interface QuestionType {
  id: string
  name: string
  label: string
}

interface Question {
  id: string
  subject_id: string
  question_type_id: string
  content: string
  options: Record<string, string> | null
  answer: Record<string, unknown> | null
  explanation: string | null
  attempt_count: number | null
  consecutive_correct: number | null
  wrong_count: number | null
  subjects?: Subject
  question_types?: QuestionType
}

interface GroupedMistakes {
  subject: Subject
  questions: Question[]
}

export default function MistakesPage() {
  const [groupedMistakes, setGroupedMistakes] = useState<GroupedMistakes[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)

  const fetchMistakes = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 取得所有錯題（consecutive_correct < 3 且有練習過）
    const { data: mistakes } = await supabase
      .from("questions")
      .select(`
        *,
        subjects (id, title, description),
        question_types (id, name, label)
      `)
      .eq("user_id", user.id)
      .lt("consecutive_correct", 3)
      .gt("attempt_count", 0)
      .order("consecutive_correct", { ascending: true })

    if (mistakes) {
      // 按科目分組
      const grouped: Record<string, GroupedMistakes> = {}

      mistakes.forEach((q) => {
        const question = q as unknown as Question
        const subject = question.subjects as unknown as Subject
        if (!subject) return

        if (!grouped[subject.id]) {
          grouped[subject.id] = {
            subject,
            questions: [],
          }
        }
        grouped[subject.id].questions.push(question)
      })

      setGroupedMistakes(Object.values(grouped))
      setTotalCount(mistakes.length)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    fetchMistakes()
  }, [fetchMistakes])

  const resetQuestion = async (questionId: string) => {
    const supabase = createClient()
    await (supabase.from("questions") as any)
      .update({
        consecutive_correct: 0,
        attempt_count: 0,
        wrong_count: 0,
      })
      .eq("id", questionId)

    fetchMistakes()
  }

  const markAsMastered = async (questionId: string) => {
    const supabase = createClient()
    await (supabase.from("questions") as any)
      .update({
        consecutive_correct: 3,
      })
      .eq("id", questionId)

    fetchMistakes()
  }

  const getAnswerText = (question: Question): string => {
    const ans = question.answer as Record<string, unknown> | null
    if (!ans) return ""
    if (ans.correct !== undefined) {
      if (typeof ans.correct === "boolean") {
        return ans.correct ? "是 (O)" : "否 (X)"
      }
      return String(ans.correct)
    }
    if (ans.text !== undefined) {
      return String(ans.text)
    }
    return ""
  }

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
          <h1 className="text-2xl font-bold text-gray-800">錯題本</h1>
          <p className="text-gray-600 mt-1">
            {totalCount > 0 ? `${totalCount} 道題目需要加強練習` : "沒有需要加強的題目"}
          </p>
        </div>
        {totalCount > 0 && (
          <Link href="/dashboard/practice/session?mode=mistakes">
            <Button className="bg-red-600 hover:bg-red-700">
              <Play className="w-4 h-4 mr-2" />
              練習錯題
            </Button>
          </Link>
        )}
      </div>

      {/* 錯題列表 */}
      {totalCount === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-gray-800 font-semibold mb-2">太棒了！</p>
            <p className="text-gray-500 mb-4">目前沒有需要加強的題目</p>
            <Link href="/dashboard/practice">
              <Button variant="outline">
                前往題庫練習
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groupedMistakes.map((group) => (
            <div key={group.subject.id}>
              {/* 科目標題 */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-100">
                    <FolderOpen className="w-4 h-4 text-indigo-600" />
                  </div>
                  <h2 className="font-semibold text-gray-800">{group.subject.title}</h2>
                  <span className="text-sm text-red-500">
                    ({group.questions.length} 題)
                  </span>
                </div>
                <Link
                  href={`/dashboard/practice/session?subject=${group.subject.id}&mode=mistakes`}
                >
                  <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
                    <Play className="w-3 h-3 mr-1" />
                    練習
                  </Button>
                </Link>
              </div>

              {/* 題目列表 */}
              <div className="space-y-2">
                {group.questions.map((question) => (
                  <Card key={question.id} className="group">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {/* 狀態圖標 */}
                        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <XCircle className="w-5 h-5 text-red-500" />
                        </div>

                        {/* 內容 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                              {question.question_types?.label || "未知題型"}
                            </span>
                            <span className="text-xs text-gray-400">
                              需連續答對 {3 - (question.consecutive_correct || 0)} 次
                            </span>
                          </div>
                          <p className="text-gray-800 line-clamp-2">{question.content}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span>練習 {question.attempt_count || 0} 次</span>
                            <span>連續正確 {question.consecutive_correct || 0} 次</span>
                          </div>
                        </div>

                        {/* 操作按鈕 */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => markAsMastered(question.id)}
                            className="p-2 rounded-lg hover:bg-green-100 text-gray-400 hover:text-green-600"
                            title="標記為已熟練"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => resetQuestion(question.id)}
                            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                            title="重置進度"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* 正確答案提示 */}
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-sm">
                          <span className="text-gray-500">正確答案：</span>
                          <span className="text-green-600 font-medium">{getAnswerText(question)}</span>
                        </p>
                        {question.explanation && (
                          <p className="text-sm text-gray-500 mt-1">
                            <span className="text-gray-400">解析：</span>
                            {question.explanation}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 提示區 */}
      {totalCount > 0 && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                <FileQuestion className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="font-medium text-amber-800">學習小提示</p>
                <p className="text-sm text-amber-700 mt-1">
                  連續答對 3 次的題目會被標記為「已熟練」並從錯題本移除。
                  建議每天花 10-15 分鐘複習錯題，效果更佳！
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
