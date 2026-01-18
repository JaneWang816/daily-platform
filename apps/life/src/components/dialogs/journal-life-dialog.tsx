// components/dashboard/dialogs/journal-life-dialog.tsx
"use client"

import { Smile, Meh, Frown } from "lucide-react"
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

import { MOOD_CONFIG } from "../panels/constants"

interface JournalLifeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  formData: Record<string, any>
  setFormData: (data: Record<string, any>) => void
  onSave: () => void
  saving: boolean
  dateLabel: string
  isEdit: boolean
}

export function JournalLifeDialog({
  open,
  onOpenChange,
  formData,
  setFormData,
  onSave,
  saving,
  dateLabel,
  isEdit,
}: JournalLifeDialogProps) {
  const getMoodIcon = (mood: number) => {
    if (mood <= 2) return Frown
    if (mood === 3) return Meh
    return Smile
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "編輯生活日誌" : "撰寫生活日誌"}</DialogTitle>
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
          <div className="space-y-2">
            <Label>今日心情</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((m) => {
                const config = MOOD_CONFIG[m as keyof typeof MOOD_CONFIG]
                const MoodIcon = getMoodIcon(m)
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setFormData({ ...formData, mood: m })}
                    className={`p-2 rounded-lg border-2 transition-all ${
                      formData.mood === m ? "border-blue-500 bg-blue-50" : "border-gray-200"
                    }`}
                  >
                    <MoodIcon className={`w-6 h-6 ${config.color}`} />
                  </button>
                )
              })}
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
