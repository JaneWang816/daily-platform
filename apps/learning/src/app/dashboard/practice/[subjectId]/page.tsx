// apps/learning/src/app/dashboard/practice/[subjectId]/page.tsx
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@daily/ui"
import {
  Plus,
  ChevronLeft,
  FileQuestion,
  MoreVertical,
  Pencil,
  Trash2,
  Play,
  Upload,
  CheckCircle,
  XCircle,
  HelpCircle,
  FolderOpen,
} from "lucide-react"

interface Subject {
  id: string
  title: string
  description: string | null
}

interface QuestionType {
  id: string
  name: string
  label: string
}

interface Question {
  id: string
  subject_id: string
  question_type_id: string
  content: string
  options: Record<string, string> | null
  answer: Record<string, unknown> | null
  explanation: string | null
  attempt_count: number | null
  consecutive_correct: number | null
  wrong_count: number | null
  user_id: string
  created_at: string | null
  question_types?: QuestionType
}

export default function SubjectQuestionsPage() {
  const params = useParams()
  const subjectId = params.subjectId as string

  const [subject, setSubject] = useState<Subject | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [questionTypes, setQuestionTypes] = useState<QuestionType[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog 狀態
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [questionToDelete, setQuestionToDelete] = useState<Question | null>(null)

  // 表單狀態
  const [questionTypeId, setQuestionTypeId] = useState("")
  const [content, setContent] = useState("")
  const [options, setOptions] = useState<Record<string, string>>({ A: "", B: "", C: "", D: "" })
  const [answer, setAnswer] = useState("")
  const [explanation, setExplanation] = useState("")
  const [saving, setSaving] = useState(false)

  // 下拉選單狀態
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  // 篩選狀態
  const [filterType, setFilterType] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")

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

    // 取得題型列表
    const { data: typesData } = await supabase
      .from("question_types")
      .select("*")
      .order("created_at")

    if (typesData) {
      setQuestionTypes(typesData as QuestionType[])
      if (typesData.length > 0 && !questionTypeId) {
        setQuestionTypeId(typesData[0].id)
      }
    }

    // 取得題目列表
    await fetchQuestions()
    setLoading(false)
  }, [subjectId, questionTypeId])

  const fetchQuestions = async () => {
    const supabase = createClient()
    const { data: questionsData } = await supabase
      .from("questions")
      .select(`
        *,
        question_types (id, name, label)
      `)
      .eq("subject_id", subjectId)
      .order("created_at", { ascending: false })

    if (questionsData) {
      setQuestions(questionsData as Question[])
    }
  }

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const resetForm = () => {
    setQuestionTypeId(questionTypes[0]?.id || "")
    setContent("")
    setOptions({ A: "", B: "", C: "", D: "" })
    setAnswer("")
    setExplanation("")
    setEditingQuestion(null)
  }

  const openCreateDialog = () => {
    resetForm()
    setDialogOpen(true)
  }

  const openEditDialog = (question: Question) => {
    setEditingQuestion(question)
    setQuestionTypeId(question.question_type_id)
    setContent(question.content)
    setOptions(question.options || { A: "", B: "", C: "", D: "" })
    // answer 可能是 { correct: "A" } 或 { correct: true } 或 { text: "..." }
    const ans = question.answer as Record<string, unknown> | null
    if (ans?.correct !== undefined) {
      setAnswer(String(ans.correct))
    } else if (ans?.text !== undefined) {
      setAnswer(String(ans.text))
    } else {
      setAnswer("")
    }
    setExplanation(question.explanation || "")
    setDialogOpen(true)
    setOpenMenuId(null)
  }

  const handleSave = async () => {
    if (!content.trim()) {
      alert("請輸入題目內容")
      return
    }

    if (!answer.trim()) {
      alert("請輸入正確答案")
      return
    }

    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSaving(false)
      return
    }

    // 根據題型決定 answer 格式
    const selectedType = questionTypes.find((t) => t.id === questionTypeId)
    let answerJson: Record<string, unknown>

    if (selectedType?.name === "true_false") {
      answerJson = { correct: answer.toLowerCase() === "true" || answer === "O" || answer === "是" }
    } else if (selectedType?.name === "single_choice" || selectedType?.name === "multiple_choice") {
      answerJson = { correct: answer }
    } else {
      answerJson = { text: answer }
    }

    // 過濾空選項
    const filteredOptions: Record<string, string> = {}
    Object.entries(options).forEach(([key, value]) => {
      if (value.trim()) {
        filteredOptions[key] = value.trim()
      }
    })

    const questionData = {
      question_type_id: questionTypeId,
      content: content.trim(),
      options: Object.keys(filteredOptions).length > 0 ? filteredOptions : null,
      answer: answerJson,
      explanation: explanation.trim() || null,
    }

    if (editingQuestion) {
      await (supabase.from("questions") as any)
        .update(questionData)
        .eq("id", editingQuestion.id)
    } else {
      await (supabase.from("questions") as any)
        .insert({
          ...questionData,
          user_id: user.id,
          subject_id: subjectId,
          attempt_count: 0,
          consecutive_correct: 0,
          wrong_count: 0,
        })
    }

    setSaving(false)
    setDialogOpen(false)
    resetForm()
    fetchQuestions()
  }

  const handleDelete = async () => {
    if (!questionToDelete) return

    const supabase = createClient()
    await (supabase.from("questions") as any)
      .delete()
      .eq("id", questionToDelete.id)

    setDeleteDialogOpen(false)
    setQuestionToDelete(null)
    fetchQuestions()
  }

  const confirmDelete = (question: Question) => {
    setQuestionToDelete(question)
    setDeleteDialogOpen(true)
    setOpenMenuId(null)
  }

  // 篩選題目
  const filteredQuestions = questions.filter((q) => {
    if (filterType !== "all" && q.question_type_id !== filterType) return false
    const attemptCount = q.attempt_count || 0
    const consecutiveCorrect = q.consecutive_correct || 0
    if (filterStatus === "mistake" && (consecutiveCorrect >= 3 || attemptCount === 0)) return false
    if (filterStatus === "mastered" && consecutiveCorrect < 3) return false
    if (filterStatus === "new" && attemptCount > 0) return false
    return true
  })

  const getStatusBadge = (question: Question) => {
    const attemptCount = question.attempt_count || 0
    const consecutiveCorrect = question.consecutive_correct || 0

    if (attemptCount === 0) {
      return (
        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full flex items-center gap-1">
          <HelpCircle className="w-3 h-3" />
          未練習
        </span>
      )
    }
    if (consecutiveCorrect >= 3) {
      return (
        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          已熟練
        </span>
      )
    }
    return (
      <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full flex items-center gap-1">
        <XCircle className="w-3 h-3" />
        待加強
      </span>
    )
  }

  const getTypeLabel = (question: Question) => {
    const type = question.question_types as QuestionType | undefined
    return type?.label || "未知題型"
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
        <Link href="/dashboard/practice" className="text-indigo-600 hover:underline mt-2 inline-block">
          返回題庫
        </Link>
      </div>
    )
  }

  const selectedType = questionTypes.find((t) => t.id === questionTypeId)
  const isChoiceType = selectedType?.name === "single_choice" || selectedType?.name === "multiple_choice"
  const isTrueFalseType = selectedType?.name === "true_false"

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div>
        <Link
          href="/dashboard/practice"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600 mb-2"
        >
          <ChevronLeft className="w-4 h-4" />
          返回題庫
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-indigo-100">
              <FolderOpen className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{subject.title}</h1>
              <p className="text-gray-600 text-sm">{questions.length} 道題目</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={openCreateDialog} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              新增題目
            </Button>
          </div>
        </div>
      </div>

      {/* 篩選工具列 */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">所有題型</option>
          {questionTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.label}
            </option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">所有狀態</option>
          <option value="new">未練習</option>
          <option value="mistake">待加強</option>
          <option value="mastered">已熟練</option>
        </select>

        <span className="text-sm text-gray-500">
          顯示 {filteredQuestions.length} / {questions.length} 題
        </span>

        {questions.length > 0 && (
          <Link
            href={`/dashboard/practice/session?subject=${subjectId}`}
            className="ml-auto"
          >
            <Button size="sm" className="bg-green-600 hover:bg-green-700">
              <Play className="w-4 h-4 mr-2" />
              開始練習
            </Button>
          </Link>
        )}
      </div>

      {/* 題目列表 */}
      {questions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <FileQuestion className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 mb-4">還沒有任何題目</p>
            <Button onClick={openCreateDialog} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              新增題目
            </Button>
          </CardContent>
        </Card>
      ) : filteredQuestions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <p className="text-gray-500">沒有符合篩選條件的題目</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredQuestions.map((question, index) => (
            <Card key={question.id} className="relative group">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* 序號 */}
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-600 flex-shrink-0">
                    {index + 1}
                  </div>

                  {/* 內容 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded">
                        {getTypeLabel(question)}
                      </span>
                      {getStatusBadge(question)}
                    </div>
                    <p className="text-gray-800 line-clamp-2">{question.content}</p>
                    {(question.attempt_count || 0) > 0 && (
                      <p className="text-xs text-gray-400 mt-2">
                        練習 {question.attempt_count} 次 · 連續正確 {question.consecutive_correct || 0} 次
                      </p>
                    )}
                  </div>

                  {/* 更多選單 */}
                  <div className="relative">
                    <button
                      onClick={() => setOpenMenuId(openMenuId === question.id ? null : question.id)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {openMenuId === question.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setOpenMenuId(null)}
                        />
                        <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                          <button
                            onClick={() => openEditDialog(question)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Pencil className="w-4 h-4" />
                            編輯
                          </button>
                          <button
                            onClick={() => confirmDelete(question)}
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
      )}

      {/* 新增/編輯題目 Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingQuestion ? "編輯題目" : "新增題目"}
            </DialogTitle>
            <DialogDescription>
              {editingQuestion ? "修改題目內容" : "建立一道新題目"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>題型</Label>
              <Select value={questionTypeId} onValueChange={setQuestionTypeId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {questionTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>題目內容</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="輸入題目..."
                rows={3}
              />
            </div>

            {isChoiceType && (
              <div className="space-y-2">
                <Label>選項</Label>
                {["A", "B", "C", "D"].map((key) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-sm">
                      {key}
                    </span>
                    <Input
                      value={options[key] || ""}
                      onChange={(e) => setOptions({ ...options, [key]: e.target.value })}
                      placeholder={`選項 ${key}`}
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <Label>正確答案</Label>
              {isChoiceType ? (
                <Select value={answer} onValueChange={setAnswer}>
                  <SelectTrigger>
                    <SelectValue placeholder="選擇正確答案" />
                  </SelectTrigger>
                  <SelectContent>
                    {["A", "B", "C", "D"].filter((key) => options[key]?.trim()).map((key) => (
                      <SelectItem key={key} value={key}>
                        {key}. {options[key]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : isTrueFalseType ? (
                <Select value={answer} onValueChange={setAnswer}>
                  <SelectTrigger>
                    <SelectValue placeholder="選擇正確答案" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">是 (O)</SelectItem>
                    <SelectItem value="false">否 (X)</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="輸入正確答案..."
                />
              )}
            </div>

            <div className="space-y-2">
              <Label>解析（選填）</Label>
              <Textarea
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="輸入題目解析..."
                rows={2}
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
              刪除此題目後將無法復原，練習紀錄也會一併刪除。
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
