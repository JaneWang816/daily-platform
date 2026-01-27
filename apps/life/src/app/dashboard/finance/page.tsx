//apps/life/src/app/dashboard/finance/page.tsx
"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { createClient } from "@daily/database/client"
import { 
  Button, Input, Card, CardContent, Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, Label, Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue, AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@daily/ui"
import { cn } from "@daily/utils"
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from "date-fns"
import { zhTW } from "date-fns/locale"
import {
  ArrowLeft, Plus, Wallet, TrendingUp, TrendingDown, Pencil, Trash2,
  ChevronLeft, ChevronRight, BarChart2, ArrowUpCircle, ArrowDownCircle, Target, PiggyBank, Clock,
} from "lucide-react"
import { PieChart, Pie, Cell } from "recharts"

// ============================================
// 類型定義
// ============================================
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

type FinanceCategory = {
  id: string
  user_id: string | null
  name: string
  type: "income" | "expense"
  icon: string | null
  color: string | null
  sort_order: number | null
}

type Budget = {
  id: string
  user_id: string
  year_month: string
  category_id: string | null
  amount: number
}

// ============================================
// 常數
// ============================================
const EXPENSE_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899"]

// ============================================
// 主元件
// ============================================
export default function FinancePage() {
  const supabase = createClient()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [records, setRecords] = useState<FinanceRecord[]>([])
  const [categories, setCategories] = useState<FinanceCategory[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all")

  // 記錄對話框
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<FinanceRecord | null>(null)
  const [formData, setFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    type: "expense" as "income" | "expense",
    category_id: "",
    amount: "",
    description: "",
  })
  const [saving, setSaving] = useState(false)

  // 刪除狀態
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingRecord, setDeletingRecord] = useState<FinanceRecord | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // 載入分類（預設 + 用戶自訂）
  const fetchCategories = async (userId: string) => {
    const [defaultRes, userRes] = await Promise.all([
      supabase.from("finance_categories").select("*").is("user_id", null).order("sort_order"),
      supabase.from("finance_categories").select("*").eq("user_id", userId).order("sort_order"),
    ])
    const allCategories = [...(defaultRes.data || []), ...(userRes.data || [])] as FinanceCategory[]
    setCategories(allCategories)
  }

  // 載入記錄
  const fetchRecords = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await fetchCategories(user.id)

    const startDate = format(startOfMonth(currentMonth), "yyyy-MM-dd")
    const endDate = format(endOfMonth(currentMonth), "yyyy-MM-dd")
    const yearMonth = format(currentMonth, "yyyy-MM")

    const [recordsRes, budgetsRes] = await Promise.all([
      supabase.from("finance_records").select("*").eq("user_id", user.id).gte("date", startDate).lte("date", endDate).order("date", { ascending: false }),
      supabase.from("budgets").select("*").eq("user_id", user.id).eq("year_month", yearMonth),
    ])

    if (recordsRes.data) setRecords(recordsRes.data as FinanceRecord[])
    if (budgetsRes.data) setBudgets(budgetsRes.data as Budget[])
    setLoading(false)
  }

  useEffect(() => { fetchRecords() }, [currentMonth])

  // 分類對應
  const categoryMap = useMemo(() => {
    const map = new Map<string, FinanceCategory>()
    categories.forEach(c => map.set(c.id, c))
    return map
  }, [categories])

  const expenseCategories = categories.filter(c => c.type === "expense")
  const incomeCategories = categories.filter(c => c.type === "income")

  // 統計
  const totalIncome = records.filter(r => r.type === "income").reduce((sum, r) => sum + Number(r.amount), 0)
  const totalExpense = records.filter(r => r.type === "expense").reduce((sum, r) => sum + Number(r.amount), 0)
  const balance = totalIncome - totalExpense

  // 預算
  const totalBudget = budgets.find(b => !b.category_id)
  const budgetAmount = totalBudget ? Number(totalBudget.amount) : 0
  const budgetUsedPercent = budgetAmount > 0 ? (totalExpense / budgetAmount) * 100 : 0

  // 各分類支出統計
  const expenseByCategoryData = useMemo(() => {
    const catMap = new Map<string, number>()
    records.filter(r => r.type === "expense").forEach(r => {
      const catId = r.category_id || "__uncategorized__"
      catMap.set(catId, (catMap.get(catId) || 0) + Number(r.amount))
    })
    const total = Array.from(catMap.values()).reduce((a, b) => a + b, 0)
    return Array.from(catMap.entries())
      .map(([catId, value], index) => {
        const cat = categoryMap.get(catId)
        return {
          id: catId,
          name: cat?.name || "未分類",
          value,
          icon: cat?.icon || "📦",
          color: cat?.color || EXPENSE_COLORS[index % EXPENSE_COLORS.length],
          percent: total > 0 ? (value / total) * 100 : 0,
        }
      })
      .sort((a, b) => b.value - a.value)
  }, [records, categoryMap])

  // 各分類預算使用率
  const categoryBudgetUsage = useMemo(() => {
    const categoryBudgets = budgets.filter(b => b.category_id)
    return categoryBudgets.map(b => {
      const cat = categoryMap.get(b.category_id || "")
      const spent = records
        .filter(r => r.type === "expense" && r.category_id === b.category_id)
        .reduce((sum, r) => sum + Number(r.amount), 0)
      const budgetAmt = Number(b.amount)
      const usedPercent = budgetAmt > 0 ? (spent / budgetAmt) * 100 : 0
      return {
        id: b.category_id || "",
        name: cat?.name || "未知",
        icon: cat?.icon || "📦",
        budget: budgetAmt,
        spent,
        usedPercent,
      }
    }).sort((a, b) => b.usedPercent - a.usedPercent)
  }, [budgets, records, categoryMap])

  // 開啟新增/編輯對話框
  const openDialog = (record?: FinanceRecord) => {
    if (record) {
      setEditingRecord(record)
      setFormData({
        date: record.date,
        type: record.type,
        category_id: record.category_id || "",
        amount: record.amount.toString(),
        description: record.description || "",
      })
    } else {
      setEditingRecord(null)
      setFormData({
        date: format(new Date(), "yyyy-MM-dd"),
        type: "expense",
        category_id: "",
        amount: "",
        description: "",
      })
    }
    setDialogOpen(true)
  }

  // 儲存記錄
  const handleSave = async () => {
    if (!formData.category_id || !formData.amount) return
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const category = categoryMap.get(formData.category_id)
    const data = {
      date: formData.date,
      type: formData.type,
      category_id: formData.category_id,
      category: category?.name || "",
      amount: parseFloat(formData.amount),
      description: formData.description.trim() || null,
    }

    if (editingRecord) {
      await supabase.from("finance_records").update(data as Record<string, unknown>).eq("id", editingRecord.id)
    } else {
      await supabase.from("finance_records").insert({ ...data, user_id: user.id } as Record<string, unknown>)
    }

    setSaving(false)
    setDialogOpen(false)
    fetchRecords()
  }

  // 刪除記錄
  const handleDelete = async () => {
    if (!deletingRecord) return
    setDeleteLoading(true)
    await supabase.from("finance_records").delete().eq("id", deletingRecord.id)
    setDeleteLoading(false)
    setDeleteDialogOpen(false)
    setDeletingRecord(null)
    fetchRecords()
  }

  // 月份切換
  const goToPrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const goToCurrentMonth = () => setCurrentMonth(new Date())

  // 篩選記錄
  const filteredRecords = records.filter(r => filter === "all" || r.type === filter)

  // 格式化日期
  const formatDate = (date: string) => format(new Date(date), "M/d EEEE", { locale: zhTW })

  // 取得進度條顏色
  const getBarColor = (percent: number) => {
    if (percent >= 100) return "bg-red-500"
    if (percent >= 80) return "bg-amber-500"
    return "bg-green-500"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
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
        <div className="flex gap-2">
          <Link href="/dashboard/finance/budget">
            <Button variant="outline" size="sm" className="gap-2">
              <Target className="w-4 h-4" />
              預算管理
            </Button>
          </Link>
          <Link href="/dashboard/finance/stats">
            <Button variant="outline" size="sm" className="gap-2">
              <BarChart2 className="w-4 h-4" />
              財務統計
            </Button>
          </Link>
        </div>
      </div>

      {/* 頁面標題 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">💰 收支記錄</h1>
          <p className="text-gray-600 mt-1">管理你的收入與支出</p>
        </div>
        <Button onClick={() => openDialog()} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4 mr-2" />
          新增記錄
        </Button>
      </div>

      {/* 月份選擇 */}
      <div className="flex items-center justify-center gap-4">
        <Button variant="ghost" size="icon" onClick={goToPrevMonth}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <button onClick={goToCurrentMonth} className="text-lg font-semibold text-gray-800 hover:text-emerald-600">
          {format(currentMonth, "yyyy 年 M 月", { locale: zhTW })}
        </button>
        <Button variant="ghost" size="icon" onClick={goToNextMonth}>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <p className="text-xl font-bold text-green-600">+${totalIncome.toLocaleString()}</p>
            <p className="text-xs text-gray-500">收入</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-rose-50">
          <CardContent className="p-4 text-center">
            <TrendingDown className="w-6 h-6 text-red-600 mx-auto mb-2" />
            <p className="text-xl font-bold text-red-600">-${totalExpense.toLocaleString()}</p>
            <p className="text-xs text-gray-500">支出</p>
          </CardContent>
        </Card>
        <Card className={cn("bg-gradient-to-br", balance >= 0 ? "from-blue-50 to-cyan-50" : "from-amber-50 to-orange-50")}>
          <CardContent className="p-4 text-center">
            <Wallet className={cn("w-6 h-6 mx-auto mb-2", balance >= 0 ? "text-blue-600" : "text-amber-600")} />
            <p className={cn("text-xl font-bold", balance >= 0 ? "text-blue-600" : "text-amber-600")}>
              ${balance.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500">結餘</p>
          </CardContent>
        </Card>
      </div>

      {/* 本月預算 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-800 flex items-center gap-2">
              <PiggyBank className="w-4 h-4" />
              本月預算
            </h3>
            <Link href="/dashboard/finance/budget" className="text-sm text-amber-600 hover:underline">
              管理預算
            </Link>
          </div>
          {totalBudget ? (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">
                  已支出 ${totalExpense.toLocaleString()} / 預算 ${budgetAmount.toLocaleString()}
                </span>
                <span className={cn("text-sm font-medium", budgetUsedPercent > 100 ? "text-red-600" : budgetUsedPercent > 80 ? "text-amber-600" : "text-green-600")}>
                  {budgetUsedPercent.toFixed(1)}%
                </span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", getBarColor(budgetUsedPercent))}
                  style={{ width: `${Math.min(budgetUsedPercent, 100)}%` }}
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">尚未設定預算</p>
          )}
        </CardContent>
      </Card>

      {/* 兩個統計圖 */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* 預算使用率 - 橫向條狀圖 */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-gray-800 flex items-center gap-2 mb-1">
              <Target className="w-4 h-4" />
              預算使用率
            </h3>
            <p className="text-xs text-gray-500 mb-4">各分類支出佔預算比例</p>
            
            {categoryBudgetUsage.length > 0 ? (
              <div className="space-y-3">
                {categoryBudgetUsage.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <span className="text-lg w-6">{item.icon}</span>
                    <span className="text-sm w-16 truncate">{item.name}</span>
                    <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                      <div
                        className={cn("h-full rounded transition-all", getBarColor(item.usedPercent))}
                        style={{ width: `${Math.min(item.usedPercent, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-12 text-right">{item.usedPercent.toFixed(0)}%</span>
                  </div>
                ))}
                {/* 圖例 */}
                <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-xs text-gray-500">&lt;80%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="text-xs text-gray-500">80-100%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-xs text-gray-500">&gt;100%</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Target className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-gray-400 text-sm">尚未設定分類預算</p>
                <Link href="/dashboard/finance/budget">
                  <Button size="sm" variant="outline" className="mt-2">設定預算</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 支出結構 - 環形圖 */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-gray-800 flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4" />
              支出結構
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              {format(currentMonth, "yyyy年M月", { locale: zhTW })} 各分類支出佔比
            </p>
            
            {expenseByCategoryData.length > 0 ? (
              <div className="flex flex-col items-center gap-4">
                {/* 環形圖 */}
                <div className="w-[200px] h-[200px] shrink-0">
                  <PieChart width={200} height={200}>
                    <Pie
                      data={expenseByCategoryData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={32}
                      outerRadius={78}
                      strokeWidth={2}
                      stroke="#fff"
                    >
                      {expenseByCategoryData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </div>
                
                {/* 圖例列表 */}
                <div className="flex-1 space-y-2">
                  {expenseByCategoryData.slice(0, 5).map((item) => (
                    <div key={item.id} className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="truncate flex-1">{item.icon} {item.name}</span>
                      <span className="font-medium">${item.value.toLocaleString()}</span>
                      <span className="text-gray-400 text-xs w-10 text-right">{item.percent.toFixed(1)}%</span>
                    </div>
                  ))}
                  {expenseByCategoryData.length > 5 && (
                    <p className="text-xs text-gray-400 pt-1">還有 {expenseByCategoryData.length - 5} 個分類...</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <BarChart2 className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-gray-400 text-sm">本月尚無支出記錄</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 篩選 */}
      <div className="flex gap-2">
        {[
          { value: "all", label: "全部" },
          { value: "expense", label: "支出" },
          { value: "income", label: "收入" },
        ].map((item) => (
          <Button
            key={item.value}
            variant={filter === item.value ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(item.value as "all" | "income" | "expense")}
            className={filter === item.value ? "bg-emerald-600 hover:bg-emerald-700" : ""}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {/* 記錄列表 */}
      {filteredRecords.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <Wallet className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">本月還沒有記錄</h3>
          <Button onClick={() => openDialog()} className="mt-4">
            <Plus className="w-4 h-4 mr-2" />
            新增第一筆記錄
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRecords.map((record) => {
            const category = categoryMap.get(record.category_id || "")
            return (
              <Card key={record.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center text-2xl",
                      record.type === "income" ? "bg-green-100" : "bg-red-100"
                    )}>
                      {category?.icon || (record.type === "income" ? "💰" : "💸")}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-800">{category?.name || record.category}</h3>
                        <span className="text-sm text-gray-500">{formatDate(record.date)}</span>
                      </div>
                      {record.description && (
                        <p className="text-sm text-gray-500">{record.description}</p>
                      )}
                    </div>
                    <p className={cn(
                      "text-xl font-bold",
                      record.type === "income" ? "text-green-600" : "text-red-600"
                    )}>
                      {record.type === "income" ? "+" : "-"}${Number(record.amount).toLocaleString()}
                    </p>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDialog(record)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500"
                        onClick={() => { setDeletingRecord(record); setDeleteDialogOpen(true) }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* 新增/編輯對話框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRecord ? "編輯記錄" : "新增記錄"}</DialogTitle>
            <DialogDescription>記錄你的收支</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* 類型切換 */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant={formData.type === "expense" ? "default" : "outline"}
                className={formData.type === "expense" ? "bg-red-600 hover:bg-red-700 flex-1" : "flex-1"}
                onClick={() => setFormData({ ...formData, type: "expense", category_id: "" })}
              >
                <ArrowDownCircle className="w-4 h-4 mr-2" />
                支出
              </Button>
              <Button
                type="button"
                variant={formData.type === "income" ? "default" : "outline"}
                className={formData.type === "income" ? "bg-green-600 hover:bg-green-700 flex-1" : "flex-1"}
                onClick={() => setFormData({ ...formData, type: "income", category_id: "" })}
              >
                <ArrowUpCircle className="w-4 h-4 mr-2" />
                收入
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>分類 *</Label>
                <Select value={formData.category_id} onValueChange={(v) => setFormData({ ...formData, category_id: v })}>
                  <SelectTrigger><SelectValue placeholder="選擇分類" /></SelectTrigger>
                  <SelectContent>
                    {(formData.type === "expense" ? expenseCategories : incomeCategories).map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.icon || "📦"} {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>日期</Label>
                <Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>金額 *</Label>
              <Input
                type="number"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label>備註</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="選填"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSave} disabled={saving || !formData.category_id || !formData.amount}>
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
            <AlertDialogDescription>刪除後無法復原。</AlertDialogDescription>
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
