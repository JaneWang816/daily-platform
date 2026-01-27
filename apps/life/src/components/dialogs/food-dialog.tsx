// apps/life/src/components/dialogs/food-dialog.tsx
"use client"

import { useState, useEffect } from "react"
import {
  Button,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@daily/ui"
import { Copy } from "lucide-react"
import { FOOD_CATEGORIES, type FoodCategory } from "@daily/database"

// ============================================
// 類型定義
// ============================================
type FoodNutrition = {
  id: string
  user_id: string | null
  name: string
  portion: string
  calories: number
  protein: number | null
  carbs: number | null
  fat: number | null
  category: FoodCategory
  is_favorite: boolean | null
  created_at: string | null
  updated_at: string | null
}

type FoodFormData = {
  name: string
  portion: string
  calories: string
  protein: string
  category: FoodCategory
}

interface FoodDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  food?: FoodNutrition | null
  onSave: (data: {
    name: string
    portion: string
    calories: number
    protein: number | null
    category: FoodCategory
  }) => Promise<void>
  onCopyAndEdit?: (food: FoodNutrition) => Promise<void>
}

// ============================================
// 初始表單狀態
// ============================================
const getInitialForm = (food?: FoodNutrition | null): FoodFormData => {
  if (food) {
    return {
      name: food.name,
      portion: food.portion,
      calories: food.calories.toString(),
      protein: food.protein?.toString() ?? "",
      category: food.category,
    }
  }
  return {
    name: "",
    portion: "",
    calories: "",
    protein: "",
    category: "staple",
  }
}

// ============================================
// 主元件
// ============================================
export function FoodDialog({
  open,
  onOpenChange,
  food,
  onSave,
  onCopyAndEdit,
}: FoodDialogProps) {
  const [form, setForm] = useState<FoodFormData>(() => getInitialForm(food))
  const [saving, setSaving] = useState(false)

  // 當 dialog 開啟或 food 變更時重置表單
  useEffect(() => {
    if (open) {
      setForm(getInitialForm(food))
    }
  }, [open, food])

  // 處理儲存
  const handleSave = async () => {
    if (!form.name.trim() || !form.portion.trim() || !form.calories) return

    setSaving(true)
    try {
      await onSave({
        name: form.name.trim(),
        portion: form.portion.trim(),
        calories: parseInt(form.calories, 10),
        protein: form.protein ? parseFloat(form.protein) : null,
        category: form.category,
      })
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  // 處理複製並編輯
  const handleCopyAndEdit = () => {
    if (food && onCopyAndEdit) {
      onCopyAndEdit(food)
    }
  }

  // 更新表單欄位
  const updateField = <K extends keyof FoodFormData>(
    field: K,
    value: FoodFormData[K]
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const isEditing = !!food
  const isSystemFood = food?.user_id === null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? (isSystemFood ? "系統預設食物" : "編輯食物") : "新增食物"}
          </DialogTitle>
          <DialogDescription>
            {isSystemFood
              ? "這是系統預設食物，如需調整請複製到自訂清單"
              : isEditing
                ? "修改自訂食物資料"
                : "新增常吃的食物到資料庫"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 系統食物提示 */}
          {isSystemFood && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <Copy className="w-5 h-5 text-blue-600 shrink-0" />
              <div className="flex-1 text-sm text-blue-800">
                <p>想要調整數值？</p>
                <p className="text-blue-600">複製後可自由編輯，不影響其他人</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 border-blue-300 text-blue-700 hover:bg-blue-100"
                onClick={handleCopyAndEdit}
              >
                複製並編輯
              </Button>
            </div>
          )}

          {/* 食物名稱 */}
          <div className="space-y-2">
            <Label htmlFor="name">食物名稱 *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="例如：雞腿便當"
              disabled={isSystemFood}
            />
          </div>

          {/* 份量 + 分類 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="portion">份量 *</Label>
              <Input
                id="portion"
                value={form.portion}
                onChange={(e) => updateField("portion", e.target.value)}
                placeholder="例如：一個、100g"
                disabled={isSystemFood}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">分類 *</Label>
              <Select
                value={form.category}
                onValueChange={(v) => updateField("category", v as FoodCategory)}
                disabled={isSystemFood}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="選擇分類" />
                </SelectTrigger>
                <SelectContent>
                  {FOOD_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 熱量 + 蛋白質 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="calories">熱量 (大卡) *</Label>
              <Input
                id="calories"
                type="number"
                min="0"
                value={form.calories}
                onChange={(e) => updateField("calories", e.target.value)}
                placeholder="例如：800"
                disabled={isSystemFood}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="protein">
                蛋白質 (g)
                <span className="text-gray-400 font-normal ml-1">選填</span>
              </Label>
              <Input
                id="protein"
                type="number"
                min="0"
                step="0.1"
                value={form.protein}
                onChange={(e) => updateField("protein", e.target.value)}
                placeholder="例如：35"
                disabled={isSystemFood}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            關閉
          </Button>
          {!isSystemFood && (
            <Button
              onClick={handleSave}
              disabled={saving || !form.name.trim() || !form.portion.trim() || !form.calories}
            >
              {saving ? "儲存中..." : "儲存"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}