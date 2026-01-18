// components/dashboard/panels/panel-wrapper.tsx
"use client"

import { Button } from "@daily/ui"
import { Plus, Pencil, ExternalLink } from "lucide-react"
import { LucideIcon } from "lucide-react"

interface PanelWrapperProps {
  title: string
  icon: LucideIcon
  panelColor: string
  loading?: boolean
  children: React.ReactNode
  // 按鈕選項
  onAdd?: () => void
  addLabel?: string
  addColor?: string
  onEdit?: () => void
  editLabel?: string
  editColor?: string
  onNavigate?: () => void
  navigateLabel?: string
  hasData?: boolean
}

export function PanelWrapper({
  title,
  icon: Icon,
  panelColor,
  loading,
  children,
  onAdd,
  addLabel = "新增",
  addColor = "bg-blue-600 hover:bg-blue-700",
  onEdit,
  editLabel = "編輯",
  editColor = "bg-blue-600 hover:bg-blue-700",
  onNavigate,
  navigateLabel = "管理",
  hasData,
}: PanelWrapperProps) {
  if (loading) {
    return (
      <div className={`mt-4 p-4 rounded-lg border ${panelColor}`}>
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className={`mt-4 p-4 rounded-lg border ${panelColor}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold flex items-center gap-2">
          <Icon className="w-4 h-4" /> {title}
        </h4>
        <div className="flex gap-2">
          {onNavigate && (
            <Button variant="outline" size="sm" onClick={onNavigate}>
              <ExternalLink className="w-3 h-3 mr-1" /> {navigateLabel}
            </Button>
          )}
          {onAdd && (
            <Button size="sm" onClick={onAdd} className={addColor}>
              <Plus className="w-3 h-3 mr-1" /> {addLabel}
            </Button>
          )}
          {onEdit && (
            <Button size="sm" onClick={onEdit} className={editColor}>
              {hasData ? (
                <><Pencil className="w-3 h-3 mr-1" /> {editLabel}</>
              ) : (
                <><Plus className="w-3 h-3 mr-1" /> 撰寫</>
              )}
            </Button>
          )}
        </div>
      </div>
      {children}
    </div>
  )
}

// 空狀態元件
interface EmptyStateProps {
  message: string
}

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <p className="text-center py-6 text-gray-500">{message}</p>
  )
}
