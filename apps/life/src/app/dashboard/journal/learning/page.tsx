//apps/life/src/app/dashboard/journal/learning/page.tsx
"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { createClient } from "@daily/database/client"
import { 
  Button, Input, Card, CardContent, Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, Label, Textarea, AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@daily/ui"
import { cn } from "@daily/utils"
import { format } from "date-fns"
import { zhTW } from "date-fns/locale"
import { ArrowLeft, Plus, BookMarked, Calendar, Search, Pencil, Trash2, MoreVertical, Clock } from "lucide-react"

type JournalLearning = {
  id: string
  user_id: string
  date: string
  title: string | null
  content: string
  duration_minutes: number | null
  difficulty: number | null
  created_at: string | null
  updated_at: string | null
}

const DIFFICULTY_OPTIONS = [
  { value: 1, label: "很簡單", color: "text-green-600" },
  { value: 2, label: "簡單", color: "text-lime-600" },
  { value: 3, label: "適中", color: "text-yellow-600" },
  { value: 4, label: "困難", color: "text-orange-600" },
  { value: 5, label: "很難", color: "text-red-600" },
]

export default function JournalLearningPage() {
  const supabase = createClient()
  const [journals, setJournals] = useState<JournalLearning[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingJournal, setEditingJournal] = useState<JournalLearning | null>(null)
  const [formData, setFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    title: "",
    content: "",
    duration_minutes: "",
    difficulty: 3,
  })
  const [saving, setSaving] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingJournal, setDeletingJournal] = useState<JournalLearning | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const fetchJournals = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from("journals_learning")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
    if (data) setJournals(data as JournalLearning[])
    setLoading(false)
  }

  useEffect(() => { fetchJournals() }, [])

  const openDialog = (journal?: JournalLearning) => {
    if (journal) {
      setEditingJournal(journal)
      setFormData({
        date: journal.date,
        title: journal.title || "",
        content: journal.content,
        duration_minutes: journal.duration_minutes?.toString() || "",
        difficulty: journal.difficulty || 3,
      })
    } else {
      setEditingJournal(null)
      setFormData({ date: format(new Date(), "yyyy-MM-dd"), title: "", content: "", duration_minutes: "", difficulty: 3 })
    }
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.content.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const journalData = {
      date: formData.date,
      title: formData.title.trim() || null,
      content: formData.content.trim(),
      duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
      difficulty: formData.difficulty,
    }

    if (editingJournal) {
      await supabase.from("journals_learning").update(journalData as Record<string, unknown>).eq("id", editingJournal.id)
    } else {
      await supabase.from("journals_learning").insert({ ...journalData, user_id: user.id } as Record<string, unknown>)
    }
    setSaving(false)
    setDialogOpen(false)
    fetchJournals()
  }

  const handleDelete = async () => {
    if (!deletingJournal) return
    setDeleteLoading(true)
    await supabase.from("journals_learning").delete().eq("id", deletingJournal.id)
    setDeleteLoading(false)
    setDeleteDialogOpen(false)
    setDeletingJournal(null)
    fetchJournals()
  }

  const formatDate = (date: string) => format(new Date(date), "M月d日 EEEE", { locale: zhTW })
  const totalMinutes = journals.reduce((sum, j) => sum + (j.duration_minutes || 0), 0)
  const filteredJournals = journals.filter(j => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return j.content.toLowerCase().includes(query) || j.title?.toLowerCase().includes(query)
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
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
            <BookMarked className="w-7 h-7 text-purple-600" />學習日誌
          </h1>
          <p className="text-gray-600 mt-1">記錄學習內容與心得</p>
        </div>
        <Button onClick={() => openDialog()} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="w-4 h-4 mr-2" />新增日誌
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-purple-50 to-violet-50">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-purple-600">{journals.length}</p>
            <p className="text-sm text-gray-600">學習紀錄</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">{Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m</p>
            <p className="text-sm text-gray-600">累計學習</p>
          </CardContent>
        </Card>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input placeholder="搜尋日誌..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
      </div>

      {filteredJournals.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <BookMarked className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">{searchQuery ? "找不到符合的日誌" : "還沒有學習日誌"}</h3>
          {!searchQuery && <Button onClick={() => openDialog()} className="mt-4"><Plus className="w-4 h-4 mr-2" />記錄今天的學習</Button>}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredJournals.map((journal) => (
            <Card key={journal.id} className="group hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
                    <BookMarked className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm text-gray-500 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatDate(journal.date)}</span>
                      {journal.duration_minutes && <span className="text-xs px-2 py-0.5 bg-blue-100 rounded text-blue-700 flex items-center gap-1"><Clock className="w-3 h-3" />{journal.duration_minutes}分鐘</span>}
                      {journal.difficulty && <span className={cn("text-xs px-2 py-0.5 bg-gray-100 rounded", DIFFICULTY_OPTIONS.find(d => d.value === journal.difficulty)?.color)}>{DIFFICULTY_OPTIONS.find(d => d.value === journal.difficulty)?.label}</span>}
                    </div>
                    {journal.title && <h3 className="font-semibold text-gray-800 mb-1">{journal.title}</h3>}
                    <p className="text-gray-700 whitespace-pre-wrap line-clamp-3">{journal.content}</p>
                  </div>
                  <div className="relative shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDialog(journal)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => { setDeletingJournal(journal); setDeleteDialogOpen(true) }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingJournal ? "編輯學習日誌" : "新增學習日誌"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>日期</Label><Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} /></div>
            <div className="space-y-2"><Label>標題（選填）</Label><Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="學習主題..." /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>學習時長（分鐘）</Label><Input type="number" value={formData.duration_minutes} onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })} placeholder="60" /></div>
              <div className="space-y-2">
                <Label>難度</Label>
                <div className="flex gap-1">
                  {DIFFICULTY_OPTIONS.map((d) => (
                    <button key={d.value} type="button" onClick={() => setFormData({ ...formData, difficulty: d.value })} className={cn("flex-1 py-1 rounded border text-xs", formData.difficulty === d.value ? "border-purple-500 bg-purple-50" : "border-gray-200")}>{d.value}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-2"><Label>學習內容 *</Label><Textarea value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} placeholder="今天學了什麼..." rows={6} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSave} disabled={saving || !formData.content.trim()}>{saving ? "儲存中..." : "儲存"}</Button>
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
