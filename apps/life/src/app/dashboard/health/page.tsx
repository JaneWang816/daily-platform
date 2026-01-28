//apps/life/src/app/dashboard/health/page.tsx
"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { createBrowserClient } from '@supabase/ssr'
import { 
  Button, Input, Card, CardContent, Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, Label, Textarea, Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue, Tabs, TabsContent, TabsList, TabsTrigger,
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@daily/ui"
import { cn } from "@daily/utils"
import { format } from "date-fns"
import { zhTW } from "date-fns/locale"
import {
  ArrowLeft, Plus, Dumbbell, Activity, Scale, Heart, Moon, Droplets, Footprints,
  Clock, Flame, Pencil, Trash2, Calendar, BarChart2,
} from "lucide-react"

// ============================================
// 類型定義
// ============================================
type HealthExercise = {
  id: string
  user_id: string
  date: string
  exercise_type: string
  duration_minutes: number | null
  distance_km: number | null
  calories: number | null
  note: string | null
  created_at: string | null
  updated_at: string | null
}

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
  created_at: string | null
  updated_at: string | null
}

// ============================================
// 常數
// ============================================
const EXERCISE_TYPES = ["跑步", "健走", "騎車", "游泳", "重訓", "瑜伽", "籃球", "羽球", "跳繩", "其他"]
const EXERCISE_ICONS: Record<string, string> = {
  "跑步": "🏃", "健走": "🚶", "騎車": "🚴", "游泳": "🏊", "重訓": "🏋️",
  "瑜伽": "🧘", "籃球": "🏀", "羽球": "🏸", "跳繩": "⏱️", "其他": "⚡"
}

const METRIC_TYPES = [
  { value: "weight", label: "體重", icon: Scale, unit: "kg" },
  { value: "blood_pressure", label: "血壓", icon: Heart, unit: "mmHg" },
  { value: "sleep", label: "睡眠", icon: Moon, unit: "小時" },
  { value: "water", label: "飲水", icon: Droplets, unit: "ml" },
  { value: "steps", label: "步數", icon: Footprints, unit: "步" },
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
export default function HealthPage() {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState("exercise")
  const [exercises, setExercises] = useState<HealthExercise[]>([])
  const [metrics, setMetrics] = useState<HealthMetric[]>([])
  const [loading, setLoading] = useState(true)

  // 運動表單狀態
  const [exerciseDialogOpen, setExerciseDialogOpen] = useState(false)
  const [editingExercise, setEditingExercise] = useState<HealthExercise | null>(null)
  const [exerciseForm, setExerciseForm] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    exercise_type: "",
    duration_minutes: "",
    distance_km: "",
    calories: "",
    note: "",
  })

  // 健康數值表單狀態
  const [metricDialogOpen, setMetricDialogOpen] = useState(false)
  const [editingMetric, setEditingMetric] = useState<HealthMetric | null>(null)
  const [metricForm, setMetricForm] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    metric_type: "weight",
    value_primary: "",
    value_secondary: "",
    value_tertiary: "",
    measured_time: "",
    note: "",
  })

  const [saving, setSaving] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ type: "exercise" | "metric"; item: HealthExercise | HealthMetric } | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // 載入資料
  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [exerciseRes, metricRes] = await Promise.all([
      supabase.from("health_exercises").select("*").eq("user_id", user.id).order("date", { ascending: false }),
      supabase.from("health_metrics").select("*").eq("user_id", user.id).order("date", { ascending: false }),
    ])

    if (exerciseRes.data) setExercises(exerciseRes.data as HealthExercise[])
    if (metricRes.data) setMetrics(metricRes.data as HealthMetric[])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  // ============ 運動記錄 ============
  const openExerciseDialog = (exercise?: HealthExercise) => {
    if (exercise) {
      setEditingExercise(exercise)
      setExerciseForm({
        date: exercise.date,
        exercise_type: exercise.exercise_type,
        duration_minutes: exercise.duration_minutes?.toString() || "",
        distance_km: exercise.distance_km?.toString() || "",
        calories: exercise.calories?.toString() || "",
        note: exercise.note || "",
      })
    } else {
      setEditingExercise(null)
      setExerciseForm({
        date: format(new Date(), "yyyy-MM-dd"),
        exercise_type: "",
        duration_minutes: "",
        distance_km: "",
        calories: "",
        note: "",
      })
    }
    setExerciseDialogOpen(true)
  }

  const handleExerciseSave = async () => {
    if (!exerciseForm.exercise_type) return
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const data = {
      date: exerciseForm.date,
      exercise_type: exerciseForm.exercise_type,
      duration_minutes: exerciseForm.duration_minutes ? parseInt(exerciseForm.duration_minutes) : null,
      distance_km: exerciseForm.distance_km ? parseFloat(exerciseForm.distance_km) : null,
      calories: exerciseForm.calories ? parseInt(exerciseForm.calories) : null,
      note: exerciseForm.note.trim() || null,
    }

    if (editingExercise) {
      await supabase.from("health_exercises").update(data as Record<string, unknown>).eq("id", editingExercise.id)
    } else {
      await supabase.from("health_exercises").insert({ ...data, user_id: user.id } as Record<string, unknown>)
    }

    setSaving(false)
    setExerciseDialogOpen(false)
    fetchData()
  }

  // ============ 健康數值 ============
  const openMetricDialog = (metric?: HealthMetric, type?: string) => {
    if (metric) {
      setEditingMetric(metric)
      setMetricForm({
        date: metric.date,
        metric_type: metric.metric_type,
        value_primary: metric.value_primary.toString(),
        value_secondary: metric.value_secondary?.toString() || "",
        value_tertiary: metric.value_tertiary?.toString() || "",
        measured_time: metric.measured_time || "",
        note: metric.note || "",
      })
    } else {
      setEditingMetric(null)
      setMetricForm({
        date: format(new Date(), "yyyy-MM-dd"),
        metric_type: type || "weight",
        value_primary: "",
        value_secondary: "",
        value_tertiary: "",
        measured_time: "",
        note: "",
      })
    }
    setMetricDialogOpen(true)
  }

  const handleMetricSave = async () => {
    if (!metricForm.value_primary) return
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const data = {
      date: metricForm.date,
      metric_type: metricForm.metric_type,
      value_primary: parseFloat(metricForm.value_primary),
      value_secondary: metricForm.value_secondary ? parseFloat(metricForm.value_secondary) : null,
      value_tertiary: metricForm.value_tertiary ? parseFloat(metricForm.value_tertiary) : null,
      measured_time: metricForm.measured_time || null,
      note: metricForm.note.trim() || null,
    }

    if (editingMetric) {
      await supabase.from("health_metrics").update(data as Record<string, unknown>).eq("id", editingMetric.id)
    } else {
      await supabase.from("health_metrics").insert({ ...data, user_id: user.id } as Record<string, unknown>)
    }

    setSaving(false)
    setMetricDialogOpen(false)
    fetchData()
  }

  // ============ 刪除 ============
  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)

    const table = deleteTarget.type === "exercise" ? "health_exercises" : "health_metrics"
    await supabase.from(table).delete().eq("id", deleteTarget.item.id)

    setDeleteLoading(false)
    setDeleteDialogOpen(false)
    setDeleteTarget(null)
    fetchData()
  }

  // ============ 格式化 ============
  const formatDate = (date: string) => format(new Date(date), "M/d EEEE", { locale: zhTW })

  const formatMetricValue = (metric: HealthMetric) => {
    switch (metric.metric_type) {
      case "weight":
        return `${metric.value_primary} kg`
      case "blood_pressure":
        return `${metric.value_primary}/${metric.value_secondary || "?"} mmHg`
      case "sleep":
        return `${metric.value_primary} 小時`
      case "water":
        return `${metric.value_primary} ml`
      case "steps":
        return `${metric.value_primary.toLocaleString()} 步`
      default:
        return `${metric.value_primary}`
    }
  }

  const getMetricIcon = (type: string) => {
    return METRIC_TYPES.find(m => m.value === type)?.icon || Activity
  }

  // ============ 統計 ============
  const thisWeekExercises = exercises.filter(e => {
    const date = new Date(e.date)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    return date >= weekAgo
  })
  const totalDuration = thisWeekExercises.reduce((sum, e) => sum + (e.duration_minutes || 0), 0)
  const totalCalories = thisWeekExercises.reduce((sum, e) => sum + (e.calories || 0), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 返回按鈕 */}
      <Link href="/dashboard">
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          返回總覽
        </Button>
      </Link>

      {/* 頁面標題 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">💪 健康記錄</h1>
          <p className="text-gray-600 mt-1">追蹤運動與健康數據</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/health/weight">
            <Button variant="outline" className="gap-2">
              <Scale className="w-4 h-4" />
              體重管理
            </Button>
          </Link>
          <Link href="/dashboard/health/stats">
            <Button variant="outline" className="gap-2">
              <BarChart2 className="w-4 h-4" />
              健康統計
            </Button>
          </Link>
        </div>
      </div>

      {/* 本週統計 */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50">
          <CardContent className="p-4 text-center">
            <Activity className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-600">{thisWeekExercises.length}</p>
            <p className="text-xs text-gray-500">本週運動</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50">
          <CardContent className="p-4 text-center">
            <Clock className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-blue-600">{totalDuration}</p>
            <p className="text-xs text-gray-500">分鐘</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-50 to-amber-50">
          <CardContent className="p-4 text-center">
            <Flame className="w-6 h-6 text-orange-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-orange-600">{totalCalories}</p>
            <p className="text-xs text-gray-500">卡路里</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="exercise" className="gap-2">
              <Dumbbell className="w-4 h-4" />
              運動記錄
            </TabsTrigger>
            <TabsTrigger value="metrics" className="gap-2">
              <Activity className="w-4 h-4" />
              健康數值
            </TabsTrigger>
          </TabsList>

          {activeTab === "exercise" ? (
            <Button onClick={() => openExerciseDialog()} className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-2" />
              新增運動
            </Button>
          ) : (
            <Button onClick={() => openMetricDialog()} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              新增記錄
            </Button>
          )}
        </div>

        {/* 運動記錄 Tab */}
        <TabsContent value="exercise" className="space-y-4 mt-4">
          {exercises.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border">
              <Dumbbell className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-800 mb-2">尚無運動記錄</h3>
              <Button onClick={() => openExerciseDialog()} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                新增運動
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {exercises.map((exercise) => (
                <Card key={exercise.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-2xl">
                        {EXERCISE_ICONS[exercise.exercise_type] || "⚡"}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-800">{exercise.exercise_type}</h3>
                          <span className="text-sm text-gray-500">{formatDate(exercise.date)}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          {exercise.duration_minutes && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {exercise.duration_minutes} 分鐘
                            </span>
                          )}
                          {exercise.calories && (
                            <span className="flex items-center gap-1">
                              <Flame className="w-3.5 h-3.5" />
                              {exercise.calories} kcal
                            </span>
                          )}
                          {exercise.distance_km && <span>{exercise.distance_km} km</span>}
                        </div>
                        {exercise.note && <p className="text-sm text-gray-500 mt-1">{exercise.note}</p>}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openExerciseDialog(exercise)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => { setDeleteTarget({ type: "exercise", item: exercise }); setDeleteDialogOpen(true) }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* 健康數值 Tab */}
        <TabsContent value="metrics" className="space-y-4 mt-4">
          {/* 快速新增按鈕 */}
          <div className="grid grid-cols-5 gap-2">
            {METRIC_TYPES.map((type) => {
              const Icon = type.icon
              return (
                <Button
                  key={type.value}
                  variant="outline"
                  className="h-auto py-3 flex flex-col gap-1"
                  onClick={() => openMetricDialog(undefined, type.value)}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs">{type.label}</span>
                </Button>
              )
            })}
          </div>

          {metrics.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border">
              <Activity className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-800 mb-2">尚無健康數值</h3>
              <p className="text-gray-500">開始記錄體重、血壓等數據</p>
            </div>
          ) : (
            <div className="space-y-3">
              {metrics.map((metric) => {
                const Icon = getMetricIcon(metric.metric_type)
                const typeLabel = METRIC_TYPES.find(m => m.value === metric.metric_type)?.label || metric.metric_type
                return (
                  <Card key={metric.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <Icon className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-800">{typeLabel}</h3>
                            <span className="text-sm text-gray-500">{formatDate(metric.date)}</span>
                            {metric.measured_time && <span className="text-sm text-gray-400">{metric.measured_time}</span>}
                          </div>
                          <p className="text-lg font-bold text-blue-600">{formatMetricValue(metric)}</p>
                          {metric.note && <p className="text-sm text-gray-500 mt-1">{metric.note}</p>}
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openMetricDialog(metric)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => { setDeleteTarget({ type: "metric", item: metric }); setDeleteDialogOpen(true) }}>
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
        </TabsContent>
      </Tabs>

      {/* 運動表單對話框 */}
      <Dialog open={exerciseDialogOpen} onOpenChange={setExerciseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingExercise ? "編輯運動" : "新增運動記錄"}</DialogTitle>
            <DialogDescription>記錄你的運動內容</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>運動類型 *</Label>
                <Select value={exerciseForm.exercise_type} onValueChange={(v) => setExerciseForm({ ...exerciseForm, exercise_type: v })}>
                  <SelectTrigger><SelectValue placeholder="選擇類型" /></SelectTrigger>
                  <SelectContent>
                    {EXERCISE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{EXERCISE_ICONS[type]} {type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>日期</Label>
                <Input type="date" value={exerciseForm.date} onChange={(e) => setExerciseForm({ ...exerciseForm, date: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>時長（分鐘）</Label>
                <Input type="number" value={exerciseForm.duration_minutes} onChange={(e) => setExerciseForm({ ...exerciseForm, duration_minutes: e.target.value })} placeholder="30" />
              </div>
              <div className="space-y-2">
                <Label>距離（公里）</Label>
                <Input type="number" step="0.1" value={exerciseForm.distance_km} onChange={(e) => setExerciseForm({ ...exerciseForm, distance_km: e.target.value })} placeholder="5.0" />
              </div>
              <div className="space-y-2">
                <Label>卡路里</Label>
                <Input type="number" value={exerciseForm.calories} onChange={(e) => setExerciseForm({ ...exerciseForm, calories: e.target.value })} placeholder="200" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>備註</Label>
              <Textarea value={exerciseForm.note} onChange={(e) => setExerciseForm({ ...exerciseForm, note: e.target.value })} placeholder="運動心得..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExerciseDialogOpen(false)}>取消</Button>
            <Button onClick={handleExerciseSave} disabled={saving || !exerciseForm.exercise_type}>{saving ? "儲存中..." : "儲存"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 健康數值表單對話框 */}
      <Dialog open={metricDialogOpen} onOpenChange={setMetricDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMetric ? "編輯健康數值" : "新增健康數值"}</DialogTitle>
            <DialogDescription>記錄你的健康數據</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>類型 *</Label>
                <Select value={metricForm.metric_type} onValueChange={(v) => setMetricForm({ ...metricForm, metric_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {METRIC_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>日期</Label>
                <Input type="date" value={metricForm.date} onChange={(e) => setMetricForm({ ...metricForm, date: e.target.value })} />
              </div>
            </div>

            {/* 動態欄位根據類型 */}
            {metricForm.metric_type === "weight" && (
              <div className="space-y-2">
                <Label>體重 (kg) *</Label>
                <Input type="number" step="0.1" value={metricForm.value_primary} onChange={(e) => setMetricForm({ ...metricForm, value_primary: e.target.value })} placeholder="65.5" />
              </div>
            )}

            {metricForm.metric_type === "blood_pressure" && (
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>收縮壓 *</Label>
                  <Input type="number" value={metricForm.value_primary} onChange={(e) => setMetricForm({ ...metricForm, value_primary: e.target.value })} placeholder="120" />
                </div>
                <div className="space-y-2">
                  <Label>舒張壓</Label>
                  <Input type="number" value={metricForm.value_secondary} onChange={(e) => setMetricForm({ ...metricForm, value_secondary: e.target.value })} placeholder="80" />
                </div>
                <div className="space-y-2">
                  <Label>心率</Label>
                  <Input type="number" value={metricForm.value_tertiary} onChange={(e) => setMetricForm({ ...metricForm, value_tertiary: e.target.value })} placeholder="72" />
                </div>
              </div>
            )}

            {metricForm.metric_type === "sleep" && (
              <div className="space-y-2">
                <Label>睡眠時數 *</Label>
                <Input type="number" step="0.5" value={metricForm.value_primary} onChange={(e) => setMetricForm({ ...metricForm, value_primary: e.target.value })} placeholder="7.5" />
              </div>
            )}

            {metricForm.metric_type === "water" && (
              <div className="space-y-2">
                <Label>飲水量 (ml) *</Label>
                <Input type="number" value={metricForm.value_primary} onChange={(e) => setMetricForm({ ...metricForm, value_primary: e.target.value })} placeholder="2000" />
              </div>
            )}

            {metricForm.metric_type === "steps" && (
              <div className="space-y-2">
                <Label>步數 *</Label>
                <Input type="number" value={metricForm.value_primary} onChange={(e) => setMetricForm({ ...metricForm, value_primary: e.target.value })} placeholder="8000" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>測量時間</Label>
                <Input type="time" value={metricForm.measured_time} onChange={(e) => setMetricForm({ ...metricForm, measured_time: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>備註</Label>
                <Input value={metricForm.note} onChange={(e) => setMetricForm({ ...metricForm, note: e.target.value })} placeholder="備註..." />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMetricDialogOpen(false)}>取消</Button>
            <Button onClick={handleMetricSave} disabled={saving || !metricForm.value_primary}>{saving ? "儲存中..." : "儲存"}</Button>
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
