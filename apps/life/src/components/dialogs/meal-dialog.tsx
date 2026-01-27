// apps/life/src/components/dialogs/meal-dialog.tsx
"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import Link from "next/link"
import { createClient } from "@daily/database/client"
import {
  Button,
  Input,
  Label,
  Textarea,
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
import { cn } from "@daily/utils"
import { format } from "date-fns"
import { Search, ChevronRight, Star, Plus, X } from "lucide-react"
import {
  MEAL_TYPES,
  FOOD_CATEGORY_MAP,
  type MealType,
  type FoodCategory,
} from "@daily/database"

// ============================================
// 類型定義
// ============================================
type Meal = {
  id: string
  user_id: string
  date: string
  meal_type: MealType
  description: string
  calories: number | null
  protein: number | null
  photo_url: string | null
  note: string | null
}

type FoodNutrition = {
  id: string
  user_id: string | null
  name: string
  portion: string
  calories: number
  protein: number | null
  category: FoodCategory
  is_favorite: boolean | null
}

type MealFormData = {
  date: string
  meal_type: MealType
  description: string
  calories: string
  protein: string
  note: string
}

interface MealDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  meal?: Meal | null
  defaultDate?: string
  defaultMealType?: MealType
  onSave: (data: {
    date: string
    meal_type: MealType
    description: string
    calories: number | null
    protein: number | null
    note: string | null
  }) => Promise<void>
}

// ============================================
// 初始表單狀態
// ============================================
const getInitialForm = (
  meal?: Meal | null,
  defaultDate?: string,
  defaultMealType?: MealType
): MealFormData => {
  if (meal) {
    return {
      date: meal.date,
      meal_type: meal.meal_type,
      description: meal.description,
      calories: meal.calories?.toString() ?? "",
      protein: meal.protein?.toString() ?? "",
      note: meal.note ?? "",
    }
  }
  return {
    date: defaultDate ?? format(new Date(), "yyyy-MM-dd"),
    meal_type: defaultMealType ?? "breakfast",
    description: "",
    calories: "",
    protein: "",
    note: "",
  }
}

// ============================================
// 主元件
// ============================================
export function MealDialog({
  open,
  onOpenChange,
  meal,
  defaultDate,
  defaultMealType,
  onSave,
}: MealDialogProps) {
  const supabase = createClient()
  const [form, setForm] = useState<MealFormData>(() =>
    getInitialForm(meal, defaultDate, defaultMealType)
  )
  const [saving, setSaving] = useState(false)

  // 食物搜尋相關
  const [foods, setFoods] = useState<FoodNutrition[]>([])
  const [foodsLoading, setFoodsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [showFoodList, setShowFoodList] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // 載入食物資料
  const fetchFoods = async () => {
    setFoodsLoading(true)
    const { data } = await supabase
      .from("food_nutrition")
      .select("id, user_id, name, portion, calories, protein, category, is_favorite")
      .order("is_favorite", { ascending: false, nullsFirst: false })
      .order("name", { ascending: true })

    if (data) {
      // 過濾重複：已有自訂版本則隱藏系統預設
      const userFoodKeys = new Set(
        data
          .filter((f) => f.user_id !== null)
          .map((f) => `${f.name}|${f.portion}`)
      )
      const filtered = data.filter((food) => {
        if (food.user_id === null) {
          const key = `${food.name}|${food.portion}`
          return !userFoodKeys.has(key)
        }
        return true
      })
      setFoods(filtered as FoodNutrition[])
    }
    setFoodsLoading(false)
  }

  // 當 dialog 開啟時載入食物並重置表單
  useEffect(() => {
    if (open) {
      setForm(getInitialForm(meal, defaultDate, defaultMealType))
      setSearchQuery("")
      setShowFoodList(false)
      fetchFoods()
    }
  }, [open, meal, defaultDate, defaultMealType])

  // 篩選食物（常用優先）
  const filteredFoods = useMemo(() => {
    if (!searchQuery.trim()) {
      // 沒有搜尋時，只顯示常用
      return foods.filter((f) => f.is_favorite).slice(0, 10)
    }

    const query = searchQuery.toLowerCase()
    return foods
      .filter(
        (f) =>
          f.name.toLowerCase().includes(query) ||
          f.portion.toLowerCase().includes(query)
      )
      .slice(0, 15)
  }, [foods, searchQuery])

  // 處理儲存
  const handleSave = async () => {
    if (!form.description.trim()) return

    setSaving(true)
    try {
      await onSave({
        date: form.date,
        meal_type: form.meal_type,
        description: form.description.trim(),
        calories: form.calories ? parseInt(form.calories, 10) : null,
        protein: form.protein ? parseFloat(form.protein) : null,
        note: form.note.trim() || null,
      })
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  // 選擇食物（累加模式）
  const selectFood = (food: FoodNutrition) => {
    const currentDesc = form.description.trim()
    const newDesc = currentDesc ? `${currentDesc}、${food.name}` : food.name

    const currentCal = form.calories ? parseInt(form.calories, 10) : 0
    const newCal = currentCal + food.calories

    const currentProtein = form.protein ? parseFloat(form.protein) : 0
    const newProtein = currentProtein + (food.protein ?? 0)

    setForm((prev) => ({
      ...prev,
      description: newDesc,
      calories: newCal.toString(),
      protein: newProtein > 0 ? newProtein.toString() : "",
    }))

    setSearchQuery("")
    setShowFoodList(false)
  }

  // 更新表單欄位
  const updateField = <K extends keyof MealFormData>(
    field: K,
    value: MealFormData[K]
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  // 清空表單
  const clearForm = () => {
    setForm((prev) => ({
      ...prev,
      description: "",
      calories: "",
      protein: "",
    }))
  }

  const isEditing = !!meal

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "編輯餐點" : "新增餐點"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "修改餐點記錄" : "記錄你的飲食內容"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 餐點類型 + 日期 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="meal_type">餐點類型 *</Label>
              <Select
                value={form.meal_type}
                onValueChange={(v) => updateField("meal_type", v as MealType)}
              >
                <SelectTrigger id="meal_type">
                  <SelectValue placeholder="選擇類型" />
                </SelectTrigger>
                <SelectContent>
                  {MEAL_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">日期</Label>
              <Input
                id="date"
                type="date"
                value={form.date}
                onChange={(e) => updateField("date", e.target.value)}
              />
            </div>
          </div>

          {/* 食物搜尋選擇 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>從食物資料庫選擇</Label>
              <Link
                href="/dashboard/health/foods"
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
                onClick={() => onOpenChange(false)}
              >
                管理食物
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            {/* 搜尋框 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                ref={searchInputRef}
                placeholder="搜尋食物名稱..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setShowFoodList(true)
                }}
                onFocus={() => setShowFoodList(true)}
                className="pl-9"
              />
            </div>

            {/* 食物列表 */}
            {showFoodList && (
              <div className="border rounded-lg max-h-[200px] overflow-y-auto bg-white">
                {foodsLoading ? (
                  <div className="p-4 text-center text-gray-400 text-sm">
                    載入中...
                  </div>
                ) : filteredFoods.length === 0 ? (
                  <div className="p-4 text-center text-gray-400 text-sm">
                    {searchQuery ? "找不到符合的食物" : "尚無常用食物，請搜尋或新增"}
                  </div>
                ) : (
                  <div className="divide-y">
                    {!searchQuery && filteredFoods.length > 0 && (
                      <div className="px-3 py-1.5 bg-gray-50 text-xs text-gray-500">
                        ⭐ 常用食物
                      </div>
                    )}
                    {filteredFoods.map((food) => (
                      <button
                        key={food.id}
                        type="button"
                        onClick={() => selectFood(food)}
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                      >
                        {food.is_favorite && (
                          <Star className="w-3 h-3 text-amber-500 fill-current shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-800 truncate">
                              {food.name}
                            </span>
                            <span className="text-xs text-gray-400">
                              {food.portion}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="text-orange-600">
                              {food.calories} 大卡
                            </span>
                            {food.protein && (
                              <span>蛋白質 {food.protein}g</span>
                            )}
                          </div>
                        </div>
                        <Plus className="w-4 h-4 text-gray-400 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 分隔線 */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-gray-400">或手動輸入</span>
            </div>
          </div>

          {/* 餐點描述 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="description">餐點內容 *</Label>
              {form.description && (
                <button
                  type="button"
                  onClick={clearForm}
                  className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-0.5"
                >
                  <X className="w-3 h-3" />
                  清空
                </button>
              )}
            </div>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="例如：雞腿便當、珍珠奶茶"
              rows={2}
            />
          </div>

          {/* 熱量 + 蛋白質 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="calories">
                熱量（大卡）
                <span className="text-gray-400 font-normal ml-1">選填</span>
              </Label>
              <Input
                id="calories"
                type="number"
                min="0"
                max="9999"
                value={form.calories}
                onChange={(e) => updateField("calories", e.target.value)}
                placeholder="例如：800"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="protein">
                蛋白質（g）
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
              />
            </div>
          </div>

          {/* 備註 */}
          <div className="space-y-2">
            <Label htmlFor="note">
              備註
              <span className="text-gray-400 font-normal ml-2">選填</span>
            </Label>
            <Input
              id="note"
              value={form.note}
              onChange={(e) => updateField("note", e.target.value)}
              placeholder="例如：外食、自己煮"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            取消
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !form.description.trim()}
          >
            {saving ? "儲存中..." : "儲存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}