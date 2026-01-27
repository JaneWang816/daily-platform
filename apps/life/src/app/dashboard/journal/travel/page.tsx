//apps/life/src/app/dashboard/journal/travel/page.tsx
"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { createBrowserClient } from '@supabase/ssr'
import { 
  Button, Input, Card, CardContent, Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, Label, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@daily/ui"
import { cn } from "@daily/utils"
import { format } from "date-fns"
import { zhTW } from "date-fns/locale"
import { ArrowLeft, Plus, Compass, Calendar, Search, Pencil, Trash2, MapPin, Clock, Star } from "lucide-react"

type JournalTravel = {
  id: string
  user_id: string
  date: string
  title: string
  location: string
  duration_minutes: number | null
  content: string | null
  mood: number | null
  weather: string | null
  companions: string | null
  rating: number | null
  photos: string[] | null
  created_at: string | null
  updated_at: string | null
}

const MOOD_CONFIG: Record<number, { label: string; emoji: string }> = {
  1: { label: "很差", emoji: "😢" },
  2: { label: "不好", emoji: "😕" },
  3: { label: "普通", emoji: "😐" },
  4: { label: "不錯", emoji: "🙂" },
  5: { label: "很棒", emoji: "😄" },
}

const WEATHER_OPTIONS = ["☀️ 晴天", "⛅ 多雲", "☁️ 陰天", "🌧️ 雨天", "⛈️ 雷雨", "🌨️ 雪天", "🌫️ 霧"]
const COMPANION_OPTIONS = ["👤 獨自", "👨‍👩‍👧 家人", "👫 朋友", "💑 情侶", "👥 同學", "🏢 同事", "🎒 團體"]

// ============================================
// Supabase Client
// ============================================
function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export default function JournalTravelPage() {
  const supabase = createClient()
  const [journals, setJournals] = useState<JournalTravel[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingJournal, setEditingJournal] = useState<JournalTravel | null>(null)
  const [formData, setFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    title: "",
    location: "",
    duration_minutes: "",
    content: "",
    mood: 4,
    weather: "",
    companions: "",
    rating: 0,
  })
  const [saving, setSaving] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingJournal, setDeletingJournal] = useState<JournalTravel | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const fetchJournals = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from("journals_travel")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
    if (data) setJournals(data as JournalTravel[])
    setLoading(false)
  }

  useEffect(() => { fetchJournals() }, [])

  const openDialog = (journal?: JournalTravel) => {
    if (journal) {
      setEditingJournal(journal)
      setFormData({
        date: journal.date,
        title: journal.title,
        location: journal.location,
        duration_minutes: journal.duration_minutes?.toString() || "",
        content: journal.content || "",
        mood: journal.mood || 4,
        weather: journal.weather || "",
        companions: journal.companions || "",
        rating: journal.rating || 0,
      })
    } else {
      setEditingJournal(null)
      setFormData({
        date: format(new Date(), "yyyy-MM-dd"),
        title: "",
        location: "",
        duration_minutes: "",
        content: "",
        mood: 4,
        weather: "",
        companions: "",
        rating: 0,
      })
    }
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.location.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const journalData = {
      date: formData.date,
      title: formData.title.trim(),
      location: formData.location.trim(),
      duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
      content: formData.content.trim() || null,
      mood: formData.mood || null,
      weather: formData.weather || null,
      companions: formData.companions || null,
      rating: formData.rating || null,
    }

    if (editingJournal) {
      await supabase.from("journals_travel").update(journalData as Record<string, unknown>).eq("id", editingJournal.id)
    } else {
      await supabase.from("journals_travel").insert({ ...journalData, user_id: user.id } as Record<string, unknown>)
    }
    setSaving(false)
    setDialogOpen(false)
    fetchJournals()
  }

  const handleDelete = async () => {
    if (!deletingJournal) return
    setDeleteLoading(true)
    await supabase.from("journals_travel").delete().eq("id", deletingJournal.id)
    setDeleteLoading(false)
    setDeleteDialogOpen(false)
    setDeletingJournal(null)
    fetchJournals()
  }

  const formatDate = (date: string) => format(new Date(date), "M月d日 EEEE", { locale: zhTW })
  const formatDuration = (minutes: number | null) => {
    if (!minutes) return ""
    if (minutes < 60) return `${minutes}分鐘`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}小時${mins}分` : `${hours}小時`
  }

  const uniqueLocations = new Set(journals.map(j => j.location)).size

  const filteredJournals = journals.filter(j => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return j.title.toLowerCase().includes(query) || j.location.toLowerCase().includes(query) || j.content?.toLowerCase().includes(query)
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
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
            <Compass className="w-7 h-7 text-sky-600" />遊覽日誌
          </h1>
          <p className="text-gray-600 mt-1">記錄旅行與探索的足跡</p>
        </div>
        <Button onClick={() => openDialog()} className="bg-sky-600 hover:bg-sky-700">
          <Plus className="w-4 h-4 mr-2" />新增紀錄
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-sky-50 to-blue-50">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-sky-600">{journals.length}</p>
            <p className="text-sm text-gray-600">遊覽紀錄</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-teal-50 to-cyan-50">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-teal-600">{uniqueLocations}</p>
            <p className="text-sm text-gray-600">個地點</p>
          </CardContent>
        </Card>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input placeholder="搜尋地點、標題..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
      </div>

      {filteredJournals.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <Compass className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">{searchQuery ? "找不到符合的紀錄" : "還沒有遊覽紀錄"}</h3>
          {!searchQuery && <Button onClick={() => openDialog()} className="mt-4"><Plus className="w-4 h-4 mr-2" />記錄第一次探索</Button>}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredJournals.map((journal) => (
            <Card key={journal.id} className="group hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center shrink-0">
                    <Compass className="w-5 h-5 text-sky-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-gray-800">{journal.title}</h3>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDialog(journal)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => { setDeletingJournal(journal); setDeleteDialogOpen(true) }}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500 mb-2 flex-wrap">
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{journal.location}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatDate(journal.date)}</span>
                      {journal.duration_minutes && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{formatDuration(journal.duration_minutes)}</span>}
                    </div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {journal.weather && <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded">{journal.weather}</span>}
                      {journal.companions && <span className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded">{journal.companions}</span>}
                      {journal.mood && <span className="text-xs px-2 py-1 bg-yellow-50 text-yellow-700 rounded">{MOOD_CONFIG[journal.mood]?.emoji} {MOOD_CONFIG[journal.mood]?.label}</span>}
                      {journal.rating && <span className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded flex items-center gap-1"><Star className="w-3 h-3" />{journal.rating}/5</span>}
                    </div>
                    {journal.content && <p className="text-gray-700 whitespace-pre-wrap line-clamp-2">{journal.content}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingJournal ? "編輯遊覽紀錄" : "新增遊覽紀錄"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>日期</Label><Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} /></div>
            <div className="space-y-2"><Label>標題 *</Label><Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="這次旅程的主題" /></div>
            <div className="space-y-2"><Label>地點 *</Label><Input value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="去了哪裡" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>停留時間（分鐘）</Label><Input type="number" value={formData.duration_minutes} onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })} placeholder="120" /></div>
              <div className="space-y-2">
                <Label>天氣</Label>
                <Select value={formData.weather} onValueChange={(v) => setFormData({ ...formData, weather: v })}>
                  <SelectTrigger><SelectValue placeholder="選擇天氣" /></SelectTrigger>
                  <SelectContent>{WEATHER_OPTIONS.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>同行者</Label>
              <Select value={formData.companions} onValueChange={(v) => setFormData({ ...formData, companions: v })}>
                <SelectTrigger><SelectValue placeholder="選擇同行者" /></SelectTrigger>
                <SelectContent>{COMPANION_OPTIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>心情</Label>
              <div className="flex gap-2">
                {Object.entries(MOOD_CONFIG).map(([value, config]) => (
                  <button key={value} type="button" onClick={() => setFormData({ ...formData, mood: parseInt(value) })} className={cn("flex-1 py-2 rounded-lg border-2 text-center", formData.mood === parseInt(value) ? "border-sky-500 bg-sky-50" : "border-gray-200")}>
                    <div className="text-xl">{config.emoji}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>推薦度</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} type="button" onClick={() => setFormData({ ...formData, rating: formData.rating === star ? 0 : star })}>
                    <Star className={cn("w-6 h-6", star <= formData.rating ? "text-amber-500 fill-amber-500" : "text-gray-300")} />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2"><Label>心得</Label><Textarea value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} placeholder="這次旅程的感想..." rows={4} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSave} disabled={saving || !formData.title.trim() || !formData.location.trim()}>{saving ? "儲存中..." : "儲存"}</Button>
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
