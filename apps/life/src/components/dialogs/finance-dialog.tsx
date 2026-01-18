// components/dashboard/dialogs/finance-dialog.tsx
"use client"

import { useState, useEffect } from "react"
import {
  Button,
  Input,
  Label,
  Textarea,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@daily/ui"

import { createClient } from "@daily/database"

interface FinanceCategory {
  id: string
  name: string
  type: "income" | "expense"
  icon: string | null
  is_default: boolean
}

interface FinanceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  formData: Record<string, any>
  setFormData: (data: Record<string, any>) => void
  onSave: () => void
  saving: boolean
  dateLabel: string
  isEdit: boolean
}

export function FinanceDialog({
  open,
  onOpenChange,
  formData,
  setFormData,
  onSave,
  saving,
  dateLabel,
  isEdit,
}: FinanceDialogProps) {
  const [expenseCategories, setExpenseCategories] = useState<FinanceCategory[]>([])
  const [incomeCategories, setIncomeCategories] = useState<FinanceCategory[]>([])
  const [loading, setLoading] = useState(false)

  // 載入分類（預設 + 自訂）
  useEffect(() => {
    const supabase = createClient()
    const loadCategories = async () => {
      if (!open) return
      
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      // 分開查詢：預設分類和用戶分類
      const [defaultRes, userRes] = await Promise.all([
        supabase
          .from("finance_categories")
          .select("*")
          .is("user_id", null)
          .order("sort_order", { ascending: true }),
        supabase
          .from("finance_categories")
          .select("*")
          .eq("user_id", user.id)
          .order("sort_order", { ascending: true }),
      ])

      // 合併分類
      const allCategories = [
        ...(defaultRes.data || []),
        ...(userRes.data || []),
      ] as FinanceCategory[]

      if (allCategories.length > 0) {
        const expense = allCategories.filter(c => c.type === "expense")
        const income = allCategories.filter(c => c.type === "income")
        setExpenseCategories(expense)
        setIncomeCategories(income)
      }
      
      setLoading(false)
    }

    loadCategories()
  }, [open])

  const categories = formData.type === "income" ? incomeCategories : expenseCategories

  // 根據 category_id 找到對應的分類名稱（用於顯示）
  const selectedCategory = categories.find(c => c.id === formData.category_id)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "編輯收支" : "新增收支"}</DialogTitle>
          <DialogDescription>{dateLabel} 的記錄</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>類型</Label>
            <Select 
              value={formData.type || "expense"} 
              onValueChange={(v) => setFormData({ ...formData, type: v, category_id: "", category: "" })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">支出</SelectItem>
                <SelectItem value="income">收入</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>分類 *</Label>
            <Select 
              value={formData.category_id || ""} 
              onValueChange={(v) => {
                const cat = categories.find(c => c.id === v)
                setFormData({ 
                  ...formData, 
                  category_id: v,
                  category: cat?.name || ""  // 同時更新 category 名稱（向後相容）
                })
              }}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder={loading ? "載入中..." : "選擇分類"}>
                  {selectedCategory ? `${selectedCategory.icon || "📦"} ${selectedCategory.name}` : (loading ? "載入中..." : "選擇分類")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.icon || "📦"} {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>金額 *</Label>
            <Input 
              type="number" 
              value={formData.amount || ""} 
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })} 
            />
          </div>
          <div className="space-y-2">
            <Label>備註</Label>
            <Input 
              value={formData.description || ""} 
              onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button 
            onClick={onSave} 
            disabled={saving || !formData.category_id || !formData.amount || loading}
          >
            {saving ? "儲存中..." : "儲存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
