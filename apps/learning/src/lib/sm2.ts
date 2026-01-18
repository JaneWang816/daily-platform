// lib/sm2.ts
// SM-2 間隔重複演算法實作

export interface SM2Result {
  interval: number        // 下次複習間隔（天）
  easeFactor: number      // 難易度因子
  repetitions: number     // 重複次數
  nextReview: Date        // 下次複習時間
}

export interface SM2Input {
  quality: number
  currentInterval: number
  currentEaseFactor: number
  currentRepetitionCount: number
}

/**
 * SM-2 演算法（物件參數版本）
 * 
 * 評分說明（0-4）：
 * 0 - 全忘
 * 1 - 模糊
 * 2 - 要想
 * 3 - 順答
 * 4 - 秒答
 */
export function calculateSM2(input: SM2Input): SM2Result
export function calculateSM2(
  quality: number,
  repetitions: number,
  easeFactor: number,
  interval: number
): SM2Result
export function calculateSM2(
  inputOrQuality: SM2Input | number,
  repetitions?: number,
  easeFactor?: number,
  interval?: number
): SM2Result {
  // 處理兩種呼叫方式
  let quality: number
  let currentRepetitions: number
  let currentEaseFactor: number
  let currentInterval: number

  if (typeof inputOrQuality === "object") {
    quality = inputOrQuality.quality
    currentRepetitions = inputOrQuality.currentRepetitionCount
    currentEaseFactor = inputOrQuality.currentEaseFactor
    currentInterval = inputOrQuality.currentInterval
  } else {
    quality = inputOrQuality
    currentRepetitions = repetitions!
    currentEaseFactor = easeFactor!
    currentInterval = interval!
  }

  let newRepetitions: number
  let newInterval: number
  let newEaseFactor: number

  // 使用 0-4 評分系統，轉換為 SM-2 的 0-5 系統
  // 0(全忘)->0, 1(模糊)->1, 2(要想)->3, 3(順答)->4, 4(秒答)->5
  const sm2Quality = quality <= 1 ? quality : quality + 1

  // 評分 < 3 (原始 SM-2) 視為失敗，重新開始
  if (sm2Quality < 3) {
    newRepetitions = 0
    newInterval = quality === 0 ? 0 : 1 // 全忘=10分鐘後(當天), 模糊=明天
    newEaseFactor = Math.max(1.3, currentEaseFactor - 0.2)
  } else {
    // 評分 >= 3 視為成功
    newRepetitions = currentRepetitions + 1

    // 計算新間隔
    if (newRepetitions === 1) {
      newInterval = 1
    } else if (newRepetitions === 2) {
      newInterval = quality === 2 ? 3 : quality === 3 ? 6 : 7 // 要想3天, 順答6天, 秒答7天
    } else {
      // 根據評分調整倍數
      const multiplier = quality === 2 ? 1.5 : quality === 3 ? currentEaseFactor : currentEaseFactor * 1.2
      newInterval = Math.round(currentInterval * multiplier)
    }

    // 更新難易度因子
    newEaseFactor = currentEaseFactor + (0.1 - (5 - sm2Quality) * (0.08 + (5 - sm2Quality) * 0.02))
    newEaseFactor = Math.max(1.3, newEaseFactor) // 最小值 1.3
  }

  // 計算下次複習時間
  const nextReview = new Date()
  if (newInterval === 0) {
    // 10 分鐘後
    nextReview.setMinutes(nextReview.getMinutes() + 10)
  } else {
    nextReview.setDate(nextReview.getDate() + newInterval)
    nextReview.setHours(0, 0, 0, 0) // 設為當天開始
  }

  return {
    interval: newInterval,
    easeFactor: Math.round(newEaseFactor * 100) / 100, // 保留兩位小數
    repetitions: newRepetitions,
    nextReview,
  }
}

/**
 * 評分按鈕配置（原平台風格）
 */
export const qualityButtons = [
  { value: 0, label: "全忘", bg: "#ef4444", hover: "#dc2626" },
  { value: 1, label: "模糊", bg: "#f97316", hover: "#ea580c" },
  { value: 2, label: "要想", bg: "#eab308", hover: "#ca8a04" },
  { value: 3, label: "順答", bg: "#22c55e", hover: "#16a34a" },
  { value: 4, label: "秒答", bg: "#14b8a6", hover: "#0d9488" },
]

/**
 * 計算預計下次複習時間的顯示文字
 */
export function getNextReviewText(days: number): string {
  if (days === 0) return "10 分鐘"
  if (days === 1) return "明天"
  if (days < 7) return `${days} 天後`
  if (days < 30) return `${Math.round(days / 7)} 週後`
  if (days < 365) return `${Math.round(days / 30)} 個月後`
  return `${Math.round(days / 365)} 年後`
}
