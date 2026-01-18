// components/study/note-card.tsx
"use client"

import { useState } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  Button,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@daily/ui"
import { NoteContent } from "./note-editor"
import { createClient } from "@daily/database"
import { NOTE_CATEGORY_MAP, type UnitNote, type NoteCategoryType } from "./types"
import { Star, Pencil, Trash2, GripVertical, Link2 } from "lucide-react"

interface NoteCardProps {
  note: UnitNote
  onEdit: (note: UnitNote) => void
  onDeleted: () => void
  onLinkClick: (note: UnitNote) => void
  linkedCount?: number
}

export function NoteCard({ note, onEdit, onDeleted, onLinkClick, linkedCount = 0 }: NoteCardProps) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const categoryInfo = NOTE_CATEGORY_MAP[note.category as NoteCategoryType] || NOTE_CATEGORY_MAP.other

  const handleDelete = async () => {
    setDeleting(true)
    const supabase = createClient()
    const { error } = await supabase
      .from("unit_notes")
      .delete()
      .eq("id", note.id)

    if (error) {
      console.error("刪除失敗:", error)
      alert("刪除失敗")
      setDeleting(false)
      return
    }

    setDeleting(false)
    setDeleteOpen(false)
    onDeleted()
  }

  const toggleImportant = async () => {
    const supabase = createClient()
    const { error } = await (supabase
      .from("unit_notes") as any)
      .update({ is_important: !note.is_important })
      .eq("id", note.id)

    if (!error) {
      onDeleted() // 觸發重新載入
    }
  }

  return (
    <>
      <Card className={`${categoryInfo.color} border-l-4 transition-shadow hover:shadow-md`}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {/* 拖曳把手（未來實作） */}
              <GripVertical className="w-4 h-4 text-gray-400 cursor-grab flex-shrink-0" />
              
              {/* 分類標籤 */}
              <span className="text-sm font-medium whitespace-nowrap">
                {categoryInfo.label}
              </span>
              
              {/* 標題 */}
              {note.title && (
                <span className="text-sm text-gray-700 truncate">
                  — {note.title}
                </span>
              )}
            </div>

            {/* 操作按鈕 */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {/* 重要標記 */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={toggleImportant}
              >
                <Star
                  className={`w-4 h-4 ${
                    note.is_important ? "fill-yellow-500 text-yellow-500" : "text-gray-400"
                  }`}
                />
              </Button>

              {/* 連結 */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 relative"
                onClick={() => onLinkClick(note)}
              >
                <Link2 className="w-4 h-4 text-gray-500" />
                {linkedCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
                    {linkedCount}
                  </span>
                )}
              </Button>

              {/* 編輯 */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onEdit(note)}
              >
                <Pencil className="w-4 h-4 text-gray-500" />
              </Button>

              {/* 刪除 */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <NoteContent content={note.content} />
        </CardContent>
      </Card>

      {/* 刪除確認 */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確定要刪除這則筆記嗎？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作無法復原，筆記將被永久刪除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? "刪除中..." : "刪除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
