// components/dashboard/panels/journal-reading-panel.tsx
"use client"

import { BookMarked } from "lucide-react"
import { PanelWrapper, EmptyState } from "./panel-wrapper"
import type { JournalReading } from "@daily/database"

interface JournalReadingPanelProps {
  journal: JournalReading | null
  loading: boolean
  panelColor: string
  onEdit: () => void
}

export function JournalReadingPanel({ journal, loading, panelColor, onEdit }: JournalReadingPanelProps) {
  return (
    <PanelWrapper
      title="閱讀日誌"
      icon={BookMarked}
      panelColor={panelColor}
      loading={loading}
      onEdit={onEdit}
      editColor="bg-green-600 hover:bg-green-700"
      hasData={!!journal}
    >
      {!journal ? (
        <EmptyState message="還沒寫今天的閱讀日誌" />
      ) : (
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-2">
            <h5 className="font-medium">📖 {journal.book_title}</h5>
            {journal.is_finished && (
              <span className="text-xs px-2 py-0.5 bg-green-100 text-green-600 rounded">已讀完</span>
            )}
          </div>
          {journal.author && <p className="text-sm text-gray-500 mb-2">作者: {journal.author}</p>}
          {journal.content && <p className="text-gray-700 whitespace-pre-wrap">{journal.content}</p>}
          <div className="flex gap-4 mt-3 text-sm text-gray-500">
            {journal.pages_read && <span>今日讀 {journal.pages_read} 頁</span>}
            {journal.current_page && journal.total_pages && (
              <span>進度: {journal.current_page}/{journal.total_pages}</span>
            )}
            {journal.rating && <span>評分: {"⭐".repeat(journal.rating)}</span>}
          </div>
        </div>
      )}
    </PanelWrapper>
  )
}
