//apps/life/src/app/dashboard/export
"use client"

import { useState } from "react"
import { format } from "date-fns"
import { createClient } from "@daily/database/client"
import { Button, Input, Label } from "@daily/ui"
import {
  Download, FileSpreadsheet, Calendar, CheckSquare, Target, FileText,
  GraduationCap, BookMarked, Heart, Compass, Wallet, Dumbbell, Activity,
  CalendarClock, Check,
} from "lucide-react"
import * as XLSX from "xlsx"

// ============================================
// 類型定義
// ============================================
type TableName = 
  | "daily_plans"
  | "tasks"
  | "habit_logs"
  | "journals_life"
  | "journals_learning"
  | "journals_reading"
  | "journals_gratitude"
  | "journals_travel"
  | "finance_records"
  | "health_exercises"
  | "health_metrics"

// ============================================
// 模組定義
// ============================================
const EXPORT_MODULES: { 
  key: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  table: TableName 
}[] = [
  { key: "daily_plans", label: "每日行程", icon: CalendarClock, table: "daily_plans" },
  { key: "tasks", label: "任務", icon: CheckSquare, table: "tasks" },
  { key: "habits", label: "習慣打卡", icon: Target, table: "habit_logs" },
  { key: "journal_life", label: "生活日誌", icon: FileText, table: "journals_life" },
  { key: "journal_learning", label: "學習日誌", icon: GraduationCap, table: "journals_learning" },
  { key: "journal_reading", label: "閱讀日誌", icon: BookMarked, table: "journals_reading" },
  { key: "journal_gratitude", label: "感恩日誌", icon: Heart, table: "journals_gratitude" },
  { key: "journal_travel", label: "遊覽日誌", icon: Compass, table: "journals_travel" },
  { key: "finance", label: "收支記錄", icon: Wallet, table: "finance_records" },
  { key: "exercise", label: "運動記錄", icon: Dumbbell, table: "health_exercises" },
  { key: "health", label: "健康數值", icon: Activity, table: "health_metrics" },
]

// ============================================
// 欄位對照表（中文化）
// ============================================
const COLUMN_NAMES: Record<string, Record<string, string>> = {
  daily_plans: {
    date: "日期",
    title: "標題",
    start_time: "開始時間",
    end_time: "結束時間",
    is_all_day: "全天事件",
    location: "地點",
    description: "備註",
    color: "顏色",
    recurrence_type: "重複類型",
  },
  tasks: {
    due_date: "日期",
    title: "任務名稱",
    description: "說明",
    is_important: "重要",
    is_urgent: "緊急",
    completed_at: "完成時間",
  },
  habit_logs: {
    date: "日期",
    habit_id: "習慣 ID",
    completed: "已完成",
    note: "備註",
  },
  journals_life: {
    date: "日期",
    title: "標題",
    content: "內容",
    mood: "心情 (1-5)",
  },
  journals_learning: {
    date: "日期",
    title: "標題",
    content: "內容",
    duration_minutes: "學習時長 (分鐘)",
    difficulty: "難度 (1-5)",
  },
  journals_reading: {
    date: "日期",
    book_title: "書名",
    author: "作者",
    content: "心得",
    pages_read: "今日讀頁數",
    current_page: "目前頁數",
    total_pages: "總頁數",
    rating: "評分 (1-5)",
    is_finished: "已讀完",
  },
  journals_gratitude: {
    date: "日期",
    content: "感恩內容",
  },
  journals_travel: {
    date: "日期",
    title: "標題",
    location: "地點",
    duration_minutes: "停留時間 (分鐘)",
    content: "心得",
    mood: "心情 (1-5)",
    weather: "天氣",
    companions: "同行者",
    rating: "推薦度 (1-5)",
  },
  finance_records: {
    date: "日期",
    type: "類型",
    category: "分類",
    amount: "金額",
    description: "備註",
  },
  health_exercises: {
    date: "日期",
    exercise_type: "運動類型",
    duration_minutes: "時長 (分鐘)",
    calories: "消耗熱量",
    note: "備註",
  },
  health_metrics: {
    date: "日期",
    metric_type: "類型",
    value_primary: "數值",
    value_secondary: "數值 2",
    note: "備註",
  },
}

// ============================================
// 主元件
// ============================================
export default function ExportPage() {
  const supabase = createClient()
  const [startDate, setStartDate] = useState(format(new Date(new Date().setDate(1)), "yyyy-MM-dd"))
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [selectedModules, setSelectedModules] = useState<string[]>([])
  const [exporting, setExporting] = useState(false)

  // 全選/取消全選
  const toggleAll = () => {
    if (selectedModules.length === EXPORT_MODULES.length) {
      setSelectedModules([])
    } else {
      setSelectedModules(EXPORT_MODULES.map(m => m.key))
    }
  }

  // 切換單一模組
  const toggleModule = (key: string) => {
    setSelectedModules(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  // 匯出資料
  const handleExport = async () => {
    if (selectedModules.length === 0) {
      alert("請至少選擇一個模組")
      return
    }

    setExporting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert("請先登入")
        setExporting(false)
        return
      }

      const workbook = XLSX.utils.book_new()

      for (const moduleKey of selectedModules) {
        const module = EXPORT_MODULES.find(m => m.key === moduleKey)
        if (!module) continue

        // 查詢資料
        const { data, error } = await supabase
          .from(module.table)
          .select("*")
          .eq("user_id", user.id)
          .gte("date", startDate)
          .lte("date", endDate)
          .order("date", { ascending: true })

        if (error) {
          console.error(`查詢 ${module.label} 失敗:`, error)
          continue
        }

        if (!data || data.length === 0) continue

        // 轉換欄位名稱
        const columnMap = COLUMN_NAMES[module.table] || {}
        const transformedData = data.map((row: Record<string, unknown>) => {
          const newRow: Record<string, unknown> = {}
          for (const [key, value] of Object.entries(row)) {
            // 排除系統欄位
            if (["id", "user_id", "created_at", "updated_at", "parent_id", "photos", "category_id"].includes(key)) continue
            const chineseName = columnMap[key] || key
            // 處理布林值
            if (typeof value === "boolean") {
              newRow[chineseName] = value ? "是" : "否"
            } else {
              newRow[chineseName] = value
            }
          }
          return newRow
        })

        // 建立工作表
        const worksheet = XLSX.utils.json_to_sheet(transformedData)
        
        // 設定欄寬
        const colWidths = Object.keys(transformedData[0] || {}).map(() => ({ wch: 15 }))
        worksheet["!cols"] = colWidths

        XLSX.utils.book_append_sheet(workbook, worksheet, module.label)
      }

      // 檢查是否有資料
      if (workbook.SheetNames.length === 0) {
        alert("所選期間內沒有資料")
        setExporting(false)
        return
      }

      // 下載檔案
      const fileName = `生活管理_${startDate}_${endDate}.xlsx`
      XLSX.writeFile(workbook, fileName)

    } catch (error) {
      console.error("匯出失敗:", error)
      alert("匯出失敗，請稍後再試")
    }

    setExporting(false)
  }

  return (
    <div className="space-y-6">
      {/* 標題 */}
      <div className="flex items-center gap-2">
        <Download className="w-7 h-7 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-800">資料匯出</h1>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        {/* 日期範圍 */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Calendar className="w-5 h-5" /> 選擇期間
          </h2>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <Label className="text-sm">開始日期</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40"
              />
            </div>
            <span className="pb-2 text-gray-500">到</span>
            <div className="space-y-1">
              <Label className="text-sm">結束日期</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40"
              />
            </div>
          </div>
        </div>

        {/* 模組選擇 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" /> 選擇模組
            </h2>
            <Button variant="outline" size="sm" onClick={toggleAll}>
              {selectedModules.length === EXPORT_MODULES.length ? "取消全選" : "全選"}
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {EXPORT_MODULES.map((module) => {
              const Icon = module.icon
              const isSelected = selectedModules.includes(module.key)
              return (
                <button
                  key={module.key}
                  type="button"
                  onClick={() => toggleModule(module.key)}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left
                    ${isSelected
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                    }
                  `}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    isSelected ? "bg-blue-500 border-blue-500" : "border-gray-300"
                  }`}>
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <Icon className={`w-5 h-5 ${isSelected ? "text-blue-600" : "text-gray-400"}`} />
                  <span className={`text-sm ${isSelected ? "font-medium" : ""}`}>
                    {module.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* 匯出按鈕 */}
        <div className="flex items-center gap-4">
          <Button
            onClick={handleExport}
            disabled={exporting || selectedModules.length === 0}
            className="bg-green-600 hover:bg-green-700"
          >
            {exporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                匯出中...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                匯出 Excel
              </>
            )}
          </Button>
          <span className="text-sm text-gray-500">
            已選擇 {selectedModules.length} 個模組
          </span>
        </div>

        {/* 說明 */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
          <p className="font-medium mb-2">📝 說明</p>
          <ul className="list-disc list-inside space-y-1">
            <li>匯出的 Excel 檔案每個模組會有獨立的工作表</li>
            <li>只會匯出所選期間內有資料的模組</li>
            <li>照片不會被匯出（僅文字資料）</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
