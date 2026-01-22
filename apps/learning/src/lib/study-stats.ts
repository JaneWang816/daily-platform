// lib/study-stats.ts
import { createClient } from "@daily/database"

type UpdateType = 
  | { type: "flashcard"; reviewed: number; correct: number }
  | { type: "question"; practiced: number; correct: number }
  | { type: "study_time"; minutes: number }

interface DailyStudySummaryRow {
  id: string
  user_id: string
  date: string
  flashcard_reviewed: number | null
  flashcard_correct: number | null
  question_practiced: number | null
  question_correct: number | null
  study_minutes: number | null
  created_at: string | null
  updated_at: string | null
}

interface DailyStudySummaryInsert {
  user_id: string
  date: string
  flashcard_reviewed: number
  flashcard_correct: number
  question_practiced: number
  question_correct: number
  study_minutes: number
}

interface DailyStudySummaryUpdate {
  flashcard_reviewed?: number
  flashcard_correct?: number
  question_practiced?: number
  question_correct?: number
  study_minutes?: number
  updated_at?: string
}

/**
 * 更新每日學習統計
 * 使用 upsert 確保每天只有一筆記錄
 */
export async function updateDailyStudySummary(update: UpdateType): Promise<boolean> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    // 先嘗試取得今天的記錄
    const { data } = await supabase
      .from("daily_study_summary")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", today)
      .single()

    const existing = data as DailyStudySummaryRow | null

    if (existing) {
      // 更新現有記錄
      const updates: DailyStudySummaryUpdate = {
        updated_at: new Date().toISOString(),
      }

      if (update.type === "flashcard") {
        updates.flashcard_reviewed = (existing.flashcard_reviewed || 0) + update.reviewed
        updates.flashcard_correct = (existing.flashcard_correct || 0) + update.correct
      } else if (update.type === "question") {
        updates.question_practiced = (existing.question_practiced || 0) + update.practiced
        updates.question_correct = (existing.question_correct || 0) + update.correct
      } else if (update.type === "study_time") {
        updates.study_minutes = (existing.study_minutes || 0) + update.minutes
      }

      const { error } = await (supabase.from("daily_study_summary") as any)
        .update(updates)
        .eq("id", existing.id)

      if (error) {
        console.error("更新學習統計失敗:", error)
        return false
      }
    } else {
      // 建立新記錄
      const newRecord: DailyStudySummaryInsert = {
        user_id: user.id,
        date: today,
        flashcard_reviewed: 0,
        flashcard_correct: 0,
        question_practiced: 0,
        question_correct: 0,
        study_minutes: 0,
      }

      if (update.type === "flashcard") {
        newRecord.flashcard_reviewed = update.reviewed
        newRecord.flashcard_correct = update.correct
      } else if (update.type === "question") {
        newRecord.question_practiced = update.practiced
        newRecord.question_correct = update.correct
      } else if (update.type === "study_time") {
        newRecord.study_minutes = update.minutes
      }

      const { error } = await (supabase.from("daily_study_summary") as any)
        .insert(newRecord)

      if (error) {
        console.error("建立學習統計失敗:", error)
        return false
      }
    }

    return true
  } catch (error) {
    console.error("更新學習統計發生錯誤:", error)
    return false
  }
}

/**
 * 取得指定日期範圍的學習統計
 */
export async function getStudySummary(days: number = 30) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data, error } = await supabase
      .from("daily_study_summary")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", startDate.toISOString().split("T")[0])
      .order("date", { ascending: true })

    if (error) {
      console.error("取得學習統計失敗:", error)
      return null
    }

    return data as DailyStudySummaryRow[] | null
  } catch (error) {
    console.error("取得學習統計發生錯誤:", error)
    return null
  }
}

/**
 * 計算學習連續天數 (Streak)
 */
export async function getStudyStreak(): Promise<number> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 0

    // 取得最近 365 天的記錄
    const { data, error } = await supabase
      .from("daily_study_summary")
      .select("date")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(365)

    if (error || !data || data.length === 0) return 0

    const records = data as { date: string }[]

    // 計算連續天數
    let streak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let i = 0; i < records.length; i++) {
      const recordDate = new Date(records[i].date)
      recordDate.setHours(0, 0, 0, 0)

      const expectedDate = new Date(today)
      expectedDate.setDate(today.getDate() - i)

      if (recordDate.getTime() === expectedDate.getTime()) {
        streak++
      } else if (i === 0) {
        // 今天還沒有記錄，檢查昨天
        const yesterday = new Date(today)
        yesterday.setDate(today.getDate() - 1)
        if (recordDate.getTime() === yesterday.getTime()) {
          streak++
        } else {
          break
        }
      } else {
        break
      }
    }

    return streak
  } catch (error) {
    console.error("計算連續天數發生錯誤:", error)
    return 0
  }
}
