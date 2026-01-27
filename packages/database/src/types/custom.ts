// types/custom.ts
// 自定義類型與便利類型別名

import type { Tables, TablesInsert, TablesUpdate } from "./database.types"

// ============================================
// 模組類型
// ============================================
export type ModuleType = 
  | 'journal' 
  | 'habits' 
  | 'tasks' 
  | 'schedule' 
  | 'health' 
  | 'finance' 
  | 'study'

// ============================================
// 便利類型別名 - Row (讀取)
// ============================================
export type Profile = Tables<'profiles'>
export type Task = Tables<'tasks'>
export type ScheduleSlot = Tables<'schedule_slots'>
export type Habit = Tables<'habits'>
export type HabitLog = Tables<'habit_logs'>
export type JournalLife = Tables<'journals_life'>
export type JournalLearning = Tables<'journals_learning'>
export type JournalReading = Tables<'journals_reading'>
export type JournalGratitude = Tables<'journals_gratitude'>
export type FinanceRecord = Tables<'finance_records'>
export type HealthExercise = Tables<'health_exercises'>
export type HealthMetric = Tables<'health_metrics'>
export type Meal = Tables<'meals'>
export type Deck = Tables<'decks'>
export type Flashcard = Tables<'flashcards'>
export type Subject = Tables<'subjects'>
export type Topic = Tables<'topics'>
export type Unit = Tables<'units'>
export type Question = Tables<'questions'>
export type QuestionType = Tables<'question_types'>
export type QuestionTopic = Tables<'question_topics'>
export type DailyStudySummary = Tables<'daily_study_summary'>
export type FoodNutrition = Tables<'food_nutrition'>

// 學習歷程相關
export type LearningPortfolio = Tables<'learning_portfolios'>
export type LearningPortfolioUnit = Tables<'learning_portfolio_units'>
export type LearningPortfolioLink = Tables<'learning_portfolio_links'>

// ============================================
// 筆記相關類型
// ============================================

// 筆記分類類型
export type NoteCategoryType = 
  | 'key_point'   // 🔴 重點
  | 'definition'  // 📘 定義
  | 'formula'     // 📐 公式
  | 'example'     // 📝 例題
  | 'tip'         // 💡 技巧
  | 'summary'     // 📋 總結
  | 'warning'     // ⚠️ 易錯
  | 'other'       // 📌 其他

// 筆記連結類型
export type NoteLinkType = 'question' | 'flashcard'

// 單元筆記（使用 Supabase 生成的類型，重新定義以確保類型安全）
export type UnitNote = {
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

// 筆記關聯
export type NoteLink = {
  id: string
  note_id: string
  user_id: string
  link_type: NoteLinkType
  target_id: string
  created_at: string
}

// 遊覽日誌
export type JournalTravel = {
  id: string
  user_id: string
  date: string
  title: string
  location: string
  duration_minutes: number | null
  content: string | null
  mood: number | null
  weather: string | null
  companions: string | null
  rating: number | null
  photos: string[] | null
  created_at: string
  updated_at: string
}

// 每日行程
export type DailyPlan = {
  id: string
  user_id: string
  date: string
  title: string
  start_time: string | null
  end_time: string | null
  is_all_day: boolean
  location: string | null
  description: string | null
  color: string
  recurrence_type: string
  recurrence_end_date: string | null
  parent_id: string | null
  created_at: string
  updated_at: string
}

// ============================================
// 學習歷程相關類型
// ============================================

// 學習歷程類型
export type PortfolioLogType = 'study' | 'experiment' | 'visit' | 'reading' | 'reflection'

// 參考連結類型
export type PortfolioLinkType = 'website' | 'video' | 'article' | 'document'

// 學習歷程內容結構（依類型不同）
export type PortfolioContentStudy = {
  key_points?: string[]      // 學習重點
  difficulties?: string[]    // 遇到的困難
  solutions?: string[]       // 解決方法
}

export type PortfolioContentExperiment = {
  objective?: string         // 實驗目的
  materials?: string[]       // 實驗材料
  procedure?: string[]       // 實驗步驟
  observations?: string      // 觀察結果
  conclusion?: string        // 結論
}

export type PortfolioContentVisit = {
  purpose?: string           // 參訪目的
  highlights?: string[]      // 重點收穫
  impressions?: string       // 心得感想
}

export type PortfolioContentReading = {
  book_title?: string        // 書名/文章名
  author?: string            // 作者
  key_quotes?: string[]      // 重要摘錄
  takeaways?: string[]       // 收穫心得
}

export type PortfolioContentReflection = {
  achievements?: string[]    // 學習成就
  challenges?: string[]      // 遭遇挑戰
  improvements?: string[]    // 改進方向
  next_steps?: string[]      // 下一步計畫
}

export type PortfolioContent = 
  | PortfolioContentStudy 
  | PortfolioContentExperiment 
  | PortfolioContentVisit 
  | PortfolioContentReading 
  | PortfolioContentReflection

// 學習歷程含關聯資料
export type LearningPortfolioWithRelations = LearningPortfolio & {
  subject?: { id: string; title: string } | null
  topic?: { id: string; title: string } | null
  units?: { id: string; title: string }[]
  links?: LearningPortfolioLink[]
  link_count?: number
}

// ============================================
// 便利類型別名 - Insert (新增)
// ============================================
export type TaskInsert = TablesInsert<'tasks'>
export type HabitInsert = TablesInsert<'habits'>
export type HabitLogInsert = TablesInsert<'habit_logs'>
export type JournalLifeInsert = TablesInsert<'journals_life'>
export type JournalLearningInsert = TablesInsert<'journals_learning'>
export type JournalReadingInsert = TablesInsert<'journals_reading'>
export type JournalGratitudeInsert = TablesInsert<'journals_gratitude'>
export type FinanceRecordInsert = TablesInsert<'finance_records'>
export type HealthExerciseInsert = TablesInsert<'health_exercises'>
export type HealthMetricInsert = TablesInsert<'health_metrics'>
export type MealInsert = TablesInsert<'meals'>
export type FoodNutritionInsert = TablesInsert<'food_nutrition'>
export type FlashcardInsert = TablesInsert<'flashcards'>
export type DeckInsert = TablesInsert<'decks'>
export type JournalTravelInsert = Omit<JournalTravel, 'id' | 'created_at' | 'updated_at'>
export type DailyPlanInsert = Omit<DailyPlan, 'id' | 'created_at' | 'updated_at'>
export type SubjectInsert = TablesInsert<'subjects'>
export type TopicInsert = TablesInsert<'topics'>
export type UnitInsert = TablesInsert<'units'>
export type QuestionInsert = TablesInsert<'questions'>
export type QuestionTopicInsert = TablesInsert<'question_topics'>
export type DailyStudySummaryInsert = TablesInsert<'daily_study_summary'>

// 學習歷程 Insert
export type LearningPortfolioInsert = TablesInsert<'learning_portfolios'>
export type LearningPortfolioUnitInsert = TablesInsert<'learning_portfolio_units'>
export type LearningPortfolioLinkInsert = TablesInsert<'learning_portfolio_links'>

// ============================================
// 便利類型別名 - Update (更新)
// ============================================
export type TaskUpdate = TablesUpdate<'tasks'>
export type HabitUpdate = TablesUpdate<'habits'>
export type HabitLogUpdate = TablesUpdate<'habit_logs'>
export type JournalLifeUpdate = TablesUpdate<'journals_life'>
export type JournalLearningUpdate = TablesUpdate<'journals_learning'>
export type JournalReadingUpdate = TablesUpdate<'journals_reading'>
export type JournalGratitudeUpdate = TablesUpdate<'journals_gratitude'>
export type FinanceRecordUpdate = TablesUpdate<'finance_records'>
export type HealthExerciseUpdate = TablesUpdate<'health_exercises'>
export type HealthMetricUpdate = TablesUpdate<'health_metrics'>
export type MealUpdate = TablesUpdate<'meals'>
export type FoodNutritionUpdate = TablesUpdate<'food_nutrition'>
export type FlashcardUpdate = TablesUpdate<'flashcards'>
export type DeckUpdate = TablesUpdate<'decks'>
export type JournalTravelUpdate = Partial<Omit<JournalTravel, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
export type DailyPlanUpdate = Partial<Omit<DailyPlan, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
export type SubjectUpdate = TablesUpdate<'subjects'>
export type TopicUpdate = TablesUpdate<'topics'>
export type UnitUpdate = TablesUpdate<'units'>
export type QuestionUpdate = TablesUpdate<'questions'>
export type QuestionTopicUpdate = TablesUpdate<'question_topics'>
export type DailyStudySummaryUpdate = TablesUpdate<'daily_study_summary'>

// 學習歷程 Update
export type LearningPortfolioUpdate = TablesUpdate<'learning_portfolios'>
export type LearningPortfolioUnitUpdate = TablesUpdate<'learning_portfolio_units'>
export type LearningPortfolioLinkUpdate = TablesUpdate<'learning_portfolio_links'>

// 單元筆記 Insert/Update
export type UnitNoteInsert = Omit<UnitNote, 'id' | 'created_at' | 'updated_at'>
export type UnitNoteUpdate = Partial<Omit<UnitNote, 'id' | 'user_id' | 'unit_id' | 'created_at' | 'updated_at'>>

// 筆記關聯 Insert
export type NoteLinkInsert = Omit<NoteLink, 'id' | 'created_at'>

// ============================================
// 擴展類型（含額外欄位）
// ============================================

// 習慣含今日打卡狀態
export type HabitWithTodayLog = Habit & {
  todayLog?: HabitLog | null
}

// 任務含例行任務欄位
export type TaskWithRecurrence = Task

// 健康數值含脈搏欄位
export type HealthMetricExtended = HealthMetric & {
  value_tertiary?: number | null
}

// 題目含題型名稱
export type QuestionWithType = Question & {
  question_types?: QuestionType | null
}

// 題目含關聯主題
export type QuestionWithTopics = Question & {
  question_topics?: (QuestionTopic & { topics?: Topic })[]
}

// 字卡含牌組資訊
export type FlashcardWithDeck = Flashcard & {
  decks?: Deck | null
}

// 單元含筆記數量
export type UnitWithNoteCount = Unit & {
  noteCount?: number
}

// 主題含單元列表
export type TopicWithUnits = Topic & {
  units?: Unit[]
}

// 科目含主題列表
export type SubjectWithTopics = Subject & {
  topics?: Topic[]
}

// ============================================
// 任務四象限類型
// ============================================
export type TaskQuadrant = 
  | 'do_first'      // 重要且緊急
  | 'schedule'      // 重要不緊急
  | 'delegate'      // 緊急不重要
  | 'eliminate'     // 不重要不緊急

// 取得任務象限
export function getTaskQuadrant(task: Task): TaskQuadrant {
  const isImportant = task.is_important ?? false
  const isUrgent = task.is_urgent ?? false
  
  if (isImportant && isUrgent) return 'do_first'
  if (isImportant && !isUrgent) return 'schedule'
  if (!isImportant && isUrgent) return 'delegate'
  return 'eliminate'
}

// ============================================
// 重複類型
// ============================================
export type RecurrenceType = 
  | 'none' 
  | 'daily' 
  | 'weekly' 
  | 'biweekly' 
  | 'monthly' 
  | 'bimonthly' 
  | 'quarterly' 
  | 'semiannually' 
  | 'yearly' 
  | 'custom'

// ============================================
// 課表相關
// ============================================
export type SlotTime = {
  slot: number
  startTime: string
  endTime: string
}

export const SCHEDULE_SLOTS: SlotTime[] = [
  { slot: 1, startTime: '08:00', endTime: '08:50' },
  { slot: 2, startTime: '09:00', endTime: '09:50' },
  { slot: 3, startTime: '10:00', endTime: '10:50' },
  { slot: 4, startTime: '11:00', endTime: '11:50' },
  { slot: 5, startTime: '12:00', endTime: '12:50' },
  { slot: 6, startTime: '13:00', endTime: '13:50' },
  { slot: 7, startTime: '14:00', endTime: '14:50' },
  { slot: 8, startTime: '15:00', endTime: '15:50' },
  { slot: 9, startTime: '16:00', endTime: '16:50' },
  { slot: 10, startTime: '17:00', endTime: '17:50' },
]

export const DAY_OF_WEEK_LABELS: Record<number, string> = {
  1: '週一',
  2: '週二',
  3: '週三',
  4: '週四',
  5: '週五',
  6: '週六',
  7: '週日',
}

// ============================================
// 心情對照
// ============================================
export const MOOD_LABELS: Record<number, string> = {
  1: '😢 很差',
  2: '😕 不好',
  3: '😐 普通',
  4: '🙂 不錯',
  5: '😄 很棒',
}

// ============================================
// 健康數值類型對照
// ============================================
export const METRIC_TYPE_LABELS: Record<string, string> = {
  weight: '體重 (kg)',
  blood_pressure: '血壓',
  sleep: '睡眠 (小時)',
  water: '飲水 (ml)',
  steps: '步數',
}

// ============================================
// 收支分類建議
// ============================================
export const EXPENSE_CATEGORIES = [
  '飲食',
  '交通',
  '娛樂',
  '購物',
  '學習',
  '其他'
] as const

export const INCOME_CATEGORIES = [
  '零用錢',
  '獎金',
  '打工',
  '禮金',
  '其他',
] as const

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number]
export type IncomeCategory = typeof INCOME_CATEGORIES[number]

// ============================================
// 運動類型建議
// ============================================
export const EXERCISE_TYPES = [
  '跑步',
  '游泳',
  '籃球',
  '羽球',
  '桌球',
  '健身',
  '瑜珈',
  '騎車',
  '健行',
  '其他',
] as const

export type ExerciseType = typeof EXERCISE_TYPES[number]

// ============================================
// 餐點類型
// ============================================
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export const MEAL_TYPES = [
  { value: 'breakfast', label: '🌅 早餐', color: 'bg-amber-100', textColor: 'text-amber-700' },
  { value: 'lunch', label: '☀️ 午餐', color: 'bg-orange-100', textColor: 'text-orange-700' },
  { value: 'dinner', label: '🌙 晚餐', color: 'bg-indigo-100', textColor: 'text-indigo-700' },
  { value: 'snack', label: '🍪 點心', color: 'bg-pink-100', textColor: 'text-pink-700' },
] as const

export const MEAL_TYPE_MAP: Record<MealType, { label: string; color: string; textColor: string }> = {
  breakfast: { label: '🌅 早餐', color: 'bg-amber-100', textColor: 'text-amber-700' },
  lunch: { label: '☀️ 午餐', color: 'bg-orange-100', textColor: 'text-orange-700' },
  dinner: { label: '🌙 晚餐', color: 'bg-indigo-100', textColor: 'text-indigo-700' },
  snack: { label: '🍪 點心', color: 'bg-pink-100', textColor: 'text-pink-700' },
}

// ============================================
// 食物分類
// ============================================
export type FoodCategory = 'staple' | 'protein' | 'vegetable' | 'fruit' | 'drink' | 'snack'

export const FOOD_CATEGORIES = [
  { value: 'staple', label: '🍚 主食', color: 'bg-amber-100', textColor: 'text-amber-700' },
  { value: 'protein', label: '🥚 蛋白質', color: 'bg-red-100', textColor: 'text-red-700' },
  { value: 'vegetable', label: '🥗 蔬菜', color: 'bg-green-100', textColor: 'text-green-700' },
  { value: 'fruit', label: '🍎 水果', color: 'bg-pink-100', textColor: 'text-pink-700' },
  { value: 'drink', label: '🧋 飲料', color: 'bg-cyan-100', textColor: 'text-cyan-700' },
  { value: 'snack', label: '🍿 點心', color: 'bg-purple-100', textColor: 'text-purple-700' },
] as const

export const FOOD_CATEGORY_MAP: Record<FoodCategory, { label: string; color: string; textColor: string }> = {
  staple: { label: '🍚 主食', color: 'bg-amber-100', textColor: 'text-amber-700' },
  protein: { label: '🥚 蛋白質', color: 'bg-red-100', textColor: 'text-red-700' },
  vegetable: { label: '🥗 蔬菜', color: 'bg-green-100', textColor: 'text-green-700' },
  fruit: { label: '🍎 水果', color: 'bg-pink-100', textColor: 'text-pink-700' },
  drink: { label: '🧋 飲料', color: 'bg-cyan-100', textColor: 'text-cyan-700' },
  snack: { label: '🍿 點心', color: 'bg-purple-100', textColor: 'text-purple-700' },
}

// ============================================
// 天氣選項（遊覽日誌用）
// ============================================
export const WEATHER_OPTIONS = [
  '☀️ 晴天',
  '⛅ 多雲',
  '☁️ 陰天',
  '🌧️ 雨天',
  '⛈️ 雷雨',
  '🌨️ 雪天',
  '🌫️ 霧',
] as const

export type WeatherOption = typeof WEATHER_OPTIONS[number]

// ============================================
// 同行者選項（遊覽日誌用）
// ============================================
export const COMPANION_OPTIONS = [
  '👤 獨自',
  '👨‍👩‍👧 家人',
  '👫 朋友',
  '💑 情侶',
  '👥 同學',
  '🏢 同事',
  '🎒 團體旅遊',
] as const

export type CompanionOption = typeof COMPANION_OPTIONS[number]

// ============================================
// 筆記分類常數
// ============================================
export const NOTE_CATEGORIES = [
  { value: 'key_point', label: '🔴 重點', color: 'bg-red-100 border-red-300' },
  { value: 'definition', label: '📘 定義', color: 'bg-blue-100 border-blue-300' },
  { value: 'formula', label: '📐 公式', color: 'bg-purple-100 border-purple-300' },
  { value: 'example', label: '📝 例題', color: 'bg-green-100 border-green-300' },
  { value: 'tip', label: '💡 技巧', color: 'bg-yellow-100 border-yellow-300' },
  { value: 'summary', label: '📋 總結', color: 'bg-gray-100 border-gray-300' },
  { value: 'warning', label: '⚠️ 易錯', color: 'bg-orange-100 border-orange-300' },
  { value: 'other', label: '📌 其他', color: 'bg-slate-100 border-slate-300' },
] as const

export const NOTE_CATEGORY_MAP: Record<NoteCategoryType, { label: string; color: string }> = {
  key_point: { label: '🔴 重點', color: 'bg-red-100 border-red-300' },
  definition: { label: '📘 定義', color: 'bg-blue-100 border-blue-300' },
  formula: { label: '📐 公式', color: 'bg-purple-100 border-purple-300' },
  example: { label: '📝 例題', color: 'bg-green-100 border-green-300' },
  tip: { label: '💡 技巧', color: 'bg-yellow-100 border-yellow-300' },
  summary: { label: '📋 總結', color: 'bg-gray-100 border-gray-300' },
  warning: { label: '⚠️ 易錯', color: 'bg-orange-100 border-orange-300' },
  other: { label: '📌 其他', color: 'bg-slate-100 border-slate-300' },
}

// ============================================
// 學習歷程類型常數
// ============================================
export const PORTFOLIO_LOG_TYPES = [
  { value: 'study', label: '課堂學習', icon: '📝', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  { value: 'experiment', label: '實驗記錄', icon: '🧪', color: 'text-green-600', bgColor: 'bg-green-100' },
  { value: 'visit', label: '參訪活動', icon: '🏛️', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  { value: 'reading', label: '延伸閱讀', icon: '📖', color: 'text-amber-600', bgColor: 'bg-amber-100' },
  { value: 'reflection', label: '反思統整', icon: '💭', color: 'text-pink-600', bgColor: 'bg-pink-100' },
] as const

export const PORTFOLIO_LOG_TYPE_MAP: Record<PortfolioLogType, { 
  label: string
  icon: string
  color: string
  bgColor: string 
}> = {
  study: { label: '課堂學習', icon: '📝', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  experiment: { label: '實驗記錄', icon: '🧪', color: 'text-green-600', bgColor: 'bg-green-100' },
  visit: { label: '參訪活動', icon: '🏛️', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  reading: { label: '延伸閱讀', icon: '📖', color: 'text-amber-600', bgColor: 'bg-amber-100' },
  reflection: { label: '反思統整', icon: '💭', color: 'text-pink-600', bgColor: 'bg-pink-100' },
}

// 參考連結類型常數
export const PORTFOLIO_LINK_TYPES = [
  { value: 'website', label: '網站', icon: '🌐' },
  { value: 'video', label: '影片', icon: '🎬' },
  { value: 'article', label: '文章', icon: '📄' },
  { value: 'document', label: '文件', icon: '📁' },
] as const

export const PORTFOLIO_LINK_TYPE_MAP: Record<PortfolioLinkType, { label: string; icon: string }> = {
  website: { label: '網站', icon: '🌐' },
  video: { label: '影片', icon: '🎬' },
  article: { label: '文章', icon: '📄' },
  document: { label: '文件', icon: '📁' },
}

// ============================================
// 目標相關類型
// ============================================
export type GoalType = "countdown" | "numeric" | "streak" | "count"
export type GoalStatus = "active" | "completed" | "paused"
export type GoalDirection = "increase" | "decrease"
export type GoalPeriodType = "once" | "daily" | "weekly" | "monthly" | "yearly"

export type Goal = {
  id: string
  user_id: string
  title: string
  icon: string
  color: string
  goal_type: GoalType
  target_date: string | null
  target_value: number | null
  target_count: number | null
  current_value: number | null
  current_count: number | null
  unit: string | null
  direction: GoalDirection | null
  status: GoalStatus
  show_on_dashboard: boolean
  period_type: GoalPeriodType
  period_target: number | null
  track_source: string | null
  track_config: Record<string, unknown> | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export type GoalInsert = Omit<Goal, 'id' | 'created_at' | 'updated_at'>
export type GoalUpdate = Partial<Omit<Goal, 'id' | 'user_id' | 'created_at' | 'updated_at'>>

// ============================================
// 輔助函數
// ============================================

// 格式化時長
export function formatDuration(minutes: number | null | undefined): string {
  if (!minutes) return ''
  if (minutes < 60) return `${minutes}分鐘`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) return `${hours}小時`
  return `${hours}小時${mins}分鐘`
}

// 格式化日期為年月
export function formatYearMonth(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.getFullYear()}年${date.getMonth() + 1}月`
}

// 格式化日期為 MM/DD
export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr)
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
}

// 格式化日期為 YYYY-MM-DD
export function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0]
}
