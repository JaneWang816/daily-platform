// apps/learning/src/app/dashboard/subjects/[subjectId]/page.tsx
"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
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
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Pencil,
  Trash2,
  FolderOpen,
  GripVertical,
  BookOpen,
} from "lucide-react"

interface Subject {
  id: string
  title: string
  description: string | null
}

interface Topic {
  id: string
  title: string
  subject_id: string
  order: number | null
  user_id: string
  unit_count?: number
}

export default function TopicsPage() {
  const params = useParams()
  const subjectId = params.subjectId as string

  const [subject, setSubject] = useState<Subject | null>(null)
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog 狀態
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [topicToDelete, setTopicToDelete] = useState<Topic | null>(null)

  // 表單狀態
  const [title, setTitle] = useState("")
  const [saving, setSaving] = useState(false)

  // 下拉選單狀態
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 取得科目資訊
    const { data: subjectData } = await supabase
      .from("subjects")
      .select("id, title, description")
      .eq("id", subjectId)
      .single()

    if (subjectData) {
      setSubject(subjectData as Subject)
    }

    // 取得主題列表
    const { data: topicsData } = await supabase
      .from("topics")
      .select("*")
      .eq("subject_id", subjectId)
      .order("order", { ascending: true })

    if (topicsData) {
      // 取得每個主題的單元數量
      const topicsWithCount = await Promise.all(
        (topicsData as Topic[]).map(async (topic) => {
          const { count } = await supabase
            .from("units")
            .select("*", { count: "exact", head: true })
            .eq("topic_id", topic.id)
          return { ...topic, unit_count: count || 0 }
        })
      )
      setTopics(topicsWithCount)
    }

    setLoading(false)
  }, [subjectId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const resetForm = () => {
    setTitle("")
    setEditingTopic(null)
  }

  const openCreateDialog = () => {
    resetForm()
    setDialogOpen(true)
  }

  const openEditDialog = (topic: Topic) => {
    setEditingTopic(topic)
    setTitle(topic.title)
    setDialogOpen(true)
    setOpenMenuId(null)
  }

  const handleSave = async () => {
    if (!title.trim()) {
      alert("請輸入主題名稱")
      return
    }

    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSaving(false)
      return
    }

    if (editingTopic) {
      await (supabase.from("topics") as any)
        .update({ title: title.trim() })
        .eq("id", editingTopic.id)
    } else {
      const { data: maxOrderData } = await supabase
        .from("topics")
        .select("order")
        .eq("subject_id", subjectId)
        .order("order", { ascending: false })
        .limit(1)
        .maybeSingle() as { data: { order: number | null } | null }

      const newOrder = (maxOrderData?.order ?? -1) + 1

      await (supabase.from("topics") as any)
        .insert({
          user_id: user.id,
          subject_id: subjectId,
          title: title.trim(),
          order: newOrder,
        })
    }

    setSaving(false)
    setDialogOpen(false)
    resetForm()
    fetchData()
  }

  const handleDelete = async () => {
    if (!topicToDelete) return

    const supabase = createClient()
    await (supabase.from("topics") as any)
      .delete()
      .eq("id", topicToDelete.id)

    setDeleteDialogOpen(false)
    setTopicToDelete(null)
    fetchData()
  }

  const confirmDelete = (topic: Topic) => {
    setTopicToDelete(topic)
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

  if (!subject) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">找不到此科目</p>
        <Link href="/dashboard/subjects" className="text-indigo-600 hover:underline mt-2 inline-block">
          返回科目列表
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 麵包屑 + 標題 */}
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/dashboard/subjects" className="hover:text-indigo-600">
            科目管理
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-800">{subject.title}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-indigo-100">
              <BookOpen className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{subject.title}</h1>
              {subject.description && (
                <p className="text-gray-500 text-sm">{subject.description}</p>
              )}
            </div>
          </div>
          <Button onClick={openCreateDialog} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" />
            新增主題
          </Button>
        </div>
      </div>

      {/* 主題列表 */}
      {topics.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <FolderOpen className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 mb-4">還沒有任何主題</p>
            <Button onClick={openCreateDialog} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              建立第一個主題
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {topics.map((topic, index) => (
            <Card
              key={topic.id}
              className="hover:shadow-md transition-shadow relative group"
              style={{ zIndex: openMenuId === topic.id ? 50 : 1 }}
            >
              <Link href={`/dashboard/subjects/${subjectId}/${topic.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="text-gray-300 cursor-grab">
                      <GripVertical className="w-5 h-5" />
                    </div>

                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium bg-indigo-100 text-indigo-600">
                      {index + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-800">{topic.title}</h3>
                    </div>

                    <span className="text-sm text-gray-400">
                      {topic.unit_count} 個單元
                    </span>

                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors" />
                  </div>
                </CardContent>
              </Link>

              {/* 更多選單 - 修正 z-index */}
              <div className="absolute top-1/2 -translate-y-1/2 right-12 z-10">
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setOpenMenuId(openMenuId === topic.id ? null : topic.id)
                  }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {openMenuId === topic.id && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setOpenMenuId(null)
                      }}
                    />
                    <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          openEditDialog(topic)
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
                          confirmDelete(topic)
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

      {/* 新增/編輯 Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTopic ? "編輯主題" : "新增主題"}
            </DialogTitle>
            <DialogDescription>
              {editingTopic ? "修改主題名稱" : "在此科目下建立新的主題"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>主題名稱</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：第一章 緒論、Unit 1..."
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
              刪除「{topicToDelete?.title}」將會同時刪除所有相關的單元和筆記。此操作無法復原。
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
