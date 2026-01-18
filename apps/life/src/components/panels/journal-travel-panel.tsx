// components/dashboard/panels/journal-travel-panel.tsx
"use client"

import { Compass, MapPin, Clock, Pencil, Trash2, Star, Image } from "lucide-react"
import { Button } from "@daily/ui"
import { PanelWrapper, EmptyState } from "./panel-wrapper"
import { MOOD_CONFIG } from "./constants"
import type { JournalTravel } from "@daily/database"

interface JournalTravelPanelProps {
  travels: JournalTravel[]
  loading: boolean
  panelColor: string
  onAdd: () => void
  onEdit: (travel: JournalTravel) => void
  onDelete: (id: string, photos?: string[]) => void
}

export function JournalTravelPanel({
  travels,
  loading,
  panelColor,
  onAdd,
  onEdit,
  onDelete,
}: JournalTravelPanelProps) {
  // 格式化時長
  const formatDuration = (minutes: number | null) => {
    if (!minutes) return null
    if (minutes < 60) return `${minutes} 分鐘`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours} 小時 ${mins} 分鐘` : `${hours} 小時`
  }

  return (
    <PanelWrapper
      title="遊覽日誌"
      icon={Compass}
      panelColor={panelColor}
      loading={loading}
      onAdd={onAdd}
      addColor="bg-sky-600 hover:bg-sky-700"
    >
      {travels.length === 0 ? (
        <EmptyState message="今天還沒有遊覽記錄" />
      ) : (
        <div className="space-y-3">
          {travels.map((travel) => (
            <div key={travel.id} className="bg-white rounded-lg border p-4">
              {/* 標題列 */}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h5 className="font-medium text-lg">{travel.title}</h5>
                  <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> {travel.location}
                    </span>
                    {travel.duration_minutes && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {formatDuration(travel.duration_minutes)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(travel)}>
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-red-500" 
                    onClick={() => onDelete(travel.id, travel.photos || undefined)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {/* 標籤列 */}
              <div className="flex flex-wrap gap-2 mb-2">
                {travel.weather && (
                  <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded">
                    {travel.weather}
                  </span>
                )}
                {travel.companions && (
                  <span className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded">
                    {travel.companions}
                  </span>
                )}
                {travel.mood && (
                  <span className="text-xs px-2 py-1 bg-yellow-50 text-yellow-700 rounded">
                    {MOOD_CONFIG[travel.mood as keyof typeof MOOD_CONFIG]?.emoji}{" "}
                    {MOOD_CONFIG[travel.mood as keyof typeof MOOD_CONFIG]?.label}
                  </span>
                )}
                {travel.rating && (
                  <span className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded flex items-center gap-1">
                    <Star className="w-3 h-3" /> {travel.rating}/5
                  </span>
                )}
              </div>

              {/* 內容 */}
              {travel.content && (
                <p className="text-gray-700 whitespace-pre-wrap text-sm mb-3">{travel.content}</p>
              )}

              {/* 照片 */}
              {travel.photos && travel.photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {travel.photos.map((url, index) => (
                    <div key={index} className="aspect-square rounded-lg overflow-hidden border">
                      <img
                        src={url}
                        alt={`${travel.title} 照片 ${index + 1}`}
                        className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                        onClick={() => window.open(url, "_blank")}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </PanelWrapper>
  )
}
