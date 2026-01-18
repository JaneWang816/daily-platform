// components/dashboard/dialogs/exercise-dialog.tsx
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

import { EXERCISE_TYPES } from "../panels/constants"

interface ExerciseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  formData: Record<string, any>
  setFormData: (data: Record<string, any>) => void
  onSave: () => void
  saving: boolean
  dateLabel: string
  isEdit: boolean
}

export function ExerciseDialog({
  open,
  onOpenChange,
  formData,
  setFormData,
  onSave,
  saving,
  dateLabel,
  isEdit,
}: ExerciseDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "編輯運動" : "新增運動"}</DialogTitle>
          <DialogDescription>{dateLabel} 的記錄</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>運動類型 *</Label>
            <Select 
              value={formData.exercise_type || ""} 
              onValueChange={(v) => setFormData({ ...formData, exercise_type: v })}
            >
              <SelectTrigger><SelectValue placeholder="選擇類型" /></SelectTrigger>
              <SelectContent>
                {EXERCISE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>時長 (分鐘)</Label>
              <Input 
                type="number" 
                value={formData.duration_minutes || ""} 
                onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })} 
              />
            </div>
            <div className="space-y-2">
              <Label>消耗熱量 (卡)</Label>
              <Input 
                type="number" 
                value={formData.calories || ""} 
                onChange={(e) => setFormData({ ...formData, calories: e.target.value })} 
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>備註</Label>
            <Input 
              value={formData.note || ""} 
              onChange={(e) => setFormData({ ...formData, note: e.target.value })} 
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button 
            onClick={onSave} 
            disabled={saving || !formData.exercise_type}
          >
            {saving ? "儲存中..." : "儲存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
