// components/study/note-link-dialog.tsx
"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@daily/ui"
import { createClient } from "@daily/database"
import { type UnitNote } from "./types"
import { Search, FileQuestion, CreditCard, Check } from "lucide-react"

// 簡化的類型定義
interface Question {
  id: string
  content: string
}

interface Flashcard {
  id: string
  front: string
  back: string
}

interface NoteLink {
  id: string
  note_id: string
  link_type: string
  target_id: string
  user_id: string
  created_at: string | null
}

interface NoteLinkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  note: UnitNote | null
  subjectId: string
  onUpdated: () => void
}

export function NoteLinkDialog({ open, onOpenChange, note, subjectId, onUpdated }: NoteLinkDialogProps) {
  const [activeTab, setActiveTab] = useState<"question" | "flashcard">("question")
  const [searchQuery, setSearchQuery] = useState("")
  
  // 已連結項目
  const [linkedQuestions, setLinkedQuestions] = useState<string[]>([])
  const [linkedFlashcards, setLinkedFlashcards] = useState<string[]>([])
  
  // 可用項目
  const [questions, setQuestions] = useState<Question[]>([])
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  
  const [loading, setLoading] = useState(false)

  // 載入已連結項目
  useEffect(() => {
    if (!note || !open) return

    const fetchLinks = async () => {
      const supabase = createClient()
      const { data: links } = await supabase
        .from("note_links")
        .select("*")
        .eq("note_id", note.id) as { data: NoteLink[] | null }

      if (links) {
        setLinkedQuestions(
          links.filter((l) => l.link_type === "question").map((l) => l.target_id)
        )
        setLinkedFlashcards(
          links.filter((l) => l.link_type === "flashcard").map((l) => l.target_id)
        )
      }
    }

    fetchLinks()
  }, [note, open])

  // 載入可用題目
  useEffect(() => {
    if (!open || activeTab !== "question") return

    const fetchQuestions = async () => {
      setLoading(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let query = supabase
        .from("questions")
        .select("id, content")
        .eq("user_id", user.id)
        .eq("subject_id", subjectId)
        .is("parent_id", null)
        .order("created_at", { ascending: false })
        .limit(50)

      if (searchQuery.trim()) {
        query = query.ilike("content", `%${searchQuery}%`)
      }

      const { data } = await query
      setQuestions((data || []) as Question[])
      setLoading(false)
    }

    fetchQuestions()
  }, [open, activeTab, searchQuery, subjectId])

  // 載入可用字卡
  useEffect(() => {
    if (!open || activeTab !== "flashcard") return

    const fetchFlashcards = async () => {
      setLoading(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let query = supabase
        .from("flashcards")
        .select("id, front, back")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50)

      if (searchQuery.trim()) {
        query = query.or(`front.ilike.%${searchQuery}%,back.ilike.%${searchQuery}%`)
      }

      const { data } = await query
      setFlashcards((data || []) as Flashcard[])
      setLoading(false)
    }

    fetchFlashcards()
  }, [open, activeTab, searchQuery])

  const toggleLink = async (type: "question" | "flashcard", targetId: string) => {
    if (!note) return

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const isLinked = type === "question" 
      ? linkedQuestions.includes(targetId)
      : linkedFlashcards.includes(targetId)

    if (isLinked) {
      // 移除連結
      await (supabase
        .from("note_links") as any)
        .delete()
        .eq("note_id", note.id)
        .eq("link_type", type)
        .eq("target_id", targetId)

      if (type === "question") {
        setLinkedQuestions((prev) => prev.filter((id) => id !== targetId))
      } else {
        setLinkedFlashcards((prev) => prev.filter((id) => id !== targetId))
      }
    } else {
      // 新增連結
      await (supabase
        .from("note_links") as any)
        .insert({
          note_id: note.id,
          user_id: user.id,
          link_type: type,
          target_id: targetId,
        })

      if (type === "question") {
        setLinkedQuestions((prev) => [...prev, targetId])
      } else {
        setLinkedFlashcards((prev) => [...prev, targetId])
      }
    }

    onUpdated()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>連結題目或字卡</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "question" | "flashcard")} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="question" className="flex items-center gap-2">
              <FileQuestion className="w-4 h-4" />
              題庫 ({linkedQuestions.length})
            </TabsTrigger>
            <TabsTrigger value="flashcard" className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              字卡 ({linkedFlashcards.length})
            </TabsTrigger>
          </TabsList>

          {/* 搜尋框 */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋..."
              className="pl-10"
            />
          </div>

          {/* 題目列表 */}
          <TabsContent value="question" className="flex-1 overflow-y-auto mt-4 space-y-2">
            {loading ? (
              <div className="text-center py-8 text-gray-500">載入中...</div>
            ) : questions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">沒有找到題目</div>
            ) : (
              questions.map((q) => {
                const isLinked = linkedQuestions.includes(q.id)
                return (
                  <div
                    key={q.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      isLinked ? "bg-blue-50 border-blue-300" : "hover:bg-gray-50"
                    }`}
                    onClick={() => toggleLink("question", q.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        isLinked ? "bg-blue-500 border-blue-500" : "border-gray-300"
                      }`}>
                        {isLinked && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm line-clamp-2">{q.content}</p>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </TabsContent>

          {/* 字卡列表 */}
          <TabsContent value="flashcard" className="flex-1 overflow-y-auto mt-4 space-y-2">
            {loading ? (
              <div className="text-center py-8 text-gray-500">載入中...</div>
            ) : flashcards.length === 0 ? (
              <div className="text-center py-8 text-gray-500">沒有找到字卡</div>
            ) : (
              flashcards.map((fc) => {
                const isLinked = linkedFlashcards.includes(fc.id)
                return (
                  <div
                    key={fc.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      isLinked ? "bg-blue-50 border-blue-300" : "hover:bg-gray-50"
                    }`}
                    onClick={() => toggleLink("flashcard", fc.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        isLinked ? "bg-blue-500 border-blue-500" : "border-gray-300"
                      }`}>
                        {isLinked && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{fc.front}</p>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">{fc.back}</p>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={() => onOpenChange(false)}>完成</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
