// components/dashboard/dialogs/daily-plan-dialog.tsx
"use client"

import {
  Button,
  Input,
  Label,
  Textarea,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@daily/ui"

import { PLAN_COLORS, RECURRENCE_OPTIONS, TIME_OPTIONS } from "../panels/constants"

interface DailyPlanDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  formData: Record<string, any>
  setFormData: (data: Record<string, any>) => void
  onSave: () => void
  saving: boolean
  dateLabel: string
  isEdit: boolean
}

export function DailyPlanDialog({
  open,
  onOpenChange,
  formData,
  setFormData,
  onSave,
  saving,
  dateLabel,
  isEdit,
}: DailyPlanDialogProps) {
  const isAllDay = formData.is_all_day || false
  const hasRecurrence = formData.recurrence_type && formData.recurrence_type !== "none"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <DialogTitle>{isEdit ? "編輯行程" : "新增行程"}</DialogTitle>
          <DialogDescription>{dateLabel}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* 標題 */}
          <div className="space-y-1">
            <Label className="text-xs">標題 *</Label>
            <Input 
              value={formData.title || ""} 
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="例：討論作業"
              className="h-9"
            />
          </div>

          {/* 全天事件 */}
          <div className="flex items-center gap-2">
            <Checkbox 
              id="is_all_day"
              checked={isAllDay} 
              onCheckedChange={(c) => setFormData({ 
                ...formData, 
                is_all_day: c,
                start_time: c ? null : formData.start_time,
                end_time: c ? null : formData.end_time,
              })} 
            />
            <Label htmlFor="is_all_day" className="text-sm cursor-pointer">全天事件</Label>
          </div>

          {/* 時間選擇 */}
          {!isAllDay && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">開始</Label>
                <Select 
                  value={formData.start_time || ""} 
                  onValueChange={(v) => setFormData({ ...formData, start_time: v })}
                >
                  <SelectTrigger className="h-9"><SelectValue placeholder="時間" /></SelectTrigger>
                  <SelectContent className="max-h-48">
                    {TIME_OPTIONS.map((time) => (
                      <SelectItem key={time} value={time}>{time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">結束</Label>
                <Select 
                  value={formData.end_time || ""} 
                  onValueChange={(v) => setFormData({ ...formData, end_time: v })}
                >
                  <SelectTrigger className="h-9"><SelectValue placeholder="時間" /></SelectTrigger>
                  <SelectContent className="max-h-48">
                    {TIME_OPTIONS.map((time) => (
                      <SelectItem key={time} value={time}>{time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* 地點 */}
          <div className="space-y-1">
            <Label className="text-xs">地點</Label>
            <Input 
              value={formData.location || ""} 
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="選填"
              className="h-9"
            />
          </div>

          {/* 顏色 */}
          <div className="space-y-1">
            <Label className="text-xs">顏色</Label>
            <div className="flex flex-wrap gap-2">
              {PLAN_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, color: color.value })}
                  className={`w-7 h-7 rounded-full ${color.bg} transition-all ${
                    formData.color === color.value 
                      ? "ring-2 ring-offset-1 ring-gray-400 scale-110" 
                      : "hover:scale-105"
                  }`}
                  title={color.label}
                />
              ))}
            </div>
          </div>

          {/* 重複 */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">重複</Label>
              <Select 
                value={formData.recurrence_type || "none"} 
                onValueChange={(v) => setFormData({ 
                  ...formData, 
                  recurrence_type: v,
                  recurrence_end_date: v === "none" ? null : formData.recurrence_end_date
                })}
              >
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RECURRENCE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {hasRecurrence && (
              <div className="space-y-1">
                <Label className="text-xs">到期日</Label>
                <Input 
                  type="date"
                  value={formData.recurrence_end_date || ""} 
                  onChange={(e) => setFormData({ ...formData, recurrence_end_date: e.target.value || null })}
                  className="h-9"
                />
              </div>
            )}
          </div>

          {/* 備註 */}
          <div className="space-y-1">
            <Label className="text-xs">備註</Label>
            <Textarea 
              value={formData.description || ""} 
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              placeholder="選填"
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>取消</Button>
          <Button size="sm" onClick={onSave} disabled={saving || !formData.title}>
            {saving ? "儲存中..." : "儲存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
