export * from './database.types'
export * from "./custom"

// 常用類型別名
import type { Tables } from './database.types'

export type Profile = Tables<'profiles'>
export type Task = Tables<'tasks'>
export type Habit = Tables<'habits'>
export type HabitLog = Tables<'habit_logs'>
export type Goal = Tables<'goals'>
export type GoalLog = Tables<'goal_logs'>
export type DailyPlan = Tables<'daily_plans'>
export type FinanceRecord = Tables<'finance_records'>
export type FinanceCategory = Tables<'finance_categories'>
export type Budget = Tables<'budgets'>
export type HealthMetric = Tables<'health_metrics'>
export type HealthExercise = Tables<'health_exercises'>
export type JournalLife = Tables<'journals_life'>
export type JournalGratitude = Tables<'journals_gratitude'>
export type JournalReading = Tables<'journals_reading'>
export type JournalTravel = Tables<'journals_travel'>

// 學習相關
export type Subject = Tables<'subjects'>
export type Topic = Tables<'topics'>
export type Unit = Tables<'units'>
export type Deck = Tables<'decks'>
export type Flashcard = Tables<'flashcards'>
export type Question = Tables<'questions'>

// 學習歷程相關
export type LearningPortfolio = Tables<'learning_portfolios'>
export type LearningPortfolioLink = Tables<'learning_portfolio_links'>
export type LearningPortfolioUnit = Tables<'learning_portfolio_units'>
