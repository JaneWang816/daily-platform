//apps/life/src/app/dashboard/journal/gratitude/page.tsx
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
import { format, subDays } from "date-fns"
import { zhTW } from "date-fns/locale"
import {
  ArrowLeft,
  Plus,
  Heart,
  Calendar,
  Search,
  Pencil,
  Trash2,
  MoreVertical,
} from "lucide-react"

// ============================================
// 類型定義
// ============================================
type JournalGratitude = {
  id: string
  user_id: string
  date: string
  content: string
  created_at: string | null
  updated_at: string | null
}

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
export default function JournalGratitudePage() {
  const supabase = createClient()

  const [journals, setJournals] = useState<JournalGratitude[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  // 對話框狀態
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingJournal, setEditingJournal] = useState<JournalGratitude | null>(null)
  const [formData, setFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    content: "",
  })
  const [saving, setSaving] = useState(false)

  // 刪除狀態
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingJournal, setDeletingJournal] = useState<JournalGratitude | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // 載入日誌
  const fetchJournals = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from("journals_gratitude")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })

    if (data) {
      setJournals(data as JournalGratitude[])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchJournals()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 開啟新增/編輯對話框
  const openDialog = (journal?: JournalGratitude) => {
    if (journal) {
      setEditingJournal(journal)
      setFormData({
        date: journal.date,
        content: journal.content,
      })
    } else {
      setEditingJournal(null)
      setFormData({
        date: format(new Date(), "yyyy-MM-dd"),
        content: "",
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
      content: formData.content.trim(),
    }

    if (editingJournal) {
      await supabase
        .from("journals_gratitude")
        .update(journalData as Record<string, unknown>)
        .eq("id", editingJournal.id)
    } else {
      await supabase
        .from("journals_gratitude")
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

    await supabase.from("journals_gratitude").delete().eq("id", deletingJournal.id)

    setDeleteLoading(false)
    setDeleteDialogOpen(false)
    setDeletingJournal(null)
    fetchJournals()
  }

  // 格式化日期
  const formatDate = (date: string) => {
    return format(new Date(date), "M月d日 EEEE", { locale: zhTW })
  }

  // 計算連續天數
  const getStreak = (): number => {
    if (journals.length === 0) return 0
    
    let streak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let i = 0; i < journals.length; i++) {
      const journalDate = new Date(journals[i].date)
      journalDate.setHours(0, 0, 0, 0)
      const expectedDate = subDays(today, streak)

      if (journalDate.getTime() === expectedDate.getTime()) {
        streak++
      } else if (i === 0 && journalDate.getTime() === subDays(today, 1).getTime()) {
        // 如果今天還沒寫，但昨天有寫
        continue
      } else {
        break
      }
    }

    return streak
  }

  // 篩選日誌
  const filteredJournals = journals.filter(j => {
    if (!searchQuery) return true
    return j.content.toLowerCase().includes(searchQuery.toLowerCase())
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-rose-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const streak = getStreak()

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
            <Heart className="w-7 h-7 text-rose-600" />
            感恩日誌
          </h1>
          <p className="text-gray-600 mt-1">感謝生活中的美好</p>
        </div>
        <Button onClick={() => openDialog()} className="bg-rose-600 hover:bg-rose-700">
          <Plus className="w-4 h-4 mr-2" />
          新增日誌
        </Button>
      </div>

      {/* 統計 */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-rose-50 to-pink-50">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-rose-600">{journals.length}</p>
            <p className="text-sm text-gray-600">感恩紀錄</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-amber-600">
              {streak > 0 ? `🔥 ${streak}` : "0"}
            </p>
            <p className="text-sm text-gray-600">連續天數</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-violet-50">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-purple-700">
              每天記錄感恩的事 ✨
            </p>
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
          <Heart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">
            {searchQuery ? "找不到符合的日誌" : "還沒有感恩日誌"}
          </h3>
          {!searchQuery && (
            <Button onClick={() => openDialog()} className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              寫下今天感恩的事
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
            <DialogTitle>{editingJournal ? "編輯感恩日誌" : "新增感恩日誌"}</DialogTitle>
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
              <Label>今天感恩的事 *</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="1. 感謝...&#10;2. 感謝...&#10;3. 感謝..."
                rows={6}
              />
              <p className="text-xs text-gray-500">建議每天記錄 3 件感恩的事</p>
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
            <AlertDialogDescription>刪除後無法復原。</AlertDialogDescription>
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
  journal: JournalGratitude
  onEdit: () => void
  onDelete: () => void
  formatDate: (date: string) => string
}) {
  const [showMenu, setShowMenu] = useState(false)
  const lines = journal.content.split("\n").filter((line) => line.trim())

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* 愛心圖示 */}
          <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center shrink-0">
            <Heart className="w-5 h-5 text-rose-600 fill-rose-200" />
          </div>

          {/* 內容 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-gray-500 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {formatDate(journal.date)}
              </span>
            </div>

            <div className="space-y-1">
              {lines.map((line, index) => (
                <p key={index} className="text-gray-700 flex items-start gap-2">
                  <span className="text-rose-400">♡</span>
                  {line}
                </p>
              ))}
            </div>
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
