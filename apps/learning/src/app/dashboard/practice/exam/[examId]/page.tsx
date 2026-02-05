// apps/learning/src/app/dashboard/practice/exam/[examId]/page.tsx
"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, Button, Input } from "@daily/ui"
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Clock,
  Send,
  CheckCircle,
  XCircle,
  Trophy,
  RotateCcw,
  AlertCircle,
  Loader2,
} from "lucide-react"
import { ExamPDFDownloadButton } from "@/components/questions/exam-pdf-document"

interface QuestionType {
  id: string
  name: string
  label: string
}

interface Question {
  id: string
  content: string
  options: Record<string, string> | null
  answer: Record<string, unknown> | null
  explanation: string | null
  question_type_id: string
  difficulty: string | null
  is_group: boolean | null
  parent_id: string | null
  order: number | null
  question_types?: QuestionType
  children?: Question[]
}

interface ExamAnswer {
  id: string
  exam_id: string
  question_id: string
  question_order: number
  score: number
  user_answer: Record<string, unknown> | null
  is_correct: boolean | null
  earned_score: number | null
  question?: Question
}

interface Exam {
  id: string
  exam_code: string
  subject_id: string
  topic_ids: string[] | null
  unit_ids: string[] | null
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

interface ShuffledOption {
  originalKey: string
  displayKey: string
  value: string
}

export default function ExamPage() {
  const params = useParams()
  const router = useRouter()
  const examId = params.examId as string

  const [exam, setExam] = useState<Exam | null>(null)
  const [examAnswers, setExamAnswers] = useState<ExamAnswer[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // 當前題目索引
  const [currentIndex, setCurrentIndex] = useState(0)

  // 作答狀態（key: question_id, value: 答案）
  const [answers, setAnswers] = useState<Record<string, string>>({})

  // 選項打散（key: question_id, value: 打散後的選項）
  const [shuffledOptionsMap, setShuffledOptionsMap] = useState<Record<string, ShuffledOption[]>>({})

  // 計時器
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [timerActive, setTimerActive] = useState(false)

  // 題組狀態
  const [currentGroupChildIndex, setCurrentGroupChildIndex] = useState(0)

  // Fisher-Yates 洗牌
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  // 載入試卷
  const fetchExam = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 載入試卷
    const { data: examData, error: examError } = await supabase
      .from("exams")
      .select("*, subjects (id, title)")
      .eq("id", examId)
      .eq("user_id", user.id)
      .single()

    if (examError || !examData) {
      console.error("Load exam error:", examError)
      router.push("/dashboard/practice")
      return
    }

    setExam(examData as unknown as Exam)

    // 載入試卷題目
    const { data: answersData } = await supabase
      .from("exam_answers")
      .select("*")
      .eq("exam_id", examId)
      .order("question_order")

    if (!answersData) {
      setLoading(false)
      return
    }

    // 載入題目詳情
    const questionIds = answersData.map(a => a.question_id)
    const { data: questionsData } = await supabase
      .from("questions")
      .select("*, question_types (id, name, label)")
      .in("id", questionIds)

    // 載入題組子題
    const { data: childrenData } = await supabase
      .from("questions")
      .select("*, question_types (id, name, label)")
      .in("parent_id", questionIds)
      .order("order")

    // 組合資料
    const questionsMap: Record<string, Question> = {}
    questionsData?.forEach(q => {
      questionsMap[q.id] = q as unknown as Question
    })

    // 加入子題
    const childrenMap: Record<string, Question[]> = {}
    childrenData?.forEach(child => {
      if (child.parent_id) {
        if (!childrenMap[child.parent_id]) childrenMap[child.parent_id] = []
        childrenMap[child.parent_id].push(child as unknown as Question)
      }
    })

    Object.keys(questionsMap).forEach(id => {
      if (questionsMap[id].is_group) {
        questionsMap[id].children = childrenMap[id] || []
      }
    })

    // 組合 exam answers
    const combined = answersData.map(a => ({
      ...a,
      question: questionsMap[a.question_id],
    })) as ExamAnswer[]

    setExamAnswers(combined)

    // 如果有已保存的答案，載入
    const savedAnswers: Record<string, string> = {}
    combined.forEach(a => {
      if (a.user_answer) {
        const ans = a.user_answer as Record<string, unknown>
        if (ans.selected !== undefined) {
          savedAnswers[a.question_id] = String(ans.selected)
        } else if (ans.text !== undefined) {
          savedAnswers[a.question_id] = String(ans.text)
        }
      }
    })
    setAnswers(savedAnswers)

    // 預先打散所有選項
    const optionsMap: Record<string, ShuffledOption[]> = {}
    combined.forEach(a => {
      const q = a.question
      if (!q) return

      // 處理題組
      if (q.is_group && q.children) {
        q.children.forEach(child => {
          if (child.options) {
            optionsMap[child.id] = shuffleOptions(child.options)
          }
        })
      } else if (q.options) {
        optionsMap[q.id] = shuffleOptions(q.options)
      }
    })
    setShuffledOptionsMap(optionsMap)

    // 如果是新試卷或草稿，更新狀態為進行中
    if (examData.status === "draft") {
      await supabase
        .from("exams")
        .update({
          status: "in_progress",
          started_at: new Date().toISOString(),
        })
        .eq("id", examId)

      setExam(prev => prev ? {
        ...prev,
        status: "in_progress",
        started_at: new Date().toISOString(),
      } : null)
    }

    // 啟動計時器（如果未完成）
    if (examData.status !== "completed") {
      setTimerActive(true)
      // 如果有之前的作答時間，繼續計時
      if (examData.time_spent_seconds) {
        setElapsedSeconds(examData.time_spent_seconds)
      }
    } else {
      setElapsedSeconds(examData.time_spent_seconds || 0)
    }

    setLoading(false)
  }, [examId, router])

  // 打散選項
  const shuffleOptions = (options: Record<string, string>): ShuffledOption[] => {
    const entries = Object.entries(options)
    const displayKeys = ['A', 'B', 'C', 'D', 'E', 'F'].slice(0, entries.length)
    const shuffledEntries = shuffleArray(entries)
    return shuffledEntries.map(([originalKey, value], index) => ({
      originalKey,
      displayKey: displayKeys[index],
      value,
    }))
  }

  useEffect(() => {
    fetchExam()
  }, [fetchExam])

  // 計時器
  useEffect(() => {
    if (!timerActive) return

    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [timerActive])

  // 格式化時間
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // 當前題目
  const currentExamAnswer = examAnswers[currentIndex]
  const currentQuestion = useMemo(() => {
    if (!currentExamAnswer?.question) return null

    const q = currentExamAnswer.question
    if (q.is_group && q.children && q.children.length > 0) {
      return q.children[currentGroupChildIndex]
    }
    return q
  }, [currentExamAnswer, currentGroupChildIndex])

  const currentParentQuestion = currentExamAnswer?.question?.is_group
    ? currentExamAnswer.question
    : null

  // 取得當前題目的打散選項
  const currentShuffledOptions = currentQuestion
    ? shuffledOptionsMap[currentQuestion.id] || []
    : []

  // 計算實際題號（考慮題組）
  const getActualQuestionNumber = () => {
    let number = 0
    for (let i = 0; i < currentIndex; i++) {
      const q = examAnswers[i]?.question
      if (q?.is_group && q.children) {
        number += q.children.length
      } else {
        number += 1
      }
    }
    if (currentParentQuestion) {
      number += currentGroupChildIndex + 1
    } else {
      number += 1
    }
    return number
  }

  // 計算總題數
  const getTotalQuestionCount = () => {
    let count = 0
    examAnswers.forEach(a => {
      if (a.question?.is_group && a.question.children) {
        count += a.question.children.length
      } else {
        count += 1
      }
    })
    return count
  }

  // 保存答案
  const saveAnswer = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }

  // 上一題
  const handlePrev = () => {
    if (currentParentQuestion && currentGroupChildIndex > 0) {
      setCurrentGroupChildIndex(prev => prev - 1)
    } else if (currentIndex > 0) {
      const prevAnswer = examAnswers[currentIndex - 1]
      if (prevAnswer?.question?.is_group && prevAnswer.question.children) {
        setCurrentIndex(prev => prev - 1)
        setCurrentGroupChildIndex(prevAnswer.question.children.length - 1)
      } else {
        setCurrentIndex(prev => prev - 1)
        setCurrentGroupChildIndex(0)
      }
    }
  }

  // 下一題
  const handleNext = () => {
    if (currentParentQuestion && currentParentQuestion.children &&
        currentGroupChildIndex < currentParentQuestion.children.length - 1) {
      setCurrentGroupChildIndex(prev => prev + 1)
    } else if (currentIndex < examAnswers.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setCurrentGroupChildIndex(0)
    }
  }

  // 是否可以上一題/下一題
  const canGoPrev = currentIndex > 0 || currentGroupChildIndex > 0
  const canGoNext = useMemo(() => {
    if (currentParentQuestion?.children &&
        currentGroupChildIndex < currentParentQuestion.children.length - 1) {
      return true
    }
    return currentIndex < examAnswers.length - 1
  }, [currentIndex, currentGroupChildIndex, currentParentQuestion, examAnswers.length])

  // 取得正確答案
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

  // 交卷
  const handleSubmit = async () => {
    if (!exam) return

    const unanswered = getTotalQuestionCount() - Object.keys(answers).length
    if (unanswered > 0) {
      if (!confirm(`還有 ${unanswered} 題未作答，確定要交卷嗎？`)) {
        return
      }
    }

    setSubmitting(true)
    setTimerActive(false)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let correctCount = 0
      let earnedScore = 0
      const updates: Array<{
        id: string
        user_answer: Record<string, unknown>
        is_correct: boolean
        earned_score: number
      }> = []

      // 批次更新 questions 表的記錄
      const questionUpdates: Array<{
        id: string
        is_correct: boolean
      }> = []

      // 評分
      for (const examAnswer of examAnswers) {
        const question = examAnswer.question
        if (!question) continue

        // 處理題組
        if (question.is_group && question.children) {
          for (const child of question.children) {
            const userAnswer = answers[child.id] || ""
            const correctAnswer = getCorrectAnswer(child)

            // 比對答案
            let isCorrect = false
            const questionType = child.question_types?.name

            if (questionType === "single_choice" || questionType === "multiple_choice") {
              // 選擇題：找出原始選項 key
              const shuffled = shuffledOptionsMap[child.id] || []
              const selected = shuffled.find(opt => opt.displayKey === userAnswer)
              isCorrect = selected?.originalKey === correctAnswer
            } else if (questionType === "true_false") {
              isCorrect = userAnswer.toLowerCase() === correctAnswer.toLowerCase()
            } else {
              // 填充題、問答題：忽略大小寫和前後空白
              isCorrect = userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase()
            }

            // 計算該子題的配分
            const childScore = Math.round(examAnswer.score / question.children.length)

            if (isCorrect) {
              correctCount++
              earnedScore += childScore
            }

            questionUpdates.push({ id: child.id, is_correct: isCorrect })
          }

          // 更新 exam_answer（題組整體）
          const allChildrenCorrect = question.children.every(child => {
            const userAnswer = answers[child.id] || ""
            const correctAnswer = getCorrectAnswer(child)
            const questionType = child.question_types?.name

            if (questionType === "single_choice" || questionType === "multiple_choice") {
              const shuffled = shuffledOptionsMap[child.id] || []
              const selected = shuffled.find(opt => opt.displayKey === userAnswer)
              return selected?.originalKey === correctAnswer
            } else if (questionType === "true_false") {
              return userAnswer.toLowerCase() === correctAnswer.toLowerCase()
            }
            return userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase()
          })

          updates.push({
            id: examAnswer.id,
            user_answer: { children: question.children.map(c => ({ id: c.id, answer: answers[c.id] || "" })) },
            is_correct: allChildrenCorrect,
            earned_score: allChildrenCorrect ? examAnswer.score : 0,
          })

        } else {
          // 一般題目
          const userAnswer = answers[question.id] || ""
          const correctAnswer = getCorrectAnswer(question)

          let isCorrect = false
          const questionType = question.question_types?.name

          if (questionType === "single_choice" || questionType === "multiple_choice") {
            const shuffled = shuffledOptionsMap[question.id] || []
            const selected = shuffled.find(opt => opt.displayKey === userAnswer)
            isCorrect = selected?.originalKey === correctAnswer
          } else if (questionType === "true_false") {
            isCorrect = userAnswer.toLowerCase() === correctAnswer.toLowerCase()
          } else {
            isCorrect = userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase()
          }

          if (isCorrect) {
            correctCount++
            earnedScore += examAnswer.score
          }

          updates.push({
            id: examAnswer.id,
            user_answer: { selected: userAnswer },
            is_correct: isCorrect,
            earned_score: isCorrect ? examAnswer.score : 0,
          })

          questionUpdates.push({ id: question.id, is_correct: isCorrect })
        }
      }

      // 更新 exam_answers
      for (const update of updates) {
        await supabase
          .from("exam_answers")
          .update({
            user_answer: update.user_answer,
            is_correct: update.is_correct,
            earned_score: update.earned_score,
          })
          .eq("id", update.id)
      }

      // 更新 questions 表（記錄練習結果）
      for (const qu of questionUpdates) {
        // 先取得當前值
        const { data: currentQ } = await supabase
          .from("questions")
          .select("attempt_count, wrong_count, consecutive_correct")
          .eq("id", qu.id)
          .single()

        if (currentQ) {
          await supabase
            .from("questions")
            .update({
              attempt_count: (currentQ.attempt_count || 0) + 1,
              wrong_count: qu.is_correct ? (currentQ.wrong_count || 0) : (currentQ.wrong_count || 0) + 1,
              consecutive_correct: qu.is_correct ? (currentQ.consecutive_correct || 0) + 1 : 0,
              last_attempted_at: new Date().toISOString(),
            })
            .eq("id", qu.id)
        }
      }

      // 更新試卷
      await supabase
        .from("exams")
        .update({
          status: "completed",
          earned_score: earnedScore,
          correct_count: correctCount,
          time_spent_seconds: elapsedSeconds,
          completed_at: new Date().toISOString(),
        })
        .eq("id", exam.id)

      // 更新本地狀態
      setExam(prev => prev ? {
        ...prev,
        status: "completed",
        earned_score: earnedScore,
        correct_count: correctCount,
        time_spent_seconds: elapsedSeconds,
      } : null)

      // 更新 examAnswers
      setExamAnswers(prev => prev.map(a => {
        const update = updates.find(u => u.id === a.id)
        if (update) {
          return {
            ...a,
            user_answer: update.user_answer,
            is_correct: update.is_correct,
            earned_score: update.earned_score,
          }
        }
        return a
      }))

    } catch (err) {
      console.error("Submit error:", err)
      alert("交卷失敗，請重試")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (!exam || examAnswers.length === 0) {
    return (
      <div className="max-w-lg mx-auto py-12">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">找不到試卷</h2>
            <Link href="/dashboard/practice">
              <Button variant="outline">返回題庫</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 已完成的試卷顯示結果
  if (exam.status === "completed") {
    const totalCount = getTotalQuestionCount()
    const percentage = Math.round((exam.earned_score || 0) / exam.total_score * 100)

    return (
      <div className="max-w-2xl mx-auto py-6 px-4">
        {/* 返回連結 */}
        <Link
          href={`/dashboard/practice/${exam.subject_id}`}
          className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-800 mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          返回題庫
        </Link>

        {/* 成績卡片 */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                  percentage >= 60 ? "bg-green-100" : "bg-red-100"
                }`}>
                  <Trophy className={`w-8 h-8 ${
                    percentage >= 60 ? "text-green-600" : "text-red-600"
                  }`} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">
                    {exam.earned_score} <span className="text-lg text-gray-500">/ {exam.total_score}</span>
                  </h1>
                  <p className="text-gray-500">答對 {exam.correct_count} / {totalCount} 題</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">作答時間</p>
                <p className="text-lg font-medium">{formatTime(exam.time_spent_seconds || 0)}</p>
              </div>
            </div>

            {/* 操作按鈕 */}
            <div className="flex gap-2">
              <ExamPDFDownloadButton
                exam={exam}
                examAnswers={examAnswers}
                userAnswers={answers}
                includeAnswers={false}
              />
              <ExamPDFDownloadButton
                exam={exam}
                examAnswers={examAnswers}
                userAnswers={answers}
                includeAnswers={true}
              />
              <div className="flex-1" />
              <Link href={`/dashboard/practice/${exam.subject_id}`}>
                <Button>
                  <RotateCcw className="w-4 h-4 mr-1" />
                  返回題庫
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* 題目回顧 */}
        <h2 className="text-lg font-semibold text-gray-800 mb-4">題目回顧</h2>
        <div className="space-y-4">
          {examAnswers.map((examAnswer, idx) => {
            const question = examAnswer.question
            if (!question) return null

            if (question.is_group && question.children) {
              return (
                <Card key={examAnswer.id}>
                  <CardContent className="p-4">
                    <div className="text-sm text-indigo-600 font-medium mb-2">【題組】</div>
                    <p className="text-gray-800 mb-4">{question.content}</p>
                    <div className="space-y-3 pl-4 border-l-2 border-gray-200">
                      {question.children.map((child, childIdx) => {
                        const userAns = answers[child.id] || ""
                        const correctAns = getCorrectAnswer(child)
                        const shuffled = shuffledOptionsMap[child.id] || []
                        const selected = shuffled.find(opt => opt.displayKey === userAns)
                        const isCorrect = selected?.originalKey === correctAns ||
                          userAns.toLowerCase() === correctAns.toLowerCase()

                        return (
                          <div key={child.id} className={`p-3 rounded-lg ${
                            isCorrect ? "bg-green-50" : "bg-red-50"
                          }`}>
                            <div className="flex items-start gap-2">
                              {isCorrect ? (
                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                              )}
                              <div className="flex-1">
                                <p className="text-gray-800">{child.content}</p>
                                <p className="text-sm mt-2">
                                  <span className="text-gray-500">你的答案：</span>
                                  <span className={isCorrect ? "text-green-700" : "text-red-700"}>
                                    {userAns || "(未作答)"}
                                  </span>
                                  {!isCorrect && (
                                    <span className="text-gray-500 ml-2">
                                      正確答案：<span className="text-green-700">{correctAns}</span>
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )
            }

            const userAns = answers[question.id] || ""
            const correctAns = getCorrectAnswer(question)
            const shuffled = shuffledOptionsMap[question.id] || []
            const selected = shuffled.find(opt => opt.displayKey === userAns)
            const isCorrect = selected?.originalKey === correctAns ||
              userAns.toLowerCase() === correctAns.toLowerCase()

            return (
              <Card key={examAnswer.id} className={isCorrect ? "border-green-200" : "border-red-200"}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {isCorrect ? (
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="text-gray-800 mb-2">{question.content}</p>
                      {question.options && (
                        <div className="space-y-1 mb-2">
                          {Object.entries(question.options).map(([key, value]) => (
                            <div
                              key={key}
                              className={`text-sm px-2 py-1 rounded ${
                                key === correctAns
                                  ? "bg-green-100 text-green-800"
                                  : "text-gray-600"
                              }`}
                            >
                              {key}. {value}
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="text-sm">
                        <span className="text-gray-500">你的答案：</span>
                        <span className={isCorrect ? "text-green-700" : "text-red-700"}>
                          {userAns || "(未作答)"}
                        </span>
                        {!isCorrect && (
                          <span className="text-gray-500 ml-2">
                            正確答案：<span className="text-green-700">{correctAns}</span>
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    )
  }

  // 作答中的試卷
  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      {/* 頂部資訊列 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <Link
            href={`/dashboard/practice/${exam.subject_id}`}
            className="text-gray-600 hover:text-gray-800"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-gray-800">{exam.subjects?.title}</h1>
            <p className="text-sm text-gray-500">{exam.exam_code}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 text-gray-600">
            <Clock className="w-4 h-4" />
            <span className="font-mono">{formatTime(elapsedSeconds)}</span>
          </div>
          <span className="text-sm text-gray-500">
            {getActualQuestionNumber()} / {getTotalQuestionCount()}
          </span>
        </div>
      </div>

      {/* 題目卡片 */}
      <Card className="mb-4">
        <CardContent className="p-6">
          {/* 題組題幹 */}
          {currentParentQuestion && (
            <div className="mb-4 p-4 bg-indigo-50 rounded-lg">
              <div className="text-xs text-indigo-600 font-medium mb-1">【題組】</div>
              <p className="text-gray-800">{currentParentQuestion.content}</p>
            </div>
          )}

          {/* 題目 */}
          {currentQuestion && (
            <>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                  {currentQuestion.question_types?.label}
                </span>
                <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded">
                  {currentExamAnswer?.score} 分
                </span>
              </div>

              <p className="text-lg text-gray-800 mb-6">{currentQuestion.content}</p>

              {/* 選項 / 輸入 */}
              {currentQuestion.question_types?.name === "single_choice" ||
               currentQuestion.question_types?.name === "multiple_choice" ? (
                <div className="space-y-2">
                  {currentShuffledOptions.map((opt) => (
                    <button
                      key={opt.displayKey}
                      onClick={() => saveAnswer(currentQuestion.id, opt.displayKey)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        answers[currentQuestion.id] === opt.displayKey
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <span className="font-medium mr-2">{opt.displayKey}.</span>
                      {opt.value}
                    </button>
                  ))}
                </div>
              ) : currentQuestion.question_types?.name === "true_false" ? (
                <div className="flex gap-4">
                  <button
                    onClick={() => saveAnswer(currentQuestion.id, "true")}
                    className={`flex-1 p-4 rounded-lg border-2 text-center transition-all ${
                      answers[currentQuestion.id] === "true"
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    ⭕ 是
                  </button>
                  <button
                    onClick={() => saveAnswer(currentQuestion.id, "false")}
                    className={`flex-1 p-4 rounded-lg border-2 text-center transition-all ${
                      answers[currentQuestion.id] === "false"
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    ❌ 否
                  </button>
                </div>
              ) : (
                <Input
                  value={answers[currentQuestion.id] || ""}
                  onChange={(e) => saveAnswer(currentQuestion.id, e.target.value)}
                  placeholder="請輸入答案..."
                  className="w-full"
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 導覽按鈕 */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handlePrev}
          disabled={!canGoPrev}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          上一題
        </Button>

        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="bg-green-600 hover:bg-green-700"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin mr-1" />
          ) : (
            <Send className="w-4 h-4 mr-1" />
          )}
          交卷
        </Button>

        <Button
          variant="outline"
          onClick={handleNext}
          disabled={!canGoNext}
        >
          下一題
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* 題目導覽 */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600 mb-3">題目導覽</p>
        <div className="flex flex-wrap gap-2">
          {examAnswers.map((a, idx) => {
            const q = a.question
            if (!q) return null

            if (q.is_group && q.children) {
              return q.children.map((child, childIdx) => {
                const isAnswered = !!answers[child.id]
                const isCurrent = idx === currentIndex && childIdx === currentGroupChildIndex
                return (
                  <button
                    key={child.id}
                    onClick={() => {
                      setCurrentIndex(idx)
                      setCurrentGroupChildIndex(childIdx)
                    }}
                    className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                      isCurrent
                        ? "bg-indigo-600 text-white"
                        : isAnswered
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                    }`}
                  >
                    {examAnswers.slice(0, idx).reduce((sum, ea) => {
                      if (ea.question?.is_group && ea.question.children) {
                        return sum + ea.question.children.length
                      }
                      return sum + 1
                    }, 0) + childIdx + 1}
                  </button>
                )
              })
            }

            const isAnswered = !!answers[q.id]
            const isCurrent = idx === currentIndex && !currentParentQuestion
            const num = examAnswers.slice(0, idx).reduce((sum, ea) => {
              if (ea.question?.is_group && ea.question.children) {
                return sum + ea.question.children.length
              }
              return sum + 1
            }, 0) + 1

            return (
              <button
                key={a.id}
                onClick={() => {
                  setCurrentIndex(idx)
                  setCurrentGroupChildIndex(0)
                }}
                className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                  isCurrent
                    ? "bg-indigo-600 text-white"
                    : isAnswered
                    ? "bg-indigo-100 text-indigo-700"
                    : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                }`}
              >
                {num}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
