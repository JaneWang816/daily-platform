// components/dashboard/dialogs/journal-learning-dialog.tsx
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

interface JournalLearningDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  formData: Record<string, any>
  setFormData: (data: Record<string, any>) => void
  onSave: () => void
  saving: boolean
  dateLabel: string
  isEdit: boolean
}

export function JournalLearningDialog({
  open,
  onOpenChange,
  formData,
  setFormData,
  onSave,
  saving,
  dateLabel,
  isEdit,
}: JournalLearningDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "編輯學習日誌" : "撰寫學習日誌"}</DialogTitle>
          <DialogDescription>{dateLabel} 的記錄</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>標題</Label>
            <Input 
              value={formData.title || ""} 
              onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
            />
          </div>
          <div className="space-y-2">
            <Label>內容 *</Label>
            <Textarea 
              value={formData.content || ""} 
              onChange={(e) => setFormData({ ...formData, content: e.target.value })} 
              rows={4} 
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>學習時長 (分鐘)</Label>
              <Input 
                type="number" 
                value={formData.duration_minutes || ""} 
                onChange={(e) => setFormData({ 
                  ...formData, 
                  duration_minutes: parseInt(e.target.value) || null 
                })} 
              />
            </div>
            <div className="space-y-2">
              <Label>難度 (1-5)</Label>
              <Select 
                value={String(formData.difficulty || "")} 
                onValueChange={(v) => setFormData({ ...formData, difficulty: parseInt(v) })}
              >
                <SelectTrigger><SelectValue placeholder="選擇" /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((d) => (
                    <SelectItem key={d} value={String(d)}>{"⭐".repeat(d)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={onSave} disabled={saving || !formData.content}>
            {saving ? "儲存中..." : "儲存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
