// apps/life/src/app/dashboard/day/[date]/page.tsx
"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { format, parseISO, getDay, addDays } from "date-fns"
import { zhTW } from "date-fns/locale"
import { createBrowserClient } from '@supabase/ssr'
import { Button } from "@daily/ui"
import { cn } from "@daily/utils"
import {
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Calendar, CheckSquare,
  FileText, GraduationCap, BookMarked, Heart, Wallet, Dumbbell, Activity,
  Target, CalendarClock, Compass, ArrowLeft, Clock, MapPin, Check, Plus,
  Pencil, Trash2, MoreVertical,
} from "lucide-react"

// 導入所有對話框
import {
  TaskDialog,
  DailyPlanDialog,
  JournalLifeDialog,
  JournalLearningDialog,
  JournalReadingDialog,
  JournalGratitudeDialog,
  JournalTravelDialog,
  FinanceDialog,
  ExerciseDialog,
  HealthDialog,
} from "@/components/dialogs"

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

type Task = {
  id: string
  user_id: string
  title: string
  description: string | null
  due_date: string | null
  is_important: boolean
  is_urgent: boolean
  completed_at: string | null
}

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
}

type Habit = {
  id: string
  user_id: string
  title: string
  description: string | null
  icon: string | null
  color: string | null
  target_days: number[] | null
  is_active: boolean | null
}

type HabitLog = {
  id: string
  habit_id: string
  user_id: string
  date: string
  completed: boolean
}

type HabitWithLog = Habit & { log?: HabitLog }

type JournalLife = {
  id: string
  user_id: string
  date: string
  title: string
  content: string | null
  mood: number | null
}

type JournalLearning = {
  id: string
  user_id: string
  date: string
  subject: string
  content: string | null
  duration_minutes: number | null
}

type JournalReading = {
  id: string
  user_id: string
  date: string
  book_title: string
  author: string | null
  pages_read: number | null
  content: string | null
  rating: number | null
  is_finished: boolean
}

type JournalGratitude = {
  id: string
  user_id: string
  date: string
  content: string
}

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
}

type FinanceRecord = {
  id: string
  user_id: string
  date: string
  type: "income" | "expense"
  category_id: string | null
  category: string
  amount: number
  description: string | null
}

type HealthExercise = {
  id: string
  user_id: string
  date: string
  exercise_type: string
  duration_minutes: number
  calories: number | null
  note: string | null
}

type HealthMetric = {
  id: string
  user_id: string
  date: string
  metric_type: string
  value_primary: number
  value_secondary: number | null
  note: string | null
}

// ============================================
// 常數
// ============================================
const MODULES = [
  { key: "schedule", icon: Calendar, label: "課表", color: "blue" },
  { key: "tasks", icon: CheckSquare, label: "任務", color: "amber" },
  { key: "habits", icon: Target, label: "習慣打卡", color: "cyan" },
  { key: "daily_plan", icon: CalendarClock, label: "每日行程", color: "indigo" },
  { key: "journal_life", icon: FileText, label: "生活日誌", color: "pink" },
  { key: "journal_learning", icon: GraduationCap, label: "學習日誌", color: "purple" },
  { key: "journal_reading", icon: BookMarked, label: "閱讀日誌", color: "green" },
  { key: "journal_gratitude", icon: Heart, label: "感恩日誌", color: "yellow" },
  { key: "journal_travel", icon: Compass, label: "遊覽日誌", color: "sky" },
  { key: "finance", icon: Wallet, label: "收支記錄", color: "emerald" },
  { key: "exercise", icon: Dumbbell, label: "運動記錄", color: "orange" },
  { key: "health", icon: Activity, label: "健康數據", color: "red" },
]

const colorMap: Record<string, { bg: string; border: string; text: string }> = {
  blue: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-600" },
  amber: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-600" },
  cyan: { bg: "bg-cyan-50", border: "border-cyan-200", text: "text-cyan-600" },
  indigo: { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-600" },
  pink: { bg: "bg-pink-50", border: "border-pink-200", text: "text-pink-600" },
  purple: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-600" },
  green: { bg: "bg-green-50", border: "border-green-200", text: "text-green-600" },
  yellow: { bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-600" },
  sky: { bg: "bg-sky-50", border: "border-sky-200", text: "text-sky-600" },
  emerald: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-600" },
  orange: { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-600" },
  red: { bg: "bg-red-50", border: "border-red-200", text: "text-red-600" },
}

const SLOT_TIMES: Record<number, { start: string; end: string }> = {
  1: { start: "08:00", end: "08:50" },
  2: { start: "09:00", end: "09:50" },
  3: { start: "10:00", end: "10:50" },
  4: { start: "11:00", end: "11:50" },
  5: { start: "12:00", end: "12:50" },
  6: { start: "13:00", end: "13:50" },
  7: { start: "14:00", end: "14:50" },
  8: { start: "15:00", end: "15:50" },
  9: { start: "16:00", end: "16:50" },
  10: { start: "17:00", end: "17:50" },
}

const MOOD_LABELS: Record<number, string> = {
  1: "😢 很差",
  2: "😕 不好",
  3: "😐 普通",
  4: "🙂 不錯",
  5: "😄 很棒",
}

const METRIC_TYPE_LABELS: Record<string, string> = {
  weight: "體重 (kg)",
  blood_pressure: "血壓",
  sleep: "睡眠 (小時)",
  water: "飲水 (ml)",
  steps: "步數",
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
export default function DayDetailPage() {
  const params = useParams()
  const router = useRouter()
  const dateStr = params.date as string
  
  const selectedDate = useMemo(() => parseISO(dateStr), [dateStr])
  const selectedDateKey = dateStr
  const dayOfWeek = useMemo(() => {
    const jsDay = getDay(selectedDate)
    return jsDay === 0 ? 7 : jsDay
  }, [selectedDate])

  const dateLabel = format(selectedDate, "M月d日", { locale: zhTW })

  // 展開狀態
  const [expandedModules, setExpandedModules] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [moduleLoading, setModuleLoading] = useState<string | null>(null)

  // 各模組資料
  const [scheduleSlots, setScheduleSlots] = useState<ScheduleSlot[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [habits, setHabits] = useState<HabitWithLog[]>([])
  const [dailyPlans, setDailyPlans] = useState<DailyPlan[]>([])
  const [journalLife, setJournalLife] = useState<JournalLife | null>(null)
  const [journalLearnings, setJournalLearnings] = useState<JournalLearning[]>([])
  const [journalReadings, setJournalReadings] = useState<JournalReading[]>([])
  const [journalGratitude, setJournalGratitude] = useState<JournalGratitude | null>(null)
  const [journalTravels, setJournalTravels] = useState<JournalTravel[]>([])
  const [financeRecords, setFinanceRecords] = useState<FinanceRecord[]>([])
  const [exercises, setExercises] = useState<HealthExercise[]>([])
  const [healthMetrics, setHealthMetrics] = useState<HealthMetric[]>([])

  // ============================================
  // 對話框狀態
  // ============================================
  // Task
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [taskFormData, setTaskFormData] = useState<Record<string, any>>({})
  const [taskSaving, setTaskSaving] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  // Daily Plan
  const [planDialogOpen, setPlanDialogOpen] = useState(false)
  const [planFormData, setPlanFormData] = useState<Record<string, any>>({})
  const [planSaving, setPlanSaving] = useState(false)
  const [editingPlan, setEditingPlan] = useState<DailyPlan | null>(null)

  // Journal Life
  const [journalLifeDialogOpen, setJournalLifeDialogOpen] = useState(false)
  const [journalLifeFormData, setJournalLifeFormData] = useState<Record<string, any>>({})
  const [journalLifeSaving, setJournalLifeSaving] = useState(false)

  // Journal Learning
  const [journalLearningDialogOpen, setJournalLearningDialogOpen] = useState(false)
  const [journalLearningFormData, setJournalLearningFormData] = useState<Record<string, any>>({})
  const [journalLearningSaving, setJournalLearningSaving] = useState(false)
  const [editingLearning, setEditingLearning] = useState<JournalLearning | null>(null)

  // Journal Reading
  const [journalReadingDialogOpen, setJournalReadingDialogOpen] = useState(false)
  const [journalReadingFormData, setJournalReadingFormData] = useState<Record<string, any>>({})
  const [journalReadingSaving, setJournalReadingSaving] = useState(false)
  const [editingReading, setEditingReading] = useState<JournalReading | null>(null)

  // Journal Gratitude
  const [journalGratitudeDialogOpen, setJournalGratitudeDialogOpen] = useState(false)
  const [journalGratitudeFormData, setJournalGratitudeFormData] = useState<Record<string, any>>({})
  const [journalGratitudeSaving, setJournalGratitudeSaving] = useState(false)

  // Journal Travel
  const [journalTravelDialogOpen, setJournalTravelDialogOpen] = useState(false)
  const [journalTravelFormData, setJournalTravelFormData] = useState<Record<string, any>>({})
  const [journalTravelPhotos, setJournalTravelPhotos] = useState<string[]>([])
  const [journalTravelSaving, setJournalTravelSaving] = useState(false)
  const [editingTravel, setEditingTravel] = useState<JournalTravel | null>(null)

  // Finance
  const [financeDialogOpen, setFinanceDialogOpen] = useState(false)
  const [financeFormData, setFinanceFormData] = useState<Record<string, any>>({ type: "expense" })
  const [financeSaving, setFinanceSaving] = useState(false)
  const [editingFinance, setEditingFinance] = useState<FinanceRecord | null>(null)

  // Exercise
  const [exerciseDialogOpen, setExerciseDialogOpen] = useState(false)
  const [exerciseFormData, setExerciseFormData] = useState<Record<string, any>>({})
  const [exerciseSaving, setExerciseSaving] = useState(false)
  const [editingExercise, setEditingExercise] = useState<HealthExercise | null>(null)

  // Health Metric
  const [healthDialogOpen, setHealthDialogOpen] = useState(false)
  const [healthFormData, setHealthFormData] = useState<Record<string, any>>({})
  const [healthSaving, setHealthSaving] = useState(false)
  const [editingHealth, setEditingHealth] = useState<HealthMetric | null>(null)

  // ============================================
  // 資料載入函數
  // ============================================
  const fetchSchedule = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from("schedule_slots")
      .select("*")
      .eq("user_id", user.id)
      .eq("day_of_week", dayOfWeek)
      .order("slot_number", { ascending: true })
    setScheduleSlots((data ?? []) as ScheduleSlot[])
  }, [dayOfWeek])

  const fetchTasks = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .eq("due_date", selectedDateKey)
      .order("is_important", { ascending: false })
    setTasks((data ?? []) as Task[])
  }, [selectedDateKey])

  const fetchHabits = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: rawHabitsData } = await supabase
      .from("habits")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)

    const habitsData = (rawHabitsData ?? []) as Habit[]

    if (habitsData.length === 0) {
      setHabits([])
      return
    }

    const { data: rawLogsData } = await supabase
      .from("habit_logs")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", selectedDateKey)

    const logsData = (rawLogsData ?? []) as HabitLog[]
    const logsMap = new Map(logsData.map(l => [l.habit_id, l]))

    const filteredHabits: HabitWithLog[] = habitsData
      .filter(h => h.target_days?.includes(dayOfWeek))
      .map(h => ({ ...h, log: logsMap.get(h.id) }))

    setHabits(filteredHabits)
  }, [selectedDateKey, dayOfWeek])

  const fetchDailyPlans = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from("daily_plans")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", selectedDateKey)
      .order("is_all_day", { ascending: false })
      .order("start_time", { ascending: true })
    setDailyPlans((data ?? []) as DailyPlan[])
  }, [selectedDateKey])

  const fetchJournalLife = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from("journals_life")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", selectedDateKey)
      .maybeSingle()
    setJournalLife(data as JournalLife | null)
  }, [selectedDateKey])

  const fetchJournalLearnings = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from("journals_learning")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", selectedDateKey)
      .order("created_at", { ascending: false })
    setJournalLearnings((data ?? []) as JournalLearning[])
  }, [selectedDateKey])

  const fetchJournalReadings = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from("journals_reading")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", selectedDateKey)
      .order("created_at", { ascending: false })
    setJournalReadings((data ?? []) as JournalReading[])
  }, [selectedDateKey])

  const fetchJournalGratitude = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from("journals_gratitude")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", selectedDateKey)
      .maybeSingle()
    setJournalGratitude(data as JournalGratitude | null)
  }, [selectedDateKey])

  const fetchJournalTravels = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from("journals_travel")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", selectedDateKey)
      .order("created_at", { ascending: false })
    setJournalTravels((data ?? []) as JournalTravel[])
  }, [selectedDateKey])

  const fetchFinance = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from("finance_records")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", selectedDateKey)
      .order("created_at", { ascending: false })
    setFinanceRecords((data ?? []) as FinanceRecord[])
  }, [selectedDateKey])

  const fetchExercises = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from("health_exercises")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", selectedDateKey)
      .order("created_at", { ascending: false })
    setExercises((data ?? []) as HealthExercise[])
  }, [selectedDateKey])

  const fetchHealthMetrics = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from("health_metrics")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", selectedDateKey)
      .order("created_at", { ascending: false })
    setHealthMetrics((data ?? []) as HealthMetric[])
  }, [selectedDateKey])

  // 載入模組資料
  const loadModuleData = useCallback(async (moduleKey: string) => {
    setModuleLoading(moduleKey)
    switch (moduleKey) {
      case "schedule": await fetchSchedule(); break
      case "tasks": await fetchTasks(); break
      case "habits": await fetchHabits(); break
      case "daily_plan": await fetchDailyPlans(); break
      case "journal_life": await fetchJournalLife(); break
      case "journal_learning": await fetchJournalLearnings(); break
      case "journal_reading": await fetchJournalReadings(); break
      case "journal_gratitude": await fetchJournalGratitude(); break
      case "journal_travel": await fetchJournalTravels(); break
      case "finance": await fetchFinance(); break
      case "exercise": await fetchExercises(); break
      case "health": await fetchHealthMetrics(); break
    }
    setModuleLoading(null)
  }, [
    fetchSchedule, fetchTasks, fetchHabits, fetchDailyPlans,
    fetchJournalLife, fetchJournalLearnings, fetchJournalReadings,
    fetchJournalGratitude, fetchJournalTravels, fetchFinance,
    fetchExercises, fetchHealthMetrics
  ])

  useEffect(() => {
    setLoading(false)
  }, [])

  // ============================================
  // 操作函數
  // ============================================
  const toggleModule = async (moduleKey: string) => {
    const isCurrentlyExpanded = expandedModules.includes(moduleKey)
    
    if (isCurrentlyExpanded) {
      setExpandedModules(prev => prev.filter(k => k !== moduleKey))
    } else {
      setExpandedModules(prev => [...prev, moduleKey])
      await loadModuleData(moduleKey)
    }
  }

  const toggleTaskComplete = async (task: Task) => {
    const supabase = createClient()
    const newCompletedAt = task.completed_at ? null : new Date().toISOString()
    await (supabase.from("tasks") as any).update({ completed_at: newCompletedAt }).eq("id", task.id)
    fetchTasks()
  }

  const toggleHabitLog = async (habit: HabitWithLog) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (habit.log) {
      await (supabase.from("habit_logs") as any).delete().eq("id", habit.log.id)
    } else {
      await (supabase.from("habit_logs") as any).insert({
        habit_id: habit.id,
        user_id: user.id,
        date: selectedDateKey,
        completed: true,
      })
    }
    fetchHabits()
  }

  const goToDate = (offset: number) => {
    const newDate = addDays(selectedDate, offset)
    router.push(`/dashboard/day/${format(newDate, "yyyy-MM-dd")}`)
  }

  // ============================================
  // 儲存函數
  // ============================================
  const handleSaveTask = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setTaskSaving(true)
    if (editingTask) {
      await (supabase.from("tasks") as any).update({
        title: taskFormData.title,
        description: taskFormData.description || null,
        is_important: taskFormData.is_important || false,
        is_urgent: taskFormData.is_urgent || false,
      }).eq("id", editingTask.id)
    } else {
      await (supabase.from("tasks") as any).insert({
        user_id: user.id,
        title: taskFormData.title,
        description: taskFormData.description || null,
        due_date: selectedDateKey,
        is_important: taskFormData.is_important || false,
        is_urgent: taskFormData.is_urgent || false,
      })
    }
    setTaskSaving(false)
    setTaskDialogOpen(false)
    setEditingTask(null)
    setTaskFormData({})
    fetchTasks()
  }

  const handleSavePlan = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setPlanSaving(true)
    if (editingPlan) {
      await (supabase.from("daily_plans") as any).update({
        title: planFormData.title,
        start_time: planFormData.start_time || null,
        end_time: planFormData.end_time || null,
        is_all_day: planFormData.is_all_day || false,
        location: planFormData.location || null,
        description: planFormData.description || null,
        color: planFormData.color || "indigo",
      }).eq("id", editingPlan.id)
    } else {
      await (supabase.from("daily_plans") as any).insert({
        user_id: user.id,
        date: selectedDateKey,
        title: planFormData.title,
        start_time: planFormData.start_time || null,
        end_time: planFormData.end_time || null,
        is_all_day: planFormData.is_all_day || false,
        location: planFormData.location || null,
        description: planFormData.description || null,
        color: planFormData.color || "indigo",
      })
    }
    setPlanSaving(false)
    setPlanDialogOpen(false)
    setEditingPlan(null)
    setPlanFormData({})
    fetchDailyPlans()
  }

  const handleSaveJournalLife = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setJournalLifeSaving(true)
    if (journalLife) {
      await (supabase.from("journals_life") as any).update({
        title: journalLifeFormData.title,
        content: journalLifeFormData.content || null,
        mood: journalLifeFormData.mood || null,
      }).eq("id", journalLife.id)
    } else {
      await (supabase.from("journals_life") as any).insert({
        user_id: user.id,
        date: selectedDateKey,
        title: journalLifeFormData.title,
        content: journalLifeFormData.content || null,
        mood: journalLifeFormData.mood || null,
      })
    }
    setJournalLifeSaving(false)
    setJournalLifeDialogOpen(false)
    setJournalLifeFormData({})
    fetchJournalLife()
  }

  const handleSaveJournalLearning = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setJournalLearningSaving(true)
    if (editingLearning) {
      await (supabase.from("journals_learning") as any).update({
        subject: journalLearningFormData.subject,
        content: journalLearningFormData.content || null,
        duration_minutes: journalLearningFormData.duration_minutes || null,
      }).eq("id", editingLearning.id)
    } else {
      await (supabase.from("journals_learning") as any).insert({
        user_id: user.id,
        date: selectedDateKey,
        subject: journalLearningFormData.subject,
        content: journalLearningFormData.content || null,
        duration_minutes: journalLearningFormData.duration_minutes || null,
      })
    }
    setJournalLearningSaving(false)
    setJournalLearningDialogOpen(false)
    setEditingLearning(null)
    setJournalLearningFormData({})
    fetchJournalLearnings()
  }

  const handleSaveJournalReading = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setJournalReadingSaving(true)
    if (editingReading) {
      await (supabase.from("journals_reading") as any).update({
        book_title: journalReadingFormData.book_title,
        author: journalReadingFormData.author || null,
        pages_read: journalReadingFormData.pages_read || null,
        content: journalReadingFormData.content || null,
        rating: journalReadingFormData.rating || null,
        is_finished: journalReadingFormData.is_finished || false,
      }).eq("id", editingReading.id)
    } else {
      await (supabase.from("journals_reading") as any).insert({
        user_id: user.id,
        date: selectedDateKey,
        book_title: journalReadingFormData.book_title,
        author: journalReadingFormData.author || null,
        pages_read: journalReadingFormData.pages_read || null,
        content: journalReadingFormData.content || null,
        rating: journalReadingFormData.rating || null,
        is_finished: journalReadingFormData.is_finished || false,
      })
    }
    setJournalReadingSaving(false)
    setJournalReadingDialogOpen(false)
    setEditingReading(null)
    setJournalReadingFormData({})
    fetchJournalReadings()
  }

  const handleSaveJournalGratitude = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !journalGratitudeFormData.content?.trim()) return

    setJournalGratitudeSaving(true)
    
    if (journalGratitude) {
      await (supabase.from("journals_gratitude") as any)
        .update({ content: journalGratitudeFormData.content })
        .eq("id", journalGratitude.id)
    } else {
      await (supabase.from("journals_gratitude") as any)
        .insert({
          user_id: user.id,
          date: selectedDateKey,
          content: journalGratitudeFormData.content,
        })
    }
    
    setJournalGratitudeSaving(false)
    setJournalGratitudeDialogOpen(false)
    setJournalGratitudeFormData({})
    fetchJournalGratitude()
  }

  const handleSaveJournalTravel = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setJournalTravelSaving(true)
    if (editingTravel) {
      await (supabase.from("journals_travel") as any).update({
        title: journalTravelFormData.title,
        location: journalTravelFormData.location,
        duration_minutes: journalTravelFormData.duration_minutes || null,
        content: journalTravelFormData.content || null,
        mood: journalTravelFormData.mood || null,
        weather: journalTravelFormData.weather || null,
        companions: journalTravelFormData.companions || null,
        rating: journalTravelFormData.rating || null,
        photos: journalTravelPhotos.length > 0 ? journalTravelPhotos : null,
      }).eq("id", editingTravel.id)
    } else {
      await (supabase.from("journals_travel") as any).insert({
        user_id: user.id,
        date: selectedDateKey,
        title: journalTravelFormData.title,
        location: journalTravelFormData.location,
        duration_minutes: journalTravelFormData.duration_minutes || null,
        content: journalTravelFormData.content || null,
        mood: journalTravelFormData.mood || null,
        weather: journalTravelFormData.weather || null,
        companions: journalTravelFormData.companions || null,
        rating: journalTravelFormData.rating || null,
        photos: journalTravelPhotos.length > 0 ? journalTravelPhotos : null,
      })
    }
    setJournalTravelSaving(false)
    setJournalTravelDialogOpen(false)
    setEditingTravel(null)
    setJournalTravelFormData({})
    setJournalTravelPhotos([])
    fetchJournalTravels()
  }

  const handleSaveFinance = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setFinanceSaving(true)
    if (editingFinance) {
      await (supabase.from("finance_records") as any).update({
        type: financeFormData.type,
        category_id: financeFormData.category_id || null,
        category: financeFormData.category || "",
        amount: Number(financeFormData.amount),
        description: financeFormData.description || null,
      }).eq("id", editingFinance.id)
    } else {
      await (supabase.from("finance_records") as any).insert({
        user_id: user.id,
        date: selectedDateKey,
        type: financeFormData.type || "expense",
        category_id: financeFormData.category_id || null,
        category: financeFormData.category || "",
        amount: Number(financeFormData.amount),
        description: financeFormData.description || null,
      })
    }
    setFinanceSaving(false)
    setFinanceDialogOpen(false)
    setEditingFinance(null)
    setFinanceFormData({ type: "expense" })
    fetchFinance()
  }

  const handleSaveExercise = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setExerciseSaving(true)
    if (editingExercise) {
      await (supabase.from("health_exercises") as any).update({
        exercise_type: exerciseFormData.exercise_type,
        duration_minutes: Number(exerciseFormData.duration_minutes),
        calories: exerciseFormData.calories ? Number(exerciseFormData.calories) : null,
        note: exerciseFormData.note || null,
      }).eq("id", editingExercise.id)
    } else {
      await (supabase.from("health_exercises") as any).insert({
        user_id: user.id,
        date: selectedDateKey,
        exercise_type: exerciseFormData.exercise_type,
        duration_minutes: Number(exerciseFormData.duration_minutes),
        calories: exerciseFormData.calories ? Number(exerciseFormData.calories) : null,
        note: exerciseFormData.note || null,
      })
    }
    setExerciseSaving(false)
    setExerciseDialogOpen(false)
    setEditingExercise(null)
    setExerciseFormData({})
    fetchExercises()
  }

  const handleSaveHealth = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setHealthSaving(true)
    if (editingHealth) {
      await (supabase.from("health_metrics") as any).update({
        metric_type: healthFormData.metric_type,
        value_primary: Number(healthFormData.value_primary),
        value_secondary: healthFormData.value_secondary ? Number(healthFormData.value_secondary) : null,
        note: healthFormData.note || null,
      }).eq("id", editingHealth.id)
    } else {
      await (supabase.from("health_metrics") as any).insert({
        user_id: user.id,
        date: selectedDateKey,
        metric_type: healthFormData.metric_type,
        value_primary: Number(healthFormData.value_primary),
        value_secondary: healthFormData.value_secondary ? Number(healthFormData.value_secondary) : null,
        note: healthFormData.note || null,
      })
    }
    setHealthSaving(false)
    setHealthDialogOpen(false)
    setEditingHealth(null)
    setHealthFormData({})
    fetchHealthMetrics()
  }

  // ============================================
  // 刪除函數
  // ============================================
  const handleDeleteTask = async (id: string) => {
    if (!confirm("確定要刪除這個任務嗎？")) return
    const supabase = createClient()
    await (supabase.from("tasks") as any).delete().eq("id", id)
    fetchTasks()
  }

  const handleDeletePlan = async (id: string) => {
    if (!confirm("確定要刪除這個行程嗎？")) return
    const supabase = createClient()
    await (supabase.from("daily_plans") as any).delete().eq("id", id)
    fetchDailyPlans()
  }

  const handleDeleteLearning = async (id: string) => {
    if (!confirm("確定要刪除這筆學習記錄嗎？")) return
    const supabase = createClient()
    await (supabase.from("journals_learning") as any).delete().eq("id", id)
    fetchJournalLearnings()
  }

  const handleDeleteReading = async (id: string) => {
    if (!confirm("確定要刪除這筆閱讀記錄嗎？")) return
    const supabase = createClient()
    await (supabase.from("journals_reading") as any).delete().eq("id", id)
    fetchJournalReadings()
  }

  const handleDeleteTravel = async (id: string) => {
    if (!confirm("確定要刪除這筆遊覽記錄嗎？")) return
    const supabase = createClient()
    await (supabase.from("journals_travel") as any).delete().eq("id", id)
    fetchJournalTravels()
  }

  const handleDeleteFinance = async (id: string) => {
    if (!confirm("確定要刪除這筆記錄嗎？")) return
    const supabase = createClient()
    await (supabase.from("finance_records") as any).delete().eq("id", id)
    fetchFinance()
  }

  const handleDeleteExercise = async (id: string) => {
    if (!confirm("確定要刪除這筆運動記錄嗎？")) return
    const supabase = createClient()
    await (supabase.from("health_exercises") as any).delete().eq("id", id)
    fetchExercises()
  }

  const handleDeleteHealth = async (id: string) => {
    if (!confirm("確定要刪除這筆健康數據嗎？")) return
    const supabase = createClient()
    await (supabase.from("health_metrics") as any).delete().eq("id", id)
    fetchHealthMetrics()
  }

  // ============================================
  // 開啟對話框函數
  // ============================================
  const openNewTaskDialog = () => {
    setEditingTask(null)
    setTaskFormData({})
    setTaskDialogOpen(true)
  }

  const openEditTaskDialog = (task: Task) => {
    setEditingTask(task)
    setTaskFormData({
      title: task.title,
      description: task.description,
      is_important: task.is_important,
      is_urgent: task.is_urgent,
    })
    setTaskDialogOpen(true)
  }

  const openNewPlanDialog = () => {
    setEditingPlan(null)
    setPlanFormData({})
    setPlanDialogOpen(true)
  }

  const openEditPlanDialog = (plan: DailyPlan) => {
    setEditingPlan(plan)
    setPlanFormData({
      title: plan.title,
      start_time: plan.start_time,
      end_time: plan.end_time,
      is_all_day: plan.is_all_day,
      location: plan.location,
      description: plan.description,
      color: plan.color,
    })
    setPlanDialogOpen(true)
  }

  const openJournalLifeDialog = () => {
    if (journalLife) {
      setJournalLifeFormData({
        title: journalLife.title,
        content: journalLife.content,
        mood: journalLife.mood,
      })
    } else {
      setJournalLifeFormData({})
    }
    setJournalLifeDialogOpen(true)
  }

  const openNewLearningDialog = () => {
    setEditingLearning(null)
    setJournalLearningFormData({})
    setJournalLearningDialogOpen(true)
  }

  const openEditLearningDialog = (learning: JournalLearning) => {
    setEditingLearning(learning)
    setJournalLearningFormData({
      subject: learning.subject,
      content: learning.content,
      duration_minutes: learning.duration_minutes,
    })
    setJournalLearningDialogOpen(true)
  }

  const openNewReadingDialog = () => {
    setEditingReading(null)
    setJournalReadingFormData({})
    setJournalReadingDialogOpen(true)
  }

  const openEditReadingDialog = (reading: JournalReading) => {
    setEditingReading(reading)
    setJournalReadingFormData({
      book_title: reading.book_title,
      author: reading.author,
      pages_read: reading.pages_read,
      content: reading.content,
      rating: reading.rating,
      is_finished: reading.is_finished,
    })
    setJournalReadingDialogOpen(true)
  }

  const openJournalGratitudeDialog = () => {
    if (journalGratitude) {
      setJournalGratitudeFormData({
        content: journalGratitude.content,
      })
    } else {
      setJournalGratitudeFormData({})
    }
    setJournalGratitudeDialogOpen(true)
  }

  const openNewTravelDialog = () => {
    setEditingTravel(null)
    setJournalTravelFormData({})
    setJournalTravelPhotos([])
    setJournalTravelDialogOpen(true)
  }

  const openEditTravelDialog = (travel: JournalTravel) => {
    setEditingTravel(travel)
    setJournalTravelFormData({
      title: travel.title,
      location: travel.location,
      duration_minutes: travel.duration_minutes,
      content: travel.content,
      mood: travel.mood,
      weather: travel.weather,
      companions: travel.companions,
      rating: travel.rating,
    })
    setJournalTravelPhotos(travel.photos || [])
    setJournalTravelDialogOpen(true)
  }

  const openNewFinanceDialog = () => {
    setEditingFinance(null)
    setFinanceFormData({ type: "expense" })
    setFinanceDialogOpen(true)
  }

  const openEditFinanceDialog = (record: FinanceRecord) => {
    setEditingFinance(record)
    setFinanceFormData({
      type: record.type,
      category_id: record.category_id,
      category: record.category,
      amount: record.amount,
      description: record.description,
    })
    setFinanceDialogOpen(true)
  }

  const openNewExerciseDialog = () => {
    setEditingExercise(null)
    setExerciseFormData({})
    setExerciseDialogOpen(true)
  }

  const openEditExerciseDialog = (exercise: HealthExercise) => {
    setEditingExercise(exercise)
    setExerciseFormData({
      exercise_type: exercise.exercise_type,
      duration_minutes: exercise.duration_minutes,
      calories: exercise.calories,
      note: exercise.note,
    })
    setExerciseDialogOpen(true)
  }

  const openNewHealthDialog = () => {
    setEditingHealth(null)
    setHealthFormData({})
    setHealthDialogOpen(true)
  }

  const openEditHealthDialog = (metric: HealthMetric) => {
    setEditingHealth(metric)
    setHealthFormData({
      metric_type: metric.metric_type,
      value_primary: metric.value_primary,
      value_secondary: metric.value_secondary,
      note: metric.note,
    })
    setHealthDialogOpen(true)
  }

  // ============================================
  // 渲染面板內容
  // ============================================
  const renderPanelContent = (moduleKey: string) => {
    const colors = colorMap[MODULES.find(m => m.key === moduleKey)?.color || "blue"]
    const isLoading = moduleLoading === moduleKey

    if (isLoading) {
      return (
        <div className={cn("p-4 flex justify-center", colors.bg)}>
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )
    }

    switch (moduleKey) {
      // ========== 課表 ==========
      case "schedule":
        return (
          <div className={cn("p-4", colors.bg)}>
            {scheduleSlots.length === 0 ? (
              <p className="text-center text-gray-500 py-4">這天沒有課程</p>
            ) : (
              <div className="space-y-2">
                {scheduleSlots.map(slot => (
                  <div key={slot.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                    <div className="flex items-center gap-1 text-sm text-gray-500 w-28 shrink-0">
                      <Clock className="w-3.5 h-3.5" />
                      {SLOT_TIMES[slot.slot_number]?.start} - {SLOT_TIMES[slot.slot_number]?.end}
                    </div>
                    <div className="flex-1 font-medium">{slot.subject_name}</div>
                    {slot.teacher && <span className="text-sm text-gray-500">{slot.teacher}</span>}
                    {slot.location && (
                      <span className="flex items-center gap-1 text-sm text-gray-500">
                        <MapPin className="w-3.5 h-3.5" />{slot.location}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 text-right">
              <Button variant="link" size="sm" onClick={() => router.push("/dashboard/schedule")}>
                管理課表 →
              </Button>
            </div>
          </div>
        )

      // ========== 任務 ==========
      case "tasks":
        return (
          <div className={cn("p-4", colors.bg)}>
            <div className="flex justify-end mb-3">
              <Button size="sm" onClick={openNewTaskDialog}>
                <Plus className="w-4 h-4 mr-1" /> 新增任務
              </Button>
            </div>
            {tasks.length === 0 ? (
              <p className="text-center text-gray-500 py-4">這天沒有任務</p>
            ) : (
              <div className="space-y-2">
                {tasks.map(task => (
                  <div key={task.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border group">
                    <button
                      onClick={() => toggleTaskComplete(task)}
                      className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center transition-colors shrink-0",
                        task.completed_at ? "bg-green-500 text-white" : "bg-gray-100 hover:bg-gray-200"
                      )}
                    >
                      {task.completed_at && <Check className="w-4 h-4" />}
                    </button>
                    <div className={cn("flex-1 min-w-0", task.completed_at && "line-through text-gray-400")}>
                      <span className="font-medium">{task.title}</span>
                      {(task.is_important || task.is_urgent) && (
                        <span className="ml-2 text-xs">
                          {task.is_important && <span className="text-red-500">重要</span>}
                          {task.is_important && task.is_urgent && " / "}
                          {task.is_urgent && <span className="text-orange-500">緊急</span>}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditTaskDialog(task)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDeleteTask(task.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )

      // ========== 習慣 ==========
      case "habits":
        return (
          <div className={cn("p-4", colors.bg)}>
            {habits.length === 0 ? (
              <p className="text-center text-gray-500 py-4">這天沒有需要執行的習慣</p>
            ) : (
              <div className="space-y-2">
                {habits.map(habit => (
                  <div key={habit.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                    <button
                      onClick={() => toggleHabitLog(habit)}
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                        habit.log ? "bg-cyan-500 text-white" : "bg-gray-100 hover:bg-gray-200"
                      )}
                    >
                      {habit.log ? <Check className="w-4 h-4" /> : null}
                    </button>
                    <span className="text-xl">{habit.icon}</span>
                    <span className="flex-1 font-medium">{habit.title}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 text-right">
              <Button variant="link" size="sm" onClick={() => router.push("/dashboard/habits")}>
                管理習慣 →
              </Button>
            </div>
          </div>
        )

      // ========== 每日行程 ==========
      case "daily_plan":
        return (
          <div className={cn("p-4", colors.bg)}>
            <div className="flex justify-end mb-3">
              <Button size="sm" onClick={openNewPlanDialog}>
                <Plus className="w-4 h-4 mr-1" /> 新增行程
              </Button>
            </div>
            {dailyPlans.length === 0 ? (
              <p className="text-center text-gray-500 py-4">這天沒有行程</p>
            ) : (
              <div className="space-y-2">
                {dailyPlans.map(plan => (
                  <div key={plan.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border group">
                    <div className={cn("w-1 h-10 rounded-full", `bg-${plan.color}-500`)} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{plan.title}</p>
                      {!plan.is_all_day && plan.start_time && (
                        <p className="text-sm text-gray-500">
                          {plan.start_time}{plan.end_time && ` - ${plan.end_time}`}
                        </p>
                      )}
                      {plan.is_all_day && <p className="text-sm text-gray-500">全天</p>}
                    </div>
                    {plan.location && (
                      <span className="flex items-center gap-1 text-sm text-gray-500">
                        <MapPin className="w-3.5 h-3.5" />{plan.location}
                      </span>
                    )}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditPlanDialog(plan)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDeletePlan(plan.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )

      // ========== 生活日誌 ==========
      case "journal_life":
        return (
          <div className={cn("p-4", colors.bg)}>
            <div className="flex justify-end mb-3">
              <Button size="sm" onClick={openJournalLifeDialog}>
                {journalLife ? <><Pencil className="w-4 h-4 mr-1" /> 編輯</> : <><Plus className="w-4 h-4 mr-1" /> 新增</>}
              </Button>
            </div>
            {!journalLife ? (
              <p className="text-center text-gray-500 py-4">還沒有寫今天的日誌</p>
            ) : (
              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{journalLife.title}</h4>
                  {journalLife.mood && <span className="text-lg">{MOOD_LABELS[journalLife.mood]?.split(" ")[0]}</span>}
                </div>
                {journalLife.content && <p className="text-gray-600 text-sm whitespace-pre-wrap">{journalLife.content}</p>}
              </div>
            )}
          </div>
        )

      // ========== 學習日誌 ==========
      case "journal_learning":
        return (
          <div className={cn("p-4", colors.bg)}>
            <div className="flex justify-end mb-3">
              <Button size="sm" onClick={openNewLearningDialog}>
                <Plus className="w-4 h-4 mr-1" /> 新增
              </Button>
            </div>
            {journalLearnings.length === 0 ? (
              <p className="text-center text-gray-500 py-4">還沒有學習記錄</p>
            ) : (
              <div className="space-y-2">
                {journalLearnings.map(learning => (
                  <div key={learning.id} className="bg-white rounded-lg border p-3 group">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{learning.subject}</span>
                      <div className="flex items-center gap-2">
                        {learning.duration_minutes && (
                          <span className="text-sm text-gray-500">{learning.duration_minutes} 分鐘</span>
                        )}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditLearningDialog(learning)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDeleteLearning(learning.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    {learning.content && <p className="text-sm text-gray-600 mt-1">{learning.content}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )

      // ========== 閱讀日誌 ==========
      case "journal_reading":
        return (
          <div className={cn("p-4", colors.bg)}>
            <div className="flex justify-end mb-3">
              <Button size="sm" onClick={openNewReadingDialog}>
                <Plus className="w-4 h-4 mr-1" /> 新增
              </Button>
            </div>
            {journalReadings.length === 0 ? (
              <p className="text-center text-gray-500 py-4">還沒有閱讀記錄</p>
            ) : (
              <div className="space-y-2">
                {journalReadings.map(reading => (
                  <div key={reading.id} className="bg-white rounded-lg border p-3 group">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">{reading.book_title}</span>
                        {reading.author && <span className="text-sm text-gray-500 ml-2">— {reading.author}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        {reading.is_finished && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">已讀完</span>}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditReadingDialog(reading)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDeleteReading(reading.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    {reading.pages_read && <p className="text-sm text-gray-500 mt-1">讀了 {reading.pages_read} 頁</p>}
                    {reading.content && <p className="text-sm text-gray-600 mt-1">{reading.content}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )

      // ========== 感恩日誌 ==========
      case "journal_gratitude":
        return (
          <div className={cn("p-4", colors.bg)}>
            <div className="flex justify-end mb-3">
              <Button size="sm" onClick={openJournalGratitudeDialog}>
                {journalGratitude ? <><Pencil className="w-4 h-4 mr-1" /> 編輯</> : <><Plus className="w-4 h-4 mr-1" /> 新增</>}
              </Button>
            </div>
            {!journalGratitude ? (
              <p className="text-center text-gray-500 py-4">還沒有寫今天的感恩日誌</p>
            ) : (
              <div className="bg-white rounded-lg border p-4">
                <p className="text-gray-700 whitespace-pre-wrap">{journalGratitude.content}</p>
              </div>
            )}
          </div>
        )
      // ========== 遊覽日誌 ==========
      case "journal_travel":
        return (
          <div className={cn("p-4", colors.bg)}>
            <div className="flex justify-end mb-3">
              <Button size="sm" onClick={openNewTravelDialog}>
                <Plus className="w-4 h-4 mr-1" /> 新增
              </Button>
            </div>
            {journalTravels.length === 0 ? (
              <p className="text-center text-gray-500 py-4">還沒有遊覽記錄</p>
            ) : (
              <div className="space-y-2">
                {journalTravels.map(travel => (
                  <div key={travel.id} className="bg-white rounded-lg border p-3 group">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">{travel.title}</span>
                        <span className="text-sm text-gray-500 ml-2 flex items-center gap-1 inline-flex">
                          <MapPin className="w-3.5 h-3.5" />{travel.location}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditTravelDialog(travel)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDeleteTravel(travel.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    {travel.content && <p className="text-sm text-gray-600 mt-1">{travel.content}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )

      // ========== 收支記錄 ==========
      case "finance":
        const totalIncome = financeRecords.filter(r => r.type === "income").reduce((sum, r) => sum + r.amount, 0)
        const totalExpense = financeRecords.filter(r => r.type === "expense").reduce((sum, r) => sum + r.amount, 0)
        return (
          <div className={cn("p-4", colors.bg)}>
            <div className="flex justify-between items-center mb-3">
              <div className="text-sm">
                <span className="text-green-600">收入 ${totalIncome}</span>
                <span className="mx-2">|</span>
                <span className="text-red-600">支出 ${totalExpense}</span>
              </div>
              <Button size="sm" onClick={openNewFinanceDialog}>
                <Plus className="w-4 h-4 mr-1" /> 新增
              </Button>
            </div>
            {financeRecords.length === 0 ? (
              <p className="text-center text-gray-500 py-4">還沒有收支記錄</p>
            ) : (
              <div className="space-y-2">
                {financeRecords.map(record => (
                  <div key={record.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border group">
                    <span className={cn(
                      "text-sm font-medium",
                      record.type === "income" ? "text-green-600" : "text-red-600"
                    )}>
                      {record.type === "income" ? "+" : "-"}${record.amount}
                    </span>
                    <span className="text-sm text-gray-600">{record.category}</span>
                    {record.description && <span className="text-sm text-gray-400 flex-1 truncate">{record.description}</span>}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditFinanceDialog(record)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDeleteFinance(record.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )

      // ========== 運動記錄 ==========
      case "exercise":
        const totalMinutes = exercises.reduce((sum, e) => sum + e.duration_minutes, 0)
        return (
          <div className={cn("p-4", colors.bg)}>
            <div className="flex justify-between items-center mb-3">
              {exercises.length > 0 && <span className="text-sm text-gray-600">共 {totalMinutes} 分鐘</span>}
              <Button size="sm" onClick={openNewExerciseDialog}>
                <Plus className="w-4 h-4 mr-1" /> 新增
              </Button>
            </div>
            {exercises.length === 0 ? (
              <p className="text-center text-gray-500 py-4">還沒有運動記錄</p>
            ) : (
              <div className="space-y-2">
                {exercises.map(exercise => (
                  <div key={exercise.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border group">
                    <Dumbbell className="w-5 h-5 text-orange-500" />
                    <span className="font-medium">{exercise.exercise_type}</span>
                    <span className="text-sm text-gray-500">{exercise.duration_minutes} 分鐘</span>
                    {exercise.calories && <span className="text-sm text-gray-400">{exercise.calories} 卡</span>}
                    <div className="flex-1" />
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditExerciseDialog(exercise)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDeleteExercise(exercise.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )

      // ========== 健康數據 ==========
      case "health":
        return (
          <div className={cn("p-4", colors.bg)}>
            <div className="flex justify-end mb-3">
              <Button size="sm" onClick={openNewHealthDialog}>
                <Plus className="w-4 h-4 mr-1" /> 新增
              </Button>
            </div>
            {healthMetrics.length === 0 ? (
              <p className="text-center text-gray-500 py-4">還沒有健康數據</p>
            ) : (
              <div className="space-y-2">
                {healthMetrics.map(metric => (
                  <div key={metric.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border group">
                    <Activity className="w-5 h-5 text-red-500" />
                    <span className="font-medium">{METRIC_TYPE_LABELS[metric.metric_type] || metric.metric_type}</span>
                    <span className="text-sm text-gray-600">
                      {metric.value_primary}
                      {metric.value_secondary && ` / ${metric.value_secondary}`}
                    </span>
                    <div className="flex-1" />
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditHealthDialog(metric)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDeleteHealth(metric.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )

      default:
        return null
    }
  }

  // ============================================
  // 主渲染
  // ============================================
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 頂部導航 */}
      <div className="flex items-center justify-between bg-white rounded-lg shadow-sm border p-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard")}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          返回
        </Button>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => goToDate(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-lg font-semibold text-gray-800 min-w-[140px] text-center">
            {format(selectedDate, "M月d日 EEEE", { locale: zhTW })}
          </h1>
          <Button variant="outline" size="icon" onClick={() => goToDate(1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/dashboard/day/${format(new Date(), "yyyy-MM-dd")}`)}
        >
          今天
        </Button>
      </div>

      {/* 12 個可收合模組 */}
      <div className="space-y-2">
        {MODULES.map((module) => {
          const Icon = module.icon
          const isExpanded = expandedModules.includes(module.key)
          const colors = colorMap[module.color]

          return (
            <div key={module.key} className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <button
                onClick={() => toggleModule(module.key)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", colors.bg)}>
                    <Icon className={cn("w-5 h-5", colors.text)} />
                  </div>
                  <span className="font-medium text-gray-800">{module.label}</span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {isExpanded && (
                <div className={cn("border-t", colors.border)}>
                  {renderPanelContent(module.key)}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ============================================ */}
      {/* 所有對話框 */}
      {/* ============================================ */}
      
      {/* Task Dialog */}
      <TaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        formData={taskFormData}
        setFormData={setTaskFormData}
        onSave={handleSaveTask}
        saving={taskSaving}
        dateLabel={dateLabel}
        isEdit={!!editingTask}
      />

      {/* Daily Plan Dialog */}
      <DailyPlanDialog
        open={planDialogOpen}
        onOpenChange={setPlanDialogOpen}
        formData={planFormData}
        setFormData={setPlanFormData}
        onSave={handleSavePlan}
        saving={planSaving}
        dateLabel={dateLabel}
        isEdit={!!editingPlan}
      />

      {/* Journal Life Dialog */}
      <JournalLifeDialog
        open={journalLifeDialogOpen}
        onOpenChange={setJournalLifeDialogOpen}
        formData={journalLifeFormData}
        setFormData={setJournalLifeFormData}
        onSave={handleSaveJournalLife}
        saving={journalLifeSaving}
        dateLabel={dateLabel}
        isEdit={!!journalLife}
      />

      {/* Journal Learning Dialog */}
      <JournalLearningDialog
        open={journalLearningDialogOpen}
        onOpenChange={setJournalLearningDialogOpen}
        formData={journalLearningFormData}
        setFormData={setJournalLearningFormData}
        onSave={handleSaveJournalLearning}
        saving={journalLearningSaving}
        dateLabel={dateLabel}
        isEdit={!!editingLearning}
      />

      {/* Journal Reading Dialog */}
      <JournalReadingDialog
        open={journalReadingDialogOpen}
        onOpenChange={setJournalReadingDialogOpen}
        formData={journalReadingFormData}
        setFormData={setJournalReadingFormData}
        onSave={handleSaveJournalReading}
        saving={journalReadingSaving}
        dateLabel={dateLabel}
        isEdit={!!editingReading}
      />

      {/* Journal Gratitude Dialog */}
      <JournalGratitudeDialog
        open={journalGratitudeDialogOpen}
        onOpenChange={setJournalGratitudeDialogOpen}
        formData={journalGratitudeFormData}
        setFormData={setJournalGratitudeFormData}
        onSave={handleSaveJournalGratitude}
        saving={journalGratitudeSaving}
        dateLabel={dateLabel}
        isEdit={!!journalGratitude}
      />

      {/* Journal Travel Dialog */}
      <JournalTravelDialog
        open={journalTravelDialogOpen}
        onOpenChange={setJournalTravelDialogOpen}
        formData={journalTravelFormData}
        setFormData={setJournalTravelFormData}
        photos={journalTravelPhotos}
        setPhotos={setJournalTravelPhotos}
        onSave={handleSaveJournalTravel}
        saving={journalTravelSaving}
        dateLabel={dateLabel}
        isEdit={!!editingTravel}
      />

      {/* Finance Dialog */}
      <FinanceDialog
        open={financeDialogOpen}
        onOpenChange={setFinanceDialogOpen}
        formData={financeFormData}
        setFormData={setFinanceFormData}
        onSave={handleSaveFinance}
        saving={financeSaving}
        dateLabel={dateLabel}
        isEdit={!!editingFinance}
      />

      {/* Exercise Dialog */}
      <ExerciseDialog
        open={exerciseDialogOpen}
        onOpenChange={setExerciseDialogOpen}
        formData={exerciseFormData}
        setFormData={setExerciseFormData}
        onSave={handleSaveExercise}
        saving={exerciseSaving}
        dateLabel={dateLabel}
        isEdit={!!editingExercise}
      />

      {/* Health Dialog */}
      <HealthDialog
        open={healthDialogOpen}
        onOpenChange={setHealthDialogOpen}
        formData={healthFormData}
        setFormData={setHealthFormData}
        onSave={handleSaveHealth}
        saving={healthSaving}
        dateLabel={dateLabel}
        isEdit={!!editingHealth}
      />
    </div>
  )
}
