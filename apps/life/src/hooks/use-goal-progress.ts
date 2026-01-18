// apps/life/src/hooks/use-goal-progress.ts
"use client"

import { useCallback } from "react"
import { createClient } from "@daily/database"
import type { Goal } from "@daily/database"
import { 
  differenceInDays, 
  parseISO, 
  format, 
  startOfDay, 
  subDays, 
  startOfMonth, 
  endOfMonth, 
  startOfYear, 
  endOfYear 
} from "date-fns"

// 追蹤來源類型
export type TrackSource = 
  | "manual"           // 手動更新
  | "habit"            // 習慣打卡
  | "weight"           // 體重記錄
  | "finance_savings"  // 累計儲蓄
  | "finance_income"   // 累計收入
  | "finance_expense"  // 累計支出
  | "exercise_count"   // 運動次數
  | "exercise_minutes" // 運動時間
  | "reading_books"    // 讀完書籍數
  | "water_days"       // 飲水達標天數
  | "sleep_days"       // 睡眠達標天數

// 追蹤設定
export interface TrackConfig {
  habit_id?: string        // 習慣 ID
  category_id?: string     // 財務類別 ID
  target_value?: number    // 目標值（如：飲水 2000ml）
  start_date?: string      // 計算起始日期
}

// 追蹤來源選項
export const TRACK_SOURCE_OPTIONS = [
  { value: "manual", label: "手動更新", goalTypes: ["countdown", "numeric", "streak", "count"] },
  { value: "habit", label: "習慣打卡", goalTypes: ["streak", "count"] },
  { value: "weight", label: "體重記錄", goalTypes: ["numeric"] },
  { value: "finance_savings", label: "累計儲蓄", goalTypes: ["numeric"] },
  { value: "finance_income", label: "累計收入", goalTypes: ["numeric"] },
  { value: "finance_expense", label: "控制支出", goalTypes: ["numeric"] },
  { value: "exercise_count", label: "運動次數", goalTypes: ["count"] },
  { value: "exercise_minutes", label: "運動時間", goalTypes: ["count"] },
  { value: "reading_books", label: "讀完書籍", goalTypes: ["count"] },
  { value: "water_days", label: "飲水達標", goalTypes: ["count"] },
  { value: "sleep_days", label: "睡眠達標", goalTypes: ["count"] },
]

export function useGoalProgress() {
  const supabase = createClient()
  // 計算習慣連續天數
  const calcHabitStreak = useCallback(async (userId: string, habitId: string): Promise<number> => {
    const { data: logs } = await supabase
      .from("habit_logs")
      .select("date")
      .eq("user_id", userId)
      .eq("habit_id", habitId)
      .order("date", { ascending: false })
      .limit(365)

    const logsList = (logs ?? []) as { date: string }[]

    if (!logsList || logsList.length === 0) return 0

    // 計算連續天數
    let streak = 0
    let currentDate = startOfDay(new Date())
    
    // 如果今天還沒打卡，從昨天開始算
    const todayStr = format(currentDate, "yyyy-MM-dd")
    const hasToday = logsList.some(l => l.date === todayStr)
    if (!hasToday) {
      currentDate = subDays(currentDate, 1)
    }

    for (const log of logsList) {
      const logDate = format(currentDate, "yyyy-MM-dd")
      if (log.date === logDate) {
        streak++
        currentDate = subDays(currentDate, 1)
      } else if (log.date < logDate) {
        break
      }
    }

    return streak
  }, [])

  // 計算習慣累計天數
  const calcHabitCount = useCallback(async (
    userId: string, 
    habitId: string, 
    startDate?: string
  ): Promise<number> => {
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
  }, [])

  // 取得最新體重
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
      
      const record = data as { value_primary: number } | null
      return record?.value_primary || null
  }, [])

  // 計算累計儲蓄/收入/支出
  const calcFinance = useCallback(async (
    userId: string,
    type: "savings" | "income" | "expense",
    startDate?: string,
    categoryId?: string
  ): Promise<number> => {
    let incomeQuery = supabase
      .from("finance_records")
      .select("amount")
      .eq("user_id", userId)
      .eq("type", "income")

    let expenseQuery = supabase
      .from("finance_records")
      .select("amount")
      .eq("user_id", userId)
      .eq("type", "expense")

    if (startDate) {
      incomeQuery = incomeQuery.gte("date", startDate)
      expenseQuery = expenseQuery.gte("date", startDate)
    }

    if (categoryId) {
      incomeQuery = incomeQuery.eq("category_id", categoryId)
      expenseQuery = expenseQuery.eq("category_id", categoryId)
    }

    const [incomeResult, expenseResult] = await Promise.all([
      incomeQuery,
      expenseQuery,
    ])

    const incomeData = (incomeResult.data ?? []) as { amount: number }[]
    const expenseData = (expenseResult.data ?? []) as { amount: number }[]

    const totalIncome = incomeData.reduce((sum, r) => sum + (r.amount || 0), 0)
    const totalExpense = expenseData.reduce((sum, r) => sum + (r.amount || 0), 0)

    switch (type) {
      case "income":
        return totalIncome
      case "expense":
        return totalExpense
      case "savings":
        return totalIncome - totalExpense
    }
  }, [])

  // 計算運動次數/時間
  const calcExercise = useCallback(async (
    userId: string,
    metric: "count" | "minutes",
    startDate?: string
  ): Promise<number> => {
    if (metric === "count") {
      let query = supabase
        .from("health_exercises")
        .select("id", { count: "exact" })
        .eq("user_id", userId)

      if (startDate) {
        query = query.gte("date", startDate)
      }

      const { count } = await query
      return count || 0
    } else {
      let query = supabase
        .from("health_exercises")
        .select("duration_minutes")
        .eq("user_id", userId)

      if (startDate) {
        query = query.gte("date", startDate)
      }

      const { data } = await query
      const exerciseData = (data ?? []) as { duration_minutes: number }[]
      return exerciseData.reduce((sum, r) => sum + (r.duration_minutes || 0), 0)
    }
  }, [])

  // 計算讀完書籍數
  const calcBooksFinished = useCallback(async (
    userId: string,
    startDate?: string
  ): Promise<number> => {
    let query = supabase
      .from("journals_reading")
      .select("id", { count: "exact" })
      .eq("user_id", userId)
      .eq("is_finished", true)

    if (startDate) {
      query = query.gte("date", startDate)
    }

    const { count } = await query
    return count || 0
  }, [])

  // 計算飲水/睡眠達標天數
  const calcHealthDays = useCallback(async (
    userId: string,
    metricType: "water" | "sleep",
    targetValue: number,
    startDate?: string
  ): Promise<number> => {
    let query = supabase
      .from("health_metrics")
      .select("date, value_primary")
      .eq("user_id", userId)
      .eq("metric_type", metricType)

    if (startDate) {
      query = query.gte("date", startDate)
    }

    const { data } = await query

    if (!data) return 0

    const records = data as { date: string; value_primary: number }[]

    // 按日期分組，取每天最高值
    const dailyMax: Record<string, number> = {}
    records.forEach(r => {
      if (!dailyMax[r.date] || r.value_primary > dailyMax[r.date]) {
        dailyMax[r.date] = r.value_primary
      }
    })

    // 計算達標天數
    return Object.values(dailyMax).filter(v => v >= targetValue).length
  }, [])

  // 取得週期的起始和結束日期
  const getPeriodRange = useCallback((periodType: "once" | "monthly" | "yearly"): { start: string, end: string } => {
    const now = new Date()
    if (periodType === "monthly") {
      return {
        start: format(startOfMonth(now), "yyyy-MM-dd"),
        end: format(endOfMonth(now), "yyyy-MM-dd"),
      }
    } else if (periodType === "yearly") {
      return {
        start: format(startOfYear(now), "yyyy-MM-dd"),
        end: format(endOfYear(now), "yyyy-MM-dd"),
      }
    }
    return { start: "", end: "" }
  }, [])

  // 計算目標進度（支援週期）
  const calculateProgress = useCallback(async (goal: Goal, userId: string): Promise<{
    currentValue?: number | null
    currentCount?: number | null
  }> => {
    const config = goal.track_config as TrackConfig || {}
    
    // 決定計算的起始日期
    let startDate = config.start_date || goal.started_at
    
    // 週期性目標使用當期的起始日期
    if (goal.period_type === "monthly" || goal.period_type === "yearly") {
      const range = getPeriodRange(goal.period_type)
      startDate = range.start
    }

    switch (goal.track_source) {
      case "habit":
        if (!config.habit_id) return {}
        if (goal.goal_type === "streak") {
          const streak = await calcHabitStreak(userId, config.habit_id)
          return { currentCount: streak }
        } else {
          const count = await calcHabitCount(userId, config.habit_id, startDate || undefined)
          return { currentCount: count }
        }

      case "weight":
        const weight = await getLatestWeight(userId)
        return { currentValue: weight }

      case "finance_savings":
        const savings = await calcFinance(userId, "savings", startDate || undefined, config.category_id)
        return { currentValue: savings }

      case "finance_income":
        const income = await calcFinance(userId, "income", startDate || undefined, config.category_id)
        return { currentValue: income }

      case "finance_expense":
        const expense = await calcFinance(userId, "expense", startDate || undefined, config.category_id)
        return { currentValue: expense }

      case "exercise_count":
        const exerciseCount = await calcExercise(userId, "count", startDate || undefined)
        return { currentCount: exerciseCount }

      case "exercise_minutes":
        const exerciseMinutes = await calcExercise(userId, "minutes", startDate || undefined)
        return { currentCount: exerciseMinutes }

      case "reading_books":
        const booksCount = await calcBooksFinished(userId, startDate || undefined)
        return { currentCount: booksCount }

      case "water_days":
        const waterDays = await calcHealthDays(userId, "water", config.target_value || 2000, startDate || undefined)
        return { currentCount: waterDays }

      case "sleep_days":
        const sleepDays = await calcHealthDays(userId, "sleep", config.target_value || 7, startDate || undefined)
        return { currentCount: sleepDays }

      default:
        return {}
    }
  }, [calcHabitStreak, calcHabitCount, getLatestWeight, calcFinance, calcExercise, calcBooksFinished, calcHealthDays])

  // 批次更新目標進度
  const syncGoalsProgress = useCallback(async (goals: Goal[], userId: string): Promise<Goal[]> => {
    const updatedGoals = await Promise.all(
      goals.map(async (goal) => {
        if (goal.track_source === "manual") {
          return goal
        }

        const progress = await calculateProgress(goal, userId)
        
        // 更新資料庫
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

          await (supabase.from("goals") as any).update(updateData).eq("id", goal.id)

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
  }, [calculateProgress])

  // 計算指定期間的累積值（用於統計頁面）
  const calcPeriodProgress = useCallback(async (
    goal: Goal, 
    userId: string,
    periodType: "month" | "year",
    offset: number = 0  // 0=當期, -1=上期, -2=上上期...
  ): Promise<number> => {
    const config = goal.track_config as TrackConfig || {}
    const now = new Date()
    
    let periodStart: Date
    let periodEnd: Date
    
    if (periodType === "month") {
      const targetMonth = new Date(now.getFullYear(), now.getMonth() + offset, 1)
      periodStart = startOfMonth(targetMonth)
      periodEnd = endOfMonth(targetMonth)
    } else {
      const targetYear = new Date(now.getFullYear() + offset, 0, 1)
      periodStart = startOfYear(targetYear)
      periodEnd = endOfYear(targetYear)
    }
    
    const startDate = format(periodStart, "yyyy-MM-dd")
    const endDate = format(periodEnd, "yyyy-MM-dd")

    switch (goal.track_source) {
      case "habit":
        if (!config.habit_id) return 0
        const { count } = await supabase
          .from("habit_logs")
          .select("id", { count: "exact" })
          .eq("user_id", userId)
          .eq("habit_id", config.habit_id)
          .gte("date", startDate)
          .lte("date", endDate)
        return count || 0

      case "finance_savings":
      case "finance_income":
      case "finance_expense": {
        const financeType = goal.track_source === "finance_income" ? "income" 
          : goal.track_source === "finance_expense" ? "expense" : null
        
        let incomeTotal = 0
        let expenseTotal = 0
        
        if (!financeType || financeType === "income" || goal.track_source === "finance_savings") {
          const { data: incomeData } = await supabase
            .from("finance_records")
            .select("amount")
            .eq("user_id", userId)
            .eq("type", "income")
            .gte("date", startDate)
            .lte("date", endDate)
          
            const incomeList = (incomeData ?? []) as { amount: number }[]
            incomeTotal = incomeList.reduce((sum, r) => sum + (r.amount || 0), 0)
        }
        
        if (!financeType || financeType === "expense" || goal.track_source === "finance_savings") {
          const { data: expenseData } = await supabase
            .from("finance_records")
            .select("amount")
            .eq("user_id", userId)
            .eq("type", "expense")
            .gte("date", startDate)
            .lte("date", endDate)
          const expenseList = (expenseData ?? []) as { amount: number }[]
          expenseTotal = expenseList.reduce((sum, r) => sum + (r.amount || 0), 0)
        }
        
        if (goal.track_source === "finance_savings") return incomeTotal - expenseTotal
        if (goal.track_source === "finance_income") return incomeTotal
        return expenseTotal
      }

      case "exercise_count": {
        const { count: exerciseCount } = await supabase
          .from("health_exercises")
          .select("id", { count: "exact" })
          .eq("user_id", userId)
          .gte("date", startDate)
          .lte("date", endDate)
        return exerciseCount || 0
      }

      case "exercise_minutes": {
        const { data: exerciseData } = await supabase
          .from("health_exercises")
          .select("duration_minutes")
          .eq("user_id", userId)
          .gte("date", startDate)
          .lte("date", endDate)
        const exerciseList = (exerciseData ?? []) as { duration_minutes: number }[]
        return exerciseList.reduce((sum, r) => sum + (r.duration_minutes || 0), 0)
      }

      case "reading_books": {
        const { count: booksCount } = await supabase
          .from("journals_reading")
          .select("id", { count: "exact" })
          .eq("user_id", userId)
          .eq("is_finished", true)
          .gte("date", startDate)
          .lte("date", endDate)
        return booksCount || 0
      }

      default:
        return 0
    }
  }, [])

  // 取得目標的歷史週期統計
  const getGoalPeriodStats = useCallback(async (
    goal: Goal,
    userId: string,
    periodType: "month" | "year",
    periodsCount: number = 6  // 取幾期資料
  ): Promise<Array<{ period: string, value: number, target: number }>> => {
    const stats: Array<{ period: string, value: number, target: number }> = []
    const target = goal.period_target || 
      (goal.goal_type === "numeric" ? goal.target_value : goal.target_count) || 0

    for (let i = 0; i < periodsCount; i++) {
      const value = await calcPeriodProgress(goal, userId, periodType, -i)
      const now = new Date()
      
      let periodLabel: string
      if (periodType === "month") {
        const targetMonth = new Date(now.getFullYear(), now.getMonth() - i, 1)
        periodLabel = format(targetMonth, "yyyy/MM")
      } else {
        periodLabel = (now.getFullYear() - i).toString()
      }
      
      stats.unshift({ period: periodLabel, value, target })
    }

    return stats
  }, [calcPeriodProgress])

  return {
    calculateProgress,
    syncGoalsProgress,
    calcHabitStreak,
    calcHabitCount,
    getLatestWeight,
    calcFinance,
    calcExercise,
    calcBooksFinished,
    calcHealthDays,
    getPeriodRange,
    calcPeriodProgress,
    getGoalPeriodStats,
  }
}
