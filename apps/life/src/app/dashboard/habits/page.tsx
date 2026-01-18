"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { createBrowserClient } from '@supabase/ssr'
import { Button, Input, Dialog, DialogContent, DialogHeader, DialogTitle, Label } from "@daily/ui"
import { cn } from "@daily/utils"
import { format, startOfWeek, endOfWeek, subDays } from "date-fns"
import { zhTW } from "date-fns/locale"
import {
  ArrowLeft,
  Plus,
  Target,
  Calendar,
  Check,
  MoreHorizontal,
  Pencil,
  Trash2,
  Pause,
  Play,
  Flame,
} from "lucide-react"

// ============================================
// 類型定義（本地定義，避免外部類型問題）
// ============================================
type Habit = {
  id: string
  user_id: string
  title: string
  description: string | null
  icon: string | null
  color: string | null
  frequency: string | null
  target_days: number[] | null
  is_active: boolean | null
  created_at: string | null
  updated_at: string | null
}

type HabitLog = {
  id: string
  habit_id: string
  user_id: string
  date: string
  completed: boolean | null
  created_at: string | null
}

interface HabitWithStats extends Habit {
  weekLogs: Record<string, boolean>
  currentStreak: number
  totalCompleted: number
}

// ============================================
// 常數
// ============================================
const COLOR_OPTIONS = [
  { value: "blue", label: "藍色", class: "bg-blue-500" },
  { value: "green", label: "綠色", class: "bg-green-500" },
  { value: "red", label: "紅色", class: "bg-red-500" },
  { value: "purple", label: "紫色", class: "bg-purple-500" },
  { value: "orange", label: "橘色", class: "bg-orange-500" },
  { value: "cyan", label: "青色", class: "bg-cyan-500" },
  { value: "pink", label: "粉色", class: "bg-pink-500" },
  { value: "yellow", label: "黃色", class: "bg-yellow-500" },
]

const DAY_OPTIONS = [
  { value: 1, label: "一" },
  { value: 2, label: "二" },
  { value: 3, label: "三" },
  { value: 4, label: "四" },
  { value: 5, label: "五" },
  { value: 6, label: "六" },
  { value: 7, label: "日" },
]

// ============================================
// Supabase Client（無類型泛型）
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
export default function HabitsPage() {
  const supabase = createClient()

  const [habits, setHabits] = useState<HabitWithStats[]>([])
  const [loading, setLoading] = useState(true)

  // 編輯對話框
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingHabit, setEditingHabit] = useState<HabitWithStats | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    icon: "🎯",
    color: "blue",
    frequency: "daily" as "daily" | "weekly",
    target_days: [1, 2, 3, 4, 5, 6, 7] as number[],
  })
  const [saving, setSaving] = useState(false)

  // 刪除確認
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingHabit, setDeletingHabit] = useState<HabitWithStats | null>(null)

  // 選單狀態
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  // 本週日期
  const today = new Date()
  const weekStart = startOfWeek(today, { weekStartsOn: 1 })
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart)
    date.setDate(date.getDate() + i)
    return date
  })

  // 載入資料
  const fetchHabits = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: habitsDataRaw } = await supabase
      .from("habits")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })

    if (!habitsDataRaw) {
      setLoading(false)
      return
    }

    // 類型斷言
    const habitsData = habitsDataRaw as Habit[]

    const weekStartStr = format(weekStart, "yyyy-MM-dd")
    const weekEndStr = format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd")

    const { data: logsDataRaw } = await supabase
      .from("habit_logs")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", weekStartStr)
      .lte("date", weekEndStr)

    const { data: allLogsDataRaw } = await supabase
      .from("habit_logs")
      .select("habit_id, date")
      .eq("user_id", user.id)
      .eq("completed", true)
      .order("date", { ascending: false })

    // 類型斷言
    const logsData = (logsDataRaw ?? []) as HabitLog[]
    const allLogsData = (allLogsDataRaw ?? []) as { habit_id: string; date: string }[]

    const habitsWithStats: HabitWithStats[] = habitsData.map(habit => {
      const weekLogs: Record<string, boolean> = {}
      weekDates.forEach(date => {
        const dateStr = format(date, "yyyy-MM-dd")
        const log = logsData.find(l => l.habit_id === habit.id && l.date === dateStr)
        weekLogs[dateStr] = !!log?.completed
      })

      const habitLogs = allLogsData.filter(l => l.habit_id === habit.id)
      let currentStreak = 0
      const todayStr = format(today, "yyyy-MM-dd")

      let checkDate = new Date(today)
      for (let i = 0; i < 365; i++) {
        const checkDateStr = format(checkDate, "yyyy-MM-dd")
        const hasLog = habitLogs.some(l => l.date === checkDateStr)
        const dayOfWeek = checkDate.getDay() === 0 ? 7 : checkDate.getDay()
        const isTargetDay = habit.target_days?.includes(dayOfWeek) ?? false

        if (isTargetDay) {
          if (hasLog) {
            currentStreak++
          } else if (checkDateStr !== todayStr) {
            break
          }
        }
        checkDate = subDays(checkDate, 1)
      }

      return {
        ...habit,
        weekLogs,
        currentStreak,
        totalCompleted: habitLogs.length,
      }
    })

    setHabits(habitsWithStats)
    setLoading(false)
  }

  useEffect(() => {
    fetchHabits()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 打卡/取消打卡
  const toggleLog = async (habit: HabitWithStats, date: Date) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const dateStr = format(date, "yyyy-MM-dd")
    const hasLog = habit.weekLogs[dateStr]

    if (hasLog) {
      await supabase
        .from("habit_logs")
        .delete()
        .eq("habit_id", habit.id)
        .eq("date", dateStr)
    } else {
      await supabase
        .from("habit_logs")
        .insert({
          habit_id: habit.id,
          user_id: user.id,
          date: dateStr,
          completed: true,
        } as Record<string, unknown>)
    }

    fetchHabits()
  }

  // 開啟新增/編輯對話框
  const openDialog = (habit?: HabitWithStats) => {
    if (habit) {
      setEditingHabit(habit)
      setFormData({
        title: habit.title,
        description: habit.description ?? "",
        icon: habit.icon ?? "🎯",
        color: habit.color ?? "blue",
        frequency: (habit.frequency as "daily" | "weekly") ?? "daily",
        target_days: habit.target_days ?? [1, 2, 3, 4, 5, 6, 7],
      })
    } else {
      setEditingHabit(null)
      setFormData({
        title: "",
        description: "",
        icon: "🎯",
        color: "blue",
        frequency: "daily",
        target_days: [1, 2, 3, 4, 5, 6, 7],
      })
    }
    setDialogOpen(true)
  }

  // 儲存習慣
  const saveHabit = async () => {
    if (!formData.title.trim()) return
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSaving(false)
      return
    }

    const habitData = {
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      icon: formData.icon,
      color: formData.color,
      frequency: formData.frequency,
      target_days: formData.target_days,
    }

    if (editingHabit) {
      await supabase
        .from("habits")
        .update(habitData as Record<string, unknown>)
        .eq("id", editingHabit.id)
    } else {
      await supabase
        .from("habits")
        .insert({
          ...habitData,
          user_id: user.id,
          is_active: true,
        } as Record<string, unknown>)
    }

    setSaving(false)
    setDialogOpen(false)
    fetchHabits()
  }

  // 切換啟用狀態
  const toggleActive = async (habit: HabitWithStats) => {
    await supabase
      .from("habits")
      .update({ is_active: !habit.is_active } as Record<string, unknown>)
      .eq("id", habit.id)
    fetchHabits()
  }

  // 刪除習慣
  const deleteHabit = async () => {
    if (!deletingHabit) return

    await supabase.from("habit_logs").delete().eq("habit_id", deletingHabit.id)
    await supabase.from("habits").delete().eq("id", deletingHabit.id)

    setDeleteDialogOpen(false)
    setDeletingHabit(null)
    fetchHabits()
  }

  const openDeleteDialog = (habit: HabitWithStats) => {
    setDeletingHabit(habit)
    setDeleteDialogOpen(true)
  }

  const toggleDay = (day: number) => {
    const newDays = formData.target_days.includes(day)
      ? formData.target_days.filter(d => d !== day)
      : [...formData.target_days, day].sort()
    setFormData({ ...formData, target_days: newDays })
  }

  const getColorClass = (color: string | null) => {
    return COLOR_OPTIONS.find(c => c.value === color)?.class ?? "bg-blue-500"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const activeHabits = habits.filter(h => h.is_active)
  const pausedHabits = habits.filter(h => !h.is_active)

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Target className="w-7 h-7 text-cyan-600" />
            習慣管理
          </h1>
          <p className="text-gray-600 mt-1">養成好習慣，每天進步一點點</p>
        </div>
        <Button onClick={() => openDialog()} className="bg-cyan-600 hover:bg-cyan-700">
          <Plus className="w-4 h-4 mr-2" />
          新增習慣
        </Button>
      </div>

      {/* 本週概覽 */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-cyan-600" />
            本週打卡
          </h2>
          <span className="text-sm text-gray-500">
            {format(weekStart, "M/d", { locale: zhTW })} - {format(weekDates[6], "M/d", { locale: zhTW })}
          </span>
        </div>

        {activeHabits.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Target className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>還沒有建立習慣</p>
            <Button onClick={() => openDialog()} variant="outline" className="mt-3">
              <Plus className="w-4 h-4 mr-2" />
              建立第一個習慣
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr>
                  <th className="text-left p-2 text-sm font-medium text-gray-500 w-48">習慣</th>
                  {weekDates.map(date => {
                    const isToday = format(date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd")
                    return (
                      <th key={date.toISOString()} className="p-2 text-center">
                        <div className={`text-xs ${isToday ? "text-cyan-600 font-bold" : "text-gray-500"}`}>
                          {format(date, "EEE", { locale: zhTW })}
                        </div>
                        <div className={`text-sm ${isToday ? "text-cyan-600 font-bold" : "text-gray-700"}`}>
                          {format(date, "d")}
                        </div>
                      </th>
                    )
                  })}
                  <th className="p-2 text-center text-sm font-medium text-gray-500">
                    <Flame className="w-4 h-4 mx-auto" />
                  </th>
                  <th className="p-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {activeHabits.map(habit => (
                  <tr key={habit.id} className="border-t">
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{habit.icon ?? "🎯"}</span>
                        <div>
                          <div className="font-medium">{habit.title}</div>
                          {habit.description && (
                            <div className="text-xs text-gray-500">{habit.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    {weekDates.map(date => {
                      const dateStr = format(date, "yyyy-MM-dd")
                      const hasLog = habit.weekLogs[dateStr]
                      const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay()
                      const isTargetDay = habit.target_days?.includes(dayOfWeek) ?? false

                      return (
                        <td key={date.toISOString()} className="p-2 text-center">
                          {isTargetDay ? (
                            <button
                              onClick={() => toggleLog(habit, date)}
                              className={cn(
                                "w-8 h-8 rounded-full mx-auto flex items-center justify-center transition-all",
                                hasLog
                                  ? `${getColorClass(habit.color)} text-white`
                                  : "bg-gray-100 hover:bg-gray-200"
                              )}
                            >
                              {hasLog && <Check className="w-4 h-4" />}
                            </button>
                          ) : (
                            <div className="w-8 h-8 mx-auto" />
                          )}
                        </td>
                      )
                    })}
                    <td className="p-2 text-center">
                      <span className="text-orange-500 font-bold">{habit.currentStreak}</span>
                    </td>
                    <td className="p-2 relative">
                      <button
                        onClick={() => setOpenMenuId(openMenuId === habit.id ? null : habit.id)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <MoreHorizontal className="w-4 h-4 text-gray-400" />
                      </button>
                      {openMenuId === habit.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                          <div className="absolute right-0 top-8 bg-white border rounded-lg shadow-lg z-20 py-1 min-w-32">
                            <button
                              onClick={() => { openDialog(habit); setOpenMenuId(null) }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center"
                            >
                              <Pencil className="w-4 h-4 mr-2" />
                              編輯
                            </button>
                            <button
                              onClick={() => { toggleActive(habit); setOpenMenuId(null) }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center"
                            >
                              <Pause className="w-4 h-4 mr-2" />
                              暫停
                            </button>
                            <button
                              onClick={() => { openDeleteDialog(habit); setOpenMenuId(null) }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              刪除
                            </button>
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 統計卡片 */}
      {habits.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border p-4 text-center">
            <div className="text-3xl font-bold text-cyan-600">{activeHabits.length}</div>
            <div className="text-sm text-gray-500">進行中習慣</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-4 text-center">
            <div className="text-3xl font-bold text-green-600">
              {activeHabits.reduce((sum, h) => sum + Object.values(h.weekLogs).filter(Boolean).length, 0)}
            </div>
            <div className="text-sm text-gray-500">本週打卡次數</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-4 text-center">
            <div className="text-3xl font-bold text-orange-600">
              {Math.max(...activeHabits.map(h => h.currentStreak), 0)}
            </div>
            <div className="text-sm text-gray-500">最長連續天數</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-4 text-center">
            <div className="text-3xl font-bold text-purple-600">
              {habits.reduce((sum, h) => sum + h.totalCompleted, 0)}
            </div>
            <div className="text-sm text-gray-500">累計完成次數</div>
          </div>
        </div>
      )}

      {/* 已暫停的習慣 */}
      {pausedHabits.length > 0 && (
        <div className="bg-gray-50 rounded-lg border p-4">
          <h2 className="font-semibold text-gray-600 mb-3 flex items-center gap-2">
            <Pause className="w-4 h-4" />
            已暫停的習慣
          </h2>
          <div className="space-y-2">
            {pausedHabits.map(habit => (
              <div key={habit.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                <div className="flex items-center gap-2">
                  <span className="text-xl opacity-50">{habit.icon ?? "🎯"}</span>
                  <span className="text-gray-500">{habit.title}</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => toggleActive(habit)}>
                    <Play className="w-3 h-3 mr-1" />
                    恢復
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-500" onClick={() => openDeleteDialog(habit)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 新增/編輯對話框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingHabit ? "編輯習慣" : "新增習慣"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>習慣名稱</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="例如：早起運動"
              />
            </div>
            <div>
              <Label>說明（選填）</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="例如：每天早上 6:30 起床"
              />
            </div>
            <div>
              <Label>圖示</Label>
              <Input
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                placeholder="輸入 emoji"
              />
            </div>
            <div>
              <Label>顏色</Label>
              <div className="flex gap-2 mt-1">
                {COLOR_OPTIONS.map(color => (
                  <button
                    key={color.value}
                    onClick={() => setFormData({ ...formData, color: color.value })}
                    className={cn(
                      "w-8 h-8 rounded-full",
                      color.class,
                      formData.color === color.value && "ring-2 ring-offset-2 ring-gray-400"
                    )}
                  />
                ))}
              </div>
            </div>
            <div>
              <Label>執行日</Label>
              <div className="flex gap-2 mt-1">
                {DAY_OPTIONS.map(day => (
                  <button
                    key={day.value}
                    onClick={() => toggleDay(day.value)}
                    className={cn(
                      "w-10 h-10 rounded-lg border text-sm font-medium transition-colors",
                      formData.target_days.includes(day.value)
                        ? "bg-cyan-600 text-white border-cyan-600"
                        : "bg-white text-gray-600 hover:bg-gray-100"
                    )}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
              <Button onClick={saveHabit} disabled={saving || !formData.title.trim()}>
                {saving ? "儲存中..." : "儲存"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 刪除確認對話框 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>確認刪除</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600">
            確定要刪除習慣「{deletingHabit?.title}」嗎？相關的打卡記錄也會一併刪除。
          </p>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>取消</Button>
            <Button variant="destructive" onClick={deleteHabit}>刪除</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
