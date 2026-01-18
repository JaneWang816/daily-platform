// components/dashboard/dialogs/journal-reading-dialog.tsx
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

interface JournalReadingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  formData: Record<string, any>
  setFormData: (data: Record<string, any>) => void
  onSave: () => void
  saving: boolean
  dateLabel: string
  isEdit: boolean
}

export function JournalReadingDialog({
  open,
  onOpenChange,
  formData,
  setFormData,
  onSave,
  saving,
  dateLabel,
  isEdit,
}: JournalReadingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "編輯閱讀日誌" : "撰寫閱讀日誌"}</DialogTitle>
          <DialogDescription>{dateLabel} 的記錄</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>書名 *</Label>
            <Input 
              value={formData.book_title || ""} 
              onChange={(e) => setFormData({ ...formData, book_title: e.target.value })} 
            />
          </div>
          <div className="space-y-2">
            <Label>作者</Label>
            <Input 
              value={formData.author || ""} 
              onChange={(e) => setFormData({ ...formData, author: e.target.value })} 
            />
          </div>
          <div className="space-y-2">
            <Label>心得</Label>
            <Textarea 
              value={formData.content || ""} 
              onChange={(e) => setFormData({ ...formData, content: e.target.value })} 
              rows={3} 
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>今日讀頁數</Label>
              <Input 
                type="number" 
                value={formData.pages_read || ""} 
                onChange={(e) => setFormData({ 
                  ...formData, 
                  pages_read: parseInt(e.target.value) || null 
                })} 
              />
            </div>
            <div className="space-y-2">
              <Label>目前頁數</Label>
              <Input 
                type="number" 
                value={formData.current_page || ""} 
                onChange={(e) => setFormData({ 
                  ...formData, 
                  current_page: parseInt(e.target.value) || null 
                })} 
              />
            </div>
            <div className="space-y-2">
              <Label>總頁數</Label>
              <Input 
                type="number" 
                value={formData.total_pages || ""} 
                onChange={(e) => setFormData({ 
                  ...formData, 
                  total_pages: parseInt(e.target.value) || null 
                })} 
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2">
              <Checkbox 
                checked={formData.is_finished || false} 
                onCheckedChange={(c) => setFormData({ ...formData, is_finished: c })} 
              />
              <span>已讀完</span>
            </label>
            <div className="flex items-center gap-2">
              <Label>評分</Label>
              <Select 
                value={String(formData.rating || "")} 
                onValueChange={(v) => setFormData({ ...formData, rating: parseInt(v) })}
              >
                <SelectTrigger className="w-24"><SelectValue placeholder="選擇" /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((r) => (
                    <SelectItem key={r} value={String(r)}>{"⭐".repeat(r)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={onSave} disabled={saving || !formData.book_title}>
            {saving ? "儲存中..." : "儲存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
