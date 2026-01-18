//apps/life/src/app/dashboard/journal/reading/page.tsx
"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { createBrowserClient } from '@supabase/ssr'
import { 
  Button, Input, Card, CardContent, Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, Label, Textarea, Checkbox, AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@daily/ui"
import { cn } from "@daily/utils"
import { format } from "date-fns"
import { zhTW } from "date-fns/locale"
import { ArrowLeft, Plus, BookOpen, Calendar, Search, Pencil, Trash2, Star, BookCheck, User } from "lucide-react"

type JournalReading = {
  id: string
  user_id: string
  date: string
  book_title: string
  author: string | null
  current_page: number | null
  total_pages: number | null
  pages_read: number | null
  content: string | null
  rating: number | null
  is_finished: boolean | null
  created_at: string | null
  updated_at: string | null
}

function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export default function JournalReadingPage() {
  const supabase = createClient()
  const [journals, setJournals] = useState<JournalReading[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingJournal, setEditingJournal] = useState<JournalReading | null>(null)
  const [formData, setFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    book_title: "",
    author: "",
    current_page: "",
    total_pages: "",
    pages_read: "",
    content: "",
    rating: 0,
    is_finished: false,
  })
  const [saving, setSaving] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingJournal, setDeletingJournal] = useState<JournalReading | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const fetchJournals = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from("journals_reading")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
    if (data) setJournals(data as JournalReading[])
    setLoading(false)
  }

  useEffect(() => { fetchJournals() }, [])

  const openDialog = (journal?: JournalReading) => {
    if (journal) {
      setEditingJournal(journal)
      setFormData({
        date: journal.date,
        book_title: journal.book_title,
        author: journal.author || "",
        current_page: journal.current_page?.toString() || "",
        total_pages: journal.total_pages?.toString() || "",
        pages_read: journal.pages_read?.toString() || "",
        content: journal.content || "",
        rating: journal.rating || 0,
        is_finished: journal.is_finished || false,
      })
    } else {
      setEditingJournal(null)
      setFormData({
        date: format(new Date(), "yyyy-MM-dd"),
        book_title: "",
        author: "",
        current_page: "",
        total_pages: "",
        pages_read: "",
        content: "",
        rating: 0,
        is_finished: false,
      })
    }
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.book_title.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const journalData = {
      date: formData.date,
      book_title: formData.book_title.trim(),
      author: formData.author.trim() || null,
      current_page: formData.current_page ? parseInt(formData.current_page) : null,
      total_pages: formData.total_pages ? parseInt(formData.total_pages) : null,
      pages_read: formData.pages_read ? parseInt(formData.pages_read) : null,
      content: formData.content.trim() || null,
      rating: formData.rating || null,
      is_finished: formData.is_finished,
    }

    if (editingJournal) {
      await supabase.from("journals_reading").update(journalData as Record<string, unknown>).eq("id", editingJournal.id)
    } else {
      await supabase.from("journals_reading").insert({ ...journalData, user_id: user.id } as Record<string, unknown>)
    }
    setSaving(false)
    setDialogOpen(false)
    fetchJournals()
  }

  const handleDelete = async () => {
    if (!deletingJournal) return
    setDeleteLoading(true)
    await supabase.from("journals_reading").delete().eq("id", deletingJournal.id)
    setDeleteLoading(false)
    setDeleteDialogOpen(false)
    setDeletingJournal(null)
    fetchJournals()
  }

  const formatDate = (date: string) => format(new Date(date), "M月d日", { locale: zhTW })
  const getProgress = (current: number | null, total: number | null) => {
    if (!current || !total || total === 0) return null
    return Math.min(100, Math.round((current / total) * 100))
  }

  const booksFinished = journals.filter(j => j.is_finished).length
  const uniqueBooks = new Set(journals.map(j => j.book_title)).size

  const filteredJournals = journals.filter(j => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return j.book_title.toLowerCase().includes(query) || j.author?.toLowerCase().includes(query) || j.content?.toLowerCase().includes(query)
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link href="/dashboard/journal">
        <Button variant="ghost" size="sm" className="gap-2"><ArrowLeft className="w-4 h-4" />返回日誌</Button>
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-green-600" />閱讀日誌
          </h1>
          <p className="text-gray-600 mt-1">記錄讀書進度與感想</p>
        </div>
        <Button onClick={() => openDialog()} className="bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4 mr-2" />新增紀錄
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{journals.length}</p>
            <p className="text-sm text-gray-600">閱讀紀錄</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">{uniqueBooks}</p>
            <p className="text-sm text-gray-600">本書籍</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-amber-600">{booksFinished}</p>
            <p className="text-sm text-gray-600">已讀完</p>
          </CardContent>
        </Card>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input placeholder="搜尋書名、作者..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
      </div>

      {filteredJournals.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">{searchQuery ? "找不到符合的紀錄" : "還沒有閱讀紀錄"}</h3>
          {!searchQuery && <Button onClick={() => openDialog()} className="mt-4"><Plus className="w-4 h-4 mr-2" />記錄第一本書</Button>}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredJournals.map((journal) => {
            const progress = getProgress(journal.current_page, journal.total_pages)
            return (
              <Card key={journal.id} className="group hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", journal.is_finished ? "bg-green-100" : "bg-emerald-100")}>
                      {journal.is_finished ? <BookCheck className="w-5 h-5 text-green-600" /> : <BookOpen className="w-5 h-5 text-emerald-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-gray-800">{journal.book_title}</h3>
                        {journal.is_finished && <span className="text-xs px-2 py-0.5 bg-green-100 rounded text-green-700">已讀完</span>}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-500 mb-2 flex-wrap">
                        {journal.author && <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />{journal.author}</span>}
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatDate(journal.date)}</span>
                        {journal.rating && (
                          <span className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={cn("w-3.5 h-3.5", i < journal.rating! ? "text-yellow-500 fill-yellow-500" : "text-gray-300")} />
                            ))}
                          </span>
                        )}
                      </div>
                      {progress !== null && !journal.is_finished && (
                        <div className="mb-2">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>進度 {journal.current_page}/{journal.total_pages} 頁</span>
                            <span>{progress}%</span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 transition-all" style={{ width: `${progress}%` }} />
                          </div>
                        </div>
                      )}
                      {journal.content && <p className="text-gray-700 whitespace-pre-wrap line-clamp-2">{journal.content}</p>}
                    </div>
                    <div className="shrink-0 flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDialog(journal)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => { setDeletingJournal(journal); setDeleteDialogOpen(true) }}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingJournal ? "編輯閱讀紀錄" : "新增閱讀紀錄"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>日期</Label><Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} /></div>
            <div className="space-y-2"><Label>書名 *</Label><Input value={formData.book_title} onChange={(e) => setFormData({ ...formData, book_title: e.target.value })} placeholder="書籍名稱" /></div>
            <div className="space-y-2"><Label>作者</Label><Input value={formData.author} onChange={(e) => setFormData({ ...formData, author: e.target.value })} placeholder="作者名稱" /></div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-2"><Label>目前頁數</Label><Input type="number" value={formData.current_page} onChange={(e) => setFormData({ ...formData, current_page: e.target.value })} /></div>
              <div className="space-y-2"><Label>總頁數</Label><Input type="number" value={formData.total_pages} onChange={(e) => setFormData({ ...formData, total_pages: e.target.value })} /></div>
              <div className="space-y-2"><Label>今日讀</Label><Input type="number" value={formData.pages_read} onChange={(e) => setFormData({ ...formData, pages_read: e.target.value })} /></div>
            </div>
            <div className="space-y-2">
              <Label>評分</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} type="button" onClick={() => setFormData({ ...formData, rating: formData.rating === star ? 0 : star })}>
                    <Star className={cn("w-6 h-6", star <= formData.rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300")} />
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="is_finished" checked={formData.is_finished} onCheckedChange={(checked) => setFormData({ ...formData, is_finished: checked as boolean })} />
              <Label htmlFor="is_finished">已讀完這本書</Label>
            </div>
            <div className="space-y-2"><Label>心得</Label><Textarea value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} placeholder="閱讀感想..." rows={4} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSave} disabled={saving || !formData.book_title.trim()}>{saving ? "儲存中..." : "儲存"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>確定要刪除嗎？</AlertDialogTitle><AlertDialogDescription>刪除後無法復原。</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteLoading} className="bg-red-600 hover:bg-red-700">{deleteLoading ? "刪除中..." : "確定刪除"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
