// components/dashboard/panels/exercise-panel.tsx
"use client"

import { Dumbbell, Pencil, Trash2 } from "lucide-react"
import { Button } from "@daily/ui"
import { PanelWrapper, EmptyState } from "./panel-wrapper"
import type { HealthExercise } from "@daily/database"

interface ExercisePanelProps {
  exercises: HealthExercise[]
  loading: boolean
  panelColor: string
  onAdd: () => void
  onEdit: (exercise: HealthExercise) => void
  onDelete: (id: string) => void
}

export function ExercisePanel({
  exercises,
  loading,
  panelColor,
  onAdd,
  onEdit,
  onDelete,
}: ExercisePanelProps) {
  return (
    <PanelWrapper
      title="運動記錄"
      icon={Dumbbell}
      panelColor={panelColor}
      loading={loading}
      onAdd={onAdd}
      addColor="bg-orange-600 hover:bg-orange-700"
    >
      {exercises.length === 0 ? (
        <EmptyState message="這天沒有運動記錄" />
      ) : (
        <div className="space-y-2">
          {exercises.map((ex) => (
            <div key={ex.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border">
              <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                <Dumbbell className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="font-medium">{ex.exercise_type}</p>
                {ex.note && <p className="text-sm text-gray-500">{ex.note}</p>}
              </div>
              {ex.duration_minutes && (
                <span className="text-sm text-gray-500">{ex.duration_minutes} 分鐘</span>
              )}
              {ex.calories && (
                <span className="text-sm text-gray-500">{ex.calories} 卡</span>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(ex)}>
                <Pencil className="w-3 h-3" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-red-500" 
                onClick={() => onDelete(ex.id)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </PanelWrapper>
  )
}
