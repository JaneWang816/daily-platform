// components/dashboard/dialogs/health-dialog.tsx
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

interface HealthDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  formData: Record<string, any>
  setFormData: (data: Record<string, any>) => void
  onSave: () => void
  saving: boolean
  dateLabel: string
  isEdit: boolean
}

export function HealthDialog({
  open,
  onOpenChange,
  formData,
  setFormData,
  onSave,
  saving,
  dateLabel,
  isEdit,
}: HealthDialogProps) {
  const metricType = formData.metric_type || "weight"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "編輯健康數值" : "新增健康數值"}</DialogTitle>
          <DialogDescription>{dateLabel} 的記錄</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>類型 *</Label>
            <Select 
              value={metricType} 
              onValueChange={(v) => setFormData({ ...formData, metric_type: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="weight">體重 (kg)</SelectItem>
                <SelectItem value="sleep">睡眠 (小時)</SelectItem>
                <SelectItem value="water">飲水 (ml)</SelectItem>
                <SelectItem value="blood_pressure">血壓</SelectItem>
                <SelectItem value="steps">步數</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 血壓：收縮壓、舒張壓、脈搏 */}
          {metricType === "blood_pressure" ? (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>收縮壓 *</Label>
                  <Input 
                    type="number" 
                    value={formData.value_primary || ""} 
                    onChange={(e) => setFormData({ ...formData, value_primary: e.target.value })}
                    placeholder="120"
                  />
                </div>
                <div className="space-y-2">
                  <Label>舒張壓</Label>
                  <Input 
                    type="number" 
                    value={formData.value_secondary || ""} 
                    onChange={(e) => setFormData({ ...formData, value_secondary: e.target.value })}
                    placeholder="80"
                  />
                </div>
                <div className="space-y-2">
                  <Label>脈搏</Label>
                  <Input 
                    type="number" 
                    value={formData.value_tertiary || ""} 
                    onChange={(e) => setFormData({ ...formData, value_tertiary: e.target.value })}
                    placeholder="72"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>測量時間</Label>
                <Input 
                  type="time" 
                  value={formData.measured_time || ""} 
                  onChange={(e) => setFormData({ ...formData, measured_time: e.target.value })}
                />
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label>
                {metricType === "weight" && "體重 (kg) *"}
                {metricType === "sleep" && "睡眠時數 *"}
                {metricType === "water" && "飲水量 (ml) *"}
                {metricType === "steps" && "步數 *"}
              </Label>
              <Input 
                type="number" 
                step={metricType === "weight" ? "0.1" : "1"}
                value={formData.value_primary || ""} 
                onChange={(e) => setFormData({ ...formData, value_primary: e.target.value })}
                placeholder={
                  metricType === "weight" ? "65.5" :
                  metricType === "sleep" ? "7" :
                  metricType === "water" ? "2000" :
                  metricType === "steps" ? "10000" : ""
                }
              />
            </div>
          )}

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
            disabled={saving || !formData.value_primary}
          >
            {saving ? "儲存中..." : "儲存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
