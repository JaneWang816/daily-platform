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
      <DialogContent className="max-w-md">
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
