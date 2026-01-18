// apps/learning/src/app/dashboard/flashcards/[deckId]/quiz/page.tsx
"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, Button, Input } from "@daily/ui"
import {
  ChevronLeft,
  Lightbulb,
  Volume2,
  Check,
  X,
  Trophy,
  SkipForward,
  RefreshCw,
  Keyboard,
} from "lucide-react"
import { speak } from "@/lib/speech"

interface Deck {
  id: string
  title: string
  front_lang: string | null
  back_lang: string | null
}

interface Flashcard {
  id: string
  front: string
  back: string
}

interface QuizResult {
  card: Flashcard
  userAnswer: string
  isCorrect: boolean
}

type QuizMode = "typing" | "choice"

export default function QuizPage() {
  const params = useParams()
  const deckId = params.deckId as string

  const [deck, setDeck] = useState<Deck | null>(null)
  const [cards, setCards] = useState<Flashcard[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  // 測驗模式
  const [mode, setMode] = useState<QuizMode>("typing")
  const [quizStarted, setQuizStarted] = useState(false)

  // 答題狀態
  const [userAnswer, setUserAnswer] = useState("")
  const [showResult, setShowResult] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)

  // 選擇題選項
  const [choices, setChoices] = useState<string[]>([])

  // 測驗結果
  const [results, setResults] = useState<QuizResult[]>([])
  const [isComplete, setIsComplete] = useState(false)

  const fetchData = useCallback(async () => {
    const supabase = createClient()
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
      .select("id, front, back")
      .eq("deck_id", deckId)

    if (cardsData && cardsData.length > 0) {
      // 隨機打亂順序
      const shuffled = [...(cardsData as Flashcard[])].sort(() => Math.random() - 0.5)
      setCards(shuffled)
    }

    setLoading(false)
  }, [deckId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // 生成選擇題選項
  const generateChoices = useCallback((currentCard: Flashcard) => {
    const correctAnswer = currentCard.back
    const otherAnswers = cards
      .filter((c) => c.id !== currentCard.id)
      .map((c) => c.back)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)

    const allChoices = [correctAnswer, ...otherAnswers].sort(() => Math.random() - 0.5)
    setChoices(allChoices)
  }, [cards])

  useEffect(() => {
    if (quizStarted && mode === "choice" && cards[currentIndex]) {
      generateChoices(cards[currentIndex])
    }
  }, [currentIndex, quizStarted, mode, cards, generateChoices])

  const currentCard = cards[currentIndex]

  const handleSpeak = (text: string, lang: string | null) => {
    if (lang && lang !== "none") {
      speak(text, lang)
    }
  }

  const checkAnswer = (answer: string) => {
    if (!currentCard) return

    // 標準化比較（去除空白、轉小寫）
    const normalizedUser = answer.trim().toLowerCase()
    const normalizedCorrect = currentCard.back.trim().toLowerCase()
    const correct = normalizedUser === normalizedCorrect

    setIsCorrect(correct)
    setShowResult(true)
    setUserAnswer(answer)

    // 記錄結果
    setResults((prev) => [
      ...prev,
      {
        card: currentCard,
        userAnswer: answer,
        isCorrect: correct,
      },
    ])
  }

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!userAnswer.trim()) return
    checkAnswer(userAnswer)
  }

  const handleChoiceSelect = (choice: string) => {
    checkAnswer(choice)
  }

  const nextCard = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1)
      setUserAnswer("")
      setShowResult(false)
    } else {
      setIsComplete(true)
    }
  }

  const skipCard = () => {
    setResults((prev) => [
      ...prev,
      {
        card: currentCard,
        userAnswer: "(跳過)",
        isCorrect: false,
      },
    ])
    nextCard()
  }

  const startQuiz = () => {
    setQuizStarted(true)
    // 重新打亂
    setCards((prev) => [...prev].sort(() => Math.random() - 0.5))
    setCurrentIndex(0)
    setResults([])
    setIsComplete(false)
    setShowResult(false)
    setUserAnswer("")
  }

  const restartQuiz = () => {
    setQuizStarted(false)
    setIsComplete(false)
  }

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

  if (cards.length === 0) {
    return (
      <div className="max-w-lg mx-auto py-12">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lightbulb className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">沒有字卡</h2>
            <p className="text-gray-500 mb-4">請先新增一些字卡再來測驗</p>
            <Link href={`/dashboard/flashcards/${deckId}`}>
              <Button>返回牌組</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 開始畫面
  if (!quizStarted) {
    return (
      <div className="max-w-lg mx-auto py-12">
        <Card>
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lightbulb className="w-8 h-8 text-indigo-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">{deck.title}</h1>
              <p className="text-gray-500">測驗模式 · {cards.length} 張字卡</p>
            </div>

            <div className="space-y-4 mb-8">
              <p className="text-sm font-medium text-gray-700">選擇測驗方式</p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setMode("typing")}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    mode === "typing"
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <Keyboard className={`w-6 h-6 mx-auto mb-2 ${mode === "typing" ? "text-indigo-600" : "text-gray-400"}`} />
                  <p className={`text-sm font-medium ${mode === "typing" ? "text-indigo-600" : "text-gray-600"}`}>
                    打字作答
                  </p>
                </button>
                <button
                  onClick={() => setMode("choice")}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    mode === "choice"
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <Check className={`w-6 h-6 mx-auto mb-2 ${mode === "choice" ? "text-indigo-600" : "text-gray-400"}`} />
                  <p className={`text-sm font-medium ${mode === "choice" ? "text-indigo-600" : "text-gray-600"}`}>
                    選擇題
                  </p>
                </button>
              </div>
            </div>

            <Button onClick={startQuiz} className="w-full" size="lg">
              開始測驗
            </Button>

            <Link
              href={`/dashboard/flashcards/${deckId}`}
              className="block text-center text-sm text-gray-500 hover:text-indigo-600 mt-4"
            >
              返回牌組
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 完成畫面
  if (isComplete) {
    const correctCount = results.filter((r) => r.isCorrect).length
    const accuracy = Math.round((correctCount / results.length) * 100)

    return (
      <div className="max-w-2xl mx-auto py-12">
        <Card>
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trophy className="w-10 h-10 text-amber-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">測驗完成！</h1>
              <p className="text-gray-600">
                正確率 {accuracy}% ({correctCount}/{results.length})
              </p>
            </div>

            {/* 進度條 */}
            <div className="mb-8">
              <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all"
                  style={{ width: `${accuracy}%` }}
                />
              </div>
            </div>

            {/* 詳細結果 */}
            <div className="space-y-3 mb-8 max-h-[300px] overflow-y-auto">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg flex items-start gap-3 ${
                    result.isCorrect ? "bg-green-50" : "bg-red-50"
                  }`}
                >
                  {result.isCorrect ? (
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <X className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{result.card.front}</p>
                    <p className="text-sm text-gray-600">正解：{result.card.back}</p>
                    {!result.isCorrect && (
                      <p className="text-sm text-red-600">你的答案：{result.userAnswer}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              <Button onClick={restartQuiz} className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                再測一次
              </Button>
              <Link href={`/dashboard/flashcards/${deckId}`}>
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

  // 測驗進行中
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
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          {deck.title}
        </div>
      </div>

      {/* 進度條 */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
          <span>進度</span>
          <span>{currentIndex + 1} / {cards.length}</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 transition-all"
            style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
          />
        </div>
      </div>

      {/* 題目卡片 */}
      <Card className="mb-6">
        <CardContent className="p-8">
          <div className="text-center">
            <span className="text-xs text-gray-400 mb-4 block">題目</span>
            <p className="text-2xl text-gray-800 mb-4">{currentCard.front}</p>
            <button
              onClick={() => handleSpeak(currentCard.front, deck.front_lang)}
              className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600"
            >
              <Volume2 className="w-5 h-5" />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* 答題區 */}
      {showResult ? (
        <div className="space-y-4">
          <Card className={isCorrect ? "border-green-500" : "border-red-500"}>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
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
              <div className="space-y-2">
                <p className="text-gray-600">
                  <span className="text-gray-400">正確答案：</span>
                  <span className="font-medium">{currentCard.back}</span>
                </p>
                {!isCorrect && (
                  <p className="text-gray-600">
                    <span className="text-gray-400">你的答案：</span>
                    <span className="font-medium text-red-600">{userAnswer}</span>
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
          <Button onClick={nextCard} className="w-full" size="lg">
            {currentIndex < cards.length - 1 ? "下一題" : "查看結果"}
          </Button>
        </div>
      ) : mode === "typing" ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            placeholder="輸入答案..."
            className="text-center text-lg py-6"
            autoFocus
          />
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={skipCard} className="flex-1">
              <SkipForward className="w-4 h-4 mr-2" />
              跳過
            </Button>
            <Button type="submit" className="flex-1" disabled={!userAnswer.trim()}>
              <Check className="w-4 h-4 mr-2" />
              確認
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-3">
          {choices.map((choice, index) => (
            <Button
              key={index}
              variant="outline"
              onClick={() => handleChoiceSelect(choice)}
              className="w-full text-left justify-start py-4 text-base"
            >
              <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-sm mr-3">
                {String.fromCharCode(65 + index)}
              </span>
              {choice}
            </Button>
          ))}
          <Button variant="ghost" onClick={skipCard} className="w-full text-gray-500">
            <SkipForward className="w-4 h-4 mr-2" />
            跳過這題
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
