//apps/life/src/app/dashboard/plans/page.tsx
"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import { createBrowserClient } from '@supabase/ssr'
import { 
  Button, Input, Card, CardContent, Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, Label, Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue, AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  Checkbox,
} from "@daily/ui"
import { cn } from "@daily/utils"
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, 
  addMonths, subMonths, parseISO, addDays, addWeeks, addYears, isBefore 
} from "date-fns"
import { zhTW } from "date-fns/locale"
import {
  ArrowLeft, Plus, CalendarClock, Clock, MapPin, Repeat, Pencil, Trash2,
  ChevronLeft, ChevronRight,
} from "lucide-react"

// ============================================
// 類型定義
// ============================================
type DailyPlan = {
  id: string
  user_id: string
  date: string
  title: string
  start_time: string | null
  end_time: string | null
  is_all_day: boolean
  location: string | null
  description: string | null
  color: string
  recurrence_type: string
  recurrence_end_date: string | null
  parent_id: string | null
  created_at: string
  updated_at: string
}

// ============================================
// 常數
// ============================================
const PLAN_COLORS = [
  { value: "blue", label: "藍色", bg: "bg-blue-500", light: "bg-blue-100", text: "text-blue-700", border: "border-blue-300" },
  { value: "red", label: "紅色", bg: "bg-red-500", light: "bg-red-100", text: "text-red-700", border: "border-red-300" },
  { value: "green", label: "綠色", bg: "bg-green-500", light: "bg-green-100", text: "text-green-700", border: "border-green-300" },
  { value: "yellow", label: "黃色", bg: "bg-yellow-500", light: "bg-yellow-100", text: "text-yellow-700", border: "border-yellow-300" },
  { value: "purple", label: "紫色", bg: "bg-purple-500", light: "bg-purple-100", text: "text-purple-700", border: "border-purple-300" },
  { value: "pink", label: "粉色", bg: "bg-pink-500", light: "bg-pink-100", text: "text-pink-700", border: "border-pink-300" },
  { value: "orange", label: "橘色", bg: "bg-orange-500", light: "bg-orange-100", text: "text-orange-700", border: "border-orange-300" },
  { value: "cyan", label: "青色", bg: "bg-cyan-500", light: "bg-cyan-100", text: "text-cyan-700", border: "border-cyan-300" },
]

const RECURRENCE_OPTIONS = [
  { value: "none", label: "不重複" },
  { value: "daily", label: "每天" },
  { value: "weekly", label: "每週" },
  { value: "monthly", label: "每月" },
  { value: "yearly", label: "每年" },
]

// 時間選項（每30分鐘）
const TIME_OPTIONS = (() => {
  const times: string[] = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      times.push(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`)
    }
  }
  return times
})()

const getPlanColor = (color: string) => PLAN_COLORS.find(c => c.value === color) || PLAN_COLORS[0]
const formatTime = (time: string | null) => time ? time.substring(0, 5) : ""

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
export default function PlansPage() {
  const supabase = createClient()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [plans, setPlans] = useState<DailyPlan[]>([])
  const [loading, setLoading] = useState(true)

  // 對話框
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState<Record<string, unknown>>({})
  const [saving, setSaving] = useState(false)

  // 刪除確認
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const selectedDateKey = format(selectedDate, "yyyy-MM-dd")

  // 載入當月行程
  const fetchPlans = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const start = format(startOfMonth(currentMonth), "yyyy-MM-dd")
    const end = format(endOfMonth(currentMonth), "yyyy-MM-dd")

    const { data } = await supabase
      .from("daily_plans")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", start)
      .lte("date", end)
      .order("date")
      .order("is_all_day", { ascending: false })
      .order("start_time")

    setPlans((data || []) as DailyPlan[])
    setLoading(false)
  }, [currentMonth, supabase])

  useEffect(() => { fetchPlans() }, [fetchPlans])

  // 日曆資料
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startDayOfWeek = monthStart.getDay()
  const prefixDays = Array(startDayOfWeek).fill(null)

  // 取得某天的行程
  const getPlansForDate = (date: Date) => {
    const dateKey = format(date, "yyyy-MM-dd")
    return plans.filter(p => p.date === dateKey)
  }

  // 選定日期的行程
  const selectedDayPlans = useMemo(() => getPlansForDate(selectedDate), [selectedDate, plans])

  // 開啟對話框
  const openDialog = (data?: DailyPlan) => {
    setFormData(data ? { ...data } : { color: "blue", recurrence_type: "none", is_all_day: false })
    setDialogOpen(true)
  }

  // 產生重複行程
  const generateRecurringPlans = async (basePlan: Record<string, unknown>, userId: string, startDate: Date) => {
    const recurrenceType = basePlan.recurrence_type as string
    if (!recurrenceType || recurrenceType === "none") return

    const endDate = basePlan.recurrence_end_date
      ? parseISO(basePlan.recurrence_end_date as string)
      : addYears(startDate, 1)

    const newPlans: Record<string, unknown>[] = []
    let currentDate = startDate

    const getNextDate = (date: Date): Date => {
      switch (recurrenceType) {
        case "daily": return addDays(date, 1)
        case "weekly": return addWeeks(date, 1)
        case "monthly": return addMonths(date, 1)
        case "yearly": return addYears(date, 1)
        default: return date
      }
    }

    let count = 0
    currentDate = getNextDate(currentDate)

    while (isBefore(currentDate, endDate) && count < 365) {
      newPlans.push({
        user_id: userId,
        date: format(currentDate, "yyyy-MM-dd"),
        title: basePlan.title,
        start_time: basePlan.start_time || null,
        end_time: basePlan.end_time || null,
        is_all_day: basePlan.is_all_day || false,
        location: basePlan.location || null,
        description: basePlan.description || null,
        color: basePlan.color || "blue",
        recurrence_type: recurrenceType,
        recurrence_end_date: basePlan.recurrence_end_date || null,
        parent_id: basePlan.id,
      })
      currentDate = getNextDate(currentDate)
      count++
    }

    if (newPlans.length > 0) {
      await supabase.from("daily_plans").insert(newPlans)
    }
  }

  // 儲存
  const handleSave = async () => {
    if (!formData.title) return
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    try {
      const isAllDay = formData.is_all_day as boolean
      const planData = {
        title: formData.title,
        start_time: isAllDay ? null : formData.start_time || null,
        end_time: isAllDay ? null : formData.end_time || null,
        is_all_day: isAllDay,
        location: formData.location || null,
        description: formData.description || null,
        color: formData.color || "blue",
        recurrence_type: formData.recurrence_type || "none",
        recurrence_end_date: formData.recurrence_end_date || null,
      }

      if (formData.id) {
        // 編輯
        await supabase.from("daily_plans").update(planData).eq("id", formData.id)
      } else {
        // 新增
        const { data: newPlan, error } = await supabase.from("daily_plans").insert({
          user_id: user.id,
          date: selectedDateKey,
          ...planData,
        }).select().single()

        // 產生重複行程
        if (!error && newPlan && formData.recurrence_type && formData.recurrence_type !== "none") {
          await generateRecurringPlans({ ...planData, id: newPlan.id }, user.id, selectedDate)
        }
      }

      setDialogOpen(false)
      fetchPlans()
    } catch (err) {
      console.error("儲存失敗:", err)
    } finally {
      setSaving(false)
    }
  }

  // 刪除
  const handleDelete = async () => {
    if (!deleteId) return
    setDeleteLoading(true)

    // 刪除該行程及其所有子行程
    await supabase.from("daily_plans").delete().eq("parent_id", deleteId)
    await supabase.from("daily_plans").delete().eq("id", deleteId)

    setDeleteLoading(false)
    setDeleteId(null)
    fetchPlans()
  }

  // 月份導航
  const goToPrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const goToToday = () => {
    setCurrentMonth(new Date())
    setSelectedDate(new Date())
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 返回按鈕 */}
      <div className="flex items-center justify-between">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            返回總覽
          </Button>
        </Link>
      </div>

      {/* 頁面標題 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">📅 每日行程</h1>
          <p className="text-gray-600 mt-1">規劃你的每日時間安排</p>
        </div>
        <Button onClick={() => openDialog()} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" />
          新增行程
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr] grid-cols-1">
        {/* 月曆 */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          {/* 月份導航 */}
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" onClick={goToPrevMonth}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <button onClick={goToToday} className="text-lg font-semibold text-gray-800 hover:text-indigo-600">
              {format(currentMonth, "yyyy 年 M 月", { locale: zhTW })}
            </button>
            <Button variant="ghost" size="icon" onClick={goToNextMonth}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          {/* 星期標題 */}
          <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {["日", "一", "二", "三", "四", "五", "六"].map((day) => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* 日期格子 */}
          <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {prefixDays.map((_, i) => (
              <div key={`prefix-${i}`} className="aspect-square" />
            ))}
            {calendarDays.map((day) => {
              const dayPlans = getPlansForDate(day)
              const isSelected = isSameDay(day, selectedDate)
              const isToday = isSameDay(day, new Date())

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "aspect-square p-1 rounded-lg border transition-all text-left",
                    isSelected ? "border-indigo-500 bg-indigo-50" : "border-transparent hover:bg-gray-50",
                    isToday && "ring-2 ring-indigo-300"
                  )}
                >
                  <div className={cn("text-sm font-medium", isToday ? "text-indigo-600" : "text-gray-700")}>
                    {format(day, "d")}
                  </div>
                  <div className="mt-0.5 space-y-0.5 overflow-hidden max-h-12">
                    {dayPlans.slice(0, 3).map((plan) => {
                      const color = getPlanColor(plan.color)
                      return (
                        <div key={plan.id} className={cn("text-xs truncate px-1 rounded", color.light, color.text)}>
                          {plan.title}
                        </div>
                      )
                    })}
                    {dayPlans.length > 3 && (
                      <div className="text-xs text-gray-400">+{dayPlans.length - 3} 更多</div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* 選定日期的行程列表 */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">
              {format(selectedDate, "M月d日 EEEE", { locale: zhTW })}
            </h3>
            <Button size="sm" onClick={() => openDialog()} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-3 h-3 mr-1" /> 新增
            </Button>
          </div>

          {selectedDayPlans.length === 0 ? (
            <div className="text-center py-12">
              <CalendarClock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-400">這天還沒有行程</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => openDialog()}>
                <Plus className="w-3 h-3 mr-1" /> 新增行程
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedDayPlans.map((plan) => {
                const color = getPlanColor(plan.color)
                return (
                  <div key={plan.id} className={cn("p-3 rounded-lg border", color.light, color.border)}>
                    <div className="flex items-start gap-3">
                      <div className={cn("w-1 h-full min-h-[40px] rounded-full shrink-0", color.bg)} />
                      <div className="flex-1 min-w-0">
                        <h4 className={cn("font-medium", color.text)}>{plan.title}</h4>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-1">
                          {plan.is_all_day ? (
                            <span>全天</span>
                          ) : plan.start_time && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTime(plan.start_time)}
                              {plan.end_time && ` - ${formatTime(plan.end_time)}`}
                            </span>
                          )}
                          {plan.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {plan.location}
                            </span>
                          )}
                          {plan.recurrence_type !== "none" && (
                            <span className="flex items-center gap-1">
                              <Repeat className="w-3 h-3" />
                              {RECURRENCE_OPTIONS.find(o => o.value === plan.recurrence_type)?.label}
                            </span>
                          )}
                        </div>
                        {plan.description && (
                          <p className="text-xs text-gray-400 mt-1 line-clamp-2">{plan.description}</p>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openDialog(plan)}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => setDeleteId(plan.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* 新增/編輯對話框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{formData.id ? "編輯行程" : "新增行程"}</DialogTitle>
            <DialogDescription>
              {format(selectedDate, "yyyy年M月d日 EEEE", { locale: zhTW })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 標題 */}
            <div className="space-y-2">
              <Label>標題 *</Label>
              <Input
                value={(formData.title as string) || ""}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="行程名稱"
              />
            </div>

            {/* 全天 */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="is_all_day"
                checked={(formData.is_all_day as boolean) || false}
                onCheckedChange={(checked) => setFormData({ ...formData, is_all_day: checked })}
              />
              <Label htmlFor="is_all_day" className="cursor-pointer">全天</Label>
            </div>

            {/* 時間選擇 */}
            {!formData.is_all_day && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>開始時間</Label>
                  <Select
                    value={(formData.start_time as string) || ""}
                    onValueChange={(v) => setFormData({ ...formData, start_time: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="選擇時間" /></SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>結束時間</Label>
                  <Select
                    value={(formData.end_time as string) || ""}
                    onValueChange={(v) => setFormData({ ...formData, end_time: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="選擇時間" /></SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* 地點 */}
            <div className="space-y-2">
              <Label>地點</Label>
              <Input
                value={(formData.location as string) || ""}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="選填"
              />
            </div>

            {/* 描述 */}
            <div className="space-y-2">
              <Label>備註</Label>
              <textarea
                value={(formData.description as string) || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="選填"
                rows={2}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {/* 顏色 */}
            <div className="space-y-2">
              <Label>顏色</Label>
              <div className="flex flex-wrap gap-2">
                {PLAN_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: color.value })}
                    className={cn(
                      "w-8 h-8 rounded-full transition-all",
                      color.bg,
                      formData.color === color.value ? "ring-2 ring-offset-2 ring-gray-400" : ""
                    )}
                    title={color.label}
                  />
                ))}
              </div>
            </div>

            {/* 重複 */}
            {!formData.id && (
              <>
                <div className="space-y-2">
                  <Label>重複</Label>
                  <Select
                    value={(formData.recurrence_type as string) || "none"}
                    onValueChange={(v) => setFormData({ ...formData, recurrence_type: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {RECURRENCE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.recurrence_type && formData.recurrence_type !== "none" && (
                  <div className="space-y-2">
                    <Label>重複結束日期</Label>
                    <Input
                      type="date"
                      value={(formData.recurrence_end_date as string) || ""}
                      onChange={(e) => setFormData({ ...formData, recurrence_end_date: e.target.value })}
                    />
                    <p className="text-xs text-gray-500">不填則預設重複一年</p>
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSave} disabled={saving || !formData.title}>
              {saving ? "儲存中..." : "儲存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 刪除確認對話框 */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確定要刪除嗎？</AlertDialogTitle>
            <AlertDialogDescription>
              刪除後無法復原。如果這是重複行程，相關的後續行程也會一併刪除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteLoading} className="bg-red-600 hover:bg-red-700">
              {deleteLoading ? "刪除中..." : "確定刪除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
