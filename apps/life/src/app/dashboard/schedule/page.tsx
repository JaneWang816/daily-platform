//apps/life/src/app/dashboard/schedule/page.tsx
"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { createBrowserClient } from '@supabase/ssr'
import { 
  Button, Input, Card, CardContent, Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, Label, AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@daily/ui"
import { cn } from "@daily/utils"
import { Calendar, Plus, Trash2, Clock, ArrowLeft } from "lucide-react"

// ============================================
// 類型定義
// ============================================
type ScheduleSlot = {
  id: string
  user_id: string
  day_of_week: number
  slot_number: number
  subject_name: string
  teacher: string | null
  location: string | null
  note: string | null
}

// ============================================
// 常數
// ============================================
const SLOTS = [
  { slot: 1, start: "08:00", end: "08:50" },
  { slot: 2, start: "09:00", end: "09:50" },
  { slot: 3, start: "10:00", end: "10:50" },
  { slot: 4, start: "11:00", end: "11:50" },
  { slot: 5, start: "12:00", end: "12:50" },
  { slot: 6, start: "13:00", end: "13:50" },
  { slot: 7, start: "14:00", end: "14:50" },
  { slot: 8, start: "15:00", end: "15:50" },
  { slot: 9, start: "16:00", end: "16:50" },
  { slot: 10, start: "17:00", end: "17:50" },
]

const DAYS = [
  { day: 1, label: "週一" },
  { day: 2, label: "週二" },
  { day: 3, label: "週三" },
  { day: 4, label: "週四" },
  { day: 5, label: "週五" },
  { day: 6, label: "週六" },
  { day: 7, label: "週日" },
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
export default function SchedulePage() {
  const supabase = createClient()
  const [slots, setSlots] = useState<ScheduleSlot[]>([])
  const [loading, setLoading] = useState(true)

  // 編輯對話框
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSlot, setEditingSlot] = useState<Partial<ScheduleSlot> | null>(null)
  const [formData, setFormData] = useState({
    subject_name: "",
    teacher: "",
    location: "",
    note: "",
  })
  const [saving, setSaving] = useState(false)

  // 刪除確認
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingSlot, setDeletingSlot] = useState<ScheduleSlot | null>(null)

  // 載入資料
  const fetchSlots = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from("schedule_slots")
      .select("*")
      .eq("user_id", user.id)
      .order("day_of_week")
      .order("slot_number")

    setSlots((data || []) as ScheduleSlot[])
    setLoading(false)
  }

  useEffect(() => { fetchSlots() }, [])

  // 取得特定格子的課程
  const getSlot = (day: number, slot: number): ScheduleSlot | undefined => {
    return slots.find(s => s.day_of_week === day && s.slot_number === slot)
  }

  // 開啟編輯對話框
  const openDialog = (day: number, slot: number) => {
    const existing = getSlot(day, slot)
    if (existing) {
      setEditingSlot(existing)
      setFormData({
        subject_name: existing.subject_name,
        teacher: existing.teacher || "",
        location: existing.location || "",
        note: existing.note || "",
      })
    } else {
      setEditingSlot({ day_of_week: day, slot_number: slot })
      setFormData({
        subject_name: "",
        teacher: "",
        location: "",
        note: "",
      })
    }
    setDialogOpen(true)
  }

  // 儲存
  const handleSave = async () => {
    if (!formData.subject_name.trim() || !editingSlot) return

    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    if (editingSlot.id) {
      // 更新
      await supabase
        .from("schedule_slots")
        .update({
          subject_name: formData.subject_name.trim(),
          teacher: formData.teacher.trim() || null,
          location: formData.location.trim() || null,
          note: formData.note.trim() || null,
        })
        .eq("id", editingSlot.id)
    } else {
      // 新增
      await supabase
        .from("schedule_slots")
        .insert({
          user_id: user.id,
          day_of_week: editingSlot.day_of_week!,
          slot_number: editingSlot.slot_number!,
          subject_name: formData.subject_name.trim(),
          teacher: formData.teacher.trim() || null,
          location: formData.location.trim() || null,
          note: formData.note.trim() || null,
        })
    }

    setSaving(false)
    setDialogOpen(false)
    fetchSlots()
  }

  // 刪除
  const handleDelete = async () => {
    if (!deletingSlot) return

    await supabase
      .from("schedule_slots")
      .delete()
      .eq("id", deletingSlot.id)

    setDeleteDialogOpen(false)
    setDeletingSlot(null)
    fetchSlots()
  }

  // 開啟刪除確認
  const openDeleteDialog = (slot: ScheduleSlot) => {
    setDeletingSlot(slot)
    setDeleteDialogOpen(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 返回按鈕 */}
      <Link href="/dashboard">
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          返回總覽
        </Button>
      </Link>

      {/* 頁面標題 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Calendar className="w-7 h-7 text-blue-600" />
          課表管理
        </h1>
        <p className="text-gray-600 mt-1">點擊格子新增或編輯課程</p>
      </div>

      {/* 課表網格 */}
      <div className="bg-white rounded-lg shadow-sm border overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="p-3 text-left text-sm font-semibold text-gray-600 w-24">
                <Clock className="w-4 h-4 inline mr-1" />
                時間
              </th>
              {DAYS.map(day => (
                <th key={day.day} className="p-3 text-center text-sm font-semibold text-gray-600">
                  {day.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SLOTS.map(slot => (
              <tr key={slot.slot} className="border-b hover:bg-gray-50">
                {/* 時間欄 */}
                <td className="p-2 text-sm text-gray-500 border-r bg-gray-50">
                  <div className="font-medium">{slot.start}</div>
                  <div className="text-xs">{slot.end}</div>
                </td>

                {/* 各天欄位 */}
                {DAYS.map(day => {
                  const cellSlot = getSlot(day.day, slot.slot)
                  return (
                    <td key={day.day} className="p-1 border-r last:border-r-0 align-top">
                      {cellSlot ? (
                        <div
                          className="group relative p-2 bg-blue-50 border border-blue-200 rounded-lg min-h-[60px] cursor-pointer hover:bg-blue-100 transition-colors"
                          onClick={() => openDialog(day.day, slot.slot)}
                        >
                          <div className="font-medium text-sm text-blue-800 truncate">
                            {cellSlot.subject_name}
                          </div>
                          {cellSlot.teacher && (
                            <div className="text-xs text-blue-600 truncate">
                              {cellSlot.teacher}
                            </div>
                          )}
                          {cellSlot.location && (
                            <div className="text-xs text-gray-500 truncate">
                              📍 {cellSlot.location}
                            </div>
                          )}

                          {/* 刪除按鈕 */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              openDeleteDialog(cellSlot)
                            }}
                            className="absolute top-1 right-1 p-1 rounded bg-red-100 text-red-600 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div
                          className="min-h-[60px] border border-dashed border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 hover:border-gray-300 transition-colors flex items-center justify-center"
                          onClick={() => openDialog(day.day, slot.slot)}
                        >
                          <Plus className="w-4 h-4 text-gray-300" />
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 統計 */}
      <div className="flex gap-4 text-sm text-gray-500">
        <span>共 {slots.length} 堂課</span>
        <span>|</span>
        <span>
          {DAYS.map(d => {
            const count = slots.filter(s => s.day_of_week === d.day).length
            return count > 0 ? `${d.label} ${count}堂` : null
          }).filter(Boolean).join("、") || "尚無課程"}
        </span>
      </div>

      {/* 編輯對話框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSlot?.id ? "編輯課程" : "新增課程"}
              {editingSlot && (
                <span className="text-sm font-normal text-gray-500 ml-2">
                  {DAYS.find(d => d.day === editingSlot.day_of_week)?.label}{" "}
                  {SLOTS.find(s => s.slot === editingSlot.slot_number)?.start}
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              填寫課程資訊，只有科目名稱為必填
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>科目名稱 *</Label>
              <Input
                value={formData.subject_name}
                onChange={(e) => setFormData({ ...formData, subject_name: e.target.value })}
                placeholder="例如：國文、數學"
              />
            </div>
            <div className="space-y-2">
              <Label>授課老師</Label>
              <Input
                value={formData.teacher}
                onChange={(e) => setFormData({ ...formData, teacher: e.target.value })}
                placeholder="選填"
              />
            </div>
            <div className="space-y-2">
              <Label>上課地點</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="例如：A101教室"
              />
            </div>
            <div className="space-y-2">
              <Label>備註</Label>
              <Input
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="選填"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.subject_name.trim() || saving}
              className="bg-blue-600 hover:bg-blue-700"
            >
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
              {deletingSlot && (
                <>
                  將刪除「{deletingSlot.subject_name}」
                  （{DAYS.find(d => d.day === deletingSlot.day_of_week)?.label}{" "}
                  {SLOTS.find(s => s.slot === deletingSlot.slot_number)?.start}）
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              確定刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
