// components/study/note-dialog.tsx
"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@daily/ui"
import { NoteEditor } from "./note-editor"
import { createClient } from "@daily/database"
import { NOTE_CATEGORIES, type UnitNote, type NoteCategoryType } from "./types"
import { Star } from "lucide-react"

interface NoteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  unitId: string
  note?: UnitNote | null
  onSaved: () => void
}

export function NoteDialog({ open, onOpenChange, unitId, note, onSaved }: NoteDialogProps) {
  const [category, setCategory] = useState<NoteCategoryType>("key_point")
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [isImportant, setIsImportant] = useState(false)
  const [saving, setSaving] = useState(false)

  // 編輯模式時載入資料
  useEffect(() => {
    if (note) {
      setCategory(note.category)
      setTitle(note.title || "")
      setContent(note.content)
      setIsImportant(note.is_important)
    } else {
      setCategory("key_point")
      setTitle("")
      setContent("")
      setIsImportant(false)
    }
  }, [note, open])

  const handleSave = async () => {
    if (!content.trim() || content === "<p></p>") {
      alert("請輸入筆記內容")
      return
    }

    setSaving(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSaving(false)
      return
    }

    if (note) {
      // 更新
      const { error } = await (supabase
        .from("unit_notes") as any)
        .update({
          category,
          title: title.trim() || null,
          content,
          is_important: isImportant,
        })
        .eq("id", note.id)

      if (error) {
        console.error("更新失敗:", error)
        alert("更新失敗")
        setSaving(false)
        return
      }
    } else {
      // 新增
      // 取得最大 order（使用 maybeSingle 避免沒資料時報錯）
      const { data: maxOrderData } = await supabase
        .from("unit_notes")
        .select("order")
        .eq("unit_id", unitId)
        .order("order", { ascending: false })
        .limit(1)
        .maybeSingle() as { data: { order: number | null } | null }

      const newOrder = (maxOrderData?.order ?? -1) + 1

      const { error } = await (supabase
        .from("unit_notes") as any)
        .insert({
          unit_id: unitId,
          user_id: user.id,
          category,
          title: title.trim() || null,
          content,
          is_important: isImportant,
          order: newOrder,
        })

      if (error) {
        console.error("新增失敗:", error)
        alert("新增失敗")
        setSaving(false)
        return
      }
    }

    setSaving(false)
    onSaved()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{note ? "編輯筆記" : "新增筆記"}</DialogTitle>
          <DialogDescription>
            {note ? "修改筆記內容和分類" : "為這個單元新增學習筆記"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* 分類與標題 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>分類</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as NoteCategoryType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NOTE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>標題（選填）</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="為這則筆記加個標題..."
              />
            </div>
          </div>

          {/* 重要標記 */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsImportant(!isImportant)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-colors ${
                isImportant
                  ? "bg-yellow-100 text-yellow-700 border border-yellow-300"
                  : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
              }`}
            >
              <Star className={`w-4 h-4 ${isImportant ? "fill-yellow-500" : ""}`} />
              {isImportant ? "已標記重要" : "標記為重要"}
            </button>
          </div>

          {/* 編輯器 */}
          <div className="space-y-2">
            <Label>內容</Label>
            <NoteEditor
              content={content}
              onChange={setContent}
              placeholder="開始輸入筆記內容..."
            />
          </div>

          {/* 按鈕 */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "儲存中..." : "儲存"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
