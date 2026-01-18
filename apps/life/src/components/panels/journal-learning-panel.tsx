// components/dashboard/panels/journal-learning-panel.tsx
"use client"

import { GraduationCap } from "lucide-react"
import { PanelWrapper, EmptyState } from "./panel-wrapper"
import type { JournalLearning } from "@daily/database"

interface JournalLearningPanelProps {
  journal: JournalLearning | null
  loading: boolean
  panelColor: string
  onEdit: () => void
}

export function JournalLearningPanel({ journal, loading, panelColor, onEdit }: JournalLearningPanelProps) {
  return (
    <PanelWrapper
      title="學習日誌"
      icon={GraduationCap}
      panelColor={panelColor}
      loading={loading}
      onEdit={onEdit}
      editColor="bg-purple-600 hover:bg-purple-700"
      hasData={!!journal}
    >
      {!journal ? (
        <EmptyState message="還沒寫今天的學習日誌" />
      ) : (
        <div className="bg-white rounded-lg border p-4">
          {journal.title && <h5 className="font-medium mb-2">{journal.title}</h5>}
          <p className="text-gray-700 whitespace-pre-wrap">{journal.content}</p>
          <div className="flex gap-4 mt-3 text-sm text-gray-500">
            {journal.duration_minutes && <span>⏱ {journal.duration_minutes} 分鐘</span>}
            {journal.difficulty && <span>難度: {"⭐".repeat(journal.difficulty)}</span>}
          </div>
        </div>
      )}
    </PanelWrapper>
  )
}
