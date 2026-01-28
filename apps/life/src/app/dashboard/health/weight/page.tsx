// apps/life/src/app/dashboard/health/weight/page.tsx
"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { createBrowserClient } from '@supabase/ssr'
import { Button, Card, CardContent } from "@daily/ui"
import { cn } from "@daily/utils"
import {
  format,
  subWeeks,
  subMonths,
  subYears,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  eachMonthOfInterval,
} from "date-fns"
import { zhTW } from "date-fns/locale"
import {
  ArrowLeft,
  Scale,
  TrendingUp,
  TrendingDown,
  Plus,
  Target,
  Utensils,
  UtensilsCrossed,
  Info,
  Pencil,
  Trash2,
} from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { MEAL_TYPE_MAP, type MealType } from "@daily/database"
import { MealDialog } from "@/components/dialogs/meal-dialog"

// ============================================
// 類型定義
// ============================================
type HealthMetric = {
  id: string
  user_id: string
  date: string
  metric_type: string
  value_primary: number
  value_secondary: number | null
  value_tertiary: number | null
  measured_time: string | null
  note: string | null
}

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

type UserProfile = {
  height_cm: number | null
  birth_year: number | null
}

type TimeRange = "week" | "month" | "year"

type ChartDataPoint = {
  date: string
  label: string
  value: number | null
}

// ============================================
// 常數
// ============================================
const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "week", label: "週" },
  { value: "month", label: "月" },
  { value: "year", label: "年" },
]

// ============================================
// Supabase Client
// ============================================
function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// ============================================
// 主元件
// ============================================
export default function WeightManagementPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<TimeRange>("month")
  const [weightData, setWeightData] = useState<HealthMetric[]>([])
  const [todayMeals, setTodayMeals] = useState<Meal[]>([])
  const [profile, setProfile] = useState<UserProfile | null>(null)

  const today = format(new Date(), "yyyy-MM-dd")

  // 飲食記錄對話框狀態
  const [mealDialogOpen, setMealDialogOpen] = useState(false)
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null)
  const [selectedMealType, setSelectedMealType] = useState<MealType>("breakfast")

  // ============================================
  // 資料載入
  // ============================================
  const fetchData = async () => {
    setLoading(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    // 計算日期範圍
    const now = new Date()
    let startDate: Date
    switch (timeRange) {
      case "week":
        startDate = subWeeks(now, 1)
        break
      case "month":
        startDate = subMonths(now, 1)
        break
      case "year":
        startDate = subYears(now, 1)
        break
    }

    // 取得體重記錄
    const weightRes = await supabase
      .from("health_metrics")
      .select("*")
      .eq("user_id", user.id)
      .eq("metric_type", "weight")
      .gte("date", format(startDate, "yyyy-MM-dd"))
      .order("date", { ascending: true })

    if (weightRes.data) {
      setWeightData(weightRes.data as HealthMetric[])
    }

    // 取得今日飲食記錄
    const mealsRes = await supabase
      .from("meals")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", today)
      .order("created_at", { ascending: true })

    if (mealsRes.data) {
      setTodayMeals(mealsRes.data as Meal[])
    }

    // 取得用戶資料（身高）
    const profileRes = await supabase
      .from("profiles")
      .select("height_cm, birth_year")
      .eq("id", user.id)
      .single()

    if (profileRes.data) {
      setProfile(profileRes.data as UserProfile)
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [timeRange])

  // ============================================
  // 飲食記錄 CRUD
  // ============================================
  const openMealDialog = (mealType?: MealType, meal?: Meal) => {
    setEditingMeal(meal ?? null)
    setSelectedMealType(mealType ?? "breakfast")
    setMealDialogOpen(true)
  }

    const handleMealSave = async (data: {
    date: string
    meal_type: MealType
    description: string
    calories: number | null
    protein: number | null
    note: string | null
    }) => {
    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    if (editingMeal) {
        // 更新
        await supabase
        .from("meals")
        .update({
            date: data.date,
            meal_type: data.meal_type,
            description: data.description,
            calories: data.calories,
            protein: data.protein,
            note: data.note,
        })
        .eq("id", editingMeal.id)
    } else {
        // 新增
        await supabase.from("meals").insert({
        user_id: user.id,
        date: data.date,
        meal_type: data.meal_type,
        description: data.description,
        calories: data.calories,
        protein: data.protein,
        note: data.note,
        })
    }

    // 重新載入資料
    fetchData()
  }

  const handleMealDelete = async (mealId: string) => {
    await supabase.from("meals").delete().eq("id", mealId)
    fetchData()
  }

  // ============================================
  // 計算數值
  // ============================================

  // 最新體重
  const latestWeight =
    weightData.length > 0
      ? weightData[weightData.length - 1].value_primary
      : null

  // 計算 BMI
  const bmi = useMemo(() => {
    if (!profile?.height_cm || !latestWeight) return null
    const heightM = profile.height_cm / 100
    return latestWeight / (heightM * heightM)
  }, [profile?.height_cm, latestWeight])

  // BMI 分類
  const getBMICategory = (bmiValue: number) => {
    if (bmiValue < 18.5)
      return {
        label: "體重過輕",
        color: "text-blue-600",
        bg: "bg-blue-50",
        barColor: "bg-blue-500",
      }
    if (bmiValue < 24)
      return {
        label: "正常範圍",
        color: "text-green-600",
        bg: "bg-green-50",
        barColor: "bg-green-500",
      }
    if (bmiValue < 27)
      return {
        label: "過重",
        color: "text-amber-600",
        bg: "bg-amber-50",
        barColor: "bg-amber-500",
      }
    return {
      label: "肥胖",
      color: "text-red-600",
      bg: "bg-red-50",
      barColor: "bg-red-500",
    }
  }

  // 體重變化趨勢
  const weightTrend = useMemo(() => {
    if (weightData.length < 2) return { direction: "stable" as const, value: 0 }
    const first = weightData[0].value_primary
    const last = weightData[weightData.length - 1].value_primary
    const diff = last - first
    const direction = diff > 0.5 ? "up" : diff < -0.5 ? "down" : "stable"
    return { direction, value: Math.abs(diff) }
  }, [weightData])

  // 今日熱量總計
  const todayCalories = useMemo(() => {
    return todayMeals.reduce((sum, meal) => sum + (meal.calories || 0), 0)
  }, [todayMeals])

  // 今日蛋白質總計
  const todayProtein = useMemo(() => {
  return todayMeals.reduce((sum, meal) => sum + (meal.protein || 0), 0)
  }, [todayMeals])

  // ============================================
  // 圖表資料處理
  // ============================================
  const chartData = useMemo((): ChartDataPoint[] => {
    if (weightData.length === 0) return []

    const now = new Date()

    if (timeRange === "week") {
      // 週視圖：顯示每天
      const days = eachDayOfInterval({
        start: subWeeks(now, 1),
        end: now,
      })
      return days.map((day) => {
        const dateStr = format(day, "yyyy-MM-dd")
        const record = weightData.find((w) => w.date === dateStr)
        return {
          date: dateStr,
          label: format(day, "MM/dd"),
          value: record?.value_primary ?? null,
        }
      })
    }

    if (timeRange === "month") {
      // 月視圖：顯示每天
      const days = eachDayOfInterval({
        start: subMonths(now, 1),
        end: now,
      })
      return days.map((day) => {
        const dateStr = format(day, "yyyy-MM-dd")
        const record = weightData.find((w) => w.date === dateStr)
        return {
          date: dateStr,
          label: format(day, "MM/dd"),
          value: record?.value_primary ?? null,
        }
      })
    }

    // 年視圖：按月份平均
    const months = eachMonthOfInterval({
      start: subYears(now, 1),
      end: now,
    })
    return months.map((month) => {
      const monthStart = startOfMonth(month)
      const monthEnd = endOfMonth(month)
      const monthRecords = weightData.filter((w) => {
        const d = new Date(w.date)
        return d >= monthStart && d <= monthEnd
      })
      const avg =
        monthRecords.length > 0
          ? monthRecords.reduce((sum, r) => sum + r.value_primary, 0) /
            monthRecords.length
          : null
      return {
        date: format(month, "yyyy-MM"),
        label: format(month, "M月", { locale: zhTW }),
        value: avg ? Math.round(avg * 10) / 10 : null,
      }
    })
  }, [weightData, timeRange])

  // 計算 Y 軸範圍
  const yAxisDomain = useMemo(() => {
    const values = chartData
      .filter((d) => d.value !== null)
      .map((d) => d.value as number)
    if (values.length === 0) return [40, 80]
    const min = Math.min(...values)
    const max = Math.max(...values)
    const padding = Math.max((max - min) * 0.2, 2)
    return [Math.floor(min - padding), Math.ceil(max + padding)]
  }, [chartData])

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
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/dashboard/health">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold text-gray-800">體重管理</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* 快速統計卡片 */}
        <div className="grid grid-cols-2 gap-4">
          {/* 當前體重 */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Scale className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-2xl font-bold text-gray-800">
                    {latestWeight?.toFixed(1) ?? "--"}
                    <span className="text-sm font-normal text-gray-500 ml-1">
                      kg
                    </span>
                  </p>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <span>目前體重</span>
                    {weightTrend.direction !== "stable" && (
                      <span
                        className={cn(
                          "flex items-center",
                          weightTrend.direction === "down"
                            ? "text-green-600"
                            : "text-red-600"
                        )}
                      >
                        {weightTrend.direction === "down" ? (
                          <TrendingDown className="w-3 h-3" />
                        ) : (
                          <TrendingUp className="w-3 h-3" />
                        )}
                        {weightTrend.value.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* BMI */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    bmi ? getBMICategory(bmi).bg : "bg-gray-100"
                  )}
                >
                  <Target
                    className={cn(
                      "w-5 h-5",
                      bmi ? getBMICategory(bmi).color : "text-gray-400"
                    )}
                  />
                </div>
                <div className="flex-1">
                  <p className="text-2xl font-bold text-gray-800">
                    {bmi?.toFixed(1) ?? "--"}
                  </p>
                  <p className="text-sm text-gray-500">
                    {bmi ? (
                      <span className={getBMICategory(bmi).color}>
                        BMI · {getBMICategory(bmi).label}
                      </span>
                    ) : profile?.height_cm ? (
                      "尚無體重記錄"
                    ) : (
                      <Link
                        href="/dashboard/settings"
                        className="text-blue-600 hover:underline"
                      >
                        請設定身高
                      </Link>
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 體重趨勢圖 */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Scale className="w-5 h-5 text-blue-600" />
                體重趨勢
              </h3>
              {/* 時間範圍切換 */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                {TIME_RANGE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setTimeRange(option.value)}
                    className={cn(
                      "px-3 py-1 text-sm rounded-md transition-colors",
                      timeRange === option.value
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-gray-600 hover:text-gray-800"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {chartData.some((d) => d.value !== null) ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="label"
                    stroke="#6b7280"
                    fontSize={12}
                    tickLine={false}
                    interval={timeRange === "month" ? 6 : "preserveStartEnd"}
                  />
                  <YAxis
                    stroke="#6b7280"
                    fontSize={12}
                    domain={yAxisDomain}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                    }}
                    formatter={(value) => {
                      const numValue = value as number | null
                      return numValue !== null
                        ? [`${numValue} kg`, "體重"]
                        : ["--", "體重"]
                    }}
                    labelFormatter={(label) => `日期: ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.2}
                    strokeWidth={2}
                    connectNulls
                    dot={{ fill: "#3b82f6", strokeWidth: 0, r: 3 }}
                    activeDot={{ r: 5, fill: "#3b82f6" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-gray-400">
                此期間尚無體重記錄
              </div>
            )}
          </CardContent>
        </Card>

        {/* 今日飲食 */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <Utensils className="w-5 h-5 text-orange-600" />
                    今日飲食
                </h3>
                <div className="flex items-center gap-3">
                    {(todayCalories > 0 || todayProtein > 0) && (
                        <div className="flex items-center gap-2 text-sm">
                            {todayCalories > 0 && (
                            <span className="font-medium text-orange-600">
                                🔥 {todayCalories} 大卡
                            </span>
                            )}
                            {todayProtein > 0 && (
                            <span className="font-medium text-blue-600">
                                💪 {todayProtein}g
                            </span>
                            )}
                        </div>
                    )}
                    <Link href="/dashboard/health/foods">
                    <Button variant="ghost" size="sm" className="gap-1 text-gray-500">
                        <UtensilsCrossed className="w-4 h-4" />
                        食物資料庫
                    </Button>
                    </Link>
                    <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => openMealDialog()}
                    >
                    <Plus className="w-4 h-4" />
                    新增
                    </Button>
                </div>
                </div>

            {/* 餐點列表 */}
            <div className="space-y-3">
              {(["breakfast", "lunch", "dinner", "snack"] as MealType[]).map(
                (mealType) => {
                  const meals = todayMeals.filter(
                    (m) => m.meal_type === mealType
                  )
                  const config = MEAL_TYPE_MAP[mealType]
                  const mealCalories = meals.reduce(
                    (sum, m) => sum + (m.calories || 0),
                    0
                  )

                  return (
                    <div
                      key={mealType}
                      className={cn(
                        "p-3 rounded-lg transition-colors",
                        meals.length > 0
                          ? config.color
                          : "border-2 border-dashed border-gray-200 hover:border-gray-300"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={cn(
                            "font-medium",
                            meals.length > 0 ? config.textColor : "text-gray-400"
                          )}
                        >
                          {config.label}
                        </span>
                        <div className="flex items-center gap-2">
                          {meals.length > 0 && mealCalories > 0 && (
                            <span className="text-sm text-gray-500">
                              {mealCalories} 大卡
                            </span>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                              "h-7 px-2",
                              meals.length > 0
                                ? "text-gray-500 hover:text-gray-700"
                                : "text-gray-400 hover:text-gray-600"
                            )}
                            onClick={() => openMealDialog(mealType)}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* 該餐點的記錄列表 */}
                      {meals.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {meals.map((meal) => (
                            <div
                              key={meal.id}
                              className="group flex items-center justify-between text-sm py-1 px-2 -mx-2 rounded hover:bg-white/50"
                            >
                              <div className="flex-1">
                                <span className="text-gray-700">
                                  {meal.description}
                                </span>
                                {meal.calories && (
                                  <span className="text-gray-400 ml-2">
                                    {meal.calories} 大卡
                                  </span>
                                )}
                                {meal.note && (
                                  <span className="text-gray-400 ml-2">
                                    · {meal.note}
                                  </span>
                                )}
                              </div>
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => openMealDialog(mealType, meal)}
                                >
                                  <Pencil className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                                  onClick={() => handleMealDelete(meal.id)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                }
              )}
            </div>
          </CardContent>
        </Card>

        {/* BMI 說明 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <div className="text-sm text-gray-600">
                <p className="font-medium text-gray-800 mb-2">BMI 指數參考</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-blue-500" />
                    <span>&lt; 18.5 體重過輕</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-green-500" />
                    <span>18.5-24 正常範圍</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-500" />
                    <span>24-27 過重</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500" />
                    <span>&ge; 27 肥胖</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 飲食記錄對話框 */}
      <MealDialog
        open={mealDialogOpen}
        onOpenChange={setMealDialogOpen}
        meal={editingMeal}
        defaultDate={today}
        defaultMealType={selectedMealType}
        onSave={handleMealSave}
      />
    </div>
  )
}