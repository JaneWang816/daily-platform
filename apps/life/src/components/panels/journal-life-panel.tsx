// components/dashboard/panels/journal-life-panel.tsx
"use client"

import { FileText, Smile, Meh, Frown } from "lucide-react"
import { PanelWrapper, EmptyState } from "./panel-wrapper"
import { MOOD_CONFIG } from "./constants"
import type { JournalLife } from "@daily/database"

interface JournalLifePanelProps {
  journal: JournalLife | null
  loading: boolean
  panelColor: string
  onEdit: () => void
}

export function JournalLifePanel({ journal, loading, panelColor, onEdit }: JournalLifePanelProps) {
  const getMoodIcon = (mood: number) => {
    if (mood <= 2) return Frown
    if (mood === 3) return Meh
    return Smile
  }

  return (
    <PanelWrapper
      title="生活日誌"
      icon={FileText}
      panelColor={panelColor}
      loading={loading}
      onEdit={onEdit}
      editColor="bg-pink-600 hover:bg-pink-700"
      hasData={!!journal}
    >
      {!journal ? (
        <EmptyState message="還沒寫今天的生活日誌" />
      ) : (
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-2">
            {journal.title && <h5 className="font-medium">{journal.title}</h5>}
            {journal.mood && (
              <div className="flex items-center gap-1">
                <span className="text-lg">{MOOD_CONFIG[journal.mood as keyof typeof MOOD_CONFIG]?.emoji}</span>
                <span className="text-sm text-gray-500">
                  {MOOD_CONFIG[journal.mood as keyof typeof MOOD_CONFIG]?.label}
                </span>
              </div>
            )}
          </div>
          <p className="text-gray-700 whitespace-pre-wrap">{journal.content}</p>
        </div>
      )}
    </PanelWrapper>
  )
}
