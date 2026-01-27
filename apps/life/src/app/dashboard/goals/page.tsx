//apps/life/src/app/dashboard/goals/page.tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { createClient } from "@daily/database/client"
import { 
  Button, 
  Input, 
  Card, 
  CardContent,
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
import { format, differenceInDays, parseISO, startOfDay, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns"
import {
  ArrowLeft,
  Plus,
  Target,
  Calendar,
  TrendingUp,
  TrendingDown,
  Flame,
  Pencil,
  Trash2,
  Pause,
  Play,
  CheckCircle,
  MoreVertical,
  BarChart3,
  Link as LinkIcon,
  RefreshCw,
} from "lucide-react"

// ============================================
// 類型定義
// ============================================
type Goal = {
  id: string
  user_id: string
  title: string
  description: string | null
  icon: string | null
  color: string | null
  goal_type: string | null  // countdown, numeric, streak, count
  target_date: string | null
  target_value: number | null
  target_count: number | null
  current_value: number | null
  current_count: number | null
  start_value: number | null
  unit: string | null
  direction: string | null  // increase, decrease
  status: string | null  // active, completed, paused
  show_on_dashboard: boolean | null
  sort_order: number | null
  started_at: string | null
  completed_at: string | null
  created_at: string | null
  updated_at: string | null
  // 追蹤來源
  track_source: string | null
  track_config: TrackConfig | null
}

type Habit = {
  id: string
  title: string
  icon: string | null
}

type TrackConfig = {
  habit_id?: string
  category_id?: string
  target_value?: number
  start_date?: string
}

type GoalType = "countdown" | "numeric" | "streak" | "count"
type FilterType = "all" | "active" | "completed" | "paused"
type TrackSource = "manual" | "habit" | "weight" | "finance_savings" | "finance_income" | "finance_expense" | "exercise_count" | "exercise_minutes" | "reading_books" | "water_days" | "sleep_days"

// ============================================
// 常數
// ============================================
const GOAL_TYPES = [
  { value: "countdown", label: "倒數計時", icon: Calendar, description: "距離某個日期的倒數" },
  { value: "numeric", label: "數值目標", icon: TrendingUp, description: "達成特定數值" },
  { value: "streak", label: "連續天數", icon: Flame, description: "連續完成某件事" },
  { value: "count", label: "累計次數", icon: Target, description: "累計達成次數" },
]

const TRACK_SOURCE_OPTIONS = [
  { value: "manual", label: "手動更新", goalTypes: ["countdown", "numeric", "streak", "count"], description: "自行更新進度" },
  { value: "habit", label: "習慣打卡", goalTypes: ["streak", "count"], description: "連結習慣自動計算" },
  { value: "weight", label: "體重記錄", goalTypes: ["numeric"], description: "取最新體重數值" },
  { value: "finance_savings", label: "累計儲蓄", goalTypes: ["numeric"], description: "收入 - 支出" },
  { value: "finance_income", label: "累計收入", goalTypes: ["numeric"], description: "累計收入金額" },
  { value: "finance_expense", label: "控制支出", goalTypes: ["numeric"], description: "累計支出金額" },
  { value: "exercise_count", label: "運動次數", goalTypes: ["count"], description: "累計運動次數" },
  { value: "exercise_minutes", label: "運動時間", goalTypes: ["count"], description: "累計運動分鐘" },
  { value: "reading_books", label: "讀完書籍", goalTypes: ["count"], description: "累計讀完書本數" },
  { value: "water_days", label: "飲水達標", goalTypes: ["count"], description: "飲水達標天數" },
  { value: "sleep_days", label: "睡眠達標", goalTypes: ["count"], description: "睡眠達標天數" },
]

const COLORS = [
  { value: "blue", label: "藍色", class: "bg-blue-500", border: "border-blue-200", bg: "bg-blue-50", text: "text-blue-600" },
  { value: "red", label: "紅色", class: "bg-red-500", border: "border-red-200", bg: "bg-red-50", text: "text-red-600" },
  { value: "green", label: "綠色", class: "bg-green-500", border: "border-green-200", bg: "bg-green-50", text: "text-green-600" },
  { value: "amber", label: "琥珀", class: "bg-amber-500", border: "border-amber-200", bg: "bg-amber-50", text: "text-amber-600" },
  { value: "purple", label: "紫色", class: "bg-purple-500", border: "border-purple-200", bg: "bg-purple-50", text: "text-purple-600" },
  { value: "pink", label: "粉紅", class: "bg-pink-500", border: "border-pink-200", bg: "bg-pink-50", text: "text-pink-600" },
  { value: "cyan", label: "青色", class: "bg-cyan-500", border: "border-cyan-200", bg: "bg-cyan-50", text: "text-cyan-600" },
]

const ICONS = ["🎯", "📚", "💪", "🏃", "💰", "📝", "🎓", "❤️", "🌟", "🔥", "✅", "📅", "🎉", "🏆", "💡", "🌱"]

// ============================================
// 工具函數
// ============================================
function getColorConfig(color: string | null) {
  return COLORS.find(c => c.value === color) || COLORS[0]
}

function calcProgress(goal: Goal): number {
  switch (goal.goal_type) {
    case "countdown":
      return 0 // 倒數型不顯示進度條
    case "numeric":
      if (!goal.target_value) return 0
      const start = goal.start_value ?? 0
      const current = goal.current_value ?? start
      const target = goal.target_value
      if (goal.direction === "decrease") {
        return Math.min(100, Math.max(0, ((start - current) / (start - target)) * 100))
      }
      return Math.min(100, Math.max(0, ((current - start) / (target - start)) * 100))
    case "streak":
    case "count":
      if (!goal.target_count) return 0
      return Math.min(100, ((goal.current_count ?? 0) / goal.target_count) * 100)
    default:
      return 0
  }
}

function getStatusText(goal: Goal): string {
  switch (goal.goal_type) {
    case "countdown":
      if (!goal.target_date) return "未設定日期"
      const days = differenceInDays(parseISO(goal.target_date), new Date())
      if (days < 0) return "已過期"
      if (days === 0) return "就是今天！"
      return `還有 ${days} 天`
    case "numeric":
      return `${goal.current_value ?? goal.start_value ?? 0} / ${goal.target_value ?? 0} ${goal.unit || ""}`
    case "streak":
      return `連續 ${goal.current_count ?? 0} 天`
    case "count":
      return `${goal.current_count ?? 0} / ${goal.target_count ?? 0} ${goal.unit || "次"}`
    default:
      return ""
  }
}

function getTrackSourceLabel(trackSource: string | null): string {
  if (!trackSource || trackSource === "manual") return ""
  const option = TRACK_SOURCE_OPTIONS.find(o => o.value === trackSource)
  return option?.label || ""
}

// ============================================
// GoalCard 組件
// ============================================
function GoalCard({ 
  goal, 
  onEdit, 
  onDelete, 
  onUpdateStatus,
  onUpdateProgress,
}: { 
  goal: Goal
  onEdit: (goal: Goal) => void
  onDelete: (goal: Goal) => void
  onUpdateStatus: (goal: Goal, status: string) => void
  onUpdateProgress: (goal: Goal) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const colors = getColorConfig(goal.color)
  const progress = calcProgress(goal)
  const isCompleted = goal.status === "completed"
  const isPaused = goal.status === "paused"
  const trackSourceLabel = getTrackSourceLabel(goal.track_source)

  return (
    <div className={cn(
      "relative p-4 rounded-xl border-2 transition-all",
      colors.bg, colors.border,
      isPaused && "opacity-60"
    )}>
      {/* 完成標記 */}
      {isCompleted && (
        <div className="absolute top-2 right-2">
          <CheckCircle className="w-5 h-5 text-green-500" />
        </div>
      )}

      {/* 標題列 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={cn("w-12 h-12 rounded-full flex items-center justify-center border", colors.bg, colors.border)}>
            <span className="text-2xl">{goal.icon || "🎯"}</span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">{goal.title}</h3>
            {goal.description && (
              <p className="text-sm text-gray-500 line-clamp-1">{goal.description}</p>
            )}
            {/* 追蹤來源標籤 */}
            {trackSourceLabel && (
              <div className="flex items-center gap-1 mt-1">
                <LinkIcon className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-400">{trackSourceLabel}</span>
              </div>
            )}
          </div>
        </div>

        {/* 操作選單 */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <MoreVertical className="w-4 h-4 text-gray-400" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-8 bg-white border rounded-lg shadow-lg z-20 py-1 min-w-32">
                <button
                  onClick={() => { onEdit(goal); setMenuOpen(false) }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                >
                  <Pencil className="w-4 h-4" />
                  編輯
                </button>
                {goal.status === "active" && (
                  <button
                    onClick={() => { onUpdateStatus(goal, "paused"); setMenuOpen(false) }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                  >
                    <Pause className="w-4 h-4" />
                    暫停
                  </button>
                )}
                {goal.status === "paused" && (
                  <button
                    onClick={() => { onUpdateStatus(goal, "active"); setMenuOpen(false) }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    恢復
                  </button>
                )}
                <button
                  onClick={() => { onDelete(goal); setMenuOpen(false) }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                  刪除
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 狀態顯示 */}
      <div className={cn("text-lg font-bold mb-2", colors.text)}>
        {getStatusText(goal)}
      </div>

      {/* 進度條（非倒數型） */}
      {goal.goal_type !== "countdown" && (
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
          <div 
            className={cn("h-full transition-all duration-500", colors.class)}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* 更新進度按鈕（只有手動更新的才顯示） */}
      {goal.status === "active" && goal.goal_type !== "countdown" && goal.track_source === "manual" && (
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full mt-2"
          onClick={() => onUpdateProgress(goal)}
        >
          更新進度
        </Button>
      )}

      {/* 狀態標籤 */}
      {(isCompleted || isPaused) && (
        <div className={cn(
          "absolute top-2 right-12 text-xs px-2 py-1 rounded-full",
          isCompleted ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
        )}>
          {isCompleted ? "已完成" : "已暫停"}
        </div>
      )}
    </div>
  )
}

// ============================================
// 主元件
// ============================================
export default function GoalsPage() {
  const supabase = createClient()

  const [goals, setGoals] = useState<Goal[]>([])
  const [habits, setHabits] = useState<Habit[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState<FilterType>("all")

  // 對話框狀態
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [progressDialogOpen, setProgressDialogOpen] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingGoal, setDeletingGoal] = useState<Goal | null>(null)

  // 表單狀態
  const [formData, setFormData] = useState({
    goalType: "countdown" as GoalType,
    title: "",
    description: "",
    icon: "🎯",
    color: "blue",
    targetDate: "",
    targetValue: "",
    currentValue: "",
    startValue: "",
    targetCount: "",
    unit: "",
    direction: "increase" as "increase" | "decrease",
    showOnDashboard: true,
    // 追蹤來源
    trackSource: "manual" as TrackSource,
    habitId: "",
    targetWaterMl: "2000",
    targetSleepHours: "7",
  })
  const [progressValue, setProgressValue] = useState("")

  // ============================================
  // 進度計算函數
  // ============================================
  const calcHabitStreak = useCallback(async (userId: string, habitId: string): Promise<number> => {
    const { data: logs } = await supabase
      .from("habit_logs")
      .select("date")
      .eq("user_id", userId)
      .eq("habit_id", habitId)
      .order("date", { ascending: false })
      .limit(365)

    if (!logs || logs.length === 0) return 0

    let streak = 0
    let currentDate = startOfDay(new Date())
    
    const todayStr = format(currentDate, "yyyy-MM-dd")
    const hasToday = logs.some(l => l.date === todayStr)
    if (!hasToday) {
      currentDate = subDays(currentDate, 1)
    }

    for (const log of logs) {
      const logDate = format(currentDate, "yyyy-MM-dd")
      if (log.date === logDate) {
        streak++
        currentDate = subDays(currentDate, 1)
      } else if (log.date < logDate) {
        break
      }
    }

    return streak
  }, [supabase])

  const calcHabitCount = useCallback(async (userId: string, habitId: string, startDate?: string): Promise<number> => {
    let query = supabase
      .from("habit_logs")
      .select("id", { count: "exact" })
      .eq("user_id", userId)
      .eq("habit_id", habitId)

    if (startDate) {
      query = query.gte("date", startDate)
    }

    const { count } = await query
    return count || 0
  }, [supabase])

  const getLatestWeight = useCallback(async (userId: string): Promise<number | null> => {
    const { data } = await supabase
      .from("health_metrics")
      .select("value_primary")
      .eq("user_id", userId)
      .eq("metric_type", "weight")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    return data?.value_primary || null
  }, [supabase])

  const calcFinance = useCallback(async (userId: string, type: "savings" | "income" | "expense", startDate?: string): Promise<number> => {
    let incomeQuery = supabase.from("finance_records").select("amount").eq("user_id", userId).eq("type", "income")
    let expenseQuery = supabase.from("finance_records").select("amount").eq("user_id", userId).eq("type", "expense")

    if (startDate) {
      incomeQuery = incomeQuery.gte("date", startDate)
      expenseQuery = expenseQuery.gte("date", startDate)
    }

    const [incomeResult, expenseResult] = await Promise.all([incomeQuery, expenseQuery])

    const totalIncome = incomeResult.data?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0
    const totalExpense = expenseResult.data?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0

    if (type === "income") return totalIncome
    if (type === "expense") return totalExpense
    return totalIncome - totalExpense
  }, [supabase])

  const calcExercise = useCallback(async (userId: string, metric: "count" | "minutes", startDate?: string): Promise<number> => {
    if (metric === "count") {
      let query = supabase.from("health_exercises").select("id", { count: "exact" }).eq("user_id", userId)
      if (startDate) query = query.gte("date", startDate)
      const { count } = await query
      return count || 0
    } else {
      let query = supabase.from("health_exercises").select("duration_minutes").eq("user_id", userId)
      if (startDate) query = query.gte("date", startDate)
      const { data } = await query
      return data?.reduce((sum, r) => sum + (r.duration_minutes || 0), 0) || 0
    }
  }, [supabase])

  const calcBooksFinished = useCallback(async (userId: string, startDate?: string): Promise<number> => {
    let query = supabase
      .from("journals_reading")
      .select("id", { count: "exact" })
      .eq("user_id", userId)
      .eq("is_finished", true)

    if (startDate) query = query.gte("date", startDate)

    const { count } = await query
    return count || 0
  }, [supabase])

  const calcHealthDays = useCallback(async (userId: string, metricType: "water" | "sleep", targetValue: number, startDate?: string): Promise<number> => {
    let query = supabase.from("health_metrics").select("date, value_primary").eq("user_id", userId).eq("metric_type", metricType)
    if (startDate) query = query.gte("date", startDate)

    const { data } = await query
    if (!data) return 0

    const dailyMax: Record<string, number> = {}
    data.forEach(r => {
      if (!dailyMax[r.date] || r.value_primary > dailyMax[r.date]) {
        dailyMax[r.date] = r.value_primary
      }
    })

    return Object.values(dailyMax).filter(v => v >= targetValue).length
  }, [supabase])

  // 計算單個目標的進度
  const calculateProgress = useCallback(async (goal: Goal, userId: string): Promise<{ currentValue?: number | null; currentCount?: number | null }> => {
    const config = (goal.track_config || {}) as TrackConfig
    const startDate = config.start_date || goal.started_at || undefined

    switch (goal.track_source) {
      case "habit":
        if (!config.habit_id) return {}
        if (goal.goal_type === "streak") {
          const streak = await calcHabitStreak(userId, config.habit_id)
          return { currentCount: streak }
        } else {
          const count = await calcHabitCount(userId, config.habit_id, startDate)
          return { currentCount: count }
        }

      case "weight":
        const weight = await getLatestWeight(userId)
        return { currentValue: weight }

      case "finance_savings":
        const savings = await calcFinance(userId, "savings", startDate)
        return { currentValue: savings }

      case "finance_income":
        const income = await calcFinance(userId, "income", startDate)
        return { currentValue: income }

      case "finance_expense":
        const expense = await calcFinance(userId, "expense", startDate)
        return { currentValue: expense }

      case "exercise_count":
        const exerciseCount = await calcExercise(userId, "count", startDate)
        return { currentCount: exerciseCount }

      case "exercise_minutes":
        const exerciseMinutes = await calcExercise(userId, "minutes", startDate)
        return { currentCount: exerciseMinutes }

      case "reading_books":
        const booksCount = await calcBooksFinished(userId, startDate)
        return { currentCount: booksCount }

      case "water_days":
        const waterDays = await calcHealthDays(userId, "water", config.target_value || 2000, startDate)
        return { currentCount: waterDays }

      case "sleep_days":
        const sleepDays = await calcHealthDays(userId, "sleep", config.target_value || 7, startDate)
        return { currentCount: sleepDays }

      default:
        return {}
    }
  }, [calcHabitStreak, calcHabitCount, getLatestWeight, calcFinance, calcExercise, calcBooksFinished, calcHealthDays])

  // 同步所有目標進度
  const syncGoalsProgress = useCallback(async (goalsToSync: Goal[], userId: string): Promise<Goal[]> => {
    const updatedGoals = await Promise.all(
      goalsToSync.map(async (goal) => {
        if (goal.track_source === "manual" || !goal.track_source) {
          return goal
        }

        const progress = await calculateProgress(goal, userId)
        
        if (progress.currentValue !== undefined || progress.currentCount !== undefined) {
          const updateData: Record<string, number | string | null> = {}
          
          if (progress.currentValue !== undefined) {
            updateData.current_value = progress.currentValue
          }
          if (progress.currentCount !== undefined) {
            updateData.current_count = progress.currentCount
          }

          // 檢查是否達成
          let isCompleted = false
          if (goal.goal_type === "numeric" && progress.currentValue !== null && progress.currentValue !== undefined) {
            if (goal.direction === "decrease" && progress.currentValue <= (goal.target_value || 0)) {
              isCompleted = true
            } else if (goal.direction === "increase" && progress.currentValue >= (goal.target_value || 0)) {
              isCompleted = true
            }
          } else if ((goal.goal_type === "streak" || goal.goal_type === "count") && progress.currentCount !== null && progress.currentCount !== undefined) {
            if (progress.currentCount >= (goal.target_count || 0)) {
              isCompleted = true
            }
          }

          if (isCompleted && goal.status === "active") {
            updateData.status = "completed"
            updateData.completed_at = new Date().toISOString()
          }

          await supabase.from("goals").update(updateData).eq("id", goal.id)

          return {
            ...goal,
            current_value: progress.currentValue ?? goal.current_value,
            current_count: progress.currentCount ?? goal.current_count,
            status: isCompleted ? "completed" : goal.status,
          } as Goal
        }

        return goal
      })
    )

    return updatedGoals
  }, [calculateProgress, supabase])

  // 載入目標
  const fetchGoals = async (shouldSync = false) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", user.id)
      .order("status", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })

    if (data) {
      let goalsData = data as Goal[]
      
      // 同步自動追蹤的目標進度
      if (shouldSync) {
        setSyncing(true)
        goalsData = await syncGoalsProgress(goalsData, user.id)
        setSyncing(false)
      }
      
      setGoals(goalsData)
    }
    setLoading(false)
  }

  // 載入習慣列表
  const fetchHabits = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from("habits")
      .select("id, title, icon")
      .eq("user_id", user.id)
      .order("title")

    if (data) {
      setHabits(data as Habit[])
    }
  }

  // 手動同步進度
  const handleSyncProgress = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setSyncing(true)
    const updatedGoals = await syncGoalsProgress(goals, user.id)
    setGoals(updatedGoals)
    setSyncing(false)
  }

  useEffect(() => {
    fetchGoals(true) // 初次載入時同步
    fetchHabits()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 開啟新增/編輯對話框
  const openDialog = (goal?: Goal) => {
    if (goal) {
      const config = (goal.track_config || {}) as TrackConfig
      setEditingGoal(goal)
      setFormData({
        goalType: (goal.goal_type as GoalType) || "countdown",
        title: goal.title,
        description: goal.description || "",
        icon: goal.icon || "🎯",
        color: goal.color || "blue",
        targetDate: goal.target_date || "",
        targetValue: goal.target_value?.toString() || "",
        currentValue: goal.current_value?.toString() || "",
        startValue: goal.start_value?.toString() || "",
        targetCount: goal.target_count?.toString() || "",
        unit: goal.unit || "",
        direction: (goal.direction as "increase" | "decrease") || "increase",
        showOnDashboard: goal.show_on_dashboard ?? true,
        trackSource: (goal.track_source as TrackSource) || "manual",
        habitId: config.habit_id || "",
        targetWaterMl: config.target_value?.toString() || "2000",
        targetSleepHours: config.target_value?.toString() || "7",
      })
    } else {
      setEditingGoal(null)
      setFormData({
        goalType: "countdown",
        title: "",
        description: "",
        icon: "🎯",
        color: "blue",
        targetDate: "",
        targetValue: "",
        currentValue: "",
        startValue: "",
        targetCount: "",
        unit: "",
        direction: "increase",
        showOnDashboard: true,
        trackSource: "manual",
        habitId: "",
        targetWaterMl: "2000",
        targetSleepHours: "7",
      })
    }
    setDialogOpen(true)
  }

  // 取得當前目標類型可用的追蹤來源
  const getAvailableTrackSources = () => {
    return TRACK_SOURCE_OPTIONS.filter(option => 
      option.goalTypes.includes(formData.goalType)
    )
  }

  // 儲存目標
  const handleSave = async () => {
    if (!formData.title.trim()) return
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSaving(false)
      return
    }

    const goalData: Record<string, unknown> = {
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      icon: formData.icon,
      color: formData.color,
      goal_type: formData.goalType,
      show_on_dashboard: formData.showOnDashboard,
      track_source: formData.trackSource,
    }

    // 建立追蹤設定
    const trackConfig: TrackConfig = {}
    if (formData.trackSource === "habit" && formData.habitId) {
      trackConfig.habit_id = formData.habitId
    }
    if (formData.trackSource === "water_days") {
      trackConfig.target_value = parseInt(formData.targetWaterMl) || 2000
    }
    if (formData.trackSource === "sleep_days") {
      trackConfig.target_value = parseInt(formData.targetSleepHours) || 7
    }
    if (Object.keys(trackConfig).length > 0) {
      goalData.track_config = trackConfig
    }

    switch (formData.goalType) {
      case "countdown":
        goalData.target_date = formData.targetDate || null
        break
      case "numeric":
        goalData.start_value = formData.startValue ? parseFloat(formData.startValue) : null
        goalData.target_value = formData.targetValue ? parseFloat(formData.targetValue) : null
        goalData.current_value = formData.currentValue ? parseFloat(formData.currentValue) : (formData.startValue ? parseFloat(formData.startValue) : null)
        goalData.unit = formData.unit || null
        goalData.direction = formData.direction
        break
      case "streak":
        goalData.target_count = formData.targetCount ? parseInt(formData.targetCount) : null
        goalData.current_count = editingGoal?.current_count ?? 0
        break
      case "count":
        goalData.target_count = formData.targetCount ? parseInt(formData.targetCount) : null
        goalData.current_count = editingGoal?.current_count ?? 0
        goalData.unit = formData.unit || "次"
        break
    }

    if (editingGoal) {
      await supabase
        .from("goals")
        .update(goalData)
        .eq("id", editingGoal.id)
    } else {
      await supabase
        .from("goals")
        .insert({
          ...goalData,
          user_id: user.id,
          status: "active",
          started_at: new Date().toISOString(),
        })
    }

    setSaving(false)
    setDialogOpen(false)
    fetchGoals(true) // 儲存後同步進度
  }

  // 更新狀態
  const handleUpdateStatus = async (goal: Goal, status: string) => {
    const updateData: Record<string, unknown> = { status }
    if (status === "completed") {
      updateData.completed_at = new Date().toISOString()
    }
    await supabase.from("goals").update(updateData).eq("id", goal.id)
    fetchGoals()
  }

  // 開啟進度對話框
  const openProgressDialog = (goal: Goal) => {
    setSelectedGoal(goal)
    setProgressValue("")
    setProgressDialogOpen(true)
  }

  // 更新進度
  const handleUpdateProgress = async () => {
    if (!selectedGoal || !progressValue) return
    setSaving(true)

    const value = parseFloat(progressValue)
    const updateData: Record<string, unknown> = {}

    if (selectedGoal.goal_type === "numeric") {
      updateData.current_value = value
      // 檢查是否達成目標
      if (selectedGoal.direction === "decrease" && value <= (selectedGoal.target_value || 0)) {
        updateData.status = "completed"
        updateData.completed_at = new Date().toISOString()
      } else if (selectedGoal.direction === "increase" && value >= (selectedGoal.target_value || 0)) {
        updateData.status = "completed"
        updateData.completed_at = new Date().toISOString()
      }
    } else {
      updateData.current_count = value
      if (value >= (selectedGoal.target_count || 0)) {
        updateData.status = "completed"
        updateData.completed_at = new Date().toISOString()
      }
    }

    await supabase.from("goals").update(updateData).eq("id", selectedGoal.id)

    setSaving(false)
    setProgressDialogOpen(false)
    fetchGoals()
  }

  // 刪除目標
  const handleDelete = async () => {
    if (!deletingGoal) return
    await supabase.from("goals").delete().eq("id", deletingGoal.id)
    setDeleteDialogOpen(false)
    setDeletingGoal(null)
    fetchGoals()
  }

  // 過濾目標
  const filteredGoals = goals.filter(goal => {
    if (filter === "all") return true
    return goal.status === filter
  })

  // 統計
  const stats = {
    total: goals.length,
    active: goals.filter(g => g.status === "active").length,
    completed: goals.filter(g => g.status === "completed").length,
    paused: goals.filter(g => g.status === "paused").length,
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
      {/* 標題列 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Target className="w-7 h-7 text-blue-600" />
              目標追蹤
            </h1>
            <p className="text-gray-600 mt-1">設定目標，追蹤進度</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleSyncProgress}
            disabled={syncing}
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", syncing && "animate-spin")} />
            {syncing ? "同步中..." : "同步進度"}
          </Button>
          <Button onClick={() => openDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            新增目標
          </Button>
        </div>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-gray-50 to-slate-50">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-gray-600">{stats.total}</p>
            <p className="text-sm text-gray-500">全部目標</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">{stats.active}</p>
            <p className="text-sm text-gray-500">進行中</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
            <p className="text-sm text-gray-500">已完成</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-gray-50 to-zinc-50">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-gray-400">{stats.paused}</p>
            <p className="text-sm text-gray-500">已暫停</p>
          </CardContent>
        </Card>
      </div>

      {/* 篩選按鈕 */}
      <div className="flex gap-2">
        {(["all", "active", "completed", "paused"] as FilterType[]).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f === "all" && "全部"}
            {f === "active" && "進行中"}
            {f === "completed" && "已完成"}
            {f === "paused" && "已暫停"}
          </Button>
        ))}
      </div>

      {/* 目標列表 */}
      {filteredGoals.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <Target className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">
            {filter === "all" ? "還沒有設定目標" : `沒有${filter === "active" ? "進行中" : filter === "completed" ? "已完成" : "已暫停"}的目標`}
          </h3>
          {filter === "all" && (
            <Button onClick={() => openDialog()} className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              建立目標
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGoals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={openDialog}
              onDelete={(g) => { setDeletingGoal(g); setDeleteDialogOpen(true) }}
              onUpdateStatus={handleUpdateStatus}
              onUpdateProgress={openProgressDialog}
            />
          ))}
        </div>
      )}

      {/* 新增/編輯對話框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingGoal ? "編輯目標" : "新增目標"}</DialogTitle>
            <DialogDescription>
              {editingGoal ? "修改目標設定" : "設定一個新的目標來追蹤進度"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 目標類型（新增時才能選） */}
            {!editingGoal && (
              <div className="space-y-2">
                <Label>目標類型 *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {GOAL_TYPES.map((type) => {
                    const Icon = type.icon
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setFormData({ 
                          ...formData, 
                          goalType: type.value as GoalType,
                          trackSource: "manual" // 切換類型時重設追蹤來源
                        })}
                        className={cn(
                          "p-3 rounded-lg border-2 text-left transition-all",
                          formData.goalType === type.value
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        )}
                      >
                        <Icon className="w-5 h-5 mb-1" />
                        <div className="font-medium text-sm">{type.label}</div>
                        <div className="text-xs text-gray-500">{type.description}</div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 資料來源選擇 */}
            {formData.goalType !== "countdown" && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <LinkIcon className="w-4 h-4" />
                  資料來源
                </Label>
                <Select
                  value={formData.trackSource}
                  onValueChange={(v) => setFormData({ ...formData, trackSource: v as TrackSource })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableTrackSources().map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div>
                          <div>{option.label}</div>
                          <div className="text-xs text-gray-500">{option.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* 習慣選擇（當資料來源是習慣時） */}
            {formData.trackSource === "habit" && (
              <div className="space-y-2">
                <Label>選擇習慣 *</Label>
                <Select
                  value={formData.habitId}
                  onValueChange={(v) => setFormData({ ...formData, habitId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="選擇要追蹤的習慣" />
                  </SelectTrigger>
                  <SelectContent>
                    {habits.length === 0 ? (
                      <SelectItem value="none" disabled>
                        尚未建立任何習慣
                      </SelectItem>
                    ) : (
                      habits.map((habit) => (
                        <SelectItem key={habit.id} value={habit.id}>
                          {habit.icon || "🎯"} {habit.title}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* 飲水達標設定 */}
            {formData.trackSource === "water_days" && (
              <div className="space-y-2">
                <Label>每日飲水目標 (ml)</Label>
                <Input
                  type="number"
                  value={formData.targetWaterMl}
                  onChange={(e) => setFormData({ ...formData, targetWaterMl: e.target.value })}
                  placeholder="2000"
                />
              </div>
            )}

            {/* 睡眠達標設定 */}
            {formData.trackSource === "sleep_days" && (
              <div className="space-y-2">
                <Label>每日睡眠目標 (小時)</Label>
                <Input
                  type="number"
                  value={formData.targetSleepHours}
                  onChange={(e) => setFormData({ ...formData, targetSleepHours: e.target.value })}
                  placeholder="7"
                />
              </div>
            )}

            {/* 基本資訊 */}
            <div className="space-y-2">
              <Label>目標名稱 *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="例如：減重 5 公斤"
              />
            </div>

            <div className="space-y-2">
              <Label>說明</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="選填"
                rows={2}
              />
            </div>

            {/* 圖示選擇 */}
            <div className="space-y-2">
              <Label>圖示</Label>
              <div className="flex flex-wrap gap-2">
                {ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setFormData({ ...formData, icon })}
                    className={cn(
                      "w-10 h-10 rounded-lg border-2 text-xl flex items-center justify-center",
                      formData.icon === icon ? "border-blue-500 bg-blue-50" : "border-gray-200"
                    )}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {/* 顏色選擇 */}
            <div className="space-y-2">
              <Label>顏色</Label>
              <div className="flex gap-2">
                {COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
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

            {/* 倒數型：目標日期 */}
            {formData.goalType === "countdown" && (
              <div className="space-y-2">
                <Label>目標日期 *</Label>
                <Input
                  type="date"
                  value={formData.targetDate}
                  onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                />
              </div>
            )}

            {/* 數值型 */}
            {formData.goalType === "numeric" && (
              <>
                <div className="space-y-2">
                  <Label>方向</Label>
                  <Select
                    value={formData.direction}
                    onValueChange={(v) => setFormData({ ...formData, direction: v as "increase" | "decrease" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="increase">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" /> 增加
                        </div>
                      </SelectItem>
                      <SelectItem value="decrease">
                        <div className="flex items-center gap-2">
                          <TrendingDown className="w-4 h-4" /> 減少
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>起始值</Label>
                    <Input
                      type="number"
                      value={formData.startValue}
                      onChange={(e) => setFormData({ ...formData, startValue: e.target.value })}
                      placeholder="例如：70"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>目標值 *</Label>
                    <Input
                      type="number"
                      value={formData.targetValue}
                      onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
                      placeholder="例如：65"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>單位</Label>
                  <Input
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="例如：公斤"
                  />
                </div>
              </>
            )}

            {/* 連續/累計型 */}
            {(formData.goalType === "streak" || formData.goalType === "count") && (
              <>
                <div className="space-y-2">
                  <Label>{formData.goalType === "streak" ? "目標天數" : "目標次數"} *</Label>
                  <Input
                    type="number"
                    value={formData.targetCount}
                    onChange={(e) => setFormData({ ...formData, targetCount: e.target.value })}
                    placeholder={formData.goalType === "streak" ? "例如：30" : "例如：100"}
                  />
                </div>
                {formData.goalType === "count" && (
                  <div className="space-y-2">
                    <Label>單位</Label>
                    <Input
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      placeholder="例如：本書"
                    />
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSave} disabled={saving || !formData.title.trim()}>
              {saving ? "儲存中..." : editingGoal ? "更新" : "建立目標"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 更新進度對話框 */}
      <Dialog open={progressDialogOpen} onOpenChange={setProgressDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>更新進度</DialogTitle>
            <DialogDescription>
              {selectedGoal?.icon} {selectedGoal?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-center text-sm text-gray-500">
              目前：{selectedGoal?.goal_type === "numeric" 
                ? `${selectedGoal?.current_value ?? selectedGoal?.start_value ?? 0} ${selectedGoal?.unit || ""}`
                : `${selectedGoal?.current_count ?? 0} ${selectedGoal?.unit || ""}`
              }
            </div>
            <div className="space-y-2">
              <Label>
                {selectedGoal?.goal_type === "numeric" 
                  ? `新數值（${selectedGoal?.unit || ""}）`
                  : `新次數`
                }
              </Label>
              <Input
                type="number"
                value={progressValue}
                onChange={(e) => setProgressValue(e.target.value)}
                placeholder="輸入新的數值"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProgressDialogOpen(false)}>取消</Button>
            <Button onClick={handleUpdateProgress} disabled={saving || !progressValue}>
              {saving ? "更新中..." : "更新"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 刪除確認對話框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除</AlertDialogTitle>
            <AlertDialogDescription>
              確定要刪除目標「{deletingGoal?.title}」嗎？此操作無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
