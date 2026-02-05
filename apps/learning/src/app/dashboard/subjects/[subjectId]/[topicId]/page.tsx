// apps/learning/src/app/dashboard/subjects/[subjectId]/[topicId]/page.tsx
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
  ChevronRight,
  MoreVertical,
  Pencil,
  Trash2,
  FileText,
  GripVertical,
  FolderOpen,
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
}

interface Unit {
  id: string
  title: string
  content: string | null
  topic_id: string
  order: number | null
  user_id: string
  note_count?: number
}

export default function UnitsPage() {
  const params = useParams()
  const subjectId = params.subjectId as string
  const topicId = params.topicId as string

  const [subject, setSubject] = useState<Subject | null>(null)
  const [topic, setTopic] = useState<Topic | null>(null)
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [unitToDelete, setUnitToDelete] = useState<Unit | null>(null)

  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [saving, setSaving] = useState(false)

  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: subjectData } = await supabase
      .from("subjects")
      .select("id, title, description")
      .eq("id", subjectId)
      .single()

    if (subjectData) setSubject(subjectData as Subject)

    const { data: topicData } = await supabase
      .from("topics")
      .select("id, title, subject_id")
      .eq("id", topicId)
      .single()

    if (topicData) setTopic(topicData as Topic)

    const { data: unitsData } = await supabase
      .from("units")
      .select("*")
      .eq("topic_id", topicId)
      .order("order", { ascending: true })

    if (unitsData) {
      const unitsWithCount = await Promise.all(
        (unitsData as Unit[]).map(async (unit) => {
          const { count } = await supabase
            .from("unit_notes")
            .select("*", { count: "exact", head: true })
            .eq("unit_id", unit.id)
          return { ...unit, note_count: count || 0 }
        })
      )
      setUnits(unitsWithCount)
    }

    setLoading(false)
  }, [subjectId, topicId])

  useEffect(() => { fetchData() }, [fetchData])

  const resetForm = () => {
    setTitle("")
    setContent("")
    setEditingUnit(null)
  }

  const openCreateDialog = () => {
    resetForm()
    setDialogOpen(true)
  }

  const openEditDialog = (unit: Unit) => {
    setEditingUnit(unit)
    setTitle(unit.title)
    setContent(unit.content || "")
    setDialogOpen(true)
    setOpenMenuId(null)
  }

  const handleSave = async () => {
    if (!title.trim()) {
      alert("請輸入單元名稱")
      return
    }

    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    if (editingUnit) {
      await (supabase.from("units") as any)
        .update({ title: title.trim(), content: content.trim() || null })
        .eq("id", editingUnit.id)
    } else {
      const { data: maxOrderData } = await supabase
        .from("units")
        .select("order")
        .eq("topic_id", topicId)
        .order("order", { ascending: false })
        .limit(1)
        .maybeSingle() as { data: { order: number | null } | null }

      const newOrder = (maxOrderData?.order ?? -1) + 1

      await (supabase.from("units") as any)
        .insert({
          user_id: user.id,
          topic_id: topicId,
          title: title.trim(),
          content: content.trim() || null,
          order: newOrder,
        })
    }

    setSaving(false)
    setDialogOpen(false)
    resetForm()
    fetchData()
  }

  const handleDelete = async () => {
    if (!unitToDelete) return

    const supabase = createClient()
    await (supabase.from("units") as any).delete().eq("id", unitToDelete.id)

    setDeleteDialogOpen(false)
    setUnitToDelete(null)
    fetchData()
  }

  const confirmDelete = (unit: Unit) => {
    setUnitToDelete(unit)
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

  if (!subject || !topic) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">找不到此主題</p>
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
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2 flex-wrap">
          <Link href="/dashboard/subjects" className="hover:text-indigo-600">科目管理</Link>
          <ChevronRight className="w-4 h-4" />
          <Link href={`/dashboard/subjects/${subjectId}`} className="hover:text-indigo-600">{subject.title}</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-800">{topic.title}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-indigo-100">
              <FolderOpen className="w-5 h-5 text-indigo-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">{topic.title}</h1>
          </div>
          <Button onClick={openCreateDialog} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" />新增單元
          </Button>
        </div>
      </div>

      {/* 單元列表 */}
      {units.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 mb-4">還沒有任何單元</p>
            <Button onClick={openCreateDialog} variant="outline">
              <Plus className="w-4 h-4 mr-2" />建立第一個單元
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {units.map((unit, index) => (
            <Card
              key={unit.id}
              className="hover:shadow-md transition-shadow relative group"
              style={{ zIndex: openMenuId === unit.id ? 50 : 1 }}
            >
              <Link href={`/dashboard/subjects/${subjectId}/${topicId}/${unit.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="text-gray-300 cursor-grab">
                      <GripVertical className="w-5 h-5" />
                    </div>

                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium bg-indigo-100 text-indigo-600">
                      {index + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-800">{unit.title}</h3>
                      {unit.content && <p className="text-sm text-gray-500 truncate">{unit.content}</p>}
                    </div>

                    <span className="text-sm text-gray-400">{unit.note_count} 則筆記</span>

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
                    setOpenMenuId(openMenuId === unit.id ? null : unit.id)
                  }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {openMenuId === unit.id && (
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
                          openEditDialog(unit)
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Pencil className="w-4 h-4" />編輯
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          confirmDelete(unit)
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />刪除
                      </button>
                    </div>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUnit ? "編輯單元" : "新增單元"}</DialogTitle>
            <DialogDescription>{editingUnit ? "修改單元資訊" : "在此主題下建立新的單元"}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>單元名稱</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例如：1-1 整數的加減、2-2 一元一次方程式..." />
            </div>

            <div className="space-y-2">
              <Label>說明（選填）</Label>
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="簡短說明這個單元的重點..." rows={3} />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? "儲存中..." : "儲存"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確定要刪除嗎？</AlertDialogTitle>
            <AlertDialogDescription>刪除「{unitToDelete?.title}」將會同時刪除所有相關的筆記。此操作無法復原。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">刪除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
