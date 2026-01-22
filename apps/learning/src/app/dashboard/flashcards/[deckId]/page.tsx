// apps/learning/src/app/dashboard/flashcards/[deckId]/page.tsx
"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import {
  Card,
  CardContent,
  Button,
  Input,
  Label,
  Textarea,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@daily/ui"
import {
  Plus,
  ChevronLeft,
  Lightbulb,
  MoreVertical,
  Pencil,
  Trash2,
  Play,
  Upload,
  Volume2,
  Clock,
  CheckCircle,
  RotateCcw,
} from "lucide-react"
import { FlashcardImport } from "@/components/flashcards"
import { speak } from "@/lib/speech"

interface Deck {
  id: string
  title: string
  description: string | null
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
  user_id: string
  created_at: string | null
}

export default function DeckDetailPage() {
  const params = useParams()
  const deckId = params.deckId as string

  const [deck, setDeck] = useState<Deck | null>(null)
  const [cards, setCards] = useState<Flashcard[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog 狀態
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [cardToDelete, setCardToDelete] = useState<Flashcard | null>(null)
  const [importDialogOpen, setImportDialogOpen] = useState(false)

  // 表單狀態
  const [front, setFront] = useState("")
  const [back, setBack] = useState("")
  const [notes, setNotes] = useState("") 
  const [saving, setSaving] = useState(false)

  // 下拉選單狀態
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  // 翻轉狀態
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set())

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

    // 取得字卡列表
    await fetchCards()
    setLoading(false)
  }, [deckId])

  const fetchCards = async () => {
    const supabase = createClient()
    const { data: cardsData } = await supabase
      .from("flashcards")
      .select("*")
      .eq("deck_id", deckId)
      .order("created_at", { ascending: false })

    if (cardsData) {
      setCards(cardsData as Flashcard[])
    }
  }

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const resetForm = () => {
    setFront("")
    setBack("")
    setNotes("")
    setEditingCard(null)
  }

  const openCreateDialog = () => {
    resetForm()
    setDialogOpen(true)
  }

  const openEditDialog = (card: Flashcard) => {
    setEditingCard(card)
    setFront(card.front)
    setBack(card.back)
    setNotes(card.note || "")
    setDialogOpen(true)
    setOpenMenuId(null)
  }

  const handleSave = async () => {
    if (!front.trim() || !back.trim()) {
      alert("請輸入正面和背面內容")
      return
    }

    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSaving(false)
      return
    }

    if (editingCard) {
      // 更新
      await (supabase.from("flashcards") as any)
        .update({
          front: front.trim(),
          back: back.trim(),
          note: notes.trim() || null,
        })
        .eq("id", editingCard.id)
    } else {
      // 新增
      await (supabase.from("flashcards") as any)
        .insert({
          user_id: user.id,
          deck_id: deckId,
          front: front.trim(),
          back: back.trim(),
          note: notes.trim() || null,
          ease_factor: 2.5,
          interval: 0,
          repetition_count: 0,
          next_review_at: new Date().toISOString(),
        })
    }

    setSaving(false)
    setDialogOpen(false)
    resetForm()
    fetchCards()
  }

  const handleDelete = async () => {
    if (!cardToDelete) return

    const supabase = createClient()
    await (supabase.from("flashcards") as any)
      .delete()
      .eq("id", cardToDelete.id)

    setDeleteDialogOpen(false)
    setCardToDelete(null)
    fetchCards()
  }

  const confirmDelete = (card: Flashcard) => {
    setCardToDelete(card)
    setDeleteDialogOpen(true)
    setOpenMenuId(null)
  }

  const toggleFlip = (cardId: string) => {
    setFlippedCards((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(cardId)) {
        newSet.delete(cardId)
      } else {
        newSet.add(cardId)
      }
      return newSet
    })
  }

  const handleSpeak = (text: string, lang: string | null) => {
    if (lang && lang !== "none") {
      speak(text, lang)
    }
  }

  const resetCardProgress = async (card: Flashcard) => {
    const supabase = createClient()
    await (supabase.from("flashcards") as any)
      .update({
        ease_factor: 2.5,
        interval: 0,
        repetition_count: 0,
        next_review_at: new Date().toISOString(),
      })
      .eq("id", card.id)

    setOpenMenuId(null)
    fetchCards()
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

  // 計算統計
  const dueCards = cards.filter((c) => new Date(c.next_review_at || new Date()) <= new Date())
  const masteredCards = cards.filter((c) => (c.repetition_count || 0) >= 5)

  return (
    <div className="space-y-6">
      {/* 麵包屑 + 標題 */}
      <div>
        <Link
          href="/dashboard/flashcards"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600 mb-2"
        >
          <ChevronLeft className="w-4 h-4" />
          返回牌組列表
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{deck.title}</h1>
              {deck.description && (
                <p className="text-gray-600 text-sm">{deck.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              匯入
            </Button>
            <Button onClick={openCreateDialog} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              新增字卡
            </Button>
          </div>
        </div>
      </div>

      {/* 統計卡片 + 操作按鈕 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-800">{cards.length}</p>
            <p className="text-sm text-gray-500">總字卡數</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{dueCards.length}</p>
            <p className="text-sm text-gray-500">待複習</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{masteredCards.length}</p>
            <p className="text-sm text-gray-500">已熟練</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-center gap-4">
              {dueCards.length > 0 ? (
                <Link href={`/dashboard/flashcards/${deckId}/review`}>
                  <Button variant="secondary" size="sm">
                    <Play className="w-4 h-4 mr-1" />
                    開始複習
                  </Button>
                </Link>
              ) : (
                <Link href={`/dashboard/flashcards/${deckId}/quiz`}>
                  <Button variant="secondary" size="sm">
                    <Play className="w-4 h-4 mr-1" />
                    測驗模式
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 字卡列表 */}
      {cards.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Lightbulb className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 mb-4">還沒有任何字卡</p>
            <div className="flex gap-2">
              <Button onClick={openCreateDialog} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                新增字卡
              </Button>
              <Button onClick={() => setImportDialogOpen(true)} variant="outline">
                <Upload className="w-4 h-4 mr-2" />
                批次匯入
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card) => {
            const isFlipped = flippedCards.has(card.id)
            const isDue = new Date(card.next_review_at || new Date()) <= new Date()

            return (
              <Card
                key={card.id}
                className={`relative group cursor-pointer transition-all ${
                  isDue ? "ring-2 ring-amber-300" : ""
                }`}
                onClick={() => toggleFlip(card.id)}
              >
                <CardContent className="p-4 min-h-[120px] flex flex-col">
                  {/* 狀態標籤 */}
                  <div className="flex items-center gap-2 mb-2">
                    {isDue ? (
                      <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        待複習
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        {(card.repetition_count || 0) >= 5 ? "已熟練" : `複習 ${card.repetition_count || 0} 次`}
                      </span>
                    )}
                  </div>

                  {/* 內容 */}
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-center text-gray-800">
                      {isFlipped ? card.back : card.front}
                    </p>
                  </div>

                  {/* 提示 */}
                  <p className="text-xs text-gray-400 text-center mt-2">
                    {isFlipped ? "背面（點擊翻回）" : "正面（點擊翻轉）"}
                  </p>

                  {/* 語音按鈕 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSpeak(
                        isFlipped ? card.back : card.front,
                        isFlipped ? deck.back_lang : deck.front_lang
                      )
                    }}
                    className="absolute bottom-3 left-3 p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>

                  {/* 更多選單 */}
                  <div className="absolute top-3 right-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setOpenMenuId(openMenuId === card.id ? null : card.id)
                      }}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {openMenuId === card.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={(e) => {
                            e.stopPropagation()
                            setOpenMenuId(null)
                          }}
                        />
                        <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              openEditDialog(card)
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Pencil className="w-4 h-4" />
                            編輯
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              resetCardProgress(card)
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <RotateCcw className="w-4 h-4" />
                            重置進度
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              confirmDelete(card)
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                            刪除
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* 新增/編輯字卡 Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCard ? "編輯字卡" : "新增字卡"}
            </DialogTitle>
            <DialogDescription>
              {editingCard ? "修改字卡內容" : "建立一張新的字卡"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>正面</Label>
              <Textarea
                value={front}
                onChange={(e) => setFront(e.target.value)}
                placeholder="例如：apple"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>背面</Label>
              <Textarea
                value={back}
                onChange={(e) => setBack(e.target.value)}
                placeholder="例如：蘋果"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>備註（例句）</Label>
                {notes.trim() && deck?.back_lang && deck.back_lang !== "none" && (
                  <button
                    type="button"
                    onClick={() => handleSpeak(notes, deck.back_lang)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="例如：I eat an apple every day."
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "儲存中..." : "儲存"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 匯入 Dialog */}
      <FlashcardImport
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        deckId={deckId}
        onSuccess={() => {
          fetchCards()
        }}
      />

      {/* 刪除確認 Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確定要刪除嗎？</AlertDialogTitle>
            <AlertDialogDescription>
              刪除此字卡後將無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
