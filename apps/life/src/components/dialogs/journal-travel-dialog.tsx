// components/dashboard/dialogs/journal-travel-dialog.tsx
"use client"

"use client"

import { Smile, Meh, Frown, Star } from "lucide-react"
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

import { PhotoUploader } from "../photo-uploader"
import { MOOD_CONFIG, WEATHER_OPTIONS, COMPANION_OPTIONS } from "../panels/constants"

interface JournalTravelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  formData: Record<string, any>
  setFormData: (data: Record<string, any>) => void
  photos: string[]
  setPhotos: (photos: string[]) => void
  onSave: () => void
  saving: boolean
  dateLabel: string
  isEdit: boolean
}

export function JournalTravelDialog({
  open,
  onOpenChange,
  formData,
  setFormData,
  photos,
  setPhotos,
  onSave,
  saving,
  dateLabel,
  isEdit,
}: JournalTravelDialogProps) {
  const getMoodIcon = (mood: number) => {
    if (mood <= 2) return Frown
    if (mood === 3) return Meh
    return Smile
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <DialogTitle>{isEdit ? "編輯遊覽日誌" : "新增遊覽日誌"}</DialogTitle>
          <DialogDescription>{dateLabel}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* 標題 */}
          <div className="space-y-1">
            <Label className="text-xs">標題 *</Label>
            <Input 
              value={formData.title || ""} 
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="例：台北動物園一日遊"
              className="h-9"
            />
          </div>

          {/* 地點 */}
          <div className="space-y-1">
            <Label className="text-xs">地點 *</Label>
            <Input 
              value={formData.location || ""} 
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="例：台北市立動物園"
              className="h-9"
            />
          </div>

          {/* 停留時間 & 天氣 */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">停留（分鐘）</Label>
              <Input 
                type="number"
                value={formData.duration_minutes || ""} 
                onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                placeholder="180"
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">天氣</Label>
              <Select 
                value={formData.weather || ""} 
                onValueChange={(v) => setFormData({ ...formData, weather: v })}
              >
                <SelectTrigger className="h-9"><SelectValue placeholder="選擇" /></SelectTrigger>
                <SelectContent>
                  {WEATHER_OPTIONS.map((w) => (
                    <SelectItem key={w} value={w}>{w}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 同行者 */}
          <div className="space-y-1">
            <Label className="text-xs">同行者</Label>
            <Select 
              value={formData.companions || ""} 
              onValueChange={(v) => setFormData({ ...formData, companions: v })}
            >
              <SelectTrigger className="h-9"><SelectValue placeholder="選擇" /></SelectTrigger>
              <SelectContent>
                {COMPANION_OPTIONS.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 心情 & 推薦度 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">心情</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((m) => {
                  const config = MOOD_CONFIG[m as keyof typeof MOOD_CONFIG]
                  const MoodIcon = getMoodIcon(m)
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setFormData({ ...formData, mood: m })}
                      className={`p-1.5 rounded border transition-all ${
                        formData.mood === m ? "border-blue-500 bg-blue-50" : "border-gray-200"
                      }`}
                      title={config.label}
                    >
                      <MoodIcon className={`w-4 h-4 ${config.color}`} />
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">推薦度 {formData.rating ? `(${formData.rating}/5)` : ""}</Label>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setFormData({ ...formData, rating: r })}
                    className="transition-transform hover:scale-110 p-0.5"
                  >
                    <Star 
                      className={`w-5 h-5 transition-colors ${
                        (formData.rating || 0) >= r 
                          ? "fill-amber-400 text-amber-400" 
                          : "fill-gray-200 text-gray-200"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 心得 */}
          <div className="space-y-1">
            <Label className="text-xs">心得</Label>
            <Textarea 
              value={formData.content || ""} 
              onChange={(e) => setFormData({ ...formData, content: e.target.value })} 
              rows={2}
              placeholder="記錄今天的遊覽心得..."
              className="resize-none"
            />
          </div>

          {/* 照片 */}
          <div className="space-y-1">
            <Label className="text-xs">照片（最多 3 張）</Label>
            <PhotoUploader
              photos={photos}
              onChange={setPhotos}
              maxPhotos={3}
              bucket="travel-photos"
            />
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>取消</Button>
          <Button 
            size="sm"
            onClick={onSave} 
            disabled={saving || !formData.title || !formData.location}
          >
            {saving ? "儲存中..." : "儲存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
