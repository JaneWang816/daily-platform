//apps/life/src/app/dashboard/tasks/page.tsx
"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { createBrowserClient } from '@supabase/ssr'
import { 
  Button, 
  Input, 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Label,
  Textarea,
  Checkbox,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@daily/ui"
import { cn } from "@daily/utils"
import { format } from "date-fns"
import {
  ArrowLeft,
  Plus,
  AlertTriangle,
  Clock,
  CalendarDays,
  Trash2,
  MoreVertical,
  Pencil,
  CheckCircle2,
  Circle,
  ListTodo,
  Flame,
  Timer,
  Coffee,
  Repeat,
  RefreshCw,
} from "lucide-react"

// ============================================
// 類型定義
// ============================================
type Task = {
  id: string
  user_id: string
  title: string
  description: string | null
  is_important: boolean | null
  is_urgent: boolean | null
  due_date: string | null
  completed_at: string | null
  recurrence_type: string | null
  recurrence_interval: number | null
  recurrence_end_date: string | null
  original_task_id: string | null
  created_at: string | null
  updated_at: string | null
}

type Quadrant = "do_first" | "schedule" | "delegate" | "eliminate"
type FilterType = "all" | "pending" | "completed"
type RecurrenceType = 
  | "none" 
  | "daily" 
  | "weekly" 
  | "biweekly" 
  | "monthly" 
  | "bimonthly" 
  | "quarterly" 
  | "semiannually" 
  | "yearly" 
  | "custom"

// ============================================
// 常數
// ============================================
const RECURRENCE_OPTIONS: { value: RecurrenceType; label: string }[] = [
  { value: "none", label: "不重複" },
  { value: "daily", label: "每日" },
  { value: "weekly", label: "每週" },
  { value: "biweekly", label: "每兩週" },
  { value: "monthly", label: "每月" },
  { value: "bimonthly", label: "每雙月" },
  { value: "quarterly", label: "每季" },
  { value: "semiannually", label: "每半年" },
  { value: "yearly", label: "每年" },
  { value: "custom", label: "自訂天數" },
]

const QUADRANTS: {
  key: Quadrant
  title: string
  subtitle: string
  color: string
  bgColor: string
  borderColor: string
  icon: React.ElementType
  is_important: boolean
  is_urgent: boolean
}[] = [
  {
    key: "do_first",
    title: "立即執行",
    subtitle: "重要且緊急",
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    icon: Flame,
    is_important: true,
    is_urgent: true,
  },
  {
    key: "schedule",
    title: "計劃安排",
    subtitle: "重要不緊急",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    icon: CalendarDays,
    is_important: true,
    is_urgent: false,
  },
  {
    key: "delegate",
    title: "委託他人",
    subtitle: "緊急不重要",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    icon: Timer,
    is_important: false,
    is_urgent: true,
  },
  {
    key: "eliminate",
    title: "考慮刪除",
    subtitle: "不重要不緊急",
    color: "text-gray-600",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
    icon: Coffee,
    is_important: false,
    is_urgent: false,
  },
]

// 工具函數
function getRecurrenceLabel(type: string | null, interval?: number | null): string {
  if (!type || type === "none") return ""
  const option = RECURRENCE_OPTIONS.find(o => o.value === type)
  if (type === "custom" && interval) {
    return `每 ${interval} 天`
  }
  return option?.label || ""
}

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
export default function TasksPage() {
  const supabase = createClient()

  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>("pending")

  // 表單狀態
  const [formOpen, setFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    is_important: false,
    is_urgent: false,
    due_date: "",
    recurrence_type: "none" as RecurrenceType,
    recurrence_interval: "",
    recurrence_end_date: "",
  })
  const [saving, setSaving] = useState(false)

  // 刪除狀態
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingTask, setDeletingTask] = useState<Task | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // 選單狀態
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  // 載入任務
  const COMPLETED_TASK_RETENTION_DAYS = 30 // 可調整天數

  const fetchTasks = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - COMPLETED_TASK_RETENTION_DAYS)
    const cutoffDateStr = format(cutoffDate, "yyyy-MM-dd")

    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .or(`completed_at.is.null,completed_at.gte.${cutoffDateStr}`) // 關鍵修改
      .order("due_date", { ascending: true })

    if (data) {
      setTasks(data as Task[])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchTasks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 取得象限任務
  const getQuadrantTasks = (quadrant: Quadrant) => {
    const config = QUADRANTS.find(q => q.key === quadrant)!
    return tasks.filter(task => {
      const matchQuadrant = 
        (task.is_important ?? false) === config.is_important &&
        (task.is_urgent ?? false) === config.is_urgent
      
      if (filter === "all") return matchQuadrant
      if (filter === "pending") return matchQuadrant && !task.completed_at
      if (filter === "completed") return matchQuadrant && !!task.completed_at
      return matchQuadrant
    })
  }

  // 開啟新增表單
  const openCreateForm = (quadrant?: Quadrant) => {
    setEditingTask(null)
    if (quadrant) {
      const config = QUADRANTS.find(q => q.key === quadrant)!
      setFormData({
        title: "",
        description: "",
        is_important: config.is_important,
        is_urgent: config.is_urgent,
        due_date: "",
        recurrence_type: "none",
        recurrence_interval: "",
        recurrence_end_date: "",
      })
    } else {
      setFormData({
        title: "",
        description: "",
        is_important: false,
        is_urgent: false,
        due_date: "",
        recurrence_type: "none",
        recurrence_interval: "",
        recurrence_end_date: "",
      })
    }
    setFormOpen(true)
  }

  // 開啟編輯表單
  const openEditForm = (task: Task) => {
    setEditingTask(task)
    setFormData({
      title: task.title,
      description: task.description || "",
      is_important: task.is_important ?? false,
      is_urgent: task.is_urgent ?? false,
      due_date: task.due_date || "",
      recurrence_type: (task.recurrence_type as RecurrenceType) || "none",
      recurrence_interval: task.recurrence_interval?.toString() || "",
      recurrence_end_date: task.recurrence_end_date || "",
    })
    setFormOpen(true)
    setOpenMenuId(null)
  }

  // 儲存任務
  const handleSave = async () => {
    if (!formData.title.trim()) return

    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSaving(false)
      return
    }

    const taskData = {
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      is_important: formData.is_important,
      is_urgent: formData.is_urgent,
      due_date: formData.due_date || null,
      recurrence_type: formData.recurrence_type,
      recurrence_interval: formData.recurrence_type === "custom" && formData.recurrence_interval 
        ? parseInt(formData.recurrence_interval) 
        : null,
      recurrence_end_date: formData.recurrence_end_date || null,
    }

    if (editingTask) {
      await supabase
        .from("tasks")
        .update(taskData as Record<string, unknown>)
        .eq("id", editingTask.id)
    } else {
      await supabase
        .from("tasks")
        .insert({
          ...taskData,
          user_id: user.id,
        } as Record<string, unknown>)
    }

    setSaving(false)
    setFormOpen(false)
    fetchTasks()
  }

  // 切換完成狀態
  const toggleComplete = async (task: Task) => {
    const newCompletedAt = task.completed_at ? null : new Date().toISOString()
    
    await supabase
      .from("tasks")
      .update({ completed_at: newCompletedAt } as Record<string, unknown>)
      .eq("id", task.id)

    // 如果是例行任務且剛完成，創建下一個實例
    if (!task.completed_at && task.recurrence_type && task.recurrence_type !== "none") {
      await createNextRecurrence(task)
    }

    fetchTasks()
  }

  // 創建下一個例行任務
  const createNextRecurrence = async (task: Task) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let nextDate: Date | null = null
    const baseDate = task.due_date ? new Date(task.due_date) : new Date()

    switch (task.recurrence_type) {
      case "daily":
        nextDate = new Date(baseDate.setDate(baseDate.getDate() + 1))
        break
      case "weekly":
        nextDate = new Date(baseDate.setDate(baseDate.getDate() + 7))
        break
      case "biweekly":
        nextDate = new Date(baseDate.setDate(baseDate.getDate() + 14))
        break
      case "monthly":
        nextDate = new Date(baseDate.setMonth(baseDate.getMonth() + 1))
        break
      case "bimonthly":
        nextDate = new Date(baseDate.setMonth(baseDate.getMonth() + 2))
        break
      case "quarterly":
        nextDate = new Date(baseDate.setMonth(baseDate.getMonth() + 3))
        break
      case "semiannually":
        nextDate = new Date(baseDate.setMonth(baseDate.getMonth() + 6))
        break
      case "yearly":
        nextDate = new Date(baseDate.setFullYear(baseDate.getFullYear() + 1))
        break
      case "custom":
        if (task.recurrence_interval) {
          nextDate = new Date(baseDate.setDate(baseDate.getDate() + task.recurrence_interval))
        }
        break
    }

    if (!nextDate) return

    // 檢查是否超過結束日期
    if (task.recurrence_end_date && nextDate > new Date(task.recurrence_end_date)) {
      return
    }

    await supabase
      .from("tasks")
      .insert({
        user_id: user.id,
        title: task.title,
        description: task.description,
        is_important: task.is_important,
        is_urgent: task.is_urgent,
        due_date: format(nextDate, "yyyy-MM-dd"),
        recurrence_type: task.recurrence_type,
        recurrence_interval: task.recurrence_interval,
        recurrence_end_date: task.recurrence_end_date,
        original_task_id: task.original_task_id || task.id,
      } as Record<string, unknown>)
  }

  // 刪除任務
  const handleDelete = async () => {
    if (!deletingTask) return

    setDeleteLoading(true)
    await supabase.from("tasks").delete().eq("id", deletingTask.id)

    setDeleteLoading(false)
    setDeleteDialogOpen(false)
    setDeletingTask(null)
    fetchTasks()
  }

  const openDeleteDialog = (task: Task) => {
    setDeletingTask(task)
    setDeleteDialogOpen(true)
    setOpenMenuId(null)
  }

  // 統計
  const pendingCount = tasks.filter(t => !t.completed_at).length
  const completedTodayCount = tasks.filter(t => {
    if (!t.completed_at) return false
    return new Date(t.completed_at).toDateString() === new Date().toDateString()
  }).length
  const recurringCount = tasks.filter(t => t.recurrence_type && t.recurrence_type !== "none" && !t.completed_at).length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
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
          <h1 className="text-2xl font-bold text-gray-800">任務管理</h1>
          <p className="text-gray-600 mt-1">使用四象限法則，聚焦重要任務</p>
        </div>
        <Button onClick={() => openCreateForm()} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          新增任務
        </Button>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <ListTodo className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{tasks.length}</p>
                <p className="text-xs text-gray-500">全部任務</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{pendingCount}</p>
                <p className="text-xs text-gray-500">待完成</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{completedTodayCount}</p>
                <p className="text-xs text-gray-500">今日完成</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{recurringCount}</p>
                <p className="text-xs text-gray-500">例行任務</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 篩選按鈕 */}
      <div className="flex gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          全部
        </Button>
        <Button
          variant={filter === "pending" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("pending")}
        >
          待完成
        </Button>
        <Button
          variant={filter === "completed" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("completed")}
        >
          已完成
        </Button>
      </div>

      {/* 四象限視圖 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {QUADRANTS.map((quadrant) => {
          const Icon = quadrant.icon
          const quadrantTasks = getQuadrantTasks(quadrant.key)

          return (
            <Card key={quadrant.key} className={`${quadrant.borderColor} border-2`}>
              <CardHeader className={`${quadrant.bgColor} pb-3`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-5 h-5 ${quadrant.color}`} />
                    <div>
                      <CardTitle className={`text-base ${quadrant.color}`}>
                        {quadrant.title}
                      </CardTitle>
                      <p className="text-xs text-gray-500">{quadrant.subtitle}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={quadrant.color}
                    onClick={() => openCreateForm(quadrant.key)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-3 min-h-[200px]">
                {quadrantTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                    <Icon className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-sm">沒有任務</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {quadrantTasks.map((task) => (
                      <div
                        key={task.id}
                        className={cn(
                          "p-3 rounded-lg border bg-white transition-all",
                          task.completed_at && "opacity-60"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => toggleComplete(task)}
                            className="mt-0.5 flex-shrink-0"
                          >
                            {task.completed_at ? (
                              <CheckCircle2 className="w-5 h-5 text-green-500" />
                            ) : (
                              <Circle className="w-5 h-5 text-gray-300 hover:text-gray-400" />
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              "font-medium text-sm",
                              task.completed_at && "line-through text-gray-500"
                            )}>
                              {task.title}
                            </p>
                            {task.description && (
                              <p className="text-xs text-gray-500 mt-1 truncate">
                                {task.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              {task.due_date && (
                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                  <CalendarDays className="w-3 h-3" />
                                  {task.due_date}
                                </span>
                              )}
                              {task.recurrence_type && task.recurrence_type !== "none" && (
                                <span className="text-xs text-purple-500 flex items-center gap-1">
                                  <Repeat className="w-3 h-3" />
                                  {getRecurrenceLabel(task.recurrence_type, task.recurrence_interval)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="relative">
                            <button
                              onClick={() => setOpenMenuId(openMenuId === task.id ? null : task.id)}
                              className="p-1 hover:bg-gray-100 rounded"
                            >
                              <MoreVertical className="w-4 h-4 text-gray-400" />
                            </button>
                            {openMenuId === task.id && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                                <div className="absolute right-0 top-8 bg-white border rounded-lg shadow-lg z-20 py-1 min-w-28">
                                  <button
                                    onClick={() => openEditForm(task)}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                                  >
                                    <Pencil className="w-4 h-4" />
                                    編輯
                                  </button>
                                  <button
                                    onClick={() => openDeleteDialog(task)}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    刪除
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* 新增/編輯對話框 */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTask ? "編輯任務" : "新增任務"}</DialogTitle>
            <DialogDescription>
              {editingTask ? "修改任務內容" : "設定任務的重要性和緊急性"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="title">任務名稱 *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="輸入任務名稱"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">描述</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="選填，補充說明"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_date">截止日期</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>

            {/* 重複設定 */}
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Repeat className="w-4 h-4 text-purple-600" />
                <Label className="text-sm font-medium">重複設定</Label>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="recurrence_type" className="text-xs text-gray-500">重複週期</Label>
                <Select
                  value={formData.recurrence_type}
                  onValueChange={(value) => setFormData({ 
                    ...formData, 
                    recurrence_type: value as RecurrenceType,
                    recurrence_interval: value !== "custom" ? "" : formData.recurrence_interval
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RECURRENCE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.recurrence_type === "custom" && (
                <div className="space-y-2">
                  <Label className="text-xs text-gray-500">間隔天數</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.recurrence_interval}
                    onChange={(e) => setFormData({ ...formData, recurrence_interval: e.target.value })}
                    placeholder="輸入天數"
                  />
                </div>
              )}

              {formData.recurrence_type !== "none" && (
                <div className="space-y-2">
                  <Label className="text-xs text-gray-500">結束日期（選填）</Label>
                  <Input
                    type="date"
                    value={formData.recurrence_end_date}
                    onChange={(e) => setFormData({ ...formData, recurrence_end_date: e.target.value })}
                  />
                </div>
              )}
            </div>

            {/* 重要/緊急選擇 */}
            <div className="grid grid-cols-2 gap-3">
              <div
                className={cn(
                  "p-3 rounded-lg border-2 cursor-pointer transition-all",
                  formData.is_important
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
                onClick={() => setFormData({ ...formData, is_important: !formData.is_important })}
              >
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={formData.is_important}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_important: !!checked })
                    }
                  />
                  <div>
                    <p className="font-medium text-sm">重要</p>
                    <p className="text-xs text-gray-500">對目標有影響</p>
                  </div>
                </div>
              </div>
              <div
                className={cn(
                  "p-3 rounded-lg border-2 cursor-pointer transition-all",
                  formData.is_urgent
                    ? "border-amber-500 bg-amber-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
                onClick={() => setFormData({ ...formData, is_urgent: !formData.is_urgent })}
              >
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={formData.is_urgent}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_urgent: !!checked })
                    }
                  />
                  <div>
                    <p className="font-medium text-sm">緊急</p>
                    <p className="text-xs text-gray-500">需要立即處理</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 象限預覽 */}
            <div className="pt-2">
              <p className="text-sm text-gray-500">
                此任務將歸類到：
                <span className="font-medium ml-1">
                  {formData.is_important && formData.is_urgent && "🔥 立即執行"}
                  {formData.is_important && !formData.is_urgent && "📅 計劃安排"}
                  {!formData.is_important && formData.is_urgent && "⏱️ 委託他人"}
                  {!formData.is_important && !formData.is_urgent && "☕ 考慮刪除"}
                </span>
              </p>
              {formData.recurrence_type !== "none" && (
                <p className="text-sm text-purple-600 mt-1">
                  🔄 {getRecurrenceLabel(formData.recurrence_type, parseInt(formData.recurrence_interval) || undefined)}
                  {formData.recurrence_end_date && ` (至 ${formData.recurrence_end_date})`}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>取消</Button>
            <Button
              onClick={handleSave}
              disabled={!formData.title.trim() || saving || (formData.recurrence_type === "custom" && !formData.recurrence_interval)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? "儲存中..." : "儲存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 刪除確認對話框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除</AlertDialogTitle>
            <AlertDialogDescription>
              確定要刪除任務「{deletingTask?.title}」嗎？此操作無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteLoading ? "刪除中..." : "刪除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
