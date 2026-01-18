//apps/life/src/app/dashboard/journal/life/page.tsx
"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { createBrowserClient } from '@supabase/ssr'
import { 
  Button, 
  Input, 
  Card, 
  CardContent,
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  Label,
  Textarea,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@daily/ui"
import { cn } from "@daily/utils"
import { format } from "date-fns"
import { zhTW } from "date-fns/locale"
import {
  ArrowLeft,
  Plus,
  FileText,
  Calendar,
  Search,
  Pencil,
  Trash2,
  MoreVertical,
} from "lucide-react"

// ============================================
// 類型定義
// ============================================
type JournalLife = {
  id: string
  user_id: string
  date: string
  title: string | null
  content: string
  mood: number | null
  created_at: string | null
  updated_at: string | null
}

// ============================================
// 常數
// ============================================
const MOOD_OPTIONS: { value: number; label: string; emoji: string }[] = [
  { value: 1, label: "很差", emoji: "😢" },
  { value: 2, label: "不好", emoji: "😕" },
  { value: 3, label: "普通", emoji: "😐" },
  { value: 4, label: "不錯", emoji: "🙂" },
  { value: 5, label: "很好", emoji: "😄" },
]

// ============================================
// Supabase Client
// ============================================
function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// ============================================
// 主元件
// ============================================
export default function JournalLifePage() {
  const supabase = createClient()

  const [journals, setJournals] = useState<JournalLife[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  // 對話框狀態
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingJournal, setEditingJournal] = useState<JournalLife | null>(null)
  const [formData, setFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    title: "",
    content: "",
    mood: 3,
  })
  const [saving, setSaving] = useState(false)

  // 刪除狀態
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingJournal, setDeletingJournal] = useState<JournalLife | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // 載入日誌
  const fetchJournals = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from("journals_life")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })

    if (data) {
      setJournals(data as JournalLife[])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchJournals()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 開啟新增/編輯對話框
  const openDialog = (journal?: JournalLife) => {
    if (journal) {
      setEditingJournal(journal)
      setFormData({
        date: journal.date,
        title: journal.title || "",
        content: journal.content,
        mood: journal.mood || 3,
      })
    } else {
      setEditingJournal(null)
      setFormData({
        date: format(new Date(), "yyyy-MM-dd"),
        title: "",
        content: "",
        mood: 3,
      })
    }
    setDialogOpen(true)
  }

  // 儲存日誌
  const handleSave = async () => {
    if (!formData.content.trim()) return
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSaving(false)
      return
    }

    const journalData = {
      date: formData.date,
      title: formData.title.trim() || null,
      content: formData.content.trim(),
      mood: formData.mood,
    }

    if (editingJournal) {
      await supabase
        .from("journals_life")
        .update(journalData as Record<string, unknown>)
        .eq("id", editingJournal.id)
    } else {
      await supabase
        .from("journals_life")
        .insert({
          ...journalData,
          user_id: user.id,
        } as Record<string, unknown>)
    }

    setSaving(false)
    setDialogOpen(false)
    fetchJournals()
  }

  // 刪除日誌
  const handleDelete = async () => {
    if (!deletingJournal) return
    setDeleteLoading(true)

    await supabase.from("journals_life").delete().eq("id", deletingJournal.id)

    setDeleteLoading(false)
    setDeleteDialogOpen(false)
    setDeletingJournal(null)
    fetchJournals()
  }

  // 格式化日期
  const formatDate = (date: string) => {
    return format(new Date(date), "M月d日 EEEE", { locale: zhTW })
  }

  // 篩選日誌
  const filteredJournals = journals.filter(j => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      j.content.toLowerCase().includes(query) ||
      j.title?.toLowerCase().includes(query)
    )
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-pink-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 返回按鈕 */}
      <Link href="/dashboard/journal">
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          返回日誌
        </Button>
      </Link>

      {/* 頁面標題 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FileText className="w-7 h-7 text-pink-600" />
            生活日誌
          </h1>
          <p className="text-gray-600 mt-1">記錄每天的生活點滴</p>
        </div>
        <Button onClick={() => openDialog()} className="bg-pink-600 hover:bg-pink-700">
          <Plus className="w-4 h-4 mr-2" />
          新增日誌
        </Button>
      </div>

      {/* 統計 */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-pink-50 to-rose-50">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-pink-600">{journals.length}</p>
            <p className="text-sm text-gray-600">日誌總數</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-amber-600">
              {journals.filter(j => j.date === format(new Date(), "yyyy-MM-dd")).length > 0 ? "✓" : "—"}
            </p>
            <p className="text-sm text-gray-600">今日記錄</p>
          </CardContent>
        </Card>
      </div>

      {/* 搜尋 */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="搜尋日誌..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* 日誌列表 */}
      {filteredJournals.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">
            {searchQuery ? "找不到符合的日誌" : "還沒有日誌"}
          </h3>
          {!searchQuery && (
            <Button onClick={() => openDialog()} className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              寫下今天的日誌
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredJournals.map((journal) => (
            <JournalCard
              key={journal.id}
              journal={journal}
              onEdit={() => openDialog(journal)}
              onDelete={() => { setDeletingJournal(journal); setDeleteDialogOpen(true) }}
              formatDate={formatDate}
            />
          ))}
        </div>
      )}

      {/* 新增/編輯對話框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingJournal ? "編輯日誌" : "新增日誌"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>日期</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>標題（選填）</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="今天的主題..."
              />
            </div>
            <div className="space-y-2">
              <Label>心情</Label>
              <div className="flex gap-2">
                {MOOD_OPTIONS.map((mood) => (
                  <button
                    key={mood.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, mood: mood.value })}
                    className={cn(
                      "flex-1 py-2 rounded-lg border-2 text-center transition-all",
                      formData.mood === mood.value
                        ? "border-pink-500 bg-pink-50"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <div className="text-2xl">{mood.emoji}</div>
                    <div className="text-xs text-gray-500">{mood.label}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>內容 *</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="今天發生了什麼事..."
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSave} disabled={saving || !formData.content.trim()}>
              {saving ? "儲存中..." : "儲存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 刪除確認對話框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確定要刪除嗎？</AlertDialogTitle>
            <AlertDialogDescription>
              刪除後無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteLoading ? "刪除中..." : "確定刪除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ============================================
// JournalCard 子元件
// ============================================
function JournalCard({
  journal,
  onEdit,
  onDelete,
  formatDate,
}: {
  journal: JournalLife
  onEdit: () => void
  onDelete: () => void
  formatDate: (date: string) => string
}) {
  const [showMenu, setShowMenu] = useState(false)

  const getMoodEmoji = (mood: number | null) => {
    return MOOD_OPTIONS.find(m => m.value === mood)?.emoji || "😐"
  }

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* 心情圖示 */}
          <div className="text-3xl shrink-0">
            {getMoodEmoji(journal.mood)}
          </div>

          {/* 內容 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm text-gray-500 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {formatDate(journal.date)}
              </span>
              {journal.mood && (
                <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-600">
                  {MOOD_OPTIONS.find(m => m.value === journal.mood)?.label}
                </span>
              )}
            </div>
            {journal.title && (
              <h3 className="font-semibold text-gray-800 mb-1">{journal.title}</h3>
            )}
            <p className="text-gray-700 whitespace-pre-wrap line-clamp-3">
              {journal.content}
            </p>
          </div>

          {/* 選單 */}
          <div className="relative shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => setShowMenu(!showMenu)}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-8 z-20 w-32 bg-white rounded-md shadow-lg border py-1">
                  <button
                    className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => { setShowMenu(false); onEdit() }}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    編輯
                  </button>
                  <button
                    className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    onClick={() => { setShowMenu(false); onDelete() }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    刪除
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
