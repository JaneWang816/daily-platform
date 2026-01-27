// apps/life/src/app/dashboard/health/foods/page.tsx
"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { createClient } from "@daily/database/client"
import { Button, Card, CardContent, Input } from "@daily/ui"
import { cn } from "@daily/utils"
import {
  ArrowLeft,
  Plus,
  Search,
  Star,
  Pencil,
  Trash2,
  UtensilsCrossed,
} from "lucide-react"
import {
  FOOD_CATEGORIES,
  FOOD_CATEGORY_MAP,
  type FoodCategory,
} from "@daily/database"
import { FoodDialog } from "@/components/dialogs/food-dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@daily/ui"

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

// ============================================
// 主元件
// ============================================
export default function FoodManagementPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [foods, setFoods] = useState<FoodNutrition[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<FoodCategory | "all">("all")
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)

  // Dialog 狀態
  const [foodDialogOpen, setFoodDialogOpen] = useState(false)
  const [editingFood, setEditingFood] = useState<FoodNutrition | null>(null)

  // 刪除確認
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingFood, setDeletingFood] = useState<FoodNutrition | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // ============================================
  // 資料載入
  // ============================================
  const fetchData = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from("food_nutrition")
      .select("*")
      .order("category", { ascending: true })
      .order("name", { ascending: true })

    if (data && !error) {
      setFoods(data as FoodNutrition[])
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  // ============================================
  // 過濾重複的系統預設（已有自訂版本則隱藏）
  // ============================================
  const visibleFoods = useMemo(() => {
    // 找出用戶自訂食物的 name + portion 組合
    const userFoodKeys = new Set(
      foods
        .filter((f) => f.user_id !== null)
        .map((f) => `${f.name}|${f.portion}`)
    )

    // 過濾：隱藏已有自訂版本的系統預設
    return foods.filter((food) => {
      if (food.user_id === null) {
        const key = `${food.name}|${food.portion}`
        return !userFoodKeys.has(key)
      }
      return true
    })
  }, [foods])

  // ============================================
  // 篩選資料
  // ============================================
  const filteredFoods = useMemo(() => {
    return visibleFoods.filter((food) => {
      // 分類篩選
      if (selectedCategory !== "all" && food.category !== selectedCategory) {
        return false
      }

      // 常用篩選
      if (showFavoritesOnly && !food.is_favorite) {
        return false
      }

      // 搜尋篩選
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          food.name.toLowerCase().includes(query) ||
          food.portion.toLowerCase().includes(query)
        )
      }

      return true
    })
  }, [visibleFoods, selectedCategory, showFavoritesOnly, searchQuery])

  // 按分類分組
  const foodsByCategory = useMemo(() => {
    const grouped: Record<string, FoodNutrition[]> = {}
    filteredFoods.forEach((food) => {
      if (!grouped[food.category]) {
        grouped[food.category] = []
      }
      grouped[food.category].push(food)
    })
    return grouped
  }, [filteredFoods])

  // ============================================
  // CRUD 操作
  // ============================================
  const openFoodDialog = (food?: FoodNutrition) => {
    setEditingFood(food ?? null)
    setFoodDialogOpen(true)
  }

  const handleFoodSave = async (data: {
    name: string
    portion: string
    calories: number
    protein: number | null
    category: FoodCategory
  }) => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    if (editingFood && editingFood.user_id !== null) {
      // 更新（只能更新自己的）
      await supabase
        .from("food_nutrition")
        .update({
          name: data.name,
          portion: data.portion,
          calories: data.calories,
          protein: data.protein,
          category: data.category,
        })
        .eq("id", editingFood.id)
    } else {
      // 新增
      await supabase.from("food_nutrition").insert({
        user_id: user.id,
        name: data.name,
        portion: data.portion,
        calories: data.calories,
        protein: data.protein,
        category: data.category,
        is_favorite: false,
      })
    }

    fetchData()
  }

  // 複製系統食物並編輯
  const handleCopyAndEdit = async (food: FoodNutrition) => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    // 建立副本
    const { data: newFood, error } = await supabase
      .from("food_nutrition")
      .insert({
        user_id: user.id,
        name: food.name,
        portion: food.portion,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        category: food.category,
        is_favorite: false,
      })
      .select()
      .single()

    if (!error && newFood) {
      // 重新載入資料
      await fetchData()
      // 關閉目前對話框，打開編輯新副本
      setFoodDialogOpen(false)
      // 稍微延遲以確保資料更新
      setTimeout(() => {
        setEditingFood(newFood as FoodNutrition)
        setFoodDialogOpen(true)
      }, 100)
    }
  }

  const handleToggleFavorite = async (food: FoodNutrition) => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    if (food.user_id === null) {
      // 系統食物：建立用戶副本並標記為常用
      await supabase.from("food_nutrition").insert({
        user_id: user.id,
        name: food.name,
        portion: food.portion,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        category: food.category,
        is_favorite: true,
      })
    } else {
      // 用戶食物：直接切換
      await supabase
        .from("food_nutrition")
        .update({ is_favorite: !food.is_favorite })
        .eq("id", food.id)
    }

    fetchData()
  }

  const confirmDelete = (food: FoodNutrition) => {
    setDeletingFood(food)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!deletingFood) return

    setDeleteLoading(true)
    await supabase.from("food_nutrition").delete().eq("id", deletingFood.id)
    setDeleteLoading(false)
    setDeleteDialogOpen(false)
    setDeletingFood(null)
    fetchData()
  }

  // ============================================
  // 統計
  // ============================================
  const stats = useMemo(() => {
    const systemCount = visibleFoods.filter((f) => f.user_id === null).length
    const userCount = visibleFoods.filter((f) => f.user_id !== null).length
    const favoriteCount = visibleFoods.filter((f) => f.is_favorite).length
    return { systemCount, userCount, favoriteCount }
  }, [visibleFoods])

  // ============================================
  // 渲染
  // ============================================
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 頂部導航 */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/health/weight">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-lg font-semibold text-gray-800">食物資料庫</h1>
          </div>
          <Button
            size="sm"
            className="gap-1"
            onClick={() => openFoodDialog()}
          >
            <Plus className="w-4 h-4" />
            新增食物
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* 統計卡片 */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-800">{stats.systemCount}</p>
              <p className="text-xs text-gray-500">系統預設</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.userCount}</p>
              <p className="text-xs text-gray-500">自訂食物</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">{stats.favoriteCount}</p>
              <p className="text-xs text-gray-500">常用標記</p>
            </CardContent>
          </Card>
        </div>

        {/* 搜尋和篩選 */}
        <Card>
          <CardContent className="p-4 space-y-4">
            {/* 搜尋框 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="搜尋食物名稱..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* 分類篩選 */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory("all")}
                className={cn(
                  "px-3 py-1 text-sm rounded-full transition-colors",
                  selectedCategory === "all"
                    ? "bg-gray-800 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                全部
              </button>
              {FOOD_CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={cn(
                    "px-3 py-1 text-sm rounded-full transition-colors",
                    selectedCategory === cat.value
                      ? `${cat.color} ${cat.textColor}`
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* 常用篩選 */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className={cn(
                  "flex items-center gap-1 px-3 py-1 text-sm rounded-full transition-colors",
                  showFavoritesOnly
                    ? "bg-amber-100 text-amber-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                <Star className={cn("w-3 h-3", showFavoritesOnly && "fill-current")} />
                只顯示常用
              </button>
            </div>
          </CardContent>
        </Card>

        {/* 食物列表 */}
        {filteredFoods.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              <UtensilsCrossed className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>找不到符合條件的食物</p>
              {searchQuery && (
                <Button
                  variant="link"
                  className="mt-2"
                  onClick={() => setSearchQuery("")}
                >
                  清除搜尋
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {(Object.keys(foodsByCategory) as FoodCategory[]).map((category) => (
              <div key={category}>
                <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                  {FOOD_CATEGORY_MAP[category].label}
                  <span className="text-gray-400">
                    ({foodsByCategory[category].length})
                  </span>
                </h3>
                <Card>
                  <CardContent className="p-0 divide-y">
                    {foodsByCategory[category].map((food) => (
                      <div
                        key={food.id}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 group"
                      >
                        {/* 常用標記 */}
                        <button
                          onClick={() => handleToggleFavorite(food)}
                          className="shrink-0"
                        >
                          <Star
                            className={cn(
                              "w-5 h-5 transition-colors",
                              food.is_favorite
                                ? "text-amber-500 fill-current"
                                : "text-gray-300 hover:text-amber-400"
                            )}
                          />
                        </button>

                        {/* 食物資訊 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-800 truncate">
                              {food.name}
                            </span>
                            <span className="text-sm text-gray-400">
                              {food.portion}
                            </span>
                            {food.user_id === null && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                                預設
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-500">
                            <span className="text-orange-600 font-medium">
                              {food.calories} 大卡
                            </span>
                            {food.protein && (
                              <span>蛋白質 {food.protein}g</span>
                            )}
                          </div>
                        </div>

                        {/* 操作按鈕 */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => openFoodDialog(food)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          {food.user_id !== null && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                              onClick={() => confirmDelete(food)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 食物編輯對話框 */}
      <FoodDialog
        open={foodDialogOpen}
        onOpenChange={setFoodDialogOpen}
        food={editingFood}
        onSave={handleFoodSave}
        onCopyAndEdit={handleCopyAndEdit}
      />

      {/* 刪除確認對話框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確定要刪除嗎？</AlertDialogTitle>
            <AlertDialogDescription>
              將刪除「{deletingFood?.name}」，此操作無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteLoading ? "刪除中..." : "確定刪除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}