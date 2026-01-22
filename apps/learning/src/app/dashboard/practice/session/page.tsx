// apps/learning/src/app/dashboard/practice/session/page.tsx
"use client"

import { useEffect, useState, useCallback, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, Button, Input } from "@daily/ui"
import {
  ChevronLeft,
  FileQuestion,
  Check,
  X,
  Trophy,
  SkipForward,
  RefreshCw,
  Lightbulb,
} from "lucide-react"

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
  question_types?: QuestionType
}

interface PracticeResult {
  question: Question
  userAnswer: string
  isCorrect: boolean
}

// 取得本地日期字串 YYYY-MM-DD
const getLocalDateString = (date: Date = new Date()) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function PracticeSessionContent() {
  const searchParams = useSearchParams()
  const subjectId = searchParams.get("subject")
  const mode = searchParams.get("mode") || "all" // all, mistakes

  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  // 答題狀態
  const [userAnswer, setUserAnswer] = useState("")
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [showExplanation, setShowExplanation] = useState(false)

  // 練習結果
  const [results, setResults] = useState<PracticeResult[]>([])
  const [isComplete, setIsComplete] = useState(false)

  const fetchQuestions = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let query = supabase
      .from("questions")
      .select(`
        *,
        question_types (id, name, label)
      `)
      .eq("user_id", user.id)

    // 根據模式篩選
    if (subjectId) {
      query = query.eq("subject_id", subjectId)
    }

    if (mode === "mistakes") {
      // 錯題模式：consecutive_correct < 3 且有練習過
      query = query.lt("consecutive_correct", 3).gt("attempt_count", 0)
    }

    const { data } = await query.order("created_at", { ascending: false })

    if (data && data.length > 0) {
      // 隨機打亂順序
      const shuffled = [...(data as Question[])].sort(() => Math.random() - 0.5)
      // 最多取 20 題
      setQuestions(shuffled.slice(0, 20))
    }

    setLoading(false)
  }, [subjectId, mode])

  // 更新學習紀錄（每次答題呼叫一次，count=1）
  const updateStudyLog = async (count: number) => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 使用本地日期
      const today = getLocalDateString()

      // 使用 maybeSingle() 避免找不到時報錯
      const { data: existing, error: selectError } = await supabase
        .from("study_logs")
        .select("*")
        .eq("user_id", user.id)
        .eq("study_date", today)
        .maybeSingle()

      if (selectError) {
        console.error("updateStudyLog select error:", selectError)
        return
      }

      if (existing) {
        // 更新現有紀錄
        const { error: updateError } = await (supabase.from("study_logs") as any)
          .update({
            questions_practiced: (existing.questions_practiced || 0) + count,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)

        if (updateError) {
          console.error("updateStudyLog update error:", updateError)
        }
      } else {
        // 新增紀錄
        const { error: insertError } = await (supabase.from("study_logs") as any)
          .insert({
            user_id: user.id,
            study_date: today,
            questions_practiced: count,
            flashcards_reviewed: 0,
            study_minutes: 0,
            pomodoro_sessions: 0,
          })

        if (insertError) {
          console.error("updateStudyLog insert error:", insertError)
        }
      }
    } catch (err) {
      console.error("updateStudyLog exception:", err)
    }
  }

  useEffect(() => {
    fetchQuestions()
  }, [fetchQuestions])

  const currentQuestion = questions[currentIndex]

  const getCorrectAnswer = (question: Question): string => {
    const ans = question.answer as Record<string, unknown> | null
    if (!ans) return ""
    if (ans.correct !== undefined) {
      if (typeof ans.correct === "boolean") {
        return ans.correct ? "true" : "false"
      }
      return String(ans.correct)
    }
    if (ans.text !== undefined) {
      return String(ans.text)
    }
    return ""
  }

  const getCorrectAnswerDisplay = (question: Question): string => {
    const ans = question.answer as Record<string, unknown> | null
    if (!ans) return ""
    if (ans.correct !== undefined) {
      if (typeof ans.correct === "boolean") {
        return ans.correct ? "是 (O)" : "否 (X)"
      }
      // 選擇題，顯示選項內容
      const optionKey = String(ans.correct)
      if (question.options && question.options[optionKey]) {
        return `${optionKey}. ${question.options[optionKey]}`
      }
      return String(ans.correct)
    }
    if (ans.text !== undefined) {
      return String(ans.text)
    }
    return ""
  }

  const checkAnswer = async () => {
    if (!currentQuestion) return

    const questionType = currentQuestion.question_types?.name
    const answer = (questionType === "single_choice" || questionType === "multiple_choice" || questionType === "true_false")
      ? selectedOption
      : userAnswer

    if (!answer) {
      alert("請選擇或輸入答案")
      return
    }

    // 比對答案（標準化比較）
    const normalizedUser = answer.trim().toLowerCase()
    const correctAnswer = getCorrectAnswer(currentQuestion)
    const normalizedCorrect = correctAnswer.trim().toLowerCase()
    const correct = normalizedUser === normalizedCorrect

    setIsCorrect(correct)
    setShowResult(true)

    // 記錄結果
    setResults((prev) => [
      ...prev,
      {
        question: currentQuestion,
        userAnswer: answer,
        isCorrect: correct,
      },
    ])

    // 更新資料庫
    const supabase = createClient()
    await (supabase.from("questions") as any)
      .update({
        attempt_count: (currentQuestion.attempt_count || 0) + 1,
        consecutive_correct: correct ? (currentQuestion.consecutive_correct || 0) + 1 : 0,
        wrong_count: correct ? (currentQuestion.wrong_count || 0) : (currentQuestion.wrong_count || 0) + 1,
        last_attempted_at: new Date().toISOString(),
      })
      .eq("id", currentQuestion.id)

    // 每次答題都寫入學習紀錄（+1）
    await updateStudyLog(1)
  }

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1)
      resetAnswer()
    } else {
      setIsComplete(true)
    }
  }

  const resetAnswer = () => {
    setUserAnswer("")
    setSelectedOption(null)
    setShowResult(false)
    setShowExplanation(false)
  }

  const skipQuestion = () => {
    setResults((prev) => [
      ...prev,
      {
        question: currentQuestion,
        userAnswer: "(跳過)",
        isCorrect: false,
      },
    ])
    nextQuestion()
  }

  const restartPractice = () => {
    setCurrentIndex(0)
    setResults([])
    setIsComplete(false)
    resetAnswer()
    // 重新打亂順序
    setQuestions((prev) => [...prev].sort(() => Math.random() - 0.5))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="max-w-lg mx-auto py-12">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileQuestion className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">沒有可練習的題目</h2>
            <p className="text-gray-500 mb-4">
              {mode === "mistakes" ? "太棒了！沒有需要加強的題目" : "請先新增一些題目"}
            </p>
            <Link href="/dashboard/practice">
              <Button>返回題庫</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 完成畫面
  if (isComplete) {
    const correctCount = results.filter((r) => r.isCorrect).length
    const accuracy = results.length > 0 ? Math.round((correctCount / results.length) * 100) : 0

    return (
      <div className="max-w-lg mx-auto py-12">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trophy className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">練習完成！</h1>
            <p className="text-gray-600 mb-6">
              你完成了 {results.length} 道題目
            </p>

            {/* 統計 */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-800">{results.length}</p>
                <p className="text-sm text-gray-500">總題數</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{correctCount}</p>
                <p className="text-sm text-gray-500">正確</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">{results.length - correctCount}</p>
                <p className="text-sm text-gray-500">錯誤</p>
              </div>
            </div>

            {/* 正確率 */}
            <div className="mb-8">
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all"
                  style={{ width: `${accuracy}%` }}
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">正確率 {accuracy}%</p>
            </div>

            {/* 詳細結果 */}
            <div className="space-y-3 mb-8 max-h-[300px] overflow-y-auto">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg ${
                    result.isCorrect ? "bg-green-50" : "bg-red-50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {result.isCorrect ? (
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <X className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 line-clamp-2">
                        {result.question.content}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        正解：{getCorrectAnswerDisplay(result.question)}
                      </p>
                      {!result.isCorrect && result.userAnswer !== "(跳過)" && (
                        <p className="text-xs text-red-600">
                          你的答案：{result.userAnswer}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              <Button onClick={restartPractice} className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                再練一次
              </Button>
              <Link href="/dashboard/practice">
                <Button variant="outline" className="w-full">
                  返回題庫
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const questionType = currentQuestion?.question_types?.name
  const isChoiceType = questionType === "single_choice" || questionType === "multiple_choice"
  const isTrueFalseType = questionType === "true_false"

  return (
    <div className="max-w-2xl mx-auto">
      {/* 頂部導航 */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/dashboard/practice"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600"
        >
          <ChevronLeft className="w-4 h-4" />
          結束練習
        </Link>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <FileQuestion className="w-4 h-4 text-green-500" />
          題庫練習
        </div>
      </div>

      {/* 進度條 */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
          <span>進度</span>
          <span>{currentIndex + 1} / {questions.length}</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 transition-all"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* 題目卡片 */}
      <Card className="mb-6">
        <CardContent className="p-6">
          {/* 題型標籤 */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded">
              {currentQuestion?.question_types?.label || "題目"}
            </span>
          </div>

          {/* 題目內容 */}
          <p className="text-lg text-gray-800 mb-6">{currentQuestion?.content}</p>

          {/* 選項/輸入 */}
          {!showResult && (
            <>
              {isChoiceType && currentQuestion?.options && (
                <div className="space-y-3">
                  {Object.entries(currentQuestion.options).map(([key, value]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedOption(key)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                        selectedOption === key
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <span className="w-6 h-6 bg-gray-100 rounded-full inline-flex items-center justify-center text-sm mr-3">
                        {key}
                      </span>
                      {value}
                    </button>
                  ))}
                </div>
              )}

              {isTrueFalseType && (
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setSelectedOption("true")}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      selectedOption === "true"
                        ? "border-green-500 bg-green-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <Check className="w-6 h-6 mx-auto mb-2 text-green-600" />
                    <span className="font-medium">是 (O)</span>
                  </button>
                  <button
                    onClick={() => setSelectedOption("false")}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      selectedOption === "false"
                        ? "border-red-500 bg-red-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <X className="w-6 h-6 mx-auto mb-2 text-red-600" />
                    <span className="font-medium">否 (X)</span>
                  </button>
                </div>
              )}

              {!isChoiceType && !isTrueFalseType && (
                <Input
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="輸入答案..."
                  className="text-lg py-6"
                />
              )}
            </>
          )}

          {/* 結果顯示 */}
          {showResult && (
            <div className={`p-4 rounded-lg ${isCorrect ? "bg-green-50" : "bg-red-50"}`}>
              <div className="flex items-center gap-2 mb-2">
                {isCorrect ? (
                  <>
                    <Check className="w-6 h-6 text-green-600" />
                    <span className="text-lg font-semibold text-green-600">正確！</span>
                  </>
                ) : (
                  <>
                    <X className="w-6 h-6 text-red-600" />
                    <span className="text-lg font-semibold text-red-600">錯誤</span>
                  </>
                )}
              </div>
              <p className="text-gray-700">
                <span className="text-gray-500">正確答案：</span>
                <span className="font-medium">{getCorrectAnswerDisplay(currentQuestion)}</span>
              </p>

              {/* 解析 */}
              {currentQuestion?.explanation && (
                <div className="mt-4">
                  {showExplanation ? (
                    <div className="p-3 bg-white rounded-lg border">
                      <p className="text-sm text-gray-600">{currentQuestion.explanation}</p>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowExplanation(true)}
                      className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700"
                    >
                      <Lightbulb className="w-4 h-4" />
                      查看解析
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 操作按鈕 */}
      {showResult ? (
        <Button onClick={nextQuestion} className="w-full" size="lg">
          {currentIndex < questions.length - 1 ? "下一題" : "查看結果"}
        </Button>
      ) : (
        <div className="flex gap-3">
          <Button variant="outline" onClick={skipQuestion} className="flex-1">
            <SkipForward className="w-4 h-4 mr-2" />
            跳過
          </Button>
          <Button
            onClick={checkAnswer}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700"
            disabled={!selectedOption && !userAnswer.trim()}
          >
            <Check className="w-4 h-4 mr-2" />
            確認答案
          </Button>
        </div>
      )}

      {/* 統計 */}
      <div className="flex justify-center gap-6 mt-8 text-sm text-gray-500">
        <span className="flex items-center gap-1">
          <Check className="w-4 h-4 text-green-500" />
          {results.filter((r) => r.isCorrect).length} 正確
        </span>
        <span className="flex items-center gap-1">
          <X className="w-4 h-4 text-red-500" />
          {results.filter((r) => !r.isCorrect).length} 錯誤
        </span>
      </div>
    </div>
  )
}

// 禁止預渲染
export const dynamic = 'force-dynamic'

export default function PracticeSessionPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <PracticeSessionContent />
    </Suspense>
  )
}
