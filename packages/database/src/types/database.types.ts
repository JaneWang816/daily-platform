export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      budgets: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
          year_month: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
          year_month: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
          year_month?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "finance_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_plans: {
        Row: {
          color: string | null
          created_at: string | null
          date: string
          description: string | null
          end_time: string | null
          id: string
          is_all_day: boolean | null
          location: string | null
          parent_id: string | null
          recurrence_end_date: string | null
          recurrence_type: string | null
          start_time: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          date: string
          description?: string | null
          end_time?: string | null
          id?: string
          is_all_day?: boolean | null
          location?: string | null
          parent_id?: string | null
          recurrence_end_date?: string | null
          recurrence_type?: string | null
          start_time?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          date?: string
          description?: string | null
          end_time?: string | null
          id?: string
          is_all_day?: boolean | null
          location?: string | null
          parent_id?: string | null
          recurrence_end_date?: string | null
          recurrence_type?: string | null
          start_time?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_plans_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "daily_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_study_summary: {
        Row: {
          created_at: string | null
          date: string
          flashcard_correct: number | null
          flashcard_reviewed: number | null
          id: string
          question_correct: number | null
          question_practiced: number | null
          study_minutes: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          flashcard_correct?: number | null
          flashcard_reviewed?: number | null
          id?: string
          question_correct?: number | null
          question_practiced?: number | null
          study_minutes?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          flashcard_correct?: number | null
          flashcard_reviewed?: number | null
          id?: string
          question_correct?: number | null
          question_practiced?: number | null
          study_minutes?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_study_summary_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      decks: {
        Row: {
          back_lang: string | null
          created_at: string | null
          description: string | null
          front_lang: string | null
          id: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          back_lang?: string | null
          created_at?: string | null
          description?: string | null
          front_lang?: string | null
          id?: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          back_lang?: string | null
          created_at?: string | null
          description?: string | null
          front_lang?: string | null
          id?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "decks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_answers: {
        Row: {
          created_at: string | null
          earned_score: number | null
          exam_id: string
          id: string
          is_correct: boolean | null
          question_id: string
          question_order: number
          score: number
          user_answer: Json | null
        }
        Insert: {
          created_at?: string | null
          earned_score?: number | null
          exam_id: string
          id?: string
          is_correct?: boolean | null
          question_id: string
          question_order: number
          score?: number
          user_answer?: Json | null
        }
        Update: {
          created_at?: string | null
          earned_score?: number | null
          exam_id?: string
          id?: string
          is_correct?: boolean | null
          question_id?: string
          question_order?: number
          score?: number
          user_answer?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_answers_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          completed_at: string | null
          correct_count: number | null
          created_at: string | null
          earned_score: number | null
          exam_code: string
          id: string
          question_count: number
          started_at: string | null
          status: string
          subject_id: string
          time_spent_seconds: number | null
          topic_ids: string[] | null
          total_score: number
          unit_ids: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          correct_count?: number | null
          created_at?: string | null
          earned_score?: number | null
          exam_code: string
          id?: string
          question_count: number
          started_at?: string | null
          status?: string
          subject_id: string
          time_spent_seconds?: number | null
          topic_ids?: string[] | null
          total_score?: number
          unit_ids?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          correct_count?: number | null
          created_at?: string | null
          earned_score?: number | null
          exam_code?: string
          id?: string
          question_count?: number
          started_at?: string | null
          status?: string
          subject_id?: string
          time_spent_seconds?: number | null
          topic_ids?: string[] | null
          total_score?: number
          unit_ids?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exams_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_categories: {
        Row: {
          color: string | null
          created_at: string | null
          icon: string | null
          id: string
          is_default: boolean | null
          name: string
          sort_order: number | null
          type: string
          user_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          sort_order?: number | null
          type: string
          user_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          sort_order?: number | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_categories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_records: {
        Row: {
          amount: number
          category: string
          category_id: string | null
          created_at: string | null
          date: string
          description: string | null
          id: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          category: string
          category_id?: string | null
          created_at?: string | null
          date?: string
          description?: string | null
          id?: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          category_id?: string | null
          created_at?: string | null
          date?: string
          description?: string | null
          id?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcards: {
        Row: {
          back: string
          created_at: string | null
          deck_id: string | null
          ease_factor: number | null
          front: string
          id: string
          interval: number | null
          next_review_at: string | null
          note: string | null
          note2: string | null
          repetition_count: number | null
          unit_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          back: string
          created_at?: string | null
          deck_id?: string | null
          ease_factor?: number | null
          front: string
          id?: string
          interval?: number | null
          next_review_at?: string | null
          note?: string | null
          note2?: string | null
          repetition_count?: number | null
          unit_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          back?: string
          created_at?: string | null
          deck_id?: string | null
          ease_factor?: number | null
          front?: string
          id?: string
          interval?: number | null
          next_review_at?: string | null
          note?: string | null
          note2?: string | null
          repetition_count?: number | null
          unit_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flashcards_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flashcards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      food_nutrition: {
        Row: {
          calories: number
          carbs: number | null
          category: string
          created_at: string | null
          fat: number | null
          id: string
          is_favorite: boolean | null
          name: string
          portion: string
          protein: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          calories: number
          carbs?: number | null
          category: string
          created_at?: string | null
          fat?: number | null
          id?: string
          is_favorite?: boolean | null
          name: string
          portion: string
          protein?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          calories?: number
          carbs?: number | null
          category?: string
          created_at?: string | null
          fat?: number | null
          id?: string
          is_favorite?: boolean | null
          name?: string
          portion?: string
          protein?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "food_nutrition_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_logs: {
        Row: {
          created_at: string | null
          goal_id: string
          id: string
          logged_at: string
          note: string | null
          user_id: string
          value: number | null
        }
        Insert: {
          created_at?: string | null
          goal_id: string
          id?: string
          logged_at?: string
          note?: string | null
          user_id: string
          value?: number | null
        }
        Update: {
          created_at?: string | null
          goal_id?: string
          id?: string
          logged_at?: string
          note?: string | null
          user_id?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "goal_logs_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          color: string | null
          completed_at: string | null
          created_at: string | null
          current_count: number | null
          current_value: number | null
          deadline: string | null
          description: string | null
          direction: string | null
          goal_type: string
          icon: string | null
          id: string
          period_target: number | null
          period_type: string | null
          show_on_dashboard: boolean | null
          sort_order: number | null
          start_value: number | null
          started_at: string | null
          status: string | null
          target_count: number | null
          target_date: string | null
          target_value: number | null
          title: string
          track_config: Json | null
          track_source: string | null
          unit: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          completed_at?: string | null
          created_at?: string | null
          current_count?: number | null
          current_value?: number | null
          deadline?: string | null
          description?: string | null
          direction?: string | null
          goal_type: string
          icon?: string | null
          id?: string
          period_target?: number | null
          period_type?: string | null
          show_on_dashboard?: boolean | null
          sort_order?: number | null
          start_value?: number | null
          started_at?: string | null
          status?: string | null
          target_count?: number | null
          target_date?: string | null
          target_value?: number | null
          title: string
          track_config?: Json | null
          track_source?: string | null
          unit?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          completed_at?: string | null
          created_at?: string | null
          current_count?: number | null
          current_value?: number | null
          deadline?: string | null
          description?: string | null
          direction?: string | null
          goal_type?: string
          icon?: string | null
          id?: string
          period_target?: number | null
          period_type?: string | null
          show_on_dashboard?: boolean | null
          sort_order?: number | null
          start_value?: number | null
          started_at?: string | null
          status?: string | null
          target_count?: number | null
          target_date?: string | null
          target_value?: number | null
          title?: string
          track_config?: Json | null
          track_source?: string | null
          unit?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      habit_logs: {
        Row: {
          completed: boolean | null
          created_at: string | null
          date: string
          habit_id: string
          id: string
          note: string | null
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          date?: string
          habit_id: string
          id?: string
          note?: string | null
          user_id: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          date?: string
          habit_id?: string
          id?: string
          note?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_logs_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          frequency: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          target_days: number[] | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          frequency?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          target_days?: number[] | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          frequency?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          target_days?: number[] | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      health_exercises: {
        Row: {
          calories: number | null
          created_at: string | null
          date: string
          distance_km: number | null
          duration_minutes: number | null
          exercise_type: string
          id: string
          note: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          calories?: number | null
          created_at?: string | null
          date?: string
          distance_km?: number | null
          duration_minutes?: number | null
          exercise_type: string
          id?: string
          note?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          calories?: number | null
          created_at?: string | null
          date?: string
          distance_km?: number | null
          duration_minutes?: number | null
          exercise_type?: string
          id?: string
          note?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_exercises_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      health_metrics: {
        Row: {
          created_at: string | null
          date: string
          id: string
          measured_time: string | null
          metric_type: string
          note: string | null
          updated_at: string | null
          user_id: string
          value_primary: number
          value_secondary: number | null
          value_tertiary: number | null
        }
        Insert: {
          created_at?: string | null
          date?: string
          id?: string
          measured_time?: string | null
          metric_type: string
          note?: string | null
          updated_at?: string | null
          user_id: string
          value_primary: number
          value_secondary?: number | null
          value_tertiary?: number | null
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          measured_time?: string | null
          metric_type?: string
          note?: string | null
          updated_at?: string | null
          user_id?: string
          value_primary?: number
          value_secondary?: number | null
          value_tertiary?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "health_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      journals_gratitude: {
        Row: {
          content: string
          created_at: string | null
          date: string
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          date?: string
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          date?: string
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journals_gratitude_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      journals_learning: {
        Row: {
          content: string
          created_at: string | null
          date: string
          difficulty: number | null
          duration_minutes: number | null
          id: string
          subject_id: string | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          date?: string
          difficulty?: number | null
          duration_minutes?: number | null
          id?: string
          subject_id?: string | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          date?: string
          difficulty?: number | null
          duration_minutes?: number | null
          id?: string
          subject_id?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journals_learning_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journals_learning_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      journals_life: {
        Row: {
          content: string
          created_at: string | null
          date: string
          id: string
          mood: number | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          date?: string
          id?: string
          mood?: number | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          date?: string
          id?: string
          mood?: number | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journals_life_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      journals_reading: {
        Row: {
          author: string | null
          book_title: string
          content: string | null
          created_at: string | null
          current_page: number | null
          date: string
          id: string
          is_finished: boolean | null
          pages_read: number | null
          rating: number | null
          total_pages: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          author?: string | null
          book_title: string
          content?: string | null
          created_at?: string | null
          current_page?: number | null
          date?: string
          id?: string
          is_finished?: boolean | null
          pages_read?: number | null
          rating?: number | null
          total_pages?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          author?: string | null
          book_title?: string
          content?: string | null
          created_at?: string | null
          current_page?: number | null
          date?: string
          id?: string
          is_finished?: boolean | null
          pages_read?: number | null
          rating?: number | null
          total_pages?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journals_reading_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      journals_travel: {
        Row: {
          companions: string | null
          content: string | null
          created_at: string | null
          date: string
          duration_minutes: number | null
          id: string
          location: string
          mood: number | null
          photos: string[] | null
          rating: number | null
          title: string
          updated_at: string | null
          user_id: string
          weather: string | null
        }
        Insert: {
          companions?: string | null
          content?: string | null
          created_at?: string | null
          date: string
          duration_minutes?: number | null
          id?: string
          location: string
          mood?: number | null
          photos?: string[] | null
          rating?: number | null
          title: string
          updated_at?: string | null
          user_id: string
          weather?: string | null
        }
        Update: {
          companions?: string | null
          content?: string | null
          created_at?: string | null
          date?: string
          duration_minutes?: number | null
          id?: string
          location?: string
          mood?: number | null
          photos?: string[] | null
          rating?: number | null
          title?: string
          updated_at?: string | null
          user_id?: string
          weather?: string | null
        }
        Relationships: []
      }
      learning_portfolio_links: {
        Row: {
          created_at: string | null
          id: string
          link_type: string | null
          portfolio_id: string
          title: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          link_type?: string | null
          portfolio_id: string
          title?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          link_type?: string | null
          portfolio_id?: string
          title?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_portfolio_links_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "learning_portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_portfolio_units: {
        Row: {
          created_at: string | null
          id: string
          portfolio_id: string
          unit_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          portfolio_id: string
          unit_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          portfolio_id?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_portfolio_units_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "learning_portfolios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_portfolio_units_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_portfolios: {
        Row: {
          content: Json
          created_at: string | null
          duration_minutes: number | null
          id: string
          location: string | null
          log_type: string
          photos: string[] | null
          reflection: string | null
          study_date: string
          subject_id: string
          title: string
          topic_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content?: Json
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          location?: string | null
          log_type: string
          photos?: string[] | null
          reflection?: string | null
          study_date?: string
          subject_id: string
          title: string
          topic_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: Json
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          location?: string | null
          log_type?: string
          photos?: string[] | null
          reflection?: string | null
          study_date?: string
          subject_id?: string
          title?: string
          topic_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_portfolios_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_portfolios_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      meals: {
        Row: {
          calories: number | null
          created_at: string | null
          date: string
          description: string
          id: string
          meal_type: string
          note: string | null
          photo_url: string | null
          protein: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          calories?: number | null
          created_at?: string | null
          date?: string
          description: string
          id?: string
          meal_type: string
          note?: string | null
          photo_url?: string | null
          protein?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          calories?: number | null
          created_at?: string | null
          date?: string
          description?: string
          id?: string
          meal_type?: string
          note?: string | null
          photo_url?: string | null
          protein?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      note_links: {
        Row: {
          created_at: string | null
          id: string
          link_type: string
          note_id: string
          target_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          link_type: string
          note_id: string
          target_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          link_type?: string
          note_id?: string
          target_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_links_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "unit_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_links_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pomodoro_sessions: {
        Row: {
          completed: boolean
          created_at: string | null
          duration: number
          id: string
          subject_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string | null
          duration?: number
          id?: string
          subject_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string | null
          duration?: number
          id?: string
          subject_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pomodoro_sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_sessions: {
        Row: {
          correct_count: number
          created_at: string | null
          duration: number | null
          id: string
          module: string
          score: number
          subject: string
          topic: string
          total_questions: number
          user_id: string
        }
        Insert: {
          correct_count: number
          created_at?: string | null
          duration?: number | null
          id?: string
          module: string
          score: number
          subject: string
          topic: string
          total_questions: number
          user_id: string
        }
        Update: {
          correct_count?: number
          created_at?: string | null
          duration?: number | null
          id?: string
          module?: string
          score?: number
          subject?: string
          topic?: string
          total_questions?: number
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birth_year: number | null
          created_at: string | null
          enabled_modules: string[] | null
          gender: string | null
          height_cm: number | null
          id: string
          initial_balance: number | null
          nickname: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          birth_year?: number | null
          created_at?: string | null
          enabled_modules?: string[] | null
          gender?: string | null
          height_cm?: number | null
          id: string
          initial_balance?: number | null
          nickname?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          birth_year?: number | null
          created_at?: string | null
          enabled_modules?: string[] | null
          gender?: string | null
          height_cm?: number | null
          id?: string
          initial_balance?: number | null
          nickname?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      question_topics: {
        Row: {
          created_at: string | null
          question_id: string
          topic_id: string
        }
        Insert: {
          created_at?: string | null
          question_id: string
          topic_id: string
        }
        Update: {
          created_at?: string | null
          question_id?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_topics_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_topics_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      question_types: {
        Row: {
          created_at: string | null
          id: string
          label: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          label: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          label?: string
          name?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          answer: Json | null
          attempt_count: number | null
          consecutive_correct: number | null
          content: string
          created_at: string | null
          difficulty: string | null
          explanation: string | null
          id: string
          image_url: string | null
          is_group: boolean | null
          last_attempted_at: string | null
          marked_for_review: boolean | null
          options: Json | null
          order: number | null
          parent_id: string | null
          question_type_id: string
          subject_id: string
          topic_id: string | null
          unit_id: string | null
          updated_at: string | null
          user_id: string
          wrong_count: number | null
        }
        Insert: {
          answer?: Json | null
          attempt_count?: number | null
          consecutive_correct?: number | null
          content: string
          created_at?: string | null
          difficulty?: string | null
          explanation?: string | null
          id?: string
          image_url?: string | null
          is_group?: boolean | null
          last_attempted_at?: string | null
          marked_for_review?: boolean | null
          options?: Json | null
          order?: number | null
          parent_id?: string | null
          question_type_id: string
          subject_id: string
          topic_id?: string | null
          unit_id?: string | null
          updated_at?: string | null
          user_id: string
          wrong_count?: number | null
        }
        Update: {
          answer?: Json | null
          attempt_count?: number | null
          consecutive_correct?: number | null
          content?: string
          created_at?: string | null
          difficulty?: string | null
          explanation?: string | null
          id?: string
          image_url?: string | null
          is_group?: boolean | null
          last_attempted_at?: string | null
          marked_for_review?: boolean | null
          options?: Json | null
          order?: number | null
          parent_id?: string | null
          question_type_id?: string
          subject_id?: string
          topic_id?: string | null
          unit_id?: string | null
          updated_at?: string | null
          user_id?: string
          wrong_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_question_type_id_fkey"
            columns: ["question_type_id"]
            isOneToOne: false
            referencedRelation: "question_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_slots: {
        Row: {
          created_at: string | null
          day_of_week: number
          id: string
          location: string | null
          note: string | null
          slot_number: number
          subject_name: string
          teacher: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          day_of_week: number
          id?: string
          location?: string | null
          note?: string | null
          slot_number: number
          subject_name: string
          teacher?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          day_of_week?: number
          id?: string
          location?: string | null
          note?: string | null
          slot_number?: number
          subject_name?: string
          teacher?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_slots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_logs: {
        Row: {
          created_at: string | null
          flashcards_reviewed: number | null
          id: string
          pomodoro_sessions: number | null
          questions_practiced: number | null
          study_date: string
          study_minutes: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          flashcards_reviewed?: number | null
          id?: string
          pomodoro_sessions?: number | null
          questions_practiced?: number | null
          study_date: string
          study_minutes?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          flashcards_reviewed?: number | null
          id?: string
          pomodoro_sessions?: number | null
          questions_practiced?: number | null
          study_date?: string
          study_minutes?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      subjects: {
        Row: {
          cover_url: string | null
          created_at: string | null
          description: string | null
          id: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          completed_at: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          is_important: boolean | null
          is_urgent: boolean | null
          original_task_id: string | null
          recurrence_end_date: string | null
          recurrence_interval: number | null
          recurrence_type: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_important?: boolean | null
          is_urgent?: boolean | null
          original_task_id?: string | null
          recurrence_end_date?: string | null
          recurrence_interval?: number | null
          recurrence_type?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_important?: boolean | null
          is_urgent?: boolean | null
          original_task_id?: string | null
          recurrence_end_date?: string | null
          recurrence_interval?: number | null
          recurrence_type?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_original_task_id_fkey"
            columns: ["original_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          created_at: string | null
          id: string
          order: number | null
          subject_id: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          order?: number | null
          subject_id: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          order?: number | null
          subject_id?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_notes: {
        Row: {
          category: string
          content: string
          created_at: string | null
          id: string
          is_important: boolean | null
          order: number | null
          title: string | null
          unit_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category?: string
          content?: string
          created_at?: string | null
          id?: string
          is_important?: boolean | null
          order?: number | null
          title?: string | null
          unit_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string | null
          id?: string
          is_important?: boolean | null
          order?: number | null
          title?: string | null
          unit_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_notes_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          mindmap_url: string | null
          order: number | null
          title: string
          topic_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          mindmap_url?: string | null
          order?: number | null
          title: string
          topic_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          mindmap_url?: string | null
          order?: number | null
          title?: string
          topic_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "units_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
