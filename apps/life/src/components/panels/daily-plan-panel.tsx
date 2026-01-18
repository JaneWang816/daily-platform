// components/dashboard/panels/daily-plan-panel.tsx
"use client"

import { CalendarClock, Clock, MapPin, Pencil, Trash2, Repeat } from "lucide-react"
import { Button } from "@daily/ui"
import { PanelWrapper, EmptyState } from "./panel-wrapper"
import { getPlanColor, formatTime, RECURRENCE_OPTIONS } from "./constants"
import type { DailyPlan } from "@daily/database"

interface DailyPlanPanelProps {
  plans: DailyPlan[]
  loading: boolean
  panelColor: string
  onAdd: () => void
  onEdit: (plan: DailyPlan) => void
  onDelete: (id: string) => void
}

export function DailyPlanPanel({
  plans,
  loading,
  panelColor,
  onAdd,
  onEdit,
  onDelete,
}: DailyPlanPanelProps) {
  // 分組：全天事件 vs 時間事件
  const allDayPlans = plans.filter(p => p.is_all_day)
  const timedPlans = plans.filter(p => !p.is_all_day)

  // 取得重複類型標籤
  const getRecurrenceLabel = (type: string) => {
    const option = RECURRENCE_OPTIONS.find(o => o.value === type)
    return option?.label || ""
  }

  return (
    <PanelWrapper
      title="每日行程"
      icon={CalendarClock}
      panelColor={panelColor}
      loading={loading}
      onAdd={onAdd}
      addColor="bg-indigo-600 hover:bg-indigo-700"
    >
      {plans.length === 0 ? (
        <EmptyState message="這天沒有行程安排" />
      ) : (
        <div className="space-y-3">
          {/* 全天事件 */}
          {allDayPlans.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase">全天</p>
              {allDayPlans.map((plan) => {
                const colorConfig = getPlanColor(plan.color || "")
                return (
                  <div
                    key={plan.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${colorConfig.light} border-${plan.color}-200`}
                  >
                    <div className={`w-1 h-10 rounded-full ${colorConfig.bg}`} />
                    <div className="flex-1">
                      <p className={`font-medium ${colorConfig.text}`}>{plan.title}</p>
                      <div className="flex items-center gap-3 text-sm text-gray-500 mt-0.5">
                        {plan.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {plan.location}
                          </span>
                        )}
                        {plan.recurrence_type && plan.recurrence_type !== "none" && (
                          <span className="flex items-center gap-1">
                            <Repeat className="w-3 h-3" /> {getRecurrenceLabel(plan.recurrence_type)}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(plan)}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-red-500" 
                      onClick={() => onDelete(plan.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}

          {/* 時間事件 */}
          {timedPlans.length > 0 && (
            <div className="space-y-2">
              {allDayPlans.length > 0 && (
                <p className="text-xs font-medium text-gray-500 uppercase mt-4">時間行程</p>
              )}
              {timedPlans.map((plan) => {
                const colorConfig = getPlanColor(plan.color || "")
                return (
                  <div
                    key={plan.id}
                    className="flex items-center gap-3 p-3 bg-white rounded-lg border"
                  >
                    <div className={`w-1 h-12 rounded-full ${colorConfig.bg}`} />
                    <div className="w-20 shrink-0">
                      <div className="flex items-center gap-1 text-sm font-medium text-gray-700">
                        <Clock className="w-3.5 h-3.5" />
                        {formatTime(plan.start_time)}
                      </div>
                      {plan.end_time && (
                        <div className="text-xs text-gray-400">
                          ~ {formatTime(plan.end_time)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{plan.title}</p>
                      <div className="flex items-center gap-3 text-sm text-gray-500 mt-0.5">
                        {plan.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {plan.location}
                          </span>
                        )}
                        {plan.recurrence_type && plan.recurrence_type !== "none" && (
                          <span className="flex items-center gap-1">
                            <Repeat className="w-3 h-3" /> {getRecurrenceLabel(plan.recurrence_type)}
                          </span>
                        )}
                      </div>
                      {plan.description && (
                        <p className="text-xs text-gray-400 mt-1">{plan.description}</p>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(plan)}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-red-500" 
                      onClick={() => onDelete(plan.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </PanelWrapper>
  )
}
