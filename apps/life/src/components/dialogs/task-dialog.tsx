// components/dashboard/dialogs/task-dialog.tsx
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
import { Repeat } from "lucide-react"

interface TaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  formData: Record<string, any>
  setFormData: (data: Record<string, any>) => void
  onSave: () => void
  saving: boolean
  dateLabel: string
  isEdit: boolean
}

const RECURRENCE_OPTIONS = [
  { value: "none", label: "不重複" },
  { value: "daily", label: "每天" },
  { value: "weekly", label: "每週" },
  { value: "biweekly", label: "每兩週" },
  { value: "monthly", label: "每月" },
  { value: "bimonthly", label: "每兩月" },
  { value: "quarterly", label: "每季" },
  { value: "semiannually", label: "每半年" },
  { value: "yearly", label: "每年" },
  { value: "custom", label: "自訂間隔" },
]

export function TaskDialog({
  open,
  onOpenChange,
  formData,
  setFormData,
  onSave,
  saving,
  dateLabel,
  isEdit,
}: TaskDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "編輯任務" : "新增任務"}</DialogTitle>
          <DialogDescription>{dateLabel} 的記錄</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>任務名稱 *</Label>
            <Input 
              value={formData.title || ""} 
              onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
            />
          </div>
          
          <div className="space-y-2">
            <Label>說明</Label>
            <Textarea 
              value={formData.description || ""} 
              onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
              rows={2} 
            />
          </div>
          
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <Checkbox 
                checked={formData.is_important || false} 
                onCheckedChange={(c) => setFormData({ ...formData, is_important: c })} 
              />
              <span>重要</span>
            </label>
            <label className="flex items-center gap-2">
              <Checkbox 
                checked={formData.is_urgent || false} 
                onCheckedChange={(c) => setFormData({ ...formData, is_urgent: c })} 
              />
              <span>緊急</span>
            </label>
          </div>

          {/* 重複設定 */}
          <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Repeat className="w-4 h-4 text-purple-600" />
              <Label className="text-sm font-medium">重複設定</Label>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs text-gray-500">重複週期</Label>
              <Select
                value={formData.recurrence_type || "none"}
                onValueChange={(value) => setFormData({ 
                  ...formData, 
                  recurrence_type: value,
                  recurrence_interval: value !== "custom" ? null : formData.recurrence_interval
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECURRENCE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.recurrence_type === "custom" && (
              <div className="space-y-2">
                <Label className="text-xs text-gray-500">間隔天數</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="例如: 3 (每3天)"
                  value={formData.recurrence_interval || ""}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    recurrence_interval: e.target.value ? parseInt(e.target.value) : null 
                  })}
                />
              </div>
            )}

            {formData.recurrence_type && formData.recurrence_type !== "none" && (
              <div className="space-y-2">
                <Label className="text-xs text-gray-500">結束日期(選填)</Label>
                <Input
                  type="date"
                  value={formData.recurrence_end_date || ""}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    recurrence_end_date: e.target.value 
                  })}
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={onSave} disabled={saving || !formData.title}>
            {saving ? "儲存中..." : "儲存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
