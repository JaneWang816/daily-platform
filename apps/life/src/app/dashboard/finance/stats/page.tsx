//apps/life/src/app/dashboard/finance/stats/page.tsx
"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { createClient } from "@daily/database/client"
import { Button, Card, CardContent } from "@daily/ui"
import { cn } from "@daily/utils"
import { format, subMonths } from "date-fns"
import { zhTW } from "date-fns/locale"
import {
  ArrowLeft, TrendingUp, TrendingDown, Wallet, ChevronLeft, ChevronRight,
  AlertCircle, CheckCircle, Info,
} from "lucide-react"
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts"

// ============================================
// 類型定義
// ============================================
type FinanceRecord = {
  id: string
  date: string
  type: "income" | "expense"
  category_id: string | null
  amount: number
}

type FinanceCategory = {
  id: string
  name: string
  type: "income" | "expense"
  icon: string | null
  color: string | null
}

type Budget = {
  id: string
  category_id: string | null
  amount: number
}

// ============================================
// 常數
// ============================================
const EXPENSE_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899"]
const INCOME_COLORS = ["#22c55e", "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9"]

// ============================================
// 主元件
// ============================================
export default function FinanceStatsPage() {
  const supabase = createClient()
  const [currentMonth, setCurrentMonth] = useState(format(new Date(), "yyyy-MM"))
  const [timeRange, setTimeRange] = useState<"3" | "6" | "12">("3")
  const [records, setRecords] = useState<FinanceRecord[]>([])
  const [categories, setCategories] = useState<FinanceCategory[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)

  // 載入資料
  const fetchData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const months = parseInt(timeRange)
    const startDate = format(subMonths(new Date(), months - 1), "yyyy-MM-01")

    const [defaultCatRes, userCatRes, recordsRes, budgetsRes] = await Promise.all([
      supabase.from("finance_categories").select("*").is("user_id", null),
      supabase.from("finance_categories").select("*").eq("user_id", user.id),
      supabase.from("finance_records").select("*").eq("user_id", user.id).gte("date", startDate).order("date"),
      supabase.from("budgets").select("*").eq("user_id", user.id).eq("year_month", currentMonth),
    ])

    setCategories([...(defaultCatRes.data || []), ...(userCatRes.data || [])] as FinanceCategory[])
    setRecords((recordsRes.data || []) as FinanceRecord[])
    setBudgets((budgetsRes.data || []) as Budget[])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [timeRange, currentMonth])

  // 分類對應
  const categoryMap = useMemo(() => {
    const map = new Map<string, FinanceCategory>()
    categories.forEach(c => map.set(c.id, c))
    return map
  }, [categories])

  // 本月/上月記錄
  const currentMonthRecords = useMemo(() => records.filter(r => r.date.startsWith(currentMonth)), [records, currentMonth])
  const lastMonthRecords = useMemo(() => {
    const lastMonth = format(subMonths(new Date(currentMonth + "-01"), 1), "yyyy-MM")
    return records.filter(r => r.date.startsWith(lastMonth))
  }, [records, currentMonth])

  // 統計
  const currentMonthIncome = currentMonthRecords.filter(r => r.type === "income").reduce((sum, r) => sum + Number(r.amount), 0)
  const currentMonthExpense = currentMonthRecords.filter(r => r.type === "expense").reduce((sum, r) => sum + Number(r.amount), 0)
  const currentMonthBalance = currentMonthIncome - currentMonthExpense

  const lastMonthIncome = lastMonthRecords.filter(r => r.type === "income").reduce((sum, r) => sum + Number(r.amount), 0)
  const lastMonthExpense = lastMonthRecords.filter(r => r.type === "expense").reduce((sum, r) => sum + Number(r.amount), 0)

  const incomeChange = lastMonthIncome > 0 ? ((currentMonthIncome - lastMonthIncome) / lastMonthIncome) * 100 : 0
  const expenseChange = lastMonthExpense > 0 ? ((currentMonthExpense - lastMonthExpense) / lastMonthExpense) * 100 : 0

  // 預算
  const totalBudget = budgets.find(b => !b.category_id)
  const budgetUsage = totalBudget ? { used: currentMonthExpense, budget: Number(totalBudget.amount), percent: (currentMonthExpense / Number(totalBudget.amount)) * 100 } : null

  // 每月趨勢
  const monthlyTrendData = useMemo(() => {
    const monthMap = new Map<string, { income: number; expense: number }>()
    records.forEach(r => {
      const month = r.date.slice(0, 7)
      if (!monthMap.has(month)) monthMap.set(month, { income: 0, expense: 0 })
      const data = monthMap.get(month)!
      if (r.type === "income") data.income += Number(r.amount)
      else data.expense += Number(r.amount)
    })
    return Array.from(monthMap.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([month, data]) => ({
      monthLabel: `${parseInt(month.split("-")[1])}月`,
      income: data.income,
      expense: data.expense,
    }))
  }, [records])

  // 支出/收入分類
  const expenseByCategoryData = useMemo(() => {
    const catMap = new Map<string, number>()
    currentMonthRecords.filter(r => r.type === "expense").forEach(r => {
      const catId = r.category_id || "__uncategorized__"
      catMap.set(catId, (catMap.get(catId) || 0) + Number(r.amount))
    })
    const total = Array.from(catMap.values()).reduce((a, b) => a + b, 0)
    return Array.from(catMap.entries()).map(([catId, value], index) => {
      const cat = categoryMap.get(catId)
      return { name: cat?.name || "未分類", value, icon: cat?.icon || "📦", color: cat?.color || EXPENSE_COLORS[index % EXPENSE_COLORS.length], percent: total > 0 ? (value / total) * 100 : 0 }
    }).sort((a, b) => b.value - a.value)
  }, [currentMonthRecords, categoryMap])

  const incomeByCategoryData = useMemo(() => {
    const catMap = new Map<string, number>()
    currentMonthRecords.filter(r => r.type === "income").forEach(r => {
      const catId = r.category_id || "__uncategorized__"
      catMap.set(catId, (catMap.get(catId) || 0) + Number(r.amount))
    })
    const total = Array.from(catMap.values()).reduce((a, b) => a + b, 0)
    return Array.from(catMap.entries()).map(([catId, value], index) => {
      const cat = categoryMap.get(catId)
      return { name: cat?.name || "未分類", value, icon: cat?.icon || "📦", color: cat?.color || INCOME_COLORS[index % INCOME_COLORS.length], percent: total > 0 ? (value / total) * 100 : 0 }
    }).sort((a, b) => b.value - a.value)
  }, [currentMonthRecords, categoryMap])

  // 每日支出
  const dailyExpenseData = useMemo(() => {
    const dayMap = new Map<string, number>()
    currentMonthRecords.filter(r => r.type === "expense").forEach(r => dayMap.set(r.date, (dayMap.get(r.date) || 0) + Number(r.amount)))
    const [year, month] = currentMonth.split("-").map(Number)
    const daysInMonth = new Date(year, month, 0).getDate()
    const today = new Date()
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month
    const maxDay = isCurrentMonth ? today.getDate() : daysInMonth
    const result = []
    for (let d = 1; d <= maxDay; d++) {
      const dateStr = `${currentMonth}-${String(d).padStart(2, "0")}`
      result.push({ day: `${d}日`, expense: dayMap.get(dateStr) || 0 })
    }
    return result
  }, [currentMonthRecords, currentMonth])

  // 理財建議
  const financialAdvice = useMemo(() => {
    const advice: { type: "warning" | "info" | "success"; message: string }[] = []
    if (currentMonthBalance < 0) advice.push({ type: "warning", message: `本月支出超過收入 $${Math.abs(currentMonthBalance).toLocaleString()}，建議檢視支出項目。` })
    else if (currentMonthBalance > 0) advice.push({ type: "success", message: `本月結餘 $${currentMonthBalance.toLocaleString()}，持續保持良好的理財習慣！` })
    if (budgetUsage && budgetUsage.percent > 100) advice.push({ type: "warning", message: `已超出預算 ${(budgetUsage.percent - 100).toFixed(0)}%，請注意控制支出。` })
    else if (budgetUsage && budgetUsage.percent > 80) advice.push({ type: "info", message: `預算已使用 ${budgetUsage.percent.toFixed(0)}%，剩餘 $${(budgetUsage.budget - budgetUsage.used).toLocaleString()}。` })
    if (expenseChange > 20) advice.push({ type: "warning", message: `本月支出比上月增加 ${expenseChange.toFixed(0)}%，注意控制消費。` })
    if (expenseByCategoryData.length > 0 && expenseByCategoryData[0].percent > 50) advice.push({ type: "info", message: `「${expenseByCategoryData[0].name}」佔支出的 ${expenseByCategoryData[0].percent.toFixed(0)}%，可考慮是否需要調整。` })
    return advice
  }, [currentMonthBalance, budgetUsage, expenseChange, expenseByCategoryData])

  // 月份切換
  const goToPrevMonth = () => setCurrentMonth(format(subMonths(new Date(currentMonth + "-01"), 1), "yyyy-MM"))
  const goToNextMonth = () => { const [y, m] = currentMonth.split("-").map(Number); setCurrentMonth(format(new Date(y, m, 1), "yyyy-MM")) }

  if (loading) return <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/finance"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
          <div><h1 className="text-2xl font-bold text-gray-800">📊 收支統計</h1><p className="text-gray-500">分析你的財務狀況</p></div>
        </div>
        <div className="flex gap-2">
          {(["3", "6", "12"] as const).map(t => (
            <Button key={t} variant={timeRange === t ? "default" : "outline"} size="sm" onClick={() => setTimeRange(t)} className={timeRange === t ? "bg-emerald-600" : ""}>{t}個月</Button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center gap-4">
        <Button variant="ghost" size="icon" onClick={goToPrevMonth}><ChevronLeft className="w-5 h-5" /></Button>
        <span className="text-lg font-semibold text-gray-800">{format(new Date(currentMonth + "-01"), "yyyy 年 M 月", { locale: zhTW })}</span>
        <Button variant="ghost" size="icon" onClick={goToNextMonth}><ChevronRight className="w-5 h-5" /></Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center"><TrendingUp className="w-5 h-5 text-green-600" /></div><div><p className="text-xl font-bold text-green-600">${currentMonthIncome.toLocaleString()}</p><div className="flex items-center gap-1"><p className="text-sm text-gray-500">收入</p>{incomeChange !== 0 && <span className={cn("text-xs", incomeChange > 0 ? "text-green-500" : "text-red-500")}>{incomeChange > 0 ? "↑" : "↓"}{Math.abs(incomeChange).toFixed(0)}%</span>}</div></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center"><TrendingDown className="w-5 h-5 text-red-600" /></div><div><p className="text-xl font-bold text-red-600">${currentMonthExpense.toLocaleString()}</p><div className="flex items-center gap-1"><p className="text-sm text-gray-500">支出</p>{expenseChange !== 0 && <span className={cn("text-xs", expenseChange > 0 ? "text-red-500" : "text-green-500")}>{expenseChange > 0 ? "↑" : "↓"}{Math.abs(expenseChange).toFixed(0)}%</span>}</div></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", currentMonthBalance >= 0 ? "bg-blue-100" : "bg-amber-100")}><Wallet className={cn("w-5 h-5", currentMonthBalance >= 0 ? "text-blue-600" : "text-amber-600")} /></div><div><p className={cn("text-xl font-bold", currentMonthBalance >= 0 ? "text-blue-600" : "text-amber-600")}>${currentMonthBalance.toLocaleString()}</p><p className="text-sm text-gray-500">結餘</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center"><span className="text-lg">📊</span></div><div><p className="text-xl font-bold text-purple-600">{currentMonthRecords.length}</p><p className="text-sm text-gray-500">筆記錄</p></div></div></CardContent></Card>
      </div>

      <Card><CardContent className="p-6"><h3 className="text-lg font-semibold text-gray-800 mb-4">📈 收支趨勢</h3>{monthlyTrendData.length > 0 ? <ResponsiveContainer width="100%" height={250}><BarChart data={monthlyTrendData}><CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" /><XAxis dataKey="monthLabel" stroke="#6b7280" fontSize={12} /><YAxis stroke="#6b7280" fontSize={12} /><Tooltip contentStyle={{ backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "8px" }} formatter={(value) => [`$${(value as number).toLocaleString()}`, ""]} /><Legend /><Bar dataKey="income" name="收入" fill="#22c55e" radius={[4, 4, 0, 0]} /><Bar dataKey="expense" name="支出" fill="#ef4444" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer> : <div className="h-[250px] flex items-center justify-center text-gray-400">尚無記錄</div>}</CardContent></Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card><CardContent className="p-6"><h3 className="text-lg font-semibold text-gray-800 mb-4">💸 支出分類</h3>{expenseByCategoryData.length > 0 ? <div className="flex items-center gap-4"><div className="w-[150px] h-[150px]"><PieChart width={150} height={150}><Pie data={expenseByCategoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70}>{expenseByCategoryData.map((entry, index) => <Cell key={index} fill={entry.color} />)}</Pie></PieChart></div><div className="flex-1 space-y-2">{expenseByCategoryData.slice(0, 5).map((item, index) => <div key={index} className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} /><span className="text-sm">{item.icon} {item.name}</span></div><span className="text-sm font-medium">{item.percent.toFixed(0)}%</span></div>)}</div></div> : <div className="h-[150px] flex items-center justify-center text-gray-400">尚無支出</div>}</CardContent></Card>
        <Card><CardContent className="p-6"><h3 className="text-lg font-semibold text-gray-800 mb-4">💰 收入分類</h3>{incomeByCategoryData.length > 0 ? <div className="flex items-center gap-4"><div className="w-[150px] h-[150px]"><PieChart width={150} height={150}><Pie data={incomeByCategoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70}>{incomeByCategoryData.map((entry, index) => <Cell key={index} fill={entry.color} />)}</Pie></PieChart></div><div className="flex-1 space-y-2">{incomeByCategoryData.slice(0, 5).map((item, index) => <div key={index} className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} /><span className="text-sm">{item.icon} {item.name}</span></div><span className="text-sm font-medium">{item.percent.toFixed(0)}%</span></div>)}</div></div> : <div className="h-[150px] flex items-center justify-center text-gray-400">尚無收入</div>}</CardContent></Card>
      </div>

      <Card><CardContent className="p-6"><h3 className="text-lg font-semibold text-gray-800 mb-4">📅 每日支出</h3>{dailyExpenseData.length > 0 ? <ResponsiveContainer width="100%" height={200}><LineChart data={dailyExpenseData}><CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" /><XAxis dataKey="day" stroke="#6b7280" fontSize={10} interval={4} /><YAxis stroke="#6b7280" fontSize={12} /><Tooltip contentStyle={{ backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "8px" }} formatter={(value) => [`$${(value as number).toLocaleString()}`, "支出"]} /><Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} dot={{ fill: "#ef4444", r: 3 }} /></LineChart></ResponsiveContainer> : <div className="h-[200px] flex items-center justify-center text-gray-400">尚無支出</div>}</CardContent></Card>

      {financialAdvice.length > 0 && <Card><CardContent className="p-6"><h3 className="text-lg font-semibold text-gray-800 mb-4">💡 理財建議</h3><div className="space-y-3">{financialAdvice.map((item, index) => <div key={index} className={cn("p-4 rounded-lg flex items-start gap-3", item.type === "success" && "bg-green-50", item.type === "warning" && "bg-amber-50", item.type === "info" && "bg-blue-50")}>{item.type === "success" && <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />}{item.type === "warning" && <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />}{item.type === "info" && <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />}<p className="text-gray-700">{item.message}</p></div>)}</div></CardContent></Card>}
    </div>
  )
}
