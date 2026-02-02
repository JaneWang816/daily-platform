// apps/learning/src/app/dashboard/flashcards/page.tsx
"use client"

import { useEffect, useState, useCallback } from "react"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@daily/ui"
import {
  Plus,
  Lightbulb,
  MoreVertical,
  Pencil,
  Trash2,
  ChevronRight,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react"

interface Deck {
  id: string
  title: string
  description: string | null
  front_lang: string | null
  back_lang: string | null
  user_id: string
  created_at: string | null
  card_count?: number
  due_count?: number
}

const LANGUAGES = [
  { value: "zh-TW", label: "中文" },
  { value: "en-US", label: "英文" },
  { value: "es-ES", label: "西班牙語" },
  { value: "ja-JP", label: "日文" },
  { value: "ko-KR", label: "韓文" },
  { value: "fr-FR", label: "法文" },
  { value: "de-DE", label: "德文" },
  { value: "none", label: "無語音" },
]

export default function FlashcardsPage() {
  const [decks, setDecks] = useState<Deck[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog 狀態
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deckToDelete, setDeckToDelete] = useState<Deck | null>(null)

  // 表單狀態
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [frontLang, setFrontLang] = useState("en-US")
  const [backLang, setBackLang] = useState("zh-TW")
  const [saving, setSaving] = useState(false)

  // 下拉選單狀態
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const fetchDecks = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from("decks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (data) {
      // 取得每個牌組的字卡數量和待複習數量
      const decksWithCount = await Promise.all(
        (data as Deck[]).map(async (deck) => {
          // 總字卡數
          const { count: cardCount } = await supabase
            .from("flashcards")
            .select("*", { count: "exact", head: true })
            .eq("deck_id", deck.id)

          // 待複習數（next_review_at <= now）
          const { count: dueCount } = await supabase
            .from("flashcards")
            .select("*", { count: "exact", head: true })
            .eq("deck_id", deck.id)
            .lte("next_review_at", new Date().toISOString())

          return {
            ...deck,
            card_count: cardCount || 0,
            due_count: dueCount || 0,
          }
        })
      )
      setDecks(decksWithCount)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchDecks()
  }, [fetchDecks])

  const resetForm = () => {
    setTitle("")
    setDescription("")
    setFrontLang("en-US")
    setBackLang("zh-TW")
    setEditingDeck(null)
  }

  const openCreateDialog = () => {
    resetForm()
    setDialogOpen(true)
  }

  const openEditDialog = (deck: Deck) => {
    setEditingDeck(deck)
    setTitle(deck.title)
    setDescription(deck.description || "")
    setFrontLang(deck.front_lang || "en-US")
    setBackLang(deck.back_lang || "zh-TW")
    setDialogOpen(true)
    setOpenMenuId(null)
  }

  const handleSave = async () => {
    if (!title.trim()) {
      alert("請輸入牌組名稱")
      return
    }

    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSaving(false)
      return
    }

    if (editingDeck) {
      // 更新
      await (supabase.from("decks") as any)
        .update({
          title: title.trim(),
          description: description.trim() || null,
          front_lang: frontLang,
          back_lang: backLang,
        })
        .eq("id", editingDeck.id)
    } else {
      // 新增
      await (supabase.from("decks") as any)
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          front_lang: frontLang,
          back_lang: backLang,
        })
    }

    setSaving(false)
    setDialogOpen(false)
    resetForm()
    fetchDecks()
  }

  const handleDelete = async () => {
    if (!deckToDelete) return

    const supabase = createClient()
    await (supabase.from("decks") as any)
      .delete()
      .eq("id", deckToDelete.id)

    setDeleteDialogOpen(false)
    setDeckToDelete(null)
    fetchDecks()
  }

  const confirmDelete = (deck: Deck) => {
    setDeckToDelete(deck)
    setDeleteDialogOpen(true)
    setOpenMenuId(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // 計算總待複習數
  const totalDueCount = decks.reduce((sum, deck) => sum + (deck.due_count || 0), 0)

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">字卡系統</h1>
          <p className="text-gray-600 mt-1">
            使用間隔重複法高效記憶
            {totalDueCount > 0 && (
              <span className="ml-2 text-amber-600">· {totalDueCount} 張待複習</span>
            )}
          </p>
        </div>
        <Button onClick={openCreateDialog} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" />
          新增牌組
        </Button>
      </div>

      {/* 牌組列表 */}
      {decks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
              <Lightbulb className="w-8 h-8 text-amber-500" />
            </div>
            <p className="text-gray-500 mb-4">還沒有任何牌組</p>
            <Button onClick={openCreateDialog} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              建立第一個牌組
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {decks.map((deck) => (
            <Card
              key={deck.id}
              className="hover:shadow-md transition-shadow relative group"
            >
              <Link href={`/dashboard/flashcards/${deck.id}`}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    {/* 圖標 */}
                    <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Lightbulb className="w-6 h-6 text-amber-600" />
                    </div>

                    {/* 內容 */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-800 truncate">
                        {deck.title}
                      </h3>
                      {deck.description && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                          {deck.description}
                        </p>
                      )}

                      {/* 統計 */}
                      <div className="flex items-center gap-3 mt-3 text-xs">
                        <span className="flex items-center gap-1 text-gray-500">
                          <CheckCircle className="w-3.5 h-3.5" />
                          {deck.card_count} 張
                        </span>
                        {(deck.due_count || 0) > 0 ? (
                          <span className="flex items-center gap-1 text-amber-600">
                            <Clock className="w-3.5 h-3.5" />
                            {deck.due_count} 待複習
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="w-3.5 h-3.5" />
                            已完成
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 箭頭 */}
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors" />
                  </div>
                </CardContent>
              </Link>

              {/* 更多選單按鈕 */}
              <div className="absolute top-3 right-3">
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setOpenMenuId(openMenuId === deck.id ? null : deck.id)
                  }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {openMenuId === deck.id && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setOpenMenuId(null)}
                    />
                    <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          openEditDialog(deck)
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Pencil className="w-4 h-4" />
                        編輯
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          confirmDelete(deck)
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
            </Card>
          ))}
        </div>
      )}

      {/* 新增/編輯 Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingDeck ? "編輯牌組" : "新增牌組"}
            </DialogTitle>
            <DialogDescription>
              {editingDeck ? "修改牌組資訊" : "建立一個新的字卡牌組"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>牌組名稱</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：TOEIC 單字、日文 N5..."
              />
            </div>

            <div className="space-y-2">
              <Label>描述（選填）</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="簡短描述這個牌組的內容..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>正面語言</Label>
                <Select value={frontLang} onValueChange={setFrontLang}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>背面語言</Label>
                <Select value={backLang} onValueChange={setBackLang}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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

      {/* 刪除確認 Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確定要刪除嗎？</AlertDialogTitle>
            <AlertDialogDescription>
              刪除「{deckToDelete?.title}」將會同時刪除所有字卡。此操作無法復原。
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
