// apps/learning/src/app/dashboard/practice/session/page.tsx
"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, Button } from "@daily/ui"
import {
  ChevronLeft,
  FileQuestion,
  CheckCircle,
  XCircle,
  RotateCcw,
  ChevronRight,
  Trophy,
  Lightbulb,
  SkipForward,
  ListTree,
  Settings,
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
  is_group: boolean | null
  parent_id: string | null
  order: number | null
  question_types?: QuestionType
  children?: Question[]
}

interface PracticeResult {
  question: Question
  userAnswer: string
  isCorrect: boolean
}

// 選項打散後的結構
interface ShuffledOption {
  originalKey: string
  displayKey: string
  value: string
}

export default function PracticeSessionPage() {
  const searchParams = useSearchParams()
  const subjectId = searchParams.get("subject")
  const urlMode = searchParams.get("mode") || "all"
  const urlDifficulty = searchParams.get("difficulty") || "all"
  const urlTopic = searchParams.get("topic")

  // ✨ 設定狀態
  const [showSettings, setShowSettings] = useState(true) // 初始顯示設定
  const [selectedDifficulty, setSelectedDifficulty] = useState(urlDifficulty)
  const [selectedMode, setSelectedMode] = useState(urlMode)
  const [questionCount, setQuestionCount] = useState(20)

  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [started, setStarted] = useState(false)

  // 答題狀態
  const [userAnswer, setUserAnswer] = useState("")
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [showExplanation, setShowExplanation] = useState(false)

  // ✨ 選項隨機打散
  const [shuffledOptions, setShuffledOptions] = useState<ShuffledOption[]>([])

  // 練習結果
  const [results, setResults] = useState<PracticeResult[]>([])
  const [isComplete, setIsComplete] = useState(false)

  // 題組狀態
  const [currentGroupParent, setCurrentGroupParent] = useState<Question | null>(null)
  const [currentGroupChildIndex, setCurrentGroupChildIndex] = useState(0)

  // Fisher-Yates 洗牌演算法
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  // 載入可用題目數量
  const [availableCount, setAvailableCount] = useState(0)

  const fetchAvailableCount = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let query = supabase
      .from("questions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("parent_id", null)

    if (subjectId) {
      query = query.eq("subject_id", subjectId)
    }

    if (selectedMode === "mistakes") {
      query = query.lt("consecutive_correct", 3).gt("attempt_count", 0)
    } else if (selectedMode === "new") {
      query = query.eq("attempt_count", 0)
    }

    if (selectedDifficulty !== "all") {
      query = query.eq("difficulty", selectedDifficulty)
    }

    const { count } = await query
    setAvailableCount(count || 0)
    setLoading(false)
  }, [subjectId, selectedMode, selectedDifficulty])

  useEffect(() => {
    fetchAvailableCount()
  }, [fetchAvailableCount])

  const fetchQuestions = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let query = supabase
      .from("questions")
      .select(`*, question_types (id, name, label)`)
      .eq("user_id", user.id)
      .is("parent_id", null)

    if (subjectId) {
      query = query.eq("subject_id", subjectId)
    }

    // 模式篩選
    if (selectedMode === "mistakes") {
      query = query.lt("consecutive_correct", 3).gt("attempt_count", 0)
    } else if (selectedMode === "new") {
      query = query.eq("attempt_count", 0)
    }

    // ✨ 難度篩選
    if (selectedDifficulty !== "all") {
      query = query.eq("difficulty", selectedDifficulty)
    }

    const { data } = await query

    if (data && data.length > 0) {
      // 處理題組：載入子題
      const groupIds = data.filter((q: Question) => q.is_group).map((q: Question) => q.id)
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

      // 組合題目
      let allQuestions = (data as Question[]).map(q => ({
        ...q,
        children: q.is_group ? (childrenMap[q.id] || []) : undefined
      }))

      // ✨ 隨機打亂順序
      const shuffled = shuffleArray(allQuestions)

      // 限制題目數量
      setQuestions(shuffled.slice(0, questionCount))
    }

    setStarted(true)
    setShowSettings(false)
  }, [subjectId, selectedMode, selectedDifficulty, questionCount])

  const currentQuestion = useMemo(() => {
    if (questions.length === 0) return null

    const q = questions[currentIndex]
    if (!q) return null

    // 如果是題組，返回當前子題
    if (q.is_group && q.children && q.children.length > 0) {
      setCurrentGroupParent(q)
      return q.children[currentGroupChildIndex]
    }

    setCurrentGroupParent(null)
    return q
  }, [questions, currentIndex, currentGroupChildIndex])

  // ✨ 當題目變更時，打散選項
  useEffect(() => {
    if (!currentQuestion?.options) {
      setShuffledOptions([])
      return
    }

    const entries = Object.entries(currentQuestion.options)
    const displayKeys = ['A', 'B', 'C', 'D', 'E', 'F'].slice(0, entries.length)

    // 隨機打散
    const shuffledEntries = shuffleArray(entries)

    const shuffled: ShuffledOption[] = shuffledEntries.map(([originalKey, value], index) => ({
      originalKey,
      displayKey: displayKeys[index],
      value,
    }))

    setShuffledOptions(shuffled)
  }, [currentQuestion?.id])

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

  // ✨ 取得打散後的正確答案顯示鍵
  const getShuffledCorrectKey = (): string => {
    if (!currentQuestion) return ""
    const correctOriginalKey = getCorrectAnswer(currentQuestion)
    const found = shuffledOptions.find(opt => opt.originalKey === correctOriginalKey)
    return found?.displayKey || correctOriginalKey
  }

  const getCorrectAnswerDisplay = (question: Question): string => {
    const ans = question.answer as Record<string, unknown> | null
    if (!ans) return ""
    if (ans.correct !== undefined) {
      if (typeof ans.correct === "boolean") {
        return ans.correct ? "是 (O)" : "否 (X)"
      }
      // 選擇題，顯示打散後的選項
      const correctKey = getShuffledCorrectKey()
      const found = shuffledOptions.find(opt => opt.displayKey === correctKey)
      if (found) {
        return `${correctKey}. ${found.value}`
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
    const isChoiceType = questionType === "single_choice" || questionType === "multiple_choice"
    const isTrueFalse = questionType === "true_false"

    let userAns = ""
    if (isChoiceType && selectedOption) {
      // ✨ 將打散後的選擇轉回原始鍵
      const found = shuffledOptions.find(opt => opt.displayKey === selectedOption)
      userAns = found?.originalKey || selectedOption
    } else if (isTrueFalse && selectedOption) {
      userAns = selectedOption
    } else {
      userAns = userAnswer.trim()
    }

    const correctAnswer = getCorrectAnswer(currentQuestion)
    let correct = false

    if (isTrueFalse) {
      correct = userAns === correctAnswer
    } else if (isChoiceType) {
      correct = userAns.toUpperCase() === correctAnswer.toUpperCase()
    } else {
      // 簡答/填充：忽略大小寫和空白比對
      correct = userAns.toLowerCase().replace(/\s/g, "") === correctAnswer.toLowerCase().replace(/\s/g, "")
    }

    setIsCorrect(correct)
    setShowResult(true)

    // 記錄結果
    setResults(prev => [...prev, {
      question: currentQuestion,
      userAnswer: isChoiceType ? selectedOption || "" : userAns,
      isCorrect: correct,
    }])

    // 更新資料庫
    await updateQuestionStats(correct)
  }

  const updateQuestionStats = async (correct: boolean) => {
    if (!currentQuestion) return
    const supabase = createClient()

    await (supabase.from("questions") as any)
      .update({
        attempt_count: (currentQuestion.attempt_count || 0) + 1,
        consecutive_correct: correct ? (currentQuestion.consecutive_correct || 0) + 1 : 0,
        wrong_count: correct ? (currentQuestion.wrong_count || 0) : (currentQuestion.wrong_count || 0) + 1,
        last_attempted_at: new Date().toISOString(),
      })
      .eq("id", currentQuestion.id)
  }

  const nextQuestion = () => {
    const currentQ = questions[currentIndex]

    // 如果是題組且還有子題
    if (currentQ?.is_group && currentQ.children) {
      if (currentGroupChildIndex < currentQ.children.length - 1) {
        setCurrentGroupChildIndex(prev => prev + 1)
        resetAnswer()
        return
      }
    }

    // 移到下一題
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setCurrentGroupChildIndex(0)
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
    if (!currentQuestion) return
    setResults(prev => [...prev, {
      question: currentQuestion,
      userAnswer: "(跳過)",
      isCorrect: false,
    }])
    nextQuestion()
  }

  const restartPractice = () => {
    setCurrentIndex(0)
    setCurrentGroupChildIndex(0)
    setResults([])
    setIsComplete(false)
    resetAnswer()
    setQuestions(prev => shuffleArray([...prev]))
  }

  const startPractice = () => {
    fetchQuestions()
  }

  // 計算總進度
  const getTotalProgress = () => {
    let total = 0
    let current = 0

    questions.forEach((q, idx) => {
      if (q.is_group && q.children) {
        total += q.children.length
        if (idx < currentIndex) {
          current += q.children.length
        } else if (idx === currentIndex) {
          current += currentGroupChildIndex + (showResult ? 1 : 0)
        }
      } else {
        total += 1
        if (idx < currentIndex || (idx === currentIndex && showResult)) {
          current += 1
        }
      }
    })

    return { total, current }
  }

  const progress = getTotalProgress()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // ✨ 練習設定畫面
  if (showSettings && !started) {
    return (
      <div className="max-w-lg mx-auto py-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                <Settings className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">練習設定</h2>
                <p className="text-sm text-gray-500">選擇練習模式和難度</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* 練習模式 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">練習模式</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "all", label: "全部", desc: "所有題目" },
                    { value: "new", label: "新題", desc: "未練習過" },
                    { value: "mistakes", label: "錯題", desc: "待加強" },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setSelectedMode(opt.value)}
                      className={`p-3 rounded-lg border-2 text-left transition-colors ${
                        selectedMode === opt.value
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className={`font-medium ${selectedMode === opt.value ? "text-indigo-700" : "text-gray-800"}`}>
                        {opt.label}
                      </div>
                      <div className="text-xs text-gray-500">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* ✨ 難度選擇 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">難易度</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "all", label: "全部", color: "gray" },
                    { value: "basic", label: "基礎", color: "green" },
                    { value: "advanced", label: "進階", color: "orange" },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setSelectedDifficulty(opt.value)}
                      className={`p-3 rounded-lg border-2 text-center transition-colors ${
                        selectedDifficulty === opt.value
                          ? opt.color === "green" ? "border-green-500 bg-green-50"
                            : opt.color === "orange" ? "border-orange-500 bg-orange-50"
                            : "border-indigo-500 bg-indigo-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className={`font-medium ${
                        selectedDifficulty === opt.value
                          ? opt.color === "green" ? "text-green-700"
                            : opt.color === "orange" ? "text-orange-700"
                            : "text-indigo-700"
                          : "text-gray-800"
                      }`}>
                        {opt.label}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 題目數量 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  題目數量：{questionCount} 題
                </label>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="5"
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>5</span>
                  <span>50</span>
                </div>
              </div>

              {/* 可用題目數 */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  符合條件的題目：<span className="font-bold text-indigo-600">{availableCount}</span> 題
                </p>
              </div>

              {/* 開始按鈕 */}
              <div className="flex gap-3">
                <Link href="/dashboard/practice" className="flex-1">
                  <Button variant="outline" className="w-full">返回</Button>
                </Link>
                <Button
                  onClick={startPractice}
                  disabled={availableCount === 0}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                >
                  開始練習
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (questions.length === 0 && started) {
    return (
      <div className="max-w-lg mx-auto py-12">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileQuestion className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">沒有可練習的題目</h2>
            <p className="text-gray-500 mb-4">
              {selectedMode === "mistakes" ? "太棒了！沒有需要加強的題目" : "請先新增一些題目"}
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => { setShowSettings(true); setStarted(false) }}>
                調整設定
              </Button>
              <Link href="/dashboard/practice">
                <Button variant="outline">返回題庫</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 完成畫面
  if (isComplete) {
    const correctCount = results.filter(r => r.isCorrect).length
    const accuracy = Math.round((correctCount / results.length) * 100)

    return (
      <div className="max-w-lg mx-auto py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trophy className="w-10 h-10 text-white" />
            </div>

            <h2 className="text-2xl font-bold text-gray-800 mb-2">練習完成！</h2>

            <div className="grid grid-cols-3 gap-4 my-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-800">{results.length}</div>
                <div className="text-sm text-gray-500">總題數</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{correctCount}</div>
                <div className="text-sm text-gray-500">答對</div>
              </div>
              <div className="p-4 bg-indigo-50 rounded-lg">
                <div className="text-2xl font-bold text-indigo-600">{accuracy}%</div>
                <div className="text-sm text-gray-500">正確率</div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={restartPractice} className="flex-1">
                <RotateCcw className="w-4 h-4 mr-2" />
                再練一次
              </Button>
              <Link href="/dashboard/practice" className="flex-1">
                <Button variant="outline" className="w-full">返回題庫</Button>
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
        <Link href="/dashboard/practice" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600">
          <ChevronLeft className="w-4 h-4" />
          結束練習
        </Link>
        <div className="flex items-center gap-2 text-sm">
          {selectedDifficulty !== "all" && (
            <span className={`px-2 py-0.5 rounded text-xs ${
              selectedDifficulty === "basic" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
            }`}>
              {selectedDifficulty === "basic" ? "基礎" : "進階"}
            </span>
          )}
          <span className="text-gray-500">
            <FileQuestion className="w-4 h-4 inline text-indigo-500" /> 題庫練習
          </span>
        </div>
      </div>

      {/* 進度條 */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
          <span>進度</span>
          <span>{progress.current} / {progress.total}</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 transition-all"
            style={{ width: `${(progress.current / progress.total) * 100}%` }}
          />
        </div>
      </div>

      {/* 題組母題顯示 */}
      {currentGroupParent && (
        <Card className="mb-4 border-l-4 border-l-purple-400">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <ListTree className="w-4 h-4 text-purple-500" />
              <span className="text-xs text-purple-600 font-medium">題組說明</span>
            </div>
            <p className="text-gray-700 whitespace-pre-wrap">{currentGroupParent.content}</p>
          </CardContent>
        </Card>
      )}

      {/* 題目卡片 */}
      <Card className="mb-6">
        <CardContent className="p-6">
          {/* 題型標籤 */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded">
              {currentQuestion?.question_types?.label || "題目"}
            </span>
            {currentQuestion?.difficulty && (
              <span className={`text-xs px-2 py-0.5 rounded ${
                currentQuestion.difficulty === "basic"
                  ? "bg-green-100 text-green-700"
                  : "bg-orange-100 text-orange-700"
              }`}>
                {currentQuestion.difficulty === "basic" ? "基礎" : "進階"}
              </span>
            )}
            {currentGroupParent && (
              <span className="text-xs text-purple-500">
                子題 {currentGroupChildIndex + 1}/{currentGroupParent.children?.length}
              </span>
            )}
          </div>

          {/* 題目內容 */}
          <p className="text-lg text-gray-800 mb-6 whitespace-pre-wrap">{currentQuestion?.content}</p>

          {/* ✨ 選項/輸入（選項已打散） */}
          {!showResult && (
            <>
              {isChoiceType && shuffledOptions.length > 0 && (
                <div className="space-y-3">
                  {shuffledOptions.map((opt) => (
                    <button
                      key={opt.displayKey}
                      onClick={() => setSelectedOption(opt.displayKey)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                        selectedOption === opt.displayKey
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <span className="font-medium mr-2">{opt.displayKey}.</span>
                      {opt.value}
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
                    <span className="text-xl">⭕</span>
                    <span className="ml-2 font-medium">是</span>
                  </button>
                  <button
                    onClick={() => setSelectedOption("false")}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      selectedOption === "false"
                        ? "border-red-500 bg-red-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <span className="text-xl">❌</span>
                    <span className="ml-2 font-medium">否</span>
                  </button>
                </div>
              )}

              {!isChoiceType && !isTrueFalseType && (
                <input
                  type="text"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && userAnswer.trim() && checkAnswer()}
                  placeholder="輸入你的答案..."
                  className="w-full p-4 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none"
                  autoFocus
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
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-700">答對了！</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-600" />
                    <span className="font-medium text-red-700">答錯了</span>
                  </>
                )}
              </div>
              {!isCorrect && currentQuestion && (
                <p className="text-sm text-gray-600">
                  正確答案：<span className="font-medium">{getCorrectAnswerDisplay(currentQuestion)}</span>
                </p>
              )}
            </div>
          )}

          {/* 解析 */}
          {showResult && currentQuestion?.explanation && (
            <div className="mt-4">
              {!showExplanation ? (
                <button
                  onClick={() => setShowExplanation(true)}
                  className="text-sm text-indigo-600 hover:underline flex items-center gap-1"
                >
                  <Lightbulb className="w-4 h-4" />
                  查看解析
                </button>
              ) : (
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="w-4 h-4 text-yellow-600" />
                    <span className="font-medium text-yellow-700">解析</span>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap">{currentQuestion.explanation}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 操作按鈕 */}
      <div className="flex gap-3">
        {!showResult ? (
          <>
            <Button variant="outline" onClick={skipQuestion} className="text-gray-500">
              <SkipForward className="w-4 h-4 mr-2" />
              跳過
            </Button>
            <Button
              onClick={checkAnswer}
              disabled={!selectedOption && !userAnswer.trim()}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
            >
              確認答案
            </Button>
          </>
        ) : (
          <Button onClick={nextQuestion} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
            {currentIndex === questions.length - 1 &&
              (!currentGroupParent || currentGroupChildIndex === (currentGroupParent.children?.length || 1) - 1)
              ? "查看結果"
              : "下一題"}
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  )
}
