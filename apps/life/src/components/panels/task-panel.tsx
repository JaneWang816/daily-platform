// components/dashboard/panels/task-panel.tsx
"use client"

import { CheckSquare, Pencil, Trash2 } from "lucide-react"
import { Button } from "@daily/ui"
import { Checkbox } from "@daily/ui"
import { PanelWrapper, EmptyState } from "./panel-wrapper"
import type { Task } from "@daily/database"

interface TaskPanelProps {
  tasks: Task[]
  loading: boolean
  panelColor: string
  onAdd: () => void
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  onToggleComplete: (task: Task) => void
}

export function TaskPanel({
  tasks,
  loading,
  panelColor,
  onAdd,
  onEdit,
  onDelete,
  onToggleComplete,
}: TaskPanelProps) {
  return (
    <PanelWrapper
      title="當日任務"
      icon={CheckSquare}
      panelColor={panelColor}
      loading={loading}
      onAdd={onAdd}
      addColor="bg-amber-600 hover:bg-amber-700"
    >
      {tasks.length === 0 ? (
        <EmptyState message="這天沒有任務" />
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div key={task.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border">
              <Checkbox 
                checked={!!task.completed_at} 
                onCheckedChange={() => onToggleComplete(task)} 
              />
              <div className={`flex-1 ${task.completed_at ? "line-through text-gray-400" : ""}`}>
                <p className="font-medium">{task.title}</p>
                {task.description && <p className="text-sm text-gray-500">{task.description}</p>}
              </div>
              <div className="flex gap-1">
                {task.is_important && (
                  <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded">重要</span>
                )}
                {task.is_urgent && (
                  <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-600 rounded">緊急</span>
                )}
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(task)}>
                <Pencil className="w-3 h-3" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-red-500" 
                onClick={() => onDelete(task.id)}
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
