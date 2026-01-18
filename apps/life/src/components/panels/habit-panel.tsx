// components/dashboard/panels/habit-panel.tsx
"use client"

import { useRouter } from "next/navigation"
import { Target, Check, X } from "lucide-react"
import { PanelWrapper, EmptyState } from "./panel-wrapper"
import type { HabitWithLog } from "@/lib/hooks/use-dashboard-data"

interface HabitPanelProps {
  habits: HabitWithLog[]
  loading: boolean
  panelColor: string
  onToggle: (habit: HabitWithLog) => void
}

export function HabitPanel({ habits, loading, panelColor, onToggle }: HabitPanelProps) {
  const router = useRouter()

  return (
    <PanelWrapper
      title="習慣打卡"
      icon={Target}
      panelColor={panelColor}
      loading={loading}
      onNavigate={() => router.push("/dashboard/habits")}
      navigateLabel="管理習慣"
    >
      {habits.length === 0 ? (
        <EmptyState message="這天沒有需要執行的習慣" />
      ) : (
        <div className="space-y-2">
          {habits.map((habit) => (
            <div key={habit.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border">
              <button
                onClick={() => onToggle(habit)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  habit.log ? "bg-cyan-500 text-white" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                }`}
              >
                {habit.log ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
              </button>
              <div className="flex-1">
                <p className="font-medium">{habit.title}</p>
                {habit.description && <p className="text-sm text-gray-500">{habit.description}</p>}
              </div>
              {habit.icon && <span className="text-xl">{habit.icon}</span>}
            </div>
          ))}
        </div>
      )}
    </PanelWrapper>
  )
}
