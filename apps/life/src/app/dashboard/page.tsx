// apps/life/src/app/dashboard/page.tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns"
import { zhTW } from "date-fns/locale"
import { useRouter } from "next/navigation"
import { createClient } from "@daily/database"
import type { Goal } from "@daily/database"
import { Button } from "@daily/ui"
import { 
  ChevronLeft, 
  ChevronRight, 
  Target, 
  CheckCircle2, 
  Circle,
  Clock,
  AlertCircle,
  CalendarCheck,
  Flame,
  Wallet,
  Plus,
} from "lucide-react"
import { FinanceDialog } from "@/components/dialogs"

// ============================================
// 類型定義
// ============================================
type ModuleType = 
  | "schedule" | "tasks" | "habits" | "daily_plan" 
  | "journal_life" | "journal_learning" | "journal_reading" 
  | "journal_gratitude" | "journal_travel"
  | "finance" | "exercise" | "health"

type DayIndicators = {
  [dateKey: string]: ModuleType[]
}

type Task = {
  id: string
  title: string
  due_date: string | null
  completed_at: string | null
  is_important: boolean
  is_urgent: boolean
}

type Habit = {
  id: string
  title: string
  icon: string | null
  color: string | null
  target_days: number[] | null
  is_active: boolean | null
}

type HabitLog = {
  habit_id: string
  date: string
  completed: boolean
}

type ScheduleSlot = {
  id: string
  day_of_week: number
  slot_number: number
  subject_name: string
  teacher: string | null
  location: string | null
  note: string | null
}

type DailyPlan = {
  id: string
  date: string
  title: string
  start_time: string | null
  end_time: string | null
  color: string | null
}

type FinanceRecord = {
  id: string
  date: string
  type: "income" | "expense"
  category: string
  amount: number
  description: string | null
}

// ============================================
// 常數
// ============================================
const MODULE_COLORS: Record<ModuleType, string> = {
  schedule: "bg-blue-500",
  tasks: "bg-amber-500",
  habits: "bg-cyan-500",
  daily_plan: "bg-indigo-500",
  journal_life: "bg-pink-500",
  journal_learning: "bg-purple-500",
  journal_reading: "bg-green-500",
  journal_gratitude: "bg-yellow-500",
  journal_travel: "bg-sky-500",
  finance: "bg-emerald-500",
  exercise: "bg-orange-500",
  health: "bg-red-500",
}

const GOAL_COLORS: Record<string, { bg: string; border: string; text: string; progress: string }> = {
  blue: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", progress: "bg-blue-500" },
  red: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", progress: "bg-red-500" },
  green: { bg: "bg-green-50", border: "border-green-200", text: "text-green-700", progress: "bg-green-500" },
  amber: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", progress: "bg-amber-500" },
  purple: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", progress: "bg-purple-500" },
  pink: { bg: "bg-pink-50", border: "border-pink-200", text: "text-pink-700", progress: "bg-pink-500" },
  indigo: { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-700", progress: "bg-indigo-500" },
  cyan: { bg: "bg-cyan-50", border: "border-cyan-200", text: "text-cyan-700", progress: "bg-cyan-500" },
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

// ============================================
// 日曆元件
// ============================================
function CalendarView({
  selectedDate,
  onSelectDate,
  indicators = {},
  view = "month",
  onViewChange,
}: {
  selectedDate: Date
  onSelectDate: (date: Date) => void
  indicators?: DayIndicators
  view?: "month" | "week"
  onViewChange?: (view: "month" | "week") => void
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const handleToday = () => {
    setCurrentMonth(new Date())
    onSelectDate(new Date())
  }

  const generateMonthDays = () => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 })
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 })

    const days: Date[] = []
    let day = startDate

    while (day <= endDate) {
      days.push(day)
      day = addDays(day, 1)
    }

    return days
  }

  const generateWeekDays = () => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
    const days: Date[] = []

    for (let i = 0; i < 7; i++) {
      days.push(addDays(weekStart, i))
    }

    return days
  }

  const days = view === "month" ? generateMonthDays() : generateWeekDays()
  const weekDays = ["一", "二", "三", "四", "五", "六", "日"]

  const getIndicators = (date: Date): ModuleType[] => {
    const dateKey = format(date, "yyyy-MM-dd")
    return indicators[dateKey] || []
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-gray-800">
            {format(currentMonth, "yyyy年 M月", { locale: zhTW })}
          </h2>
          <Button variant="outline" size="sm" onClick={handleToday} className="text-xs">
            今天
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {onViewChange && (
            <div className="flex border rounded-lg overflow-hidden">
              <button
                onClick={() => onViewChange("month")}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  view === "month"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                月
              </button>
              <button
                onClick={() => onViewChange("week")}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  view === "week"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                週
              </button>
            </div>
          )}

          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleNextMonth} className="h-8 w-8">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 mb-2">
        {weekDays.map((day) => (
          <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}
      </div>

      <div className={`grid grid-cols-7 ${view === "week" ? "gap-1" : "gap-0"}`}>
        {days.map((day, index) => {
          const dayIndicators = getIndicators(day)
          const isCurrentMonth = isSameMonth(day, currentMonth)
          const isSelected = isSameDay(day, selectedDate)
          const isDayToday = isToday(day)

          return (
            <button
              key={index}
              onClick={() => onSelectDate(day)}
              className={`
                relative p-2 min-h-[70px] md:min-h-[80px] border-t
                flex flex-col items-center
                transition-colors
                ${!isCurrentMonth && view === "month" ? "text-gray-300" : "text-gray-700"}
                ${isSelected ? "bg-blue-50" : "hover:bg-gray-50"}
              `}
            >
              <span
                className={`
                  w-7 h-7 flex items-center justify-center rounded-full text-sm
                  ${isSelected ? "bg-blue-600 text-white" : ""}
                  ${isDayToday && !isSelected ? "bg-gray-200 font-bold" : ""}
                `}
              >
                {format(day, "d")}
              </span>

              {dayIndicators.length > 0 && (
                <div className="flex flex-wrap justify-center gap-0.5 mt-1 max-w-full">
                  {dayIndicators.slice(0, 4).map((module, i) => (
                    <span
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full ${MODULE_COLORS[module]}`}
                    />
                  ))}
                  {dayIndicators.length > 4 && (
                    <span className="text-xs text-gray-400">+{dayIndicators.length - 4}</span>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-4 pt-4 border-t">
        <div className="flex flex-wrap gap-3 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${MODULE_COLORS.schedule}`} />
            <span>課表</span>
          </div>
          <div className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${MODULE_COLORS.tasks}`} />
            <span>任務</span>
          </div>
          <div className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${MODULE_COLORS.habits}`} />
            <span>習慣</span>
          </div>
          <div className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${MODULE_COLORS.daily_plan}`} />
            <span>行程</span>
          </div>
          <div className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${MODULE_COLORS.journal_life}`} />
            <span>日誌</span>
          </div>
          <div className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${MODULE_COLORS.finance}`} />
            <span>財務</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// 任務項目子元件
// ============================================
function TaskItem({ 
  task, 
  onToggle,
  variant 
}: { 
  task: Task
  onToggle: (taskId: string, completed: boolean) => void
  variant: "overdue" | "today" | "upcoming"
}) {
  const isCompleted = !!task.completed_at
  const bgClass = {
    overdue: "bg-red-50 hover:bg-red-100",
    today: "bg-amber-50 hover:bg-amber-100",
    upcoming: "hover:bg-gray-50",
  }[variant]

  return (
    <div
      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer ${bgClass} ${isCompleted ? "opacity-60" : ""}`}
      onClick={() => onToggle(task.id, !isCompleted)}
    >
      {isCompleted ? (
        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
      ) : (
        <Circle className="w-4 h-4 text-gray-400 shrink-0" />
      )}
      <span className={`flex-1 text-sm truncate ${isCompleted ? "line-through text-gray-400" : ""}`}>
        {task.title}
      </span>
      {task.is_important && !isCompleted && (
        <span className="text-xs px-1 py-0.5 bg-red-100 text-red-600 rounded">重要</span>
      )}
      {task.is_urgent && !isCompleted && (
        <span className="text-xs px-1 py-0.5 bg-amber-100 text-amber-600 rounded">緊急</span>
      )}
    </div>
  )
}

// ============================================
// 今日提醒元件
// ============================================
function TodayReminder({
  tasks,
  habits,
  habitLogs,
  scheduleSlots,
  dailyPlans,
  todayFinance,
  onTaskToggle,
  onHabitToggle,
  onAddExpense,
  onViewTasks,
  onViewHabits,
  onViewFinance,
}: {
  tasks: Task[]
  habits: Habit[]
  habitLogs: HabitLog[]
  scheduleSlots: ScheduleSlot[]
  dailyPlans: DailyPlan[]
  todayFinance: FinanceRecord[]
  onTaskToggle: (taskId: string, completed: boolean) => void
  onHabitToggle: (habitId: string) => void
  onAddExpense: () => void
  onViewTasks: () => void
  onViewHabits: () => void
  onViewFinance: () => void
}) {
  const today = new Date()
  const todayStr = format(today, "yyyy-MM-dd")
  const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay()
  const threeDaysLater = format(addDays(today, 3), "yyyy-MM-dd")

  // ========== 行程 & 課表合併 ==========
  const todaySchedule = scheduleSlots.map(s => ({
    id: `schedule-${s.id}`,
    time: SLOT_TIMES[s.slot_number]?.start || "00:00",
    title: s.subject_name,
    type: "schedule" as const,
    color: "blue",
  }))

  const todayPlansItems = dailyPlans.map(p => ({
    id: `plan-${p.id}`,
    time: p.start_time || "00:00",
    title: p.title,
    type: "plan" as const,
    color: p.color || "indigo",
  }))

  const timelineItems = [...todaySchedule, ...todayPlansItems].sort((a, b) => 
    a.time.localeCompare(b.time)
  )

  // ========== 任務分類 ==========
  const todayTasks = tasks.filter(t => t.due_date === todayStr)
  const upcomingTasks = tasks.filter(t => 
    t.due_date && 
    t.due_date > todayStr && 
    t.due_date <= threeDaysLater &&
    !t.completed_at
  )
  const overdueTasks = tasks.filter(t => 
    t.due_date && 
    t.due_date < todayStr && 
    !t.completed_at
  )

  // ========== 今日習慣 ==========
  const todayHabits = habits.filter(h => 
    h.is_active && h.target_days?.includes(dayOfWeek)
  )
  const completedHabits = todayHabits.filter(h => 
    habitLogs.some(log => log.habit_id === h.id && log.date === todayStr && log.completed)
  )
  const pendingHabits = todayHabits.filter(h => 
    !habitLogs.some(log => log.habit_id === h.id && log.date === todayStr && log.completed)
  )

  // ========== 今日支出 ==========
  const todayExpenses = todayFinance.filter(f => f.type === "expense")
  const totalExpense = todayExpenses.reduce((sum, f) => sum + f.amount, 0)

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <CalendarCheck className="w-5 h-5 text-blue-600" />
          今日提醒
        </h3>
        <span className="text-sm text-gray-500">
          {format(today, "M月d日 EEEE", { locale: zhTW })}
        </span>
      </div>

      {/* ========== 上方：時間軸（課表 + 行程）========== */}
      <div className="mb-4 pb-4 border-b">
        <h4 className="font-medium text-gray-700 flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-blue-500" />
          今日時程
        </h4>
        {timelineItems.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-2">今天沒有安排</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {timelineItems.map(item => (
              <div
                key={item.id}
                className={`
                  inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm
                  ${item.type === "schedule" 
                    ? "bg-blue-100 text-blue-700" 
                    : "bg-indigo-100 text-indigo-700"
                  }
                `}
              >
                <span className="font-medium">{item.time.slice(0, 5)}</span>
                <span>{item.title}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========== 中間：任務 & 習慣 ========== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 pb-4 border-b">
        {/* 任務區塊 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-700 flex items-center gap-2">
              <Target className="w-4 h-4 text-amber-500" />
              任務
            </h4>
            <Button variant="ghost" size="sm" className="text-xs text-gray-500" onClick={onViewTasks}>
              查看全部
            </Button>
          </div>

          <div className="space-y-2 max-h-52 overflow-y-auto">
            {/* 已過期 */}
            {overdueTasks.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-red-600 font-medium">已過期</p>
                {overdueTasks.map(task => (
                  <TaskItem 
                    key={task.id} 
                    task={task} 
                    onToggle={onTaskToggle}
                    variant="overdue"
                  />
                ))}
              </div>
            )}

            {/* 今日到期 */}
            {todayTasks.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-amber-600 font-medium">今日到期</p>
                {todayTasks.map(task => (
                  <TaskItem 
                    key={task.id} 
                    task={task} 
                    onToggle={onTaskToggle}
                    variant="today"
                  />
                ))}
              </div>
            )}

            {/* 三日內到期 */}
            {upcomingTasks.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-blue-600 font-medium">三日內到期</p>
                {upcomingTasks.map(task => (
                  <TaskItem 
                    key={task.id} 
                    task={task} 
                    onToggle={onTaskToggle}
                    variant="upcoming"
                  />
                ))}
              </div>
            )}

            {overdueTasks.length === 0 && todayTasks.length === 0 && upcomingTasks.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">近期沒有任務 🎉</p>
            )}
          </div>
        </div>

        {/* 習慣區塊 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-700 flex items-center gap-2">
              <Flame className="w-4 h-4 text-cyan-500" />
              今日習慣
              <span className="text-xs text-gray-400">
                {completedHabits.length}/{todayHabits.length}
              </span>
            </h4>
            <Button variant="ghost" size="sm" className="text-xs text-gray-500" onClick={onViewHabits}>
              管理
            </Button>
          </div>

          <div className="space-y-2 max-h-52 overflow-y-auto">
            {todayHabits.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">今天沒有習慣目標</p>
            ) : (
              <>
                {pendingHabits.map(habit => (
                  <div
                    key={habit.id}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => onHabitToggle(habit.id)}
                  >
                    <Circle className="w-4 h-4 text-gray-400" />
                    <span className="text-lg">{habit.icon || "🎯"}</span>
                    <span className="flex-1 text-sm">{habit.title}</span>
                  </div>
                ))}
                {completedHabits.map(habit => (
                  <div
                    key={habit.id}
                    className="flex items-center gap-2 p-2 rounded-lg bg-cyan-50 cursor-pointer"
                    onClick={() => onHabitToggle(habit.id)}
                  >
                    <CheckCircle2 className="w-4 h-4 text-cyan-500" />
                    <span className="text-lg">{habit.icon || "🎯"}</span>
                    <span className="flex-1 text-sm text-cyan-700">{habit.title}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ========== 下方：支出狀況 ========== */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-700 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-500" />
            今日支出
            <span className="text-sm text-gray-500">
              ${totalExpense.toLocaleString()}
            </span>
          </h4>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="text-xs"
              onClick={onAddExpense}
            >
              <Plus className="w-3 h-3 mr-1" />
              新增
            </Button>
            <Button variant="ghost" size="sm" className="text-xs text-gray-500" onClick={onViewFinance}>
              詳情
            </Button>
          </div>
        </div>

        {todayExpenses.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-2">今天還沒有支出記錄</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {todayExpenses.slice(0, 5).map(expense => (
              <div
                key={expense.id}
                className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-sm"
              >
                <span className="text-gray-600">{expense.category}</span>
                <span className="text-emerald-600 font-medium">${expense.amount}</span>
              </div>
            ))}
            {todayExpenses.length > 5 && (
              <span className="text-xs text-gray-400 self-center">
                +{todayExpenses.length - 5} 筆
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// 目標卡片元件
// ============================================
function GoalCard({ goal, onClick }: { goal: Goal; onClick?: () => void }) {
  const colors = GOAL_COLORS[goal.color || "blue"] || GOAL_COLORS.blue

  const getProgress = () => {
    switch (goal.goal_type) {
      case "countdown":
        return null
      case "numeric":
        if (goal.target_value === null || goal.current_value === null) return 0
        if (goal.period_type !== "once" && goal.period_target) {
          return Math.min((goal.current_value / goal.period_target) * 100, 100)
        }
        if (goal.direction === "decrease") {
          const start = goal.target_value * 2
          return Math.min(((start - goal.current_value) / (start - goal.target_value)) * 100, 100)
        }
        return Math.min((goal.current_value / goal.target_value) * 100, 100)
      case "streak":
      case "count":
        if (!goal.target_count) return 0
        return Math.min(((goal.current_count || 0) / goal.target_count) * 100, 100)
      default:
        return 0
    }
  }

  const getProgressText = () => {
    switch (goal.goal_type) {
      case "countdown":
        if (!goal.target_date) return "未設定日期"
        const targetDate = new Date(goal.target_date)
        const today = new Date()
        const diffTime = targetDate.getTime() - today.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        if (diffDays < 0) return "已過期"
        if (diffDays === 0) return "就是今天！"
        return `還有 ${diffDays} 天`
      case "numeric":
        if (goal.period_type !== "once" && goal.period_target) {
          const periodLabel = goal.period_type === "daily" ? "今日" : 
                             goal.period_type === "weekly" ? "本週" :
                             goal.period_type === "monthly" ? "本月" : "今年"
          return `${periodLabel} ${goal.current_value || 0} / ${goal.period_target} ${goal.unit || ""}`
        }
        return `${goal.current_value || 0} / ${goal.target_value || 0} ${goal.unit || ""}`
      case "streak":
        return `${goal.current_count || 0} / ${goal.target_count} 天`
      case "count":
        return `${goal.current_count || 0} / ${goal.target_count} ${goal.unit || "次"}`
      default:
        return ""
    }
  }

  const progress = getProgress()

  return (
    <div
      className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer hover:shadow-md ${colors.bg} ${colors.border}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{goal.icon}</span>
        <span className={`font-medium ${colors.text}`}>{goal.title}</span>
      </div>
      <div className="text-sm text-gray-600">{getProgressText()}</div>
      {progress !== null && (
        <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${colors.progress}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  )
}

// ============================================
// 目標區塊元件
// ============================================
function GoalSection({ 
  goals, 
  onManageClick 
}: { 
  goals: Goal[]
  onManageClick: () => void 
}) {
  const activeGoals = goals.filter(g => g.status === "active" && g.show_on_dashboard)

  if (activeGoals.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">🎯 目標追蹤</h3>
          <Button variant="outline" size="sm" onClick={onManageClick}>
            管理目標
          </Button>
        </div>
        <div className="text-center py-8 text-gray-500">
          <Target className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p>還沒有設定目標</p>
          <Button variant="link" onClick={onManageClick} className="mt-2">
            建立第一個目標
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">🎯 目標追蹤</h3>
        <Button variant="outline" size="sm" onClick={onManageClick}>
          管理目標
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {activeGoals.slice(0, 6).map((goal) => (
          <GoalCard key={goal.id} goal={goal} onClick={onManageClick} />
        ))}
      </div>
      {activeGoals.length > 6 && (
        <div className="text-center mt-3">
          <Button variant="link" onClick={onManageClick}>
            查看全部 {activeGoals.length} 個目標
          </Button>
        </div>
      )}
    </div>
  )
}

// ============================================
// 主元件
// ============================================
export default function DashboardPage() {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [calendarView, setCalendarView] = useState<"month" | "week">("month")
  const [loading, setLoading] = useState(true)
  const [indicators, setIndicators] = useState<DayIndicators>({})
  
  // 目標
  const [goals, setGoals] = useState<Goal[]>([])
  const [goalsLoading, setGoalsLoading] = useState(true)
  
  // 今日提醒
  const [tasks, setTasks] = useState<Task[]>([])
  const [habits, setHabits] = useState<Habit[]>([])
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([])
  const [scheduleSlots, setScheduleSlots] = useState<ScheduleSlot[]>([])
  const [dailyPlans, setDailyPlans] = useState<DailyPlan[]>([])
  const [todayFinance, setTodayFinance] = useState<FinanceRecord[]>([])
  
  // 收支對話框
  const [financeDialogOpen, setFinanceDialogOpen] = useState(false)
  const [financeFormData, setFinanceFormData] = useState<{
    type?: "income" | "expense"
    category_id?: string
    category?: string
    amount?: number | string
    description?: string
  }>({ type: "expense" })
  const [financeSaving, setFinanceSaving] = useState(false)

  // 載入日曆指示器
  const fetchIndicators = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

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
    tasksList.forEach(task => {
      if (task.due_date) {
        if (!newIndicators[task.due_date]) newIndicators[task.due_date] = []
        if (!newIndicators[task.due_date].includes("tasks")) {
          newIndicators[task.due_date].push("tasks")
        }
      }
    })

    // 習慣打卡
    const { data: habitsData } = await supabase
      .from("habit_logs")
      .select("date")
      .eq("user_id", user.id)
      .gte("date", startStr)
      .lte("date", endStr)

    const habitsList = (habitsData ?? []) as { date: string }[]
    habitsList.forEach(h => {
      if (!newIndicators[h.date]) newIndicators[h.date] = []
      if (!newIndicators[h.date].includes("habits")) {
        newIndicators[h.date].push("habits")
      }
    })

    // 每日行程
    const { data: plansData } = await supabase
      .from("daily_plans")
      .select("date")
      .eq("user_id", user.id)
      .gte("date", startStr)
      .lte("date", endStr)

    const plansList = (plansData ?? []) as { date: string }[]
    plansList.forEach(p => {
      if (!newIndicators[p.date]) newIndicators[p.date] = []
      if (!newIndicators[p.date].includes("daily_plan")) {
        newIndicators[p.date].push("daily_plan")
      }
    })

    // 生活日誌
    const { data: lifeJournals } = await supabase
      .from("journals_life")
      .select("date")
      .eq("user_id", user.id)
      .gte("date", startStr)
      .lte("date", endStr)

    const lifeList = (lifeJournals ?? []) as { date: string }[]
    lifeList.forEach(j => {
      if (!newIndicators[j.date]) newIndicators[j.date] = []
      if (!newIndicators[j.date].includes("journal_life")) {
        newIndicators[j.date].push("journal_life")
      }
    })

    // 收支記錄
    const { data: financeData } = await supabase
      .from("finance_records")
      .select("date")
      .eq("user_id", user.id)
      .gte("date", startStr)
      .lte("date", endStr)

    const financeList = (financeData ?? []) as { date: string }[]
    financeList.forEach(f => {
      if (!newIndicators[f.date]) newIndicators[f.date] = []
      if (!newIndicators[f.date].includes("finance")) {
        newIndicators[f.date].push("finance")
      }
    })

    // 運動記錄
    const { data: exerciseData } = await supabase
      .from("health_exercises")
      .select("date")
      .eq("user_id", user.id)
      .gte("date", startStr)
      .lte("date", endStr)

    const exerciseList = (exerciseData ?? []) as { date: string }[]
    exerciseList.forEach(e => {
      if (!newIndicators[e.date]) newIndicators[e.date] = []
      if (!newIndicators[e.date].includes("exercise")) {
        newIndicators[e.date].push("exercise")
      }
    })

    setIndicators(newIndicators)
    setLoading(false)
  }, [])

  // 載入目標
  const fetchGoals = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setGoalsLoading(false)
      return
    }

    const { data } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (data) {
      setGoals(data as Goal[])
    }
    setGoalsLoading(false)
  }, [])

  // 載入今日提醒資料
  const fetchTodayData = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const todayStr = format(new Date(), "yyyy-MM-dd")
    const threeDaysLater = format(addDays(new Date(), 3), "yyyy-MM-dd")
    const dayOfWeek = new Date().getDay() === 0 ? 7 : new Date().getDay()

    // 載入任務（今日 + 三日內 + 過期）
    const { data: tasksData } = await supabase
      .from("tasks")
      .select("id, title, due_date, completed_at, is_important, is_urgent")
      .eq("user_id", user.id)
      .or(`due_date.lte.${threeDaysLater},and(due_date.lt.${todayStr},completed_at.is.null)`)
      .order("due_date", { ascending: true })

    if (tasksData) {
      setTasks(tasksData as Task[])
    }

    // 載入習慣
    const { data: habitsData } = await supabase
      .from("habits")
      .select("id, title, icon, color, target_days, is_active")
      .eq("user_id", user.id)
      .eq("is_active", true)

    if (habitsData) {
      setHabits(habitsData as Habit[])
    }

    // 載入今日習慣記錄
    const { data: logsData } = await supabase
      .from("habit_logs")
      .select("habit_id, date, completed")
      .eq("user_id", user.id)
      .eq("date", todayStr)

    if (logsData) {
      setHabitLogs(logsData as HabitLog[])
    }

    // 載入今日課表
    const { data: scheduleData } = await supabase
      .from("schedule_slots")
      .select("id, day_of_week, slot_number, subject_name, teacher, location, note")
      .eq("user_id", user.id)
      .eq("day_of_week", dayOfWeek)
      .order("slot_number", { ascending: true })

    if (scheduleData) {
      setScheduleSlots(scheduleData as ScheduleSlot[])
    }

    // 載入今日行程
    const { data: plansData } = await supabase
      .from("daily_plans")
      .select("id, date, title, start_time, end_time, color")
      .eq("user_id", user.id)
      .eq("date", todayStr)
      .order("start_time", { ascending: true })

    if (plansData) {
      setDailyPlans(plansData as DailyPlan[])
    }

    // 載入今日收支
    const { data: financeData } = await supabase
      .from("finance_records")
      .select("id, date, type, category, amount, description")
      .eq("user_id", user.id)
      .eq("date", todayStr)
      .order("created_at", { ascending: false })

    if (financeData) {
      setTodayFinance(financeData as FinanceRecord[])
    }
  }, [])

  // 切換任務完成狀態
  const handleTaskToggle = useCallback(async (taskId: string, completed: boolean) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await (supabase
      .from("tasks") as any)
      .update({ completed_at: completed ? new Date().toISOString() : null })
      .eq("id", taskId)

    fetchTodayData()
    fetchIndicators()
  }, [fetchTodayData, fetchIndicators])

  // 切換習慣打卡
  const handleHabitToggle = useCallback(async (habitId: string) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const todayStr = format(new Date(), "yyyy-MM-dd")
    const existingLog = habitLogs.find(l => l.habit_id === habitId && l.date === todayStr)

    if (existingLog) {
      await supabase
        .from("habit_logs")
        .delete()
        .eq("habit_id", habitId)
        .eq("date", todayStr)
    } else {
      await (supabase
        .from("habit_logs") as any)
        .insert({
          habit_id: habitId,
          user_id: user.id,
          date: todayStr,
          completed: true,
        })
    }

    fetchTodayData()
    fetchIndicators()
  }, [habitLogs, fetchTodayData, fetchIndicators])

  // 儲存收支記錄
  const handleSaveFinance = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !financeFormData.category_id || !financeFormData.amount) return

    setFinanceSaving(true)
    const todayStr = format(new Date(), "yyyy-MM-dd")

    await (supabase.from("finance_records") as any).insert({
      user_id: user.id,
      date: todayStr,
      type: financeFormData.type || "expense",
      category_id: financeFormData.category_id,
      category: financeFormData.category || "",
      amount: Number(financeFormData.amount),
      description: financeFormData.description || null,
    })

    setFinanceSaving(false)
    setFinanceDialogOpen(false)
    setFinanceFormData({ type: "expense" })
    fetchTodayData()
  }

  useEffect(() => {
    fetchIndicators()
    fetchGoals()
    fetchTodayData()
  }, [fetchIndicators, fetchGoals, fetchTodayData])

  // 點擊日期 → 跳轉到日期詳情頁
  const handleSelectDate = (date: Date) => {
    setSelectedDate(date)
    const dateStr = format(date, "yyyy-MM-dd")
    router.push(`/dashboard/day/${dateStr}`)
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
      {/* 日曆 */}
      <CalendarView
        selectedDate={selectedDate}
        onSelectDate={handleSelectDate}
        indicators={indicators}
        view={calendarView}
        onViewChange={setCalendarView}
      />

      {/* 今日提醒 */}
      <TodayReminder
        tasks={tasks}
        habits={habits}
        habitLogs={habitLogs}
        scheduleSlots={scheduleSlots}
        dailyPlans={dailyPlans}
        todayFinance={todayFinance}
        onTaskToggle={handleTaskToggle}
        onHabitToggle={handleHabitToggle}
        onAddExpense={() => {
          setFinanceFormData({ type: "expense" })
          setFinanceDialogOpen(true)
        }}
        onViewTasks={() => router.push("/dashboard/tasks")}
        onViewHabits={() => router.push("/dashboard/habits")}
        onViewFinance={() => router.push("/dashboard/finance")}
      />

      {/* 目標追蹤 */}
      {!goalsLoading && (
        <GoalSection
          goals={goals}
          onManageClick={() => router.push("/dashboard/goals")}
        />
      )}

      {/* 收支對話框 */}
      <FinanceDialog
        open={financeDialogOpen}
        onOpenChange={setFinanceDialogOpen}
        formData={financeFormData}
        setFormData={setFinanceFormData}
        onSave={handleSaveFinance}
        saving={financeSaving}
        dateLabel={format(new Date(), "M月d日", { locale: zhTW })}
        isEdit={false}
      />
    </div>
  )
}
