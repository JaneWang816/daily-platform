// apps/learning/src/app/dashboard/flashcards/[deckId]/quiz/page.tsx
"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, Button } from "@daily/ui"
import {
  ChevronLeft,
  Play,
  Trophy,
  X,
  Check,
  RotateCcw,
  ArrowRight,
  Lightbulb,
  Volume2,
  AlertCircle,
} from "lucide-react"
import { calculateSM2 } from "@/lib/sm2"
import { speak } from "@/lib/speech"

// ============================================
// 類型定義
// ============================================
interface Deck {
  id: string
  title: string
  front_lang: string | null
  back_lang: string | null
}

interface Flashcard {
  id: string
  deck_id: string | null
  front: string
  back: string
  note: string | null
  ease_factor: number | null
  interval: number | null
  repetition_count: number | null
  next_review_at: string | null
}

interface QuizQuestion {
  card: Flashcard
  options: string[]
  correctIndex: number
}

type QuizMode = "front-to-back" | "back-to-front"
type QuizState = "setup" | "playing" | "answered" | "complete"

const QUESTION_COUNTS = [5, 10, 20, 0] // 0 = 全部

// ============================================
// 工具函數
// ============================================
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function generateQuizQuestions(
  cards: Flashcard[],
  mode: QuizMode,
  count: number
): QuizQuestion[] {
  // 隨機打亂卡片
  const shuffledCards = shuffleArray(cards)
  
  // 取指定數量（0 = 全部）
  const selectedCards = count === 0 ? shuffledCards : shuffledCards.slice(0, count)
  
  return selectedCards.map((card) => {
    // 正確答案
    const correctAnswer = mode === "front-to-back" ? card.back : card.front
    
    // 從其他卡片中取干擾選項
    const otherCards = cards.filter((c) => c.id !== card.id)
    const distractors = shuffleArray(otherCards)
      .slice(0, 3)
      .map((c) => (mode === "front-to-back" ? c.back : c.front))
    
    // 合併並打亂選項
    const allOptions = shuffleArray([correctAnswer, ...distractors])
    const correctIndex = allOptions.indexOf(correctAnswer)
    
    return {
      card,
      options: allOptions,
      correctIndex,
    }
  })
}

// ============================================
// 主元件
// ============================================
export default function QuizPage() {
  const params = useParams()
  const deckId = params.deckId as string
  const supabase = createClient()

  // 基本狀態
  const [deck, setDeck] = useState<Deck | null>(null)
  const [allCards, setAllCards] = useState<Flashcard[]>([])
  const [loading, setLoading] = useState(true)

  // 測驗設定
  const [quizMode, setQuizMode] = useState<QuizMode>("front-to-back")
  const [questionCount, setQuestionCount] = useState(10)

  // 測驗狀態
  const [quizState, setQuizState] = useState<QuizState>("setup")
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)

  // 統計
  const [correctCount, setCorrectCount] = useState(0)
  const [wrongCards, setWrongCards] = useState<Flashcard[]>([])

  // ============================================
  // 資料載入
  // ============================================
  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 取得牌組資訊
    const { data: deckData } = await supabase
      .from("decks")
      .select("*")
      .eq("id", deckId)
      .single()

    if (deckData) {
      setDeck(deckData as Deck)
    }

    // 取得所有字卡
    const { data: cardsData } = await supabase
      .from("flashcards")
      .select("*")
      .eq("deck_id", deckId)
      .order("created_at", { ascending: true })

    if (cardsData) {
      setAllCards(cardsData as Flashcard[])
    }

    setLoading(false)
  }, [deckId, supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ============================================
  // 測驗邏輯
  // ============================================
  const currentQuestion = questions[currentIndex]

  const startQuiz = () => {
    const quizQuestions = generateQuizQuestions(allCards, quizMode, questionCount)
    setQuestions(quizQuestions)
    setCurrentIndex(0)
    setSelectedOption(null)
    setCorrectCount(0)
    setWrongCards([])
    setQuizState("playing")
  }

  const handleSelectOption = async (optionIndex: number) => {
    if (quizState !== "playing" || selectedOption !== null) return

    setSelectedOption(optionIndex)
    const isCorrect = optionIndex === currentQuestion.correctIndex

    if (isCorrect) {
      setCorrectCount((prev) => prev + 1)
    } else {
      // 答錯：更新 SM-2（quality = 1，模糊）
      setWrongCards((prev) => [...prev, currentQuestion.card])

      const card = currentQuestion.card
      const result = calculateSM2({
        quality: 1, // 模糊
        currentInterval: card.interval || 0,
        currentEaseFactor: card.ease_factor || 2.5,
        currentRepetitionCount: card.repetition_count || 0,
      })

      await supabase
        .from("flashcards")
        .update({
          ease_factor: result.easeFactor,
          interval: result.interval,
          repetition_count: result.repetitions,
          next_review_at: result.nextReview.toISOString(),
        } as Record<string, unknown>)
        .eq("id", card.id)
    }

    setQuizState("answered")
  }

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1)
      setSelectedOption(null)
      setQuizState("playing")
    } else {
      setQuizState("complete")
    }
  }

  const handleSpeak = (text: string, lang: string | null) => {
    if (lang && lang !== "none") {
      speak(text, lang)
    }
  }

  // ============================================
  // 渲染
  // ============================================
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!deck) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">找不到此牌組</p>
        <Link href="/dashboard/flashcards" className="text-indigo-600 hover:underline mt-2 inline-block">
          返回牌組列表
        </Link>
      </div>
    )
  }

  // 卡片數量不足
  if (allCards.length < 4) {
    return (
      <div className="max-w-lg mx-auto py-12">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-amber-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-800 mb-2">卡片數量不足</h1>
            <p className="text-gray-600 mb-6">
              測驗模式需要至少 4 張卡片才能產生選項。
              <br />
              目前只有 {allCards.length} 張卡片。
            </p>
            <Link href={`/dashboard/flashcards/${deckId}`}>
              <Button>返回牌組新增卡片</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ============================================
  // 設定畫面
  // ============================================
  if (quizState === "setup") {
    return (
      <div className="max-w-lg mx-auto">
        {/* 返回連結 */}
        <Link
          href={`/dashboard/flashcards/${deckId}`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600 mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          返回牌組
        </Link>

        <Card>
          <CardContent className="p-6">
            <h1 className="text-xl font-bold text-gray-800 mb-1">測驗模式</h1>
            <p className="text-sm text-gray-500 mb-6">{deck.title}</p>

            {/* 模式選擇 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                測驗方式
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setQuizMode("front-to-back")}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    quizMode === "front-to-back"
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <p className="font-medium text-gray-800">看正面答背面</p>
                  <p className="text-xs text-gray-500 mt-1">看題目選答案</p>
                </button>
                <button
                  onClick={() => setQuizMode("back-to-front")}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    quizMode === "back-to-front"
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <p className="font-medium text-gray-800">看背面答正面</p>
                  <p className="text-xs text-gray-500 mt-1">看答案選題目</p>
                </button>
              </div>
            </div>

            {/* 題數選擇 */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                題目數量（共 {allCards.length} 張卡片）
              </label>
              <div className="flex gap-2 flex-wrap">
                {QUESTION_COUNTS.map((count) => {
                  const displayCount = count === 0 ? allCards.length : count
                  const isDisabled = count !== 0 && count > allCards.length
                  const isSelected = questionCount === count || 
                    (count === 0 && questionCount >= allCards.length)
                  
                  return (
                    <button
                      key={count}
                      onClick={() => !isDisabled && setQuestionCount(count)}
                      disabled={isDisabled}
                      className={`px-4 py-2 rounded-lg border transition-all ${
                        isSelected
                          ? "border-indigo-500 bg-indigo-500 text-white"
                          : isDisabled
                          ? "border-gray-200 text-gray-300 cursor-not-allowed"
                          : "border-gray-200 hover:border-gray-300 text-gray-700"
                      }`}
                    >
                      {count === 0 ? `全部 (${allCards.length})` : `${count} 題`}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 開始按鈕 */}
            <Button onClick={startQuiz} className="w-full" size="lg">
              <Play className="w-5 h-5 mr-2" />
              開始測驗
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ============================================
  // 完成畫面
  // ============================================
  if (quizState === "complete") {
    const accuracy = questions.length > 0 
      ? Math.round((correctCount / questions.length) * 100) 
      : 0

    return (
      <div className="max-w-lg mx-auto py-8">
        <Card>
          <CardContent className="p-8">
            {/* 標題 */}
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-10 h-10 text-indigo-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">測驗完成！</h1>
              <p className="text-gray-600">
                {deck.title}
              </p>
            </div>

            {/* 統計 */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-gray-800">{questions.length}</p>
                <p className="text-sm text-gray-500">總題數</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-600">{correctCount}</p>
                <p className="text-sm text-gray-500">答對</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-red-600">{wrongCards.length}</p>
                <p className="text-sm text-gray-500">答錯</p>
              </div>
            </div>

            {/* 正確率 */}
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">正確率</span>
                <span className={`font-medium ${
                  accuracy >= 80 ? "text-green-600" : 
                  accuracy >= 60 ? "text-amber-600" : "text-red-600"
                }`}>
                  {accuracy}%
                </span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    accuracy >= 80 ? "bg-green-500" : 
                    accuracy >= 60 ? "bg-amber-500" : "bg-red-500"
                  }`}
                  style={{ width: `${accuracy}%` }}
                />
              </div>
            </div>

            {/* 錯題列表 */}
            {wrongCards.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  需要加強的卡片（已調整複習時間）
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {wrongCards.map((card) => (
                    <div
                      key={card.id}
                      className="p-3 bg-red-50 rounded-lg border border-red-100"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {card.front}
                          </p>
                          <p className="text-sm text-gray-600 truncate">
                            → {card.back}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            const lang = quizMode === "front-to-back" 
                              ? deck.back_lang 
                              : deck.front_lang
                            handleSpeak(
                              quizMode === "front-to-back" ? card.back : card.front,
                              lang
                            )
                          }}
                          className="p-1.5 rounded-full hover:bg-red-100 text-red-400 hover:text-red-600"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 操作按鈕 */}
            <div className="flex flex-col gap-3">
              <Button onClick={() => setQuizState("setup")} className="w-full">
                <RotateCcw className="w-4 h-4 mr-2" />
                再測一次
              </Button>
              <Link href={`/dashboard/flashcards/${deckId}`} className="w-full">
                <Button variant="outline" className="w-full">
                  返回牌組
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ============================================
  // 測驗進行中
  // ============================================
  const questionText = quizMode === "front-to-back" 
    ? currentQuestion.card.front 
    : currentQuestion.card.back

  const questionLang = quizMode === "front-to-back" 
    ? deck.front_lang 
    : deck.back_lang

  return (
    <div className="max-w-2xl mx-auto">
      {/* 頂部導航 */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href={`/dashboard/flashcards/${deckId}`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600"
        >
          <ChevronLeft className="w-4 h-4" />
          結束測驗
        </Link>
        <div className="text-sm text-gray-500">
          {deck.title}
        </div>
      </div>

      {/* 進度條 */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
          <span>進度</span>
          <span>
            {currentIndex + 1} / {questions.length}
            <span className="ml-2 text-green-600">✓ {correctCount}</span>
            <span className="ml-2 text-red-600">✗ {wrongCards.length}</span>
          </span>
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
        <CardContent className="p-8">
          <div className="text-center">
            <span className="inline-block px-3 py-1 rounded-full bg-indigo-100 text-indigo-600 text-xs font-medium mb-4">
              {quizMode === "front-to-back" ? "正面" : "背面"}
            </span>
            <p className="text-2xl text-gray-800 mb-4 whitespace-pre-wrap">
              {questionText}
            </p>
            <button
              onClick={() => handleSpeak(questionText, questionLang)}
              className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600"
            >
              <Volume2 className="w-5 h-5" />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* 選項 */}
      <div className="space-y-3 mb-6">
        {currentQuestion.options.map((option, index) => {
          const isSelected = selectedOption === index
          const isCorrect = index === currentQuestion.correctIndex
          const showResult = quizState === "answered"

          let bgClass = "bg-white hover:bg-gray-50 border-gray-200"
          let textClass = "text-gray-800"

          if (showResult) {
            if (isCorrect) {
              bgClass = "bg-green-50 border-green-500"
              textClass = "text-green-800"
            } else if (isSelected && !isCorrect) {
              bgClass = "bg-red-50 border-red-500"
              textClass = "text-red-800"
            } else {
              bgClass = "bg-gray-50 border-gray-200"
              textClass = "text-gray-400"
            }
          } else if (isSelected) {
            bgClass = "bg-indigo-50 border-indigo-500"
            textClass = "text-indigo-800"
          }

          return (
            <button
              key={index}
              onClick={() => handleSelectOption(index)}
              disabled={quizState === "answered"}
              className={`w-full p-4 rounded-lg border-2 text-left transition-all ${bgClass}`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    showResult && isCorrect
                      ? "bg-green-500 text-white"
                      : showResult && isSelected && !isCorrect
                      ? "bg-red-500 text-white"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {showResult && isCorrect ? (
                    <Check className="w-4 h-4" />
                  ) : showResult && isSelected && !isCorrect ? (
                    <X className="w-4 h-4" />
                  ) : (
                    String.fromCharCode(65 + index)
                  )}
                </span>
                <span className={`flex-1 ${textClass}`}>{option}</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* 下一題按鈕 */}
      {quizState === "answered" && (
        <div className="text-center">
          <Button onClick={handleNext} size="lg">
            {currentIndex < questions.length - 1 ? (
              <>
                下一題
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            ) : (
              <>
                查看結果
                <Trophy className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
