// apps/learning/src/app/dashboard/subjects/page.tsx
"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import {
  Card,
  CardContent,
  Button,
  Input,
  Label,
  Textarea,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@daily/ui"
import {
  Plus,
  BookOpen,
  MoreVertical,
  Pencil,
  Trash2,
  FolderOpen,
  ChevronRight,
} from "lucide-react"

interface Subject {
  id: string
  title: string
  description: string | null
  cover_url: string | null
  user_id: string
  created_at: string | null
  topic_count?: number
}

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  
  // Dialog 狀態
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null)
  
  // 表單狀態
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [saving, setSaving] = useState(false)

  // 下拉選單狀態
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const fetchSubjects = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from("subjects")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (data) {
      // 取得每個科目的主題數量
      const subjectsWithCount = await Promise.all(
        (data as Subject[]).map(async (subject) => {
          const { count } = await supabase
            .from("topics")
            .select("*", { count: "exact", head: true })
            .eq("subject_id", subject.id)
          return { ...subject, topic_count: count || 0 }
        })
      )
      setSubjects(subjectsWithCount)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    fetchSubjects()
  }, [fetchSubjects])

  const resetForm = () => {
    setTitle("")
    setDescription("")
    setEditingSubject(null)
  }

  const openCreateDialog = () => {
    resetForm()
    setDialogOpen(true)
  }

  const openEditDialog = (subject: Subject) => {
    setEditingSubject(subject)
    setTitle(subject.title)
    setDescription(subject.description || "")
    setDialogOpen(true)
    setOpenMenuId(null)
  }

  const handleSave = async () => {
    if (!title.trim()) {
      alert("請輸入科目名稱")
      return
    }

    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSaving(false)
      return
    }

    if (editingSubject) {
      // 更新
      await (supabase.from("subjects") as any)
        .update({
          title: title.trim(),
          description: description.trim() || null,
        })
        .eq("id", editingSubject.id)
    } else {
      // 新增
      await (supabase.from("subjects") as any)
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
        })
    }

    setSaving(false)
    setDialogOpen(false)
    resetForm()
    fetchSubjects()
  }

  const handleDelete = async () => {
    if (!subjectToDelete) return

    const supabase = createClient()
    await (supabase.from("subjects") as any)
      .delete()
      .eq("id", subjectToDelete.id)

    setDeleteDialogOpen(false)
    setSubjectToDelete(null)
    fetchSubjects()
  }

  const confirmDelete = (subject: Subject) => {
    setSubjectToDelete(subject)
    setDeleteDialogOpen(true)
    setOpenMenuId(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">科目管理</h1>
          <p className="text-gray-600 mt-1">管理你的學習科目</p>
        </div>
        <Button onClick={openCreateDialog} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" />
          新增科目
        </Button>
      </div>

      {/* 科目列表 */}
      {subjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <BookOpen className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 mb-4">還沒有任何科目</p>
            <Button onClick={openCreateDialog} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              建立第一個科目
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((subject) => (
            <Card 
              key={subject.id} 
              className="hover:shadow-md transition-shadow relative group"
            >
              <Link href={`/dashboard/subjects/${subject.id}`}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    {/* 圖標 */}
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 bg-indigo-100">
                      <FolderOpen className="w-6 h-6 text-indigo-600" />
                    </div>
                    
                    {/* 內容 */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-800 truncate">
                        {subject.title}
                      </h3>
                      {subject.description && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {subject.description}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        {subject.topic_count} 個主題
                      </p>
                    </div>

                    {/* 箭頭 */}
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors" />
                  </div>
                </CardContent>
              </Link>

              {/* 更多選單按鈕 */}
              <div className="absolute top-3 right-3">
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setOpenMenuId(openMenuId === subject.id ? null : subject.id)
                  }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {/* 下拉選單 */}
                {openMenuId === subject.id && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setOpenMenuId(null)}
                    />
                    <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          openEditDialog(subject)
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Pencil className="w-4 h-4" />
                        編輯
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          confirmDelete(subject)
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        刪除
                      </button>
                    </div>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* 新增/編輯科目 Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingSubject ? "編輯科目" : "新增科目"}
            </DialogTitle>
            <DialogDescription>
              {editingSubject ? "修改科目名稱和描述" : "建立一個新的學習科目"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="title">科目名稱</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：數學、英文..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">描述（選填）</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="簡單描述這個科目..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "儲存中..." : "儲存"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 刪除確認 Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確定要刪除嗎？</AlertDialogTitle>
            <AlertDialogDescription>
              刪除「{subjectToDelete?.title}」後，所有相關的主題、單元和筆記都會一併刪除，此操作無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
