// apps/learning/src/app/dashboard/flashcards/[deckId]/review/page.tsx
"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, Button } from "@daily/ui"
import {
  ChevronLeft,
  Lightbulb,
  Volume2,
  RotateCcw,
  Check,
  X,
  Trophy,
  Eye,
} from "lucide-react"
import { calculateSM2, getNextReviewText } from "@/lib/sm2"
import { speak } from "@/lib/speech"

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

const RATING_BUTTONS = [
  { value: 0, label: "全忘", bg: "#ef4444", hover: "#dc2626" },
  { value: 1, label: "模糊", bg: "#f97316", hover: "#ea580c" },
  { value: 2, label: "要想", bg: "#eab308", hover: "#ca8a04" },
  { value: 3, label: "順答", bg: "#22c55e", hover: "#16a34a" },
  { value: 4, label: "秒答", bg: "#14b8a6", hover: "#0d9488" },
]

// 取得本地日期字串 YYYY-MM-DD
const getLocalDateString = (date: Date = new Date()) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export default function ReviewPage() {
  const params = useParams()
  const deckId = params.deckId as string

  const [deck, setDeck] = useState<Deck | null>(null)
  const [cards, setCards] = useState<Flashcard[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [loading, setLoading] = useState(true)

  // 複習統計
  const [stats, setStats] = useState({
    reviewed: 0,
    correct: 0,
    incorrect: 0,
  })

  // 完成狀態
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

    // 取得待複習字卡（next_review_at <= now）
    const { data: cardsData } = await supabase
      .from("flashcards")
      .select("*")
      .eq("deck_id", deckId)
      .lte("next_review_at", new Date().toISOString())
      .order("next_review_at", { ascending: true })

    if (cardsData && cardsData.length > 0) {
      setCards(cardsData as Flashcard[])
    } else {
      setIsComplete(true)
    }

    setLoading(false)
  }, [deckId])

  // 更新學習紀錄（每次評分呼叫一次，count=1）
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
            flashcards_reviewed: (existing.flashcards_reviewed || 0) + count,
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
            flashcards_reviewed: count,
            questions_practiced: 0,
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
    fetchData()
  }, [fetchData])

  const currentCard = cards[currentIndex]

  const handleSpeak = (text: string, lang: string | null) => {
    if (lang && lang !== "none") {
      speak(text, lang)
    }
  }

  const handleRate = async (quality: number) => {
    if (!currentCard) return

    const supabase = createClient()

    // 計算新的 SM-2 參數
    const result = calculateSM2({
      quality,
      currentInterval: currentCard.interval || 0,
      currentEaseFactor: currentCard.ease_factor || 2.5,
      currentRepetitionCount: currentCard.repetition_count || 0,
    })

    // 更新字卡
    await (supabase.from("flashcards") as any)
      .update({
        ease_factor: result.easeFactor,
        interval: result.interval,
        repetition_count: result.repetitions,
        next_review_at: result.nextReview.toISOString(),
      })
      .eq("id", currentCard.id)

    // 每次評分都寫入學習紀錄（+1）
    await updateStudyLog(1)

    // 更新統計
    setStats((prev) => ({
      reviewed: prev.reviewed + 1,
      correct: quality >= 2 ? prev.correct + 1 : prev.correct,
      incorrect: quality < 2 ? prev.incorrect + 1 : prev.incorrect,
    }))

    // 下一張卡
    if (currentIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1)
      setIsFlipped(false)
    } else {
      setIsComplete(true)
    }
  }

  const handleFlip = () => {
    setIsFlipped(true)
    // 自動播放背面語音
    if (deck?.back_lang && deck.back_lang !== "none" && currentCard) {
      handleSpeak(currentCard.back, deck.back_lang)
    }
  }

  const handleFlipBack = () => {
    setIsFlipped(false)
    // 自動播放正面語音
    if (deck?.front_lang && deck.front_lang !== "none" && currentCard) {
      handleSpeak(currentCard.front, deck.front_lang)
    }
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

  // 完成畫面
  if (isComplete) {
    const accuracy = stats.reviewed > 0 ? Math.round((stats.correct / stats.reviewed) * 100) : 0

    return (
      <div className="max-w-lg mx-auto py-12">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trophy className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              {stats.reviewed > 0 ? "複習完成！" : "沒有待複習的字卡"}
            </h1>
            <p className="text-gray-600 mb-6">
              {stats.reviewed > 0
                ? `你今天複習了 ${stats.reviewed} 張字卡`
                : "所有字卡都已經複習過了，明天再來吧！"}
            </p>

            {stats.reviewed > 0 && (
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-800">{stats.reviewed}</p>
                  <p className="text-sm text-gray-500">已複習</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{stats.correct}</p>
                  <p className="text-sm text-gray-500">記得</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{stats.incorrect}</p>
                  <p className="text-sm text-gray-500">需加強</p>
                </div>
              </div>
            )}

            {stats.reviewed > 0 && (
              <div className="mb-8">
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all"
                    style={{ width: `${accuracy}%` }}
                  />
                </div>
                <p className="text-sm text-gray-500 mt-2">正確率 {accuracy}%</p>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Link href={`/dashboard/flashcards/${deckId}`}>
                <Button className="w-full">返回牌組</Button>
              </Link>
              <Link href={`/dashboard/flashcards/${deckId}/quiz`}>
                <Button variant="outline" className="w-full">
                  測驗模式
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* 頂部導航 */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href={`/dashboard/flashcards/${deckId}`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600"
        >
          <ChevronLeft className="w-4 h-4" />
          結束複習
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

      {/* 字卡 */}
      <Card className="mb-6">
        <CardContent className="p-0">
          <div
            className="min-h-[300px] flex flex-col items-center justify-center p-8 cursor-pointer relative"
            onClick={() => !isFlipped && handleFlip()}
          >
            {/* 正面/背面標籤 */}
            <span className="text-xs text-gray-400 mb-4">
              {isFlipped ? "背面（答案）" : "正面（題目）"}
            </span>

            {/* 內容 */}
            <p className="text-2xl text-center text-gray-800 mb-4 whitespace-pre-wrap">
              {isFlipped ? currentCard.back : currentCard.front}
            </p>

            {/* 備註 (只在背面且有備註時顯示) */}
            {isFlipped && currentCard.note && (
              <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200 max-w-md">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-700 whitespace-pre-wrap flex-1">{currentCard.note}</p>
                  {deck?.back_lang && deck.back_lang !== "none" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSpeak(currentCard.note!, deck.back_lang)
                      }}
                      className="p-1 rounded-full hover:bg-amber-100 text-amber-600 flex-shrink-0"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 語音按鈕 */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleSpeak(
                  isFlipped ? currentCard.back : currentCard.front,
                  isFlipped ? deck.back_lang : deck.front_lang
                )
              }}
              className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600"
            >
              <Volume2 className="w-5 h-5" />
            </button>

            {/* 翻轉提示 */}
            {!isFlipped && (
              <p className="text-sm text-gray-400 mt-4">點擊卡片查看答案</p>
            )}

            {/* 翻回正面按鈕 */}
            {isFlipped && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleFlipBack()
                }}
                className="absolute top-4 right-4 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm transition-colors"
              >
                <Eye className="w-4 h-4" />
                查看題目
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 評分按鈕 */}
      {isFlipped ? (
        <div className="space-y-4">
          <p className="text-center text-sm text-gray-500">你記得多少？</p>
          <div className="flex justify-center gap-2">
            {RATING_BUTTONS.map((btn) => {
              // 計算預計下次複習時間
              const preview = calculateSM2({
                quality: btn.value,
                currentInterval: currentCard.interval || 0,
                currentEaseFactor: currentCard.ease_factor || 2.5,
                currentRepetitionCount: currentCard.repetition_count || 0,
              })
              return (
                <button
                  key={btn.value}
                  onClick={() => handleRate(btn.value)}
                  className="flex flex-col items-center px-4 py-3 rounded-lg text-white transition-transform hover:scale-105 min-w-[70px]"
                  style={{ backgroundColor: btn.bg }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = btn.hover)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = btn.bg)}
                >
                  <span className="font-medium">{btn.label}</span>
                  <span className="text-xs opacity-80 mt-1">
                    {getNextReviewText(preview.interval)}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="flex justify-center">
          <Button onClick={handleFlip} size="lg" className="px-12">
            <RotateCcw className="w-5 h-5 mr-2" />
            翻轉卡片
          </Button>
        </div>
      )}

      {/* 複習統計 */}
      <div className="flex justify-center gap-6 mt-8 text-sm text-gray-500">
        <span className="flex items-center gap-1">
          <Check className="w-4 h-4 text-green-500" />
          {stats.correct} 記得
        </span>
        <span className="flex items-center gap-1">
          <X className="w-4 h-4 text-red-500" />
          {stats.incorrect} 需加強
        </span>
      </div>
    </div>
  )
}
