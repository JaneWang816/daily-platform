// apps/learning/src/app/dashboard/subjects/[subjectId]/[topicId]/[unitId]/page.tsx
"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import {
  Card,
  CardContent,
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
import {
  Plus,
  ChevronRight,
  FolderOpen,
  FileText,
  Star,
  MoreVertical,
  Pencil,
  Trash2,
  Link as LinkIcon,
} from "lucide-react"
import { NoteDialog } from "@/components/study/note-dialog"
import { NoteLinkDialog } from "@/components/study/note-link-dialog"
import { NoteContent } from "@/components/study/note-editor"
import { NOTE_CATEGORIES, NOTE_CATEGORY_MAP, type UnitNote, type NoteCategoryType } from "@/components/study/types"

interface Subject {
  id: string
  title: string
  description: string | null
}

interface Topic {
  id: string
  title: string
}

interface Unit {
  id: string
  title: string
  content: string | null
}

export default function NotesPage() {
  const params = useParams()
  const subjectId = params.subjectId as string
  const topicId = params.topicId as string
  const unitId = params.unitId as string

  const [subject, setSubject] = useState<Subject | null>(null)
  const [topic, setTopic] = useState<Topic | null>(null)
  const [unit, setUnit] = useState<Unit | null>(null)
  const [notes, setNotes] = useState<UnitNote[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog 狀態
  const [noteDialogOpen, setNoteDialogOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<UnitNote | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [noteToDelete, setNoteToDelete] = useState<UnitNote | null>(null)
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [linkingNote, setLinkingNote] = useState<UnitNote | null>(null)

  // 下拉選單狀態
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  // 篩選狀態
  const [filterCategory, setFilterCategory] = useState<NoteCategoryType | "all">("all")
  const [showImportantOnly, setShowImportantOnly] = useState(false)

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

    // 取得主題資訊
    const { data: topicData } = await supabase
      .from("topics")
      .select("id, title")
      .eq("id", topicId)
      .single()

    if (topicData) {
      setTopic(topicData as Topic)
    }

    // 取得單元資訊
    const { data: unitData } = await supabase
      .from("units")
      .select("id, title, content")
      .eq("id", unitId)
      .single()

    if (unitData) {
      setUnit(unitData as Unit)
    }

    // 取得筆記列表
    await fetchNotes()
    setLoading(false)
  }, [subjectId, topicId, unitId])

  const fetchNotes = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: notesData } = await supabase
      .from("unit_notes")
      .select("*")
      .eq("unit_id", unitId)
      .order("order", { ascending: true })

    if (notesData) {
      setNotes(notesData as UnitNote[])
    }
  }

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const openCreateDialog = () => {
    setEditingNote(null)
    setNoteDialogOpen(true)
  }

  const openEditDialog = (note: UnitNote) => {
    setEditingNote(note)
    setNoteDialogOpen(true)
    setOpenMenuId(null)
  }

  const openLinkDialog = (note: UnitNote) => {
    setLinkingNote(note)
    setLinkDialogOpen(true)
    setOpenMenuId(null)
  }

  const handleDelete = async () => {
    if (!noteToDelete) return

    const supabase = createClient()
    await (supabase.from("unit_notes") as any)
      .delete()
      .eq("id", noteToDelete.id)

    setDeleteDialogOpen(false)
    setNoteToDelete(null)
    fetchNotes()
  }

  const confirmDelete = (note: UnitNote) => {
    setNoteToDelete(note)
    setDeleteDialogOpen(true)
    setOpenMenuId(null)
  }

  const toggleImportant = async (note: UnitNote) => {
    const supabase = createClient()
    await (supabase.from("unit_notes") as any)
      .update({ is_important: !note.is_important })
      .eq("id", note.id)
    fetchNotes()
  }

  // 篩選筆記
  const filteredNotes = notes.filter((note) => {
    if (showImportantOnly && !note.is_important) return false
    if (filterCategory !== "all" && note.category !== filterCategory) return false
    return true
  })

  // 按分類分組
  const groupedNotes = filteredNotes.reduce((acc, note) => {
    const category = note.category as NoteCategoryType
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(note)
    return acc
  }, {} as Record<NoteCategoryType, UnitNote[]>)

  const getCategoryInfo = (category: NoteCategoryType) => {
    return NOTE_CATEGORY_MAP[category] || NOTE_CATEGORY_MAP.other
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!subject || !topic || !unit) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">找不到此單元</p>
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
          <Link href="/dashboard/subjects" className="hover:text-indigo-600">
            科目管理
          </Link>
          <ChevronRight className="w-4 h-4" />
          <Link href={`/dashboard/subjects/${subjectId}`} className="hover:text-indigo-600">
            {subject.title}
          </Link>
          <ChevronRight className="w-4 h-4" />
          <Link href={`/dashboard/subjects/${subjectId}/${topicId}`} className="hover:text-indigo-600">
            {topic.title}
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-800">{unit.title}</span>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center bg-indigo-100"
            >
              <FileText
                className="w-5 h-5 text-indigo-600"
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{unit.title}</h1>
              {unit.content && (
                <p className="text-gray-600 text-sm">{unit.content}</p>
              )}
            </div>
          </div>
          <Button onClick={openCreateDialog} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" />
            新增筆記
          </Button>
        </div>
      </div>

      {/* 篩選工具列 */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => setShowImportantOnly(!showImportantOnly)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${
            showImportantOnly
              ? "bg-yellow-100 text-yellow-700 border border-yellow-300"
              : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
          }`}
        >
          <Star className={`w-4 h-4 ${showImportantOnly ? "fill-yellow-500" : ""}`} />
          重要筆記
        </button>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value as NoteCategoryType | "all")}
          className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">所有分類</option>
          {NOTE_CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>

        <span className="text-sm text-gray-500">
          共 {filteredNotes.length} 則筆記
        </span>
      </div>

      {/* 筆記列表 */}
      {notes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 mb-4">還沒有任何筆記</p>
            <Button onClick={openCreateDialog} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              建立第一則筆記
            </Button>
          </CardContent>
        </Card>
      ) : filteredNotes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <p className="text-gray-500">沒有符合篩選條件的筆記</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedNotes).map(([category, categoryNotes]) => {
            const catInfo = getCategoryInfo(category as NoteCategoryType)
            return (
              <div key={category}>
                <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: catInfo.bgColor }}
                  />
                  {catInfo.label}
                  <span className="text-gray-400">({categoryNotes.length})</span>
                </h3>
                <div className="space-y-3">
                  {categoryNotes.map((note) => (
                    <Card key={note.id} className="relative group">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {/* 重要標記 */}
                          <button
                            onClick={() => toggleImportant(note)}
                            className={`mt-1 ${note.is_important ? "text-yellow-500" : "text-gray-300 hover:text-yellow-400"}`}
                          >
                            <Star className={`w-5 h-5 ${note.is_important ? "fill-yellow-500" : ""}`} />
                          </button>

                          {/* 內容 */}
                          <div className="flex-1 min-w-0">
                            {note.title && (
                              <h4 className="font-medium text-gray-800 mb-2">{note.title}</h4>
                            )}
                            <div className="prose prose-sm max-w-none">
                              <NoteContent content={note.content} />
                            </div>
                          </div>

                          {/* 更多選單 */}
                          <div className="relative">
                            <button
                              onClick={() => setOpenMenuId(openMenuId === note.id ? null : note.id)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {openMenuId === note.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={() => setOpenMenuId(null)}
                                />
                                <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                                  <button
                                    onClick={() => openEditDialog(note)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                  >
                                    <Pencil className="w-4 h-4" />
                                    編輯
                                  </button>
                                  <button
                                    onClick={() => openLinkDialog(note)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                  >
                                    <LinkIcon className="w-4 h-4" />
                                    連結題目/字卡
                                  </button>
                                  <button
                                    onClick={() => confirmDelete(note)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    刪除
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 新增/編輯筆記 Dialog */}
      <NoteDialog
        open={noteDialogOpen}
        onOpenChange={setNoteDialogOpen}
        unitId={unitId}
        note={editingNote}
        onSaved={fetchNotes}
      />

      {/* 連結 Dialog */}
      <NoteLinkDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        note={linkingNote}
        subjectId={subjectId}
        onUpdated={fetchNotes}
      />

      {/* 刪除確認 Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確定要刪除嗎？</AlertDialogTitle>
            <AlertDialogDescription>
              刪除此筆記後將無法復原。
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
