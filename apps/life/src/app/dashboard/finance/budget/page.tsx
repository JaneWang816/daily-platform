//apps/life/src/app/dashboard/finance/budget/page.tsx
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
import { format, subMonths, addMonths } from "date-fns"
import { zhTW } from "date-fns/locale"
import {
  ArrowLeft, Plus, Target, Pencil, Trash2, ChevronLeft, ChevronRight, Copy,
} from "lucide-react"

// ============================================
// 類型定義
// ============================================
type FinanceCategory = {
  id: string
  user_id: string | null
  name: string
  type: "income" | "expense"
  icon: string | null
  color: string | null
}

type Budget = {
  id: string
  user_id: string
  year_month: string
  category_id: string | null
  amount: number
}

// ============================================
// 工具函數
// ============================================
const getPrevMonth = (yearMonth: string) => {
  const [year, month] = yearMonth.split("-").map(Number)
  const date = new Date(year, month - 2, 1)
  return format(date, "yyyy-MM")
}

// ============================================
// 主元件
// ============================================
export default function BudgetPage() {
  const supabase = createClient()
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"))
  const [categories, setCategories] = useState<FinanceCategory[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [monthlyExpenses, setMonthlyExpenses] = useState<Record<string, number>>({})
  const [totalExpense, setTotalExpense] = useState(0)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  // 表單狀態
  const [formOpen, setFormOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  const [budgetCategoryId, setBudgetCategoryId] = useState<string>("__total__")
  const [budgetAmount, setBudgetAmount] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  // 刪除狀態
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingBudget, setDeletingBudget] = useState<Budget | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // 複製上月
  const [copyDialogOpen, setCopyDialogOpen] = useState(false)
  const [copyLoading, setCopyLoading] = useState(false)

  // 載入資料
  const fetchData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    setUserId(user.id)

    // 載入支出分類
    const [defaultRes, userRes] = await Promise.all([
      supabase.from("finance_categories").select("*").is("user_id", null).eq("type", "expense").order("sort_order"),
      supabase.from("finance_categories").select("*").eq("user_id", user.id).eq("type", "expense").order("sort_order"),
    ])
    const allCategories = [...(defaultRes.data || []), ...(userRes.data || [])] as FinanceCategory[]
    setCategories(allCategories)

    // 載入當月預算
    const { data: budgetsData } = await supabase
      .from("budgets")
      .select("*")
      .eq("user_id", user.id)
      .eq("year_month", selectedMonth)
      .order("created_at")
    setBudgets((budgetsData || []) as Budget[])

    // 載入當月支出統計
    const [year, month] = selectedMonth.split("-").map(Number)
    const startDate = `${selectedMonth}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const endDate = `${selectedMonth}-${lastDay}`

    const { data: expensesData } = await supabase
      .from("finance_records")
      .select("category_id, amount")
      .eq("user_id", user.id)
      .eq("type", "expense")
      .gte("date", startDate)
      .lte("date", endDate)

    if (expensesData) {
      const expensesByCategory: Record<string, number> = {}
      let total = 0
      expensesData.forEach((record) => {
        const catId = record.category_id || "__uncategorized__"
        expensesByCategory[catId] = (expensesByCategory[catId] || 0) + Number(record.amount)
        total += Number(record.amount)
      })
      setMonthlyExpenses(expensesByCategory)
      setTotalExpense(total)
    }

    setLoading(false)
  }

  useEffect(() => { fetchData() }, [selectedMonth])

  // 分類對應
  const categoryMap = useMemo(() => {
    const map = new Map<string, FinanceCategory>()
    categories.forEach(c => map.set(c.id, c))
    return map
  }, [categories])

  // 總預算 & 分類預算
  const totalBudget = useMemo(() => budgets.find(b => !b.category_id), [budgets])
  const categoryBudgets = useMemo(() => budgets.filter(b => b.category_id), [budgets])
  const budgetedCategoryIds = useMemo(() => new Set(categoryBudgets.map(b => b.category_id)), [categoryBudgets])
  const unbudgetedCategories = useMemo(() => categories.filter(c => !budgetedCategoryIds.has(c.id)), [categories, budgetedCategoryIds])

  // 月份切換
  const goToPrevMonth = () => setSelectedMonth(format(subMonths(new Date(selectedMonth + "-01"), 1), "yyyy-MM"))
  const goToNextMonth = () => setSelectedMonth(format(addMonths(new Date(selectedMonth + "-01"), 1), "yyyy-MM"))

  // 開啟表單
  const openCreateForm = () => {
    setEditingBudget(null)
    setBudgetCategoryId("__total__")
    setBudgetAmount(null)
    setFormOpen(true)
  }

  const openEditForm = (budget: Budget) => {
    setEditingBudget(budget)
    setBudgetCategoryId(budget.category_id || "__total__")
    setBudgetAmount(Number(budget.amount))
    setFormOpen(true)
  }

  // 儲存預算
  const handleSave = async () => {
    if (!budgetAmount || budgetAmount <= 0 || !userId) return
    setSaving(true)

    const categoryId = budgetCategoryId === "__total__" ? null : budgetCategoryId

    if (editingBudget) {
      const { error } = await supabase.from("budgets").update({ category_id: categoryId, amount: budgetAmount }).eq("id", editingBudget.id)
      if (error) alert(`儲存失敗: ${error.message}`)
    } else {
      const { error } = await supabase.from("budgets").insert({ user_id: userId, year_month: selectedMonth, category_id: categoryId, amount: budgetAmount })
      if (error) {
        if (error.code === "23505") alert("此預算項目已存在")
        else alert(`儲存失敗: ${error.message}`)
      }
    }

    setSaving(false)
    setFormOpen(false)
    fetchData()
  }

  // 刪除預算
  const handleDelete = async () => {
    if (!deletingBudget) return
    setDeleteLoading(true)
    await supabase.from("budgets").delete().eq("id", deletingBudget.id)
    setDeleteLoading(false)
    setDeleteDialogOpen(false)
    setDeletingBudget(null)
    fetchData()
  }

  // 複製上月預算
  const handleCopyFromLastMonth = async () => {
    if (!userId) return
    setCopyLoading(true)

    const prevMonth = getPrevMonth(selectedMonth)
    const { data: prevBudgets } = await supabase
      .from("budgets")
      .select("category_id, amount")
      .eq("user_id", userId)
      .eq("year_month", prevMonth)

    if (!prevBudgets || prevBudgets.length === 0) {
      alert("上個月沒有預算記錄可複製")
      setCopyLoading(false)
      setCopyDialogOpen(false)
      return
    }

    const newBudgets = prevBudgets.map(b => ({
      user_id: userId,
      year_month: selectedMonth,
      category_id: b.category_id,
      amount: b.amount,
    }))

    const { error } = await supabase.from("budgets").insert(newBudgets)
    if (error) {
      if (error.code === "23505") alert("部分預算已存在，請手動調整")
      else alert(`複製失敗: ${error.message}`)
    }

    setCopyLoading(false)
    setCopyDialogOpen(false)
    fetchData()
  }

  // 計算百分比
  const getUsagePercent = (spent: number, budget: number) => budget > 0 ? Math.min((spent / budget) * 100, 100) : 0
  const getProgressColor = (percent: number) => percent >= 100 ? "bg-red-500" : percent >= 80 ? "bg-amber-500" : "bg-emerald-500"

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/finance">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">🎯 預算管理</h1>
            <p className="text-gray-500">設定並追蹤你的支出預算</p>
          </div>
        </div>
        <div className="flex gap-2">
          {budgets.length === 0 && (
            <Button variant="outline" onClick={() => setCopyDialogOpen(true)}>
              <Copy className="w-4 h-4 mr-2" />
              複製上月
            </Button>
          )}
          <Button onClick={openCreateForm} className="bg-amber-600 hover:bg-amber-700">
            <Plus className="w-4 h-4 mr-2" />
            新增預算
          </Button>
        </div>
      </div>

      {/* 月份選擇 */}
      <div className="flex items-center justify-center gap-4">
        <Button variant="ghost" size="icon" onClick={goToPrevMonth}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <span className="text-lg font-semibold text-gray-800">
          {format(new Date(selectedMonth + "-01"), "yyyy 年 M 月", { locale: zhTW })}
        </span>
        <Button variant="ghost" size="icon" onClick={goToNextMonth}>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* 總預算 */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">總預算</h3>
            {totalBudget && (
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => openEditForm(totalBudget)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="text-red-500" onClick={() => { setDeletingBudget(totalBudget); setDeleteDialogOpen(true) }}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {totalBudget ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-3xl font-bold text-amber-600">${Number(totalBudget.amount).toLocaleString()}</span>
                <span className="text-gray-500">
                  已使用 ${totalExpense.toLocaleString()} ({getUsagePercent(totalExpense, Number(totalBudget.amount)).toFixed(0)}%)
                </span>
              </div>
              <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", getProgressColor(getUsagePercent(totalExpense, Number(totalBudget.amount))))}
                  style={{ width: `${getUsagePercent(totalExpense, Number(totalBudget.amount))}%` }}
                />
              </div>
              {totalExpense > Number(totalBudget.amount) && (
                <p className="text-red-500 text-sm mt-2">⚠️ 已超出預算 ${(totalExpense - Number(totalBudget.amount)).toLocaleString()}</p>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Target className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-400 mb-3">尚未設定本月總預算</p>
              <Button onClick={openCreateForm}>設定總預算</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 分類預算 */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">分類預算</h3>
        {categoryBudgets.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-gray-400">尚未設定分類預算</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {categoryBudgets.map((budget) => {
              const category = categoryMap.get(budget.category_id || "")
              const spent = monthlyExpenses[budget.category_id || ""] || 0
              const percent = getUsagePercent(spent, Number(budget.amount))
              return (
                <Card key={budget.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{category?.icon || "📦"}</span>
                        <span className="font-medium">{category?.name || "未知分類"}</span>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditForm(budget)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => { setDeletingBudget(budget); setDeleteDialogOpen(true) }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="font-semibold">${Number(budget.amount).toLocaleString()}</span>
                      <span className="text-gray-500">已用 ${spent.toLocaleString()} ({percent.toFixed(0)}%)</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full", getProgressColor(percent))} style={{ width: `${percent}%` }} />
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* 預算表單對話框 */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingBudget ? "編輯預算" : "新增預算"}</DialogTitle>
            <DialogDescription>{format(new Date(selectedMonth + "-01"), "yyyy 年 M 月", { locale: zhTW })} 預算設定</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>預算類型</Label>
              <Select value={budgetCategoryId} onValueChange={setBudgetCategoryId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__total__">📊 總預算</SelectItem>
                  {unbudgetedCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.icon || "📦"} {cat.name}
                    </SelectItem>
                  ))}
                  {editingBudget?.category_id && (
                    <SelectItem value={editingBudget.category_id}>
                      {categoryMap.get(editingBudget.category_id)?.icon || "📦"} {categoryMap.get(editingBudget.category_id)?.name}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>預算金額 *</Label>
              <Input
                type="number"
                min="0"
                value={budgetAmount || ""}
                onChange={(e) => setBudgetAmount(e.target.value ? Number(e.target.value) : null)}
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>取消</Button>
            <Button onClick={handleSave} disabled={saving || !budgetAmount}>{saving ? "儲存中..." : "儲存"}</Button>
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

      {/* 複製上月對話框 */}
      <AlertDialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>複製上月預算</AlertDialogTitle>
            <AlertDialogDescription>
              將 {format(new Date(getPrevMonth(selectedMonth) + "-01"), "yyyy 年 M 月", { locale: zhTW })} 的預算設定複製到本月。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleCopyFromLastMonth} disabled={copyLoading}>
              {copyLoading ? "複製中..." : "確定複製"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
