// components/dashboard/panels/constants.ts

// 時段對照表
export const SLOT_TIMES: Record<number, { start: string; end: string }> = {
  1: { start: "08:00", end: "08:50" },
  2: { start: "09:00", end: "09:50" },
  3: { start: "10:00", end: "10:50" },
  4: { start: "11:00", end: "11:50" },
  5: { start: "12:00", end: "12:50" },
  6: { start: "13:00", end: "13:50" },
  7: { start: "14:00", end: "14:50" },
  8: { start: "15:00", end: "15:50" },
  9: { start: "16:00", end: "16:50" },
  10: { start: "17:00", end: "17:50" },
}

// 心情對照
export const MOOD_CONFIG = {
  1: { label: "很差", color: "text-red-500", emoji: "😢" },
  2: { label: "不好", color: "text-orange-500", emoji: "😕" },
  3: { label: "普通", color: "text-yellow-500", emoji: "😐" },
  4: { label: "不錯", color: "text-lime-500", emoji: "🙂" },
  5: { label: "很棒", color: "text-green-500", emoji: "😄" },
}

// 天氣選項
export const WEATHER_OPTIONS = [
  "☀️ 晴天",
  "⛅ 多雲", 
  "☁️ 陰天",
  "🌧️ 雨天",
  "⛈️ 雷雨",
  "🌨️ 雪天",
  "🌫️ 霧",
]

// 同行者選項
export const COMPANION_OPTIONS = [
  "👤 獨自",
  "👨‍👩‍👧 家人",
  "👫 朋友",
  "💑 情侶",
  "👥 同學",
  "🏢 同事",
  "🎒 團體旅遊",
]

// 運動類型
export const EXERCISE_TYPES = [
  "跑步",
  "游泳",
  "籃球",
  "羽球",
  "桌球",
  "健身",
  "瑜珈",
  "騎車",
  "健行",
  "其他",
]

// 健康數值類型
export const METRIC_CONFIG: Record<string, { label: string; unit: string }> = {
  weight: { label: "體重", unit: "kg" },
  sleep: { label: "睡眠", unit: "小時" },
  water: { label: "飲水", unit: "ml" },
  blood_pressure: { label: "血壓", unit: "mmHg" },
}

// ============================================
// 行程相關常量
// ============================================

// 行程顏色選項
export const PLAN_COLORS = [
  { value: "blue", label: "藍色", bg: "bg-blue-500", light: "bg-blue-100", text: "text-blue-700" },
  { value: "red", label: "紅色", bg: "bg-red-500", light: "bg-red-100", text: "text-red-700" },
  { value: "green", label: "綠色", bg: "bg-green-500", light: "bg-green-100", text: "text-green-700" },
  { value: "yellow", label: "黃色", bg: "bg-yellow-500", light: "bg-yellow-100", text: "text-yellow-700" },
  { value: "purple", label: "紫色", bg: "bg-purple-500", light: "bg-purple-100", text: "text-purple-700" },
  { value: "pink", label: "粉色", bg: "bg-pink-500", light: "bg-pink-100", text: "text-pink-700" },
  { value: "orange", label: "橘色", bg: "bg-orange-500", light: "bg-orange-100", text: "text-orange-700" },
  { value: "cyan", label: "青色", bg: "bg-cyan-500", light: "bg-cyan-100", text: "text-cyan-700" },
]

// 取得顏色設定
export function getPlanColor(color: string) {
  return PLAN_COLORS.find(c => c.value === color) || PLAN_COLORS[0]
}

// 重複類型選項
export const RECURRENCE_OPTIONS = [
  { value: "none", label: "不重複" },
  { value: "daily", label: "每天" },
  { value: "weekly", label: "每週" },
  { value: "monthly", label: "每月" },
  { value: "yearly", label: "每年" },
]

// 時間選項（每 30 分鐘）
export const TIME_OPTIONS = (() => {
  const times: string[] = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      times.push(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`)
    }
  }
  return times
})()

// 格式化時間顯示
export function formatTime(time: string | null): string {
  if (!time) return ""
  // 假設 time 格式是 "HH:mm:ss" 或 "HH:mm"
  return time.substring(0, 5)
}
