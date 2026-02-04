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
  BookOpen,
  Zap,
  Layers,
  Filter,
  LayoutList,
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
  difficulty: string | null
  unit_id: string | null
  is_group: boolean | null
  parent_id: string | null
  order: number | null
  question_types?: QuestionType
  units?: { id: string; title: string; topic_id: string } | null
  children?: Question[]
}

interface PracticeResult {
  question: Question
  userAnswer: string
  isCorrect: boolean
}

interface FilterInfo {
  subjectName?: string
  topicName?: string
  difficulty?: string
  mode?: string
}

// 練習項目：可能是獨立題目或題組
interface PracticeItem {
  type: "single" | "group"
  question?: Question          // 獨立題目
  groupParent?: Question       // 題組母題
  groupChildren?: Question[]   // 題組子題
}

const getLocalDateString = (date: Date = new Date()) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function PracticeSessionContent() {
  const searchParams = useSearchParams()
  const subjectId = searchParams.get("subject")
  const topicId = searchParams.get("topic")
  const difficulty = searchParams.get("difficulty")
  const mode = searchParams.get("mode") || "all"

  const [practiceItems, setPracticeItems] = useState<PracticeItem[]>([])
  const [currentItemIndex, setCurrentItemIndex] = useState(0)
  const [currentChildIndex, setCurrentChildIndex] = useState(0)  // 題組內的子題索引
  const [loading, setLoading] = useState(true)
  const [filterInfo, setFilterInfo] = useState<FilterInfo>({})

  const [userAnswer, setUserAnswer] = useState("")
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [showExplanation, setShowExplanation] = useState(false)

  const [results, setResults] = useState<PracticeResult[]>([])
  const [isComplete, setIsComplete] = useState(false)

  const fetchQuestions = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const info: FilterInfo = {}

    if (subjectId) {
      const { data: subjectData } = await supabase.from("subjects").select("title").eq("id", subjectId).single()
      if (subjectData) info.subjectName = subjectData.title
    }

    if (topicId) {
      const { data: topicData } = await supabase.from("topics").select("title").eq("id", topicId).single()
      if (topicData) info.topicName = topicData.title
    }

    if (difficulty) info.difficulty = difficulty === "basic" ? "基礎" : "進階"
    if (mode !== "all") {
      const modeLabels: Record<string, string> = { new: "新題目", mistakes: "錯題", review: "已熟練" }
      info.mode = modeLabels[mode]
    }
    setFilterInfo(info)

    // 查詢所有母題和獨立題目
    let query = supabase
      .from("questions")
      .select(`*, question_types (id, name, label), units (id, title, topic_id)`)
      .eq("user_id", user.id)
      .is("parent_id", null)

    if (subjectId) query = query.eq("subject_id", subjectId)

    if (difficulty) {
      if (difficulty === "basic") query = query.or("difficulty.eq.basic,difficulty.is.null")
      else if (difficulty === "advanced") query = query.eq("difficulty", "advanced")
    }

    // 練習模式篩選（只對非題組題目生效，題組由子題決定）
    // 這裡先不篩選，稍後在 JS 中處理
    const { data } = await query.order("created_at", { ascending: false })

    let filteredData = (data || []) as Question[]

    // 主題篩選
    if (topicId) {
      filteredData = filteredData.filter(q => q.units?.topic_id === topicId)
    }

    // 取得所有題組的子題
    const groupIds = filteredData.filter(q => q.is_group).map(q => q.id)
    let childrenMap: Record<string, Question[]> = {}

    if (groupIds.length > 0) {
      const { data: childrenData } = await supabase
        .from("questions")
        .select(`*, question_types (id, name, label)`)
        .in("parent_id", groupIds)
        .order("order", { ascending: true })

      if (childrenData) {
        (childrenData as Question[]).forEach(child => {
          if (child.parent_id) {
            if (!childrenMap[child.parent_id]) childrenMap[child.parent_id] = []
            childrenMap[child.parent_id].push(child)
          }
        })
      }
    }

    // 建立練習項目
    const items: PracticeItem[] = []

    for (const q of filteredData) {
      if (q.is_group) {
        // 題組：檢查子題是否符合練習模式
        let children = childrenMap[q.id] || []
        
        // 根據練習模式篩選子題
        if (mode === "new") {
          children = children.filter(c => !c.attempt_count || c.attempt_count === 0)
        } else if (mode === "mistakes") {
          children = children.filter(c => (c.attempt_count || 0) > 0 && (c.consecutive_correct || 0) < 3)
        } else if (mode === "review") {
          children = children.filter(c => (c.consecutive_correct || 0) >= 3)
        }

        // 只有有符合條件的子題時才加入
        if (children.length > 0) {
          items.push({
            type: "group",
            groupParent: q,
            groupChildren: children,
          })
        }
      } else {
        // 獨立題目：根據練習模式篩選
        const attemptCount = q.attempt_count || 0
        const consecutiveCorrect = q.consecutive_correct || 0

        let include = true
        if (mode === "new" && attemptCount > 0) include = false
        if (mode === "mistakes" && (attemptCount === 0 || consecutiveCorrect >= 3)) include = false
        if (mode === "review" && consecutiveCorrect < 3) include = false

        if (include) {
          items.push({ type: "single", question: q })
        }
      }
    }

    // 隨機打亂
    const shuffled = [...items].sort(() => Math.random() - 0.5)
    // 最多取 10 組（題組算一組）
    setPracticeItems(shuffled.slice(0, 10))
    setLoading(false)
  }, [subjectId, topicId, difficulty, mode])

  const updateStudyLog = async (count: number) => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const today = getLocalDateString()
      const { data: existing } = await supabase
        .from("study_logs")
        .select("*")
        .eq("user_id", user.id)
        .eq("study_date", today)
        .maybeSingle()

      if (existing) {
        await (supabase.from("study_logs") as any)
          .update({ questions_practiced: (existing.questions_practiced || 0) + count, updated_at: new Date().toISOString() })
          .eq("id", existing.id)
      } else {
        await (supabase.from("study_logs") as any)
          .insert({ user_id: user.id, study_date: today, questions_practiced: count, flashcards_reviewed: 0, study_minutes: 0, pomodoro_sessions: 0 })
      }
    } catch (err) {
      console.error("updateStudyLog error:", err)
    }
  }

  useEffect(() => { fetchQuestions() }, [fetchQuestions])

  // 取得當前練習項目
  const currentItem = practiceItems[currentItemIndex]
  
  // 取得當前題目（獨立題目或題組子題）
  const getCurrentQuestion = (): Question | null => {
    if (!currentItem) return null
    if (currentItem.type === "single") return currentItem.question || null
    if (currentItem.type === "group") return currentItem.groupChildren?.[currentChildIndex] || null
    return null
  }

  const currentQuestion = getCurrentQuestion()

  // 計算總題數
  const getTotalQuestionCount = () => {
    return practiceItems.reduce((sum, item) => {
      if (item.type === "single") return sum + 1
      if (item.type === "group") return sum + (item.groupChildren?.length || 0)
      return sum
    }, 0)
  }

  // 計算當前題號
  const getCurrentQuestionNumber = () => {
    let count = 0
    for (let i = 0; i < currentItemIndex; i++) {
      const item = practiceItems[i]
      if (item.type === "single") count += 1
      if (item.type === "group") count += (item.groupChildren?.length || 0)
    }
    if (currentItem?.type === "group") {
      count += currentChildIndex + 1
    } else {
      count += 1
    }
    return count
  }

  const getCorrectAnswer = (question: Question): string => {
    const ans = question.answer as Record<string, unknown> | null
    if (!ans) return ""
    if (ans.correct !== undefined) {
      if (typeof ans.correct === "boolean") return ans.correct ? "true" : "false"
      return String(ans.correct)
    }
    if (ans.text !== undefined) return String(ans.text)
    return ""
  }

  const getCorrectAnswerDisplay = (question: Question): string => {
    const ans = question.answer as Record<string, unknown> | null
    if (!ans) return ""
    if (ans.correct !== undefined) {
      if (typeof ans.correct === "boolean") return ans.correct ? "是 (O)" : "否 (X)"
      const optionKey = String(ans.correct)
      if (question.options && question.options[optionKey]) return `${optionKey}. ${question.options[optionKey]}`
      return String(ans.correct)
    }
    if (ans.text !== undefined) return String(ans.text)
    return ""
  }

  const checkAnswer = async () => {
    if (!currentQuestion) return

    const questionType = currentQuestion.question_types?.name
    const answer = (questionType === "single_choice" || questionType === "multiple_choice" || questionType === "true_false")
      ? selectedOption : userAnswer

    if (!answer) { alert("請選擇或輸入答案"); return }

    const normalizedUser = answer.trim().toLowerCase()
    const correctAnswer = getCorrectAnswer(currentQuestion)
    const normalizedCorrect = correctAnswer.trim().toLowerCase()
    const correct = normalizedUser === normalizedCorrect

    setIsCorrect(correct)
    setShowResult(true)
    setResults(prev => [...prev, { question: currentQuestion, userAnswer: answer, isCorrect: correct }])

    const supabase = createClient()
    await (supabase.from("questions") as any)
      .update({
        attempt_count: (currentQuestion.attempt_count || 0) + 1,
        consecutive_correct: correct ? (currentQuestion.consecutive_correct || 0) + 1 : 0,
        wrong_count: correct ? (currentQuestion.wrong_count || 0) : (currentQuestion.wrong_count || 0) + 1,
        last_attempted_at: new Date().toISOString(),
      })
      .eq("id", currentQuestion.id)

    await updateStudyLog(1)
  }

  const nextQuestion = () => {
    setShowResult(false)
    setIsCorrect(false)
    setShowExplanation(false)
    setSelectedOption(null)
    setUserAnswer("")

    if (currentItem?.type === "group") {
      // 題組：檢查是否還有下一個子題
      const children = currentItem.groupChildren || []
      if (currentChildIndex < children.length - 1) {
        setCurrentChildIndex(prev => prev + 1)
        return
      }
    }

    // 移到下一個練習項目
    if (currentItemIndex < practiceItems.length - 1) {
      setCurrentItemIndex(prev => prev + 1)
      setCurrentChildIndex(0)
    } else {
      setIsComplete(true)
    }
  }

  const skipQuestion = () => {
    if (currentQuestion) {
      setResults(prev => [...prev, { question: currentQuestion, userAnswer: "(跳過)", isCorrect: false }])
    }
    nextQuestion()
  }

  const restartPractice = () => {
    setCurrentItemIndex(0)
    setCurrentChildIndex(0)
    setResults([])
    setIsComplete(false)
    setShowResult(false)
    setIsCorrect(false)
    setShowExplanation(false)
    setSelectedOption(null)
    setUserAnswer("")
    fetchQuestions()
  }

  const getDifficultyBadge = (question: Question) => {
    const diff = question.difficulty || "basic"
    if (diff === "advanced") {
      return <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded flex items-center gap-1"><Zap className="w-3 h-3" />進階</span>
    }
    return <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded flex items-center gap-1"><BookOpen className="w-3 h-3" />基礎</span>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (practiceItems.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <FileQuestion className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 mb-2">找不到符合條件的題目</p>
            <div className="flex flex-wrap justify-center gap-2 mb-4 text-xs">
              {filterInfo.subjectName && <span className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded">{filterInfo.subjectName}</span>}
              {filterInfo.topicName && <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded">{filterInfo.topicName}</span>}
              {filterInfo.difficulty && <span className="px-2 py-1 bg-orange-50 text-orange-600 rounded">{filterInfo.difficulty}</span>}
              {filterInfo.mode && <span className="px-2 py-1 bg-purple-50 text-purple-600 rounded">{filterInfo.mode}</span>}
            </div>
            <Link href="/dashboard/practice"><Button variant="outline"><ChevronLeft className="w-4 h-4 mr-2" />返回題庫</Button></Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isComplete) {
    const correctCount = results.filter(r => r.isCorrect).length
    const totalCount = results.length
    const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0

    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-10 h-10 text-indigo-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">練習完成！</h2>
              <p className="text-4xl font-bold text-indigo-600 mb-1">{accuracy}%</p>
              <p className="text-gray-500">答對 {correctCount} / {totalCount} 題</p>
            </div>

            <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
              {results.map((result, index) => (
                <div key={index} className={`p-3 rounded-lg ${result.isCorrect ? "bg-green-50" : "bg-red-50"}`}>
                  <div className="flex items-start gap-3">
                    {result.isCorrect ? <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" /> : <X className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 line-clamp-2">{result.question.content}</p>
                      <p className="text-xs text-gray-500 mt-1">正解：{getCorrectAnswerDisplay(result.question)}</p>
                      {!result.isCorrect && result.userAnswer !== "(跳過)" && <p className="text-xs text-red-600">你的答案：{result.userAnswer}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              <Button onClick={restartPractice} className="w-full"><RefreshCw className="w-4 h-4 mr-2" />再練一次</Button>
              <Link href="/dashboard/practice"><Button variant="outline" className="w-full">返回題庫</Button></Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const questionType = currentQuestion?.question_types?.name
  const isChoiceType = questionType === "single_choice" || questionType === "multiple_choice"
  const isTrueFalseType = questionType === "true_false"
  const totalQuestions = getTotalQuestionCount()
  const currentQuestionNumber = getCurrentQuestionNumber()

  return (
    <div className="max-w-2xl mx-auto">
      {/* 頂部導航 */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/dashboard/practice" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600">
          <ChevronLeft className="w-4 h-4" />結束練習
        </Link>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <FileQuestion className="w-4 h-4 text-green-500" />題庫練習
        </div>
      </div>

      {/* 篩選條件 */}
      {(filterInfo.subjectName || filterInfo.topicName || filterInfo.difficulty || filterInfo.mode) && (
        <div className="flex flex-wrap items-center gap-2 mb-4 text-xs">
          <Filter className="w-3 h-3 text-gray-400" />
          {filterInfo.subjectName && <span className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded">{filterInfo.subjectName}</span>}
          {filterInfo.topicName && <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded">{filterInfo.topicName}</span>}
          {filterInfo.difficulty && <span className={`px-2 py-1 rounded ${filterInfo.difficulty === "基礎" ? "bg-green-50 text-green-600" : "bg-orange-50 text-orange-600"}`}>{filterInfo.difficulty}</span>}
          {filterInfo.mode && <span className="px-2 py-1 bg-purple-50 text-purple-600 rounded">{filterInfo.mode}</span>}
        </div>
      )}

      {/* 進度條 */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
          <span>進度</span>
          <span>{currentQuestionNumber} / {totalQuestions}</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-500 transition-all" style={{ width: `${(currentQuestionNumber / totalQuestions) * 100}%` }} />
        </div>
      </div>

      {/* 題組說明（如果是題組） */}
      {currentItem?.type === "group" && currentItem.groupParent && (
        <Card className="mb-4 border-l-4 border-l-purple-400">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded flex items-center gap-1">
                <LayoutList className="w-3 h-3" />
                題組 ({currentChildIndex + 1}/{currentItem.groupChildren?.length || 0})
              </span>
              {getDifficultyBadge(currentItem.groupParent)}
            </div>
            <p className="text-gray-700 whitespace-pre-wrap">{currentItem.groupParent.content}</p>
          </CardContent>
        </Card>
      )}

      {/* 題目卡片 */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded">
              {currentQuestion?.question_types?.label || "題目"}
            </span>
            {currentItem?.type === "single" && currentQuestion && getDifficultyBadge(currentQuestion)}
            {currentItem?.type === "single" && currentQuestion?.units && (
              <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded flex items-center gap-1">
                <Layers className="w-3 h-3" />{currentQuestion.units.title}
              </span>
            )}
          </div>

          <p className="text-lg text-gray-800 mb-6">{currentQuestion?.content}</p>

          {!showResult && (
            <>
              {isChoiceType && currentQuestion?.options && (
                <div className="space-y-3">
                  {Object.entries(currentQuestion.options).map(([key, value]) => (
                    <button key={key} onClick={() => setSelectedOption(key)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${selectedOption === key ? "border-indigo-500 bg-indigo-50" : "border-gray-200 hover:border-gray-300"}`}>
                      <span className="w-6 h-6 bg-gray-100 rounded-full inline-flex items-center justify-center text-sm mr-3">{key}</span>
                      {value}
                    </button>
                  ))}
                </div>
              )}

              {isTrueFalseType && (
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setSelectedOption("true")}
                    className={`p-4 rounded-lg border-2 transition-colors ${selectedOption === "true" ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-gray-300"}`}>
                    <Check className="w-6 h-6 mx-auto mb-2 text-green-600" /><span className="font-medium">是 (O)</span>
                  </button>
                  <button onClick={() => setSelectedOption("false")}
                    className={`p-4 rounded-lg border-2 transition-colors ${selectedOption === "false" ? "border-red-500 bg-red-50" : "border-gray-200 hover:border-gray-300"}`}>
                    <X className="w-6 h-6 mx-auto mb-2 text-red-600" /><span className="font-medium">否 (X)</span>
                  </button>
                </div>
              )}

              {!isChoiceType && !isTrueFalseType && (
                <Input value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)} placeholder="輸入答案..." className="text-lg py-6" />
              )}
            </>
          )}

          {showResult && (
            <div className={`p-4 rounded-lg ${isCorrect ? "bg-green-50" : "bg-red-50"}`}>
              <div className="flex items-center gap-2 mb-2">
                {isCorrect ? (
                  <><Check className="w-6 h-6 text-green-600" /><span className="text-lg font-semibold text-green-600">正確！</span></>
                ) : (
                  <><X className="w-6 h-6 text-red-600" /><span className="text-lg font-semibold text-red-600">錯誤</span></>
                )}
              </div>
              <p className="text-gray-700">
                <span className="text-gray-500">正確答案：</span>
                <span className="font-medium">{currentQuestion && getCorrectAnswerDisplay(currentQuestion)}</span>
              </p>

              {currentQuestion?.explanation && (
                <div className="mt-4">
                  {showExplanation ? (
                    <div className="p-3 bg-white rounded-lg border"><p className="text-sm text-gray-600">{currentQuestion.explanation}</p></div>
                  ) : (
                    <button onClick={() => setShowExplanation(true)} className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700">
                      <Lightbulb className="w-4 h-4" />查看解析
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
          {currentItemIndex < practiceItems.length - 1 || (currentItem?.type === "group" && currentChildIndex < (currentItem.groupChildren?.length || 0) - 1) ? "下一題" : "查看結果"}
        </Button>
      ) : (
        <div className="flex gap-3">
          <Button variant="outline" onClick={skipQuestion} className="flex-1"><SkipForward className="w-4 h-4 mr-2" />跳過</Button>
          <Button onClick={checkAnswer} className="flex-1 bg-indigo-600 hover:bg-indigo-700" disabled={!selectedOption && !userAnswer.trim()}>
            <Check className="w-4 h-4 mr-2" />確認答案
          </Button>
        </div>
      )}

      {/* 統計 */}
      <div className="flex justify-center gap-6 mt-8 text-sm text-gray-500">
        <span className="flex items-center gap-1"><Check className="w-4 h-4 text-green-500" />{results.filter(r => r.isCorrect).length} 正確</span>
        <span className="flex items-center gap-1"><X className="w-4 h-4 text-red-500" />{results.filter(r => !r.isCorrect).length} 錯誤</span>
      </div>
    </div>
  )
}

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
