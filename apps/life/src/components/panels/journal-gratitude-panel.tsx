// components/dashboard/panels/journal-gratitude-panel.tsx
"use client"

import { Heart } from "lucide-react"
import { PanelWrapper, EmptyState } from "./panel-wrapper"
import type { JournalGratitude } from "@daily/database"

interface JournalGratitudePanelProps {
  journal: JournalGratitude | null
  loading: boolean
  panelColor: string
  onEdit: () => void
}

export function JournalGratitudePanel({ journal, loading, panelColor, onEdit }: JournalGratitudePanelProps) {
  return (
    <PanelWrapper
      title="感恩日誌"
      icon={Heart}
      panelColor={panelColor}
      loading={loading}
      onEdit={onEdit}
      editColor="bg-yellow-600 hover:bg-yellow-700"
      hasData={!!journal}
    >
      {!journal ? (
        <EmptyState message="今天有什麼值得感恩的事？" />
      ) : (
        <div className="bg-white rounded-lg border p-4">
          <p className="text-gray-700 whitespace-pre-wrap">🙏 {journal.content}</p>
        </div>
      )}
    </PanelWrapper>
  )
}
