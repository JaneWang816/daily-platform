// apps/life/src/hooks/use-dashboard-data.ts
"use client"

import { useState, useEffect, useCallback } from "react"
import { format, getDay, addDays, addWeeks, addMonths, addYears, isBefore, isEqual, parseISO } from "date-fns"
import { createClient } from "@daily/database"
//import type { DayIndicators, ModuleType } from "@/components/calendar/calendar-view"
import type {
  ScheduleSlot,
  Task,
  Habit,
  HabitLog,
  JournalLife,
  JournalLearning,
  JournalReading,
  JournalGratitude,
  FinanceRecord,
  HealthExercise,
  HealthMetric,
} from "@daily/database"

export type ModuleType = 
  | "schedule" | "tasks" | "habits" | "daily_plan" 
  | "journal_life" | "journal_learning" | "journal_reading" 
  | "journal_gratitude" | "journal_travel"
  | "finance" | "exercise" | "health"

export type DayIndicators = {
  [dateKey: string]: ModuleType[]
}

// 遊覽日誌類型
export type JournalTravel = {
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
  created_at: string
  updated_at: string
}

// 每日行程類型
export type DailyPlan = {
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

// Habit with today's log
export type HabitWithLog = Habit & { log?: HabitLog }

export function useDashboardData(selectedDate: Date) {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [moduleLoading, setModuleLoading] = useState(false)
  const [indicators, setIndicators] = useState<DayIndicators>({})

  // 各模組資料
  const [scheduleSlots, setScheduleSlots] = useState<ScheduleSlot[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [habits, setHabits] = useState<HabitWithLog[]>([])
  const [journalLife, setJournalLife] = useState<JournalLife | null>(null)
  const [journalLearning, setJournalLearning] = useState<JournalLearning | null>(null)
  const [journalReading, setJournalReading] = useState<JournalReading | null>(null)
  const [journalGratitude, setJournalGratitude] = useState<JournalGratitude | null>(null)
  const [journalTravels, setJournalTravels] = useState<JournalTravel[]>([])
  const [dailyPlans, setDailyPlans] = useState<DailyPlan[]>([])
  const [financeRecords, setFinanceRecords] = useState<FinanceRecord[]>([])
  const [exercises, setExercises] = useState<HealthExercise[]>([])
  const [healthMetrics, setHealthMetrics] = useState<HealthMetric[]>([])

  const selectedDateKey = format(selectedDate, "yyyy-MM-dd")

  // ============================================
  // 載入指示器資料
  // ============================================
  const fetchIndicators = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const today = new Date()
    const startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const endDate = new Date(today.getFullYear(), today.getMonth() + 2, 0)
    const startStr = format(startDate, "yyyy-MM-dd")
    const endStr = format(endDate, "yyyy-MM-dd")

    const newIndicators: DayIndicators = {}

    // 課表
    const { data: scheduleData } = await supabase
      .from("schedule_slots")
      .select("day_of_week")
      .eq("user_id", user.id)

    const scheduleList = (scheduleData ?? []) as { day_of_week: number }[]

    if (scheduleList.length > 0) {
      const daysWithSchedule = new Set(scheduleList.map(s => s.day_of_week))
        let current = new Date(startDate)
      while (current <= endDate) {
        const dayOfWeek = current.getDay() === 0 ? 7 : current.getDay()
        if (daysWithSchedule.has(dayOfWeek)) {
          const dateKey = format(current, "yyyy-MM-dd")
          if (!newIndicators[dateKey]) newIndicators[dateKey] = []
          newIndicators[dateKey].push("schedule")
        }
        current.setDate(current.getDate() + 1)
      }
    }

    // 任務
    const { data: tasksData } = await supabase
      .from("tasks")
      .select("due_date")
      .eq("user_id", user.id)
      .gte("due_date", startStr)
      .lte("due_date", endStr)

    const tasksList = (tasksData ?? []) as { due_date: string | null }[]

    if (tasksData) {
      tasksList.forEach(task => {
        if (task.due_date) {
          const dateKey = task.due_date
          if (!newIndicators[dateKey]) newIndicators[dateKey] = []
          if (!newIndicators[dateKey].includes("tasks")) {
            newIndicators[dateKey].push("tasks")
          }
        }
      })
    }

    // 習慣打卡
    const { data: habitsData } = await supabase
      .from("habit_logs")
      .select("date")
      .eq("user_id", user.id)
      .gte("date", startStr)
      .lte("date", endStr)

    if (habitsData) {
      const habitsList = (habitsData ?? []) as { date: string }[]
      habitsList.forEach(h => {
        const dateKey = h.date
        if (!newIndicators[dateKey]) newIndicators[dateKey] = []
        if (!newIndicators[dateKey].includes("habits")) {
          newIndicators[dateKey].push("habits")
        }
      })
    }

    // 每日行程
    const { data: plansData } = await supabase
      .from("daily_plans")
      .select("date")
      .eq("user_id", user.id)
      .gte("date", startStr)
      .lte("date", endStr)

    if (plansData) {
      const plansList = (plansData ?? []) as { date: string }[]
      plansList.forEach(p => {
        if (!newIndicators[p.date]) newIndicators[p.date] = []
        if (!newIndicators[p.date].includes("daily_plan")) {
          newIndicators[p.date].push("daily_plan")
        }
      })
    }

    // 生活日誌
    const { data: lifeJournals } = await supabase
      .from("journals_life")
      .select("date")
      .eq("user_id", user.id)
      .gte("date", startStr)
      .lte("date", endStr)

    if (lifeJournals) {
      const lifeList = (plansData ?? []) as { date: string }[]
      lifeList.forEach(j => {
        if (!newIndicators[j.date]) newIndicators[j.date] = []
        if (!newIndicators[j.date].includes("journal_life")) {
          newIndicators[j.date].push("journal_life")
        }
      })
    }

    // 學習日誌
    const { data: learningJournals } = await supabase
      .from("journals_learning")
      .select("date")
      .eq("user_id", user.id)
      .gte("date", startStr)
      .lte("date", endStr)

    if (learningJournals) {
      const learningList = (plansData ?? []) as { date: string }[]
      learningList.forEach(j => {
        if (!newIndicators[j.date]) newIndicators[j.date] = []
        if (!newIndicators[j.date].includes("journal_learning")) {
          newIndicators[j.date].push("journal_learning")
        }
      })
    }

    // 閱讀日誌
    const { data: readingJournals } = await supabase
      .from("journals_reading")
      .select("date")
      .eq("user_id", user.id)
      .gte("date", startStr)
      .lte("date", endStr)

    if (readingJournals) {
      const readingList = (plansData ?? []) as { date: string }[]
      readingList.forEach(j => {
        if (!newIndicators[j.date]) newIndicators[j.date] = []
        if (!newIndicators[j.date].includes("journal_reading")) {
          newIndicators[j.date].push("journal_reading")
        }
      })
    }

    // 感恩日誌
    const { data: gratitudeJournals } = await supabase
      .from("journals_gratitude")
      .select("date")
      .eq("user_id", user.id)
      .gte("date", startStr)
      .lte("date", endStr)

    if (gratitudeJournals) {
      const gratitudeList = (plansData ?? []) as { date: string }[]
      gratitudeList.forEach(j => {
        if (!newIndicators[j.date]) newIndicators[j.date] = []
        if (!newIndicators[j.date].includes("journal_gratitude")) {
          newIndicators[j.date].push("journal_gratitude")
        }
      })
    }

    // 遊覽日誌
    const { data: travelJournals } = await supabase
      .from("journals_travel")
      .select("date")
      .eq("user_id", user.id)
      .gte("date", startStr)
      .lte("date", endStr)

    if (travelJournals) {
      const travelList = (plansData ?? []) as { date: string }[]
      travelList.forEach(j => {        
        if (!newIndicators[j.date]) newIndicators[j.date] = []
        if (!newIndicators[j.date].includes("journal_travel")) {
          newIndicators[j.date].push("journal_travel")
        }
      })
    }

    // 收支
    const { data: financeData } = await supabase
      .from("finance_records")
      .select("date")
      .eq("user_id", user.id)
      .gte("date", startStr)
      .lte("date", endStr)

    if (financeData) {
      const FinanceList = (plansData ?? []) as { date: string }[]
      FinanceList.forEach(f => {
        if (!newIndicators[f.date]) newIndicators[f.date] = []
        if (!newIndicators[f.date].includes("finance")) {
          newIndicators[f.date].push("finance")
        }
      })
    }

    // 運動
    const { data: exerciseData } = await supabase
      .from("health_exercises")
      .select("date")
      .eq("user_id", user.id)
      .gte("date", startStr)
      .lte("date", endStr)

    if (exerciseData) {
      const exerciseList = (plansData ?? []) as { date: string }[]
      exerciseList.forEach(e => {
        if (!newIndicators[e.date]) newIndicators[e.date] = []
        if (!newIndicators[e.date].includes("exercise")) {
          newIndicators[e.date].push("exercise")
        }
      })
    }

    // 健康
    const { data: healthData } = await supabase
      .from("health_metrics")
      .select("date")
      .eq("user_id", user.id)
      .gte("date", startStr)
      .lte("date", endStr)

    if (healthData) {
      const healthList = (plansData ?? []) as { date: string }[]
      healthList.forEach(h => {
        if (!newIndicators[h.date]) newIndicators[h.date] = []
        if (!newIndicators[h.date].includes("health")) {
          newIndicators[h.date].push("health")
        }
      })
    }

    setIndicators(newIndicators)
    setLoading(false)
  }, [])

  // ============================================
  // 各模組資料載入函數
  // ============================================
  const fetchSchedule = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const jsDay = getDay(selectedDate)
    const dayOfWeek = jsDay === 0 ? 7 : jsDay
    const { data } = await supabase
      .from("schedule_slots")
      .select("*")
      .eq("user_id", user.id)
      .eq("day_of_week", dayOfWeek)
      .order("slot_number", { ascending: true })
    setScheduleSlots((data ?? []) as ScheduleSlot[])
  }, [selectedDate])

  const fetchTasks = useCallback(async () => {
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

    const jsDay = getDay(selectedDate)
    const dayOfWeek = jsDay === 0 ? 7 : jsDay

    const filteredHabits: HabitWithLog[] = habitsData
      .filter(h => h.target_days?.includes(dayOfWeek))
      .map(h => ({ ...h, log: logsMap.get(h.id) }))

    setHabits(filteredHabits)
  }, [selectedDate, selectedDateKey])

  const fetchDailyPlans = useCallback(async () => {
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

  const fetchJournalLearning = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from("journals_learning")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", selectedDateKey)
      .maybeSingle()
    setJournalLearning(data as JournalLearning | null)
  }, [selectedDateKey])

  const fetchJournalReading = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from("journals_reading")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", selectedDateKey)
      .maybeSingle()
    setJournalReading(data as JournalReading | null)
  }, [selectedDateKey])

  const fetchJournalGratitude = useCallback(async () => {
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

  const fetchJournalTravel = useCallback(async () => {
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

  // ============================================
  // 載入模組資料
  // ============================================
  const loadModuleData = useCallback(async (moduleKey: string) => {
    setModuleLoading(true)
    switch (moduleKey) {
      case "schedule": await fetchSchedule(); break
      case "tasks": await fetchTasks(); break
      case "habits": await fetchHabits(); break
      case "daily_plan": await fetchDailyPlans(); break
      case "journal_life": await fetchJournalLife(); break
      case "journal_learning": await fetchJournalLearning(); break
      case "journal_reading": await fetchJournalReading(); break
      case "journal_gratitude": await fetchJournalGratitude(); break
      case "journal_travel": await fetchJournalTravel(); break
      case "finance": await fetchFinance(); break
      case "exercise": await fetchExercises(); break
      case "health": await fetchHealthMetrics(); break
    }
    setModuleLoading(false)
  }, [
    fetchSchedule, fetchTasks, fetchHabits, fetchDailyPlans,
    fetchJournalLife, fetchJournalLearning, fetchJournalReading,
    fetchJournalGratitude, fetchJournalTravel, fetchFinance,
    fetchExercises, fetchHealthMetrics
  ])

  // 初始載入
  useEffect(() => {
    fetchIndicators()
  }, [fetchIndicators])

  return {
    loading,
    moduleLoading,
    indicators,
    selectedDateKey,
    // 資料
    scheduleSlots,
    tasks,
    habits,
    dailyPlans,
    journalLife,
    journalLearning,
    journalReading,
    journalGratitude,
    journalTravels,
    financeRecords,
    exercises,
    healthMetrics,
    // Setters
    setJournalLife,
    setJournalLearning,
    setJournalReading,
    setJournalGratitude,
    // 函數
    fetchIndicators,
    loadModuleData,
    fetchTasks,
    fetchHabits,
    fetchDailyPlans,
    fetchJournalLife,
    fetchJournalLearning,
    fetchJournalReading,
    fetchJournalGratitude,
    fetchJournalTravel,
    fetchFinance,
    fetchExercises,
    fetchHealthMetrics,
  }
}
