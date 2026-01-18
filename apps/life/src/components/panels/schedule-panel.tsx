// components/dashboard/panels/schedule-panel.tsx
"use client"

import { useRouter } from "next/navigation"
import { Calendar, Clock, User, MapPin } from "lucide-react"
import { PanelWrapper, EmptyState } from "./panel-wrapper"
import { SLOT_TIMES } from "./constants"
import type { ScheduleSlot } from "@daily/database"

interface SchedulePanelProps {
  slots: ScheduleSlot[]
  loading: boolean
  panelColor: string
}

export function SchedulePanel({ slots, loading, panelColor }: SchedulePanelProps) {
  const router = useRouter()

  return (
    <PanelWrapper
      title="當日課表"
      icon={Calendar}
      panelColor={panelColor}
      loading={loading}
      onNavigate={() => router.push("/dashboard/schedule")}
      navigateLabel="管理課表"
    >
      {slots.length === 0 ? (
        <EmptyState message="這天沒有課程安排" />
      ) : (
        <div className="space-y-2">
          {slots.map((slot) => (
            <div key={slot.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border">
              <div className="flex items-center gap-1 text-sm text-gray-500 w-28 shrink-0">
                <Clock className="w-3.5 h-3.5" />
                {SLOT_TIMES[slot.slot_number]?.start} - {SLOT_TIMES[slot.slot_number]?.end}
              </div>
              <div className="flex-1 font-medium">{slot.subject_name}</div>
              {slot.teacher && (
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <User className="w-3.5 h-3.5" />{slot.teacher}
                </div>
              )}
              {slot.location && (
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <MapPin className="w-3.5 h-3.5" />{slot.location}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </PanelWrapper>
  )
}
