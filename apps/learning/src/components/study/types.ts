// components/study/types.ts
// 筆記相關的類型定義

// 筆記分類類型
export type NoteCategoryType = 
  | 'key_point'   // 📌 重點
  | 'definition'  // 📘 定義
  | 'formula'     // 📐 公式
  | 'example'     // 📝 例題
  | 'tip'         // 💡 技巧
  | 'summary'     // 📋 總結
  | 'warning'     // ⚠️ 易錯
  | 'other'       // 📎 其他

// 單元筆記類型
export interface UnitNote {
  id: string
  unit_id: string
  user_id: string
  category: NoteCategoryType
  title: string | null
  content: string
  is_important: boolean
  order: number
  created_at: string
  updated_at: string
}

// 筆記分類選項（用於 Select）
export const NOTE_CATEGORIES = [
  { value: "key_point", label: "📌 重點" },
  { value: "definition", label: "📘 定義" },
  { value: "formula", label: "📐 公式" },
  { value: "example", label: "📝 例題" },
  { value: "tip", label: "💡 技巧" },
  { value: "summary", label: "📋 總結" },
  { value: "warning", label: "⚠️ 易錯" },
  { value: "other", label: "📎 其他" },
] as const

// 筆記分類對應表（用於顯示）
export const NOTE_CATEGORY_MAP: Record<NoteCategoryType, { label: string; color: string; bgColor: string }> = {
  key_point: { label: "📌 重點", color: "border-l-red-500", bgColor: "#ef4444" },
  definition: { label: "📘 定義", color: "border-l-blue-500", bgColor: "#3b82f6" },
  formula: { label: "📐 公式", color: "border-l-purple-500", bgColor: "#a855f7" },
  example: { label: "📝 例題", color: "border-l-green-500", bgColor: "#22c55e" },
  tip: { label: "💡 技巧", color: "border-l-yellow-500", bgColor: "#eab308" },
  summary: { label: "📋 總結", color: "border-l-cyan-500", bgColor: "#06b6d4" },
  warning: { label: "⚠️ 易錯", color: "border-l-orange-500", bgColor: "#f97316" },
  other: { label: "📎 其他", color: "border-l-gray-500", bgColor: "#6b7280" },
}
