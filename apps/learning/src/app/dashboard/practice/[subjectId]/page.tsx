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
  ChevronDown,
  ChevronRight,
  FileQuestion,
  MoreVertical,
  Pencil,
  Trash2,
  Play,
  CheckCircle,
  XCircle,
  HelpCircle,
  Layers,
  LayoutList,
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
  topic_id: string
}

interface TopicWithUnits extends Topic {
  units: Unit[]
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
  unit_id: string | null
  difficulty: string | null
  is_group: boolean | null
  parent_id: string | null
  order: number | null
  question_types?: QuestionType
  units?: {
    id: string
    title: string
    topic_id: string
  } | null
  children?: Question[]
}

const DIFFICULTY_OPTIONS = [
  { value: "basic", label: "基礎", color: "bg-green-100 text-green-700" },
  { value: "advanced", label: "進階", color: "bg-orange-100 text-orange-700" },
]

export default function SubjectQuestionsPage() {
  const params = useParams()
  const subjectId = params.subjectId as string

  const [subject, setSubject] = useState<Subject | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [questionTypes, setQuestionTypes] = useState<QuestionType[]>([])
  const [topicsWithUnits, setTopicsWithUnits] = useState<TopicWithUnits[]>([])
  const [loading, setLoading] = useState(true)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [questionToDelete, setQuestionToDelete] = useState<Question | null>(null)

  // 題組狀態
  const [isGroupMode, setIsGroupMode] = useState(false)
  const [parentQuestion, setParentQuestion] = useState<Question | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  // 表單狀態
  const [questionTypeId, setQuestionTypeId] = useState("")
  const [content, setContent] = useState("")
  const [options, setOptions] = useState<Record<string, string>>({ A: "", B: "", C: "", D: "" })
  const [answer, setAnswer] = useState("")
  const [explanation, setExplanation] = useState("")
  const [saving, setSaving] = useState(false)
  const [selectedTopicId, setSelectedTopicId] = useState<string>("")
  const [selectedUnitId, setSelectedUnitId] = useState<string>("")
  const [difficulty, setDifficulty] = useState<string>("basic")

  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterDifficulty, setFilterDifficulty] = useState<string>("all")
  const [filterTopicId, setFilterTopicId] = useState<string>("all")

  const selectedTopicUnits = topicsWithUnits.find(t => t.id === selectedTopicId)?.units || []

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

    const { data: topicsData } = await supabase
      .from("topics")
      .select("id, title, subject_id")
      .eq("subject_id", subjectId)
      .eq("user_id", user.id)
      .order("order", { ascending: true })

    if (topicsData && topicsData.length > 0) {
      const { data: unitsData } = await supabase
        .from("units")
        .select("id, title, topic_id")
        .in("topic_id", topicsData.map(t => t.id))
        .eq("user_id", user.id)
        .order("order", { ascending: true })

      setTopicsWithUnits(topicsData.map(topic => ({
        ...topic,
        units: (unitsData || []).filter(u => u.topic_id === topic.id)
      })))
    }

    await fetchQuestions()
    setLoading(false)
  }, [subjectId, questionTypeId])

  const fetchQuestions = async () => {
    const supabase = createClient()
    
    const { data: questionsData } = await supabase
      .from("questions")
      .select(`*, question_types (id, name, label), units (id, title, topic_id)`)
      .eq("subject_id", subjectId)
      .is("parent_id", null)
      .order("created_at", { ascending: false })

    if (questionsData) {
      const groupIds = questionsData.filter((q: Question) => q.is_group).map((q: Question) => q.id)
      let childrenMap: Record<string, Question[]> = {}
      
      if (groupIds.length > 0) {
        const { data: childrenData } = await supabase
          .from("questions")
          .select(`*, question_types (id, name, label)`)
          .in("parent_id", groupIds)
          .order("order", { ascending: true })

        if (childrenData) {
          childrenData.forEach((child: Question) => {
            if (child.parent_id) {
              if (!childrenMap[child.parent_id]) childrenMap[child.parent_id] = []
              childrenMap[child.parent_id].push(child)
            }
          })
        }
      }

      setQuestions((questionsData as Question[]).map(q => ({
        ...q,
        children: q.is_group ? (childrenMap[q.id] || []) : undefined
      })))
    }
  }

  useEffect(() => { fetchData() }, [fetchData])

  const resetForm = () => {
    setQuestionTypeId(questionTypes[0]?.id || "")
    setContent("")
    setOptions({ A: "", B: "", C: "", D: "" })
    setAnswer("")
    setExplanation("")
    setSelectedTopicId("")
    setSelectedUnitId("")
    setDifficulty("basic")
    setEditingQuestion(null)
    setIsGroupMode(false)
    setParentQuestion(null)
  }

  const openCreateDialog = () => { resetForm(); setDialogOpen(true) }
  
  const openCreateGroupDialog = () => {
    resetForm()
    setIsGroupMode(true)
    setDialogOpen(true)
  }

  const openAddChildDialog = (parent: Question) => {
    resetForm()
    setParentQuestion(parent)
    if (parent.unit_id && parent.units) {
      setSelectedTopicId(parent.units.topic_id)
      setSelectedUnitId(parent.unit_id)
    }
    setDifficulty(parent.difficulty || "basic")
    setDialogOpen(true)
  }

  const openEditDialog = (question: Question) => {
    setEditingQuestion(question)
    setIsGroupMode(question.is_group || false)
    setParentQuestion(null)
    setQuestionTypeId(question.question_type_id)
    setContent(question.content)
    setOptions(question.options || { A: "", B: "", C: "", D: "" })
    
    const ans = question.answer as Record<string, unknown> | null
    if (ans?.correct !== undefined) setAnswer(String(ans.correct))
    else if (ans?.text !== undefined) setAnswer(String(ans.text))
    else setAnswer("")
    
    setExplanation(question.explanation || "")
    setDifficulty(question.difficulty || "basic")
    
    if (question.units) {
      setSelectedTopicId(question.units.topic_id)
      setSelectedUnitId(question.unit_id || "")
    } else {
      setSelectedTopicId("")
      setSelectedUnitId("")
    }
    
    setDialogOpen(true)
    setOpenMenuId(null)
  }

  const handleTopicChange = (topicId: string) => {
    setSelectedTopicId(topicId === "__none__" ? "" : topicId)
    setSelectedUnitId("")
  }

  const handleSave = async () => {
    if (!content.trim()) {
      alert(isGroupMode ? "請輸入題組說明" : "請輸入題目內容")
      return
    }
    if (!isGroupMode && !answer.trim()) {
      alert("請輸入正確答案")
      return
    }

    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    let answerJson: Record<string, unknown> | null = null
    if (!isGroupMode) {
      const selectedType = questionTypes.find((t) => t.id === questionTypeId)
      if (selectedType?.name === "true_false") {
        answerJson = { correct: answer.toLowerCase() === "true" || answer === "O" || answer === "是" }
      } else if (selectedType?.name === "single_choice" || selectedType?.name === "multiple_choice") {
        answerJson = { correct: answer }
      } else {
        answerJson = { text: answer }
      }
    }

    const filteredOptions: Record<string, string> = {}
    Object.entries(options).forEach(([key, value]) => {
      if (value.trim()) filteredOptions[key] = value.trim()
    })

    let orderValue = 0
    if (parentQuestion && !editingQuestion) {
      const existingChildren = parentQuestion.children || []
      orderValue = existingChildren.reduce((max, child) => Math.max(max, (child.order || 0) + 1), 0)
    }

    const questionData: Record<string, unknown> = {
      question_type_id: questionTypeId,
      content: content.trim(),
      options: Object.keys(filteredOptions).length > 0 ? filteredOptions : null,
      answer: answerJson,
      explanation: explanation.trim() || null,
      unit_id: selectedUnitId || null,
      difficulty: difficulty,
      is_group: isGroupMode,
    }

    if (parentQuestion) {
      questionData.parent_id = parentQuestion.id
      questionData.order = editingQuestion?.order ?? orderValue
    }

    if (editingQuestion) {
      await (supabase.from("questions") as any).update(questionData).eq("id", editingQuestion.id)
    } else {
      await (supabase.from("questions") as any).insert({
        ...questionData,
        user_id: user.id,
        subject_id: subjectId,
      })
    }

    setSaving(false)
    setDialogOpen(false)
    resetForm()
    fetchQuestions()
  }

  const confirmDelete = (question: Question) => {
    setQuestionToDelete(question)
    setDeleteDialogOpen(true)
    setOpenMenuId(null)
  }

  const handleDelete = async () => {
    if (!questionToDelete) return
    const supabase = createClient()
    await supabase.from("questions").delete().eq("id", questionToDelete.id)
    setDeleteDialogOpen(false)
    setQuestionToDelete(null)
    fetchQuestions()
  }

  const toggleGroupExpand = (questionId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(questionId)) newSet.delete(questionId)
      else newSet.add(questionId)
      return newSet
    })
  }

  const getStatusBadge = (question: Question) => {
    if (question.is_group) return null
    const attemptCount = question.attempt_count || 0
    const consecutiveCorrect = question.consecutive_correct || 0

    if (attemptCount === 0) {
      return (
        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded flex items-center gap-1">
          <HelpCircle className="w-3 h-3" />未練習
        </span>
      )
    }
    if (consecutiveCorrect >= 3) {
      return (
        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />已熟練
        </span>
      )
    }
    return (
      <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded flex items-center gap-1">
        <XCircle className="w-3 h-3" />待加強
      </span>
    )
  }

  const getDifficultyBadge = (question: Question) => {
    const diff = question.difficulty || "basic"
    const option = DIFFICULTY_OPTIONS.find(o => o.value === diff)
    return <span className={`text-xs px-2 py-0.5 rounded ${option?.color}`}>{option?.label}</span>
  }

  const getUnitBadge = (question: Question) => {
    if (!question.units) return null
    return (
      <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded flex items-center gap-1">
        <Layers className="w-3 h-3" />{question.units.title}
      </span>
    )
  }

  const filteredQuestions = questions.filter((q) => {
    if (filterType !== "all" && q.question_type_id !== filterType) return false
    if (filterStatus !== "all") {
      const attemptCount = q.attempt_count || 0
      const consecutiveCorrect = q.consecutive_correct || 0
      if (filterStatus === "new" && attemptCount > 0) return false
      if (filterStatus === "mistake" && (attemptCount === 0 || consecutiveCorrect >= 3)) return false
      if (filterStatus === "mastered" && consecutiveCorrect < 3) return false
    }
    if (filterDifficulty !== "all" && q.difficulty !== filterDifficulty) return false
    if (filterTopicId !== "all" && (!q.units || q.units.topic_id !== filterTopicId)) return false
    return true
  })

  const selectedType = questionTypes.find((t) => t.id === questionTypeId)
  const isChoiceType = selectedType?.name === "single_choice" || selectedType?.name === "multiple_choice"
  const isTrueFalseType = selectedType?.name === "true_false"

  const totalQuestionCount = questions.reduce((count, q) => {
    return count + (q.is_group ? (q.children?.length || 0) : 1)
  }, 0)

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
        <div className="flex items-center gap-4">
          <Link href="/dashboard/practice" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{subject?.title || "題庫"}</h1>
            <p className="text-gray-600 mt-1">{subject?.description || "管理題目"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={openCreateGroupDialog}>
            <LayoutList className="w-4 h-4 mr-2" />新增題組
          </Button>
          <Button variant="outline" onClick={openCreateDialog}>
            <Plus className="w-4 h-4 mr-2" />新增題目
          </Button>
        </div>
      </div>

      {/* 篩選列 */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-gray-50 rounded-lg">
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="text-sm border rounded-md px-3 py-1.5 bg-white">
          <option value="all">所有題型</option>
          {questionTypes.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="text-sm border rounded-md px-3 py-1.5 bg-white">
          <option value="all">所有狀態</option>
          <option value="new">未練習</option>
          <option value="mistake">待加強</option>
          <option value="mastered">已熟練</option>
        </select>
        <select value={filterDifficulty} onChange={(e) => setFilterDifficulty(e.target.value)} className="text-sm border rounded-md px-3 py-1.5 bg-white">
          <option value="all">所有難度</option>
          <option value="basic">基礎</option>
          <option value="advanced">進階</option>
        </select>
        {topicsWithUnits.length > 0 && (
          <select value={filterTopicId} onChange={(e) => setFilterTopicId(e.target.value)} className="text-sm border rounded-md px-3 py-1.5 bg-white">
            <option value="all">所有主題</option>
            {topicsWithUnits.map((topic) => <option key={topic.id} value={topic.id}>{topic.title}</option>)}
          </select>
        )}
        <span className="text-sm text-gray-500">共 {totalQuestionCount} 題</span>
        {totalQuestionCount > 0 && (
          <Link href={`/dashboard/practice/session?subject=${subjectId}`} className="ml-auto">
            <Button size="sm" className="bg-green-600 hover:bg-green-700">
              <Play className="w-4 h-4 mr-2" />開始練習
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
            <div className="flex gap-2">
              <Button onClick={openCreateGroupDialog} variant="outline">
                <LayoutList className="w-4 h-4 mr-2" />新增題組
              </Button>
              <Button onClick={openCreateDialog} variant="outline">
                <Plus className="w-4 h-4 mr-2" />新增題目
              </Button>
            </div>
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
            <div key={question.id}>
              <Card className={`relative group ${question.is_group ? 'border-l-4 border-l-purple-400' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {question.is_group ? (
                      <button
                        onClick={() => toggleGroupExpand(question.id)}
                        className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 flex-shrink-0 hover:bg-purple-200"
                      >
                        {expandedGroups.has(question.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    ) : (
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-600 flex-shrink-0">
                        {index + 1}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {question.is_group ? (
                          <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded flex items-center gap-1">
                            <LayoutList className="w-3 h-3" />題組 ({question.children?.length || 0} 題)
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded">
                            {question.question_types?.label || "未知"}
                          </span>
                        )}
                        {getDifficultyBadge(question)}
                        {getUnitBadge(question)}
                        {getStatusBadge(question)}
                      </div>
                      <p className="text-gray-800 line-clamp-2">{question.content}</p>
                      {!question.is_group && (question.attempt_count || 0) > 0 && (
                        <p className="text-xs text-gray-400 mt-2">
                          練習 {question.attempt_count} 次 · 連續正確 {question.consecutive_correct || 0} 次
                        </p>
                      )}
                    </div>

                    <div className="relative">
                      <button
                        onClick={() => setOpenMenuId(openMenuId === question.id ? null : question.id)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {openMenuId === question.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                          <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                            {question.is_group && (
                              <button onClick={() => { setOpenMenuId(null); openAddChildDialog(question) }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-purple-600 hover:bg-purple-50">
                                <Plus className="w-4 h-4" />新增子題
                              </button>
                            )}
                            <button onClick={() => openEditDialog(question)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                              <Pencil className="w-4 h-4" />編輯
                            </button>
                            <button onClick={() => confirmDelete(question)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                              <Trash2 className="w-4 h-4" />刪除
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 子題列表 */}
              {question.is_group && expandedGroups.has(question.id) && (
                <div className="ml-8 mt-2 space-y-2">
                  {question.children && question.children.length > 0 ? (
                    question.children.map((child, childIndex) => (
                      <Card key={child.id} className="border-l-2 border-l-purple-200">
                        <CardContent className="p-3">
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-purple-50 rounded-full flex items-center justify-center text-xs font-medium text-purple-600 flex-shrink-0">
                              {childIndex + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded">
                                  {child.question_types?.label || "未知"}
                                </span>
                                {getStatusBadge(child)}
                              </div>
                              <p className="text-sm text-gray-800 line-clamp-2">{child.content}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => openEditDialog(child)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button onClick={() => confirmDelete(child)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-4 text-sm text-gray-400">
                      尚無子題，<button onClick={() => openAddChildDialog(question)} className="text-purple-600 hover:underline">點此新增</button>
                    </div>
                  )}
                  {question.children && question.children.length > 0 && (
                    <button onClick={() => openAddChildDialog(question)} className="w-full py-2 text-sm text-purple-600 hover:bg-purple-50 rounded-lg border border-dashed border-purple-200 flex items-center justify-center gap-1">
                      <Plus className="w-4 h-4" />新增子題
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingQuestion ? (editingQuestion.is_group ? "編輯題組" : "編輯題目") : parentQuestion ? "新增子題" : isGroupMode ? "新增題組" : "新增題目"}
            </DialogTitle>
            <DialogDescription>
              {isGroupMode ? "題組是相關題目的容器，如閱讀測驗" : parentQuestion ? `在「${parentQuestion.content.slice(0, 20)}...」下新增子題` : "建立新題目"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {!parentQuestion && (
              <div className="p-4 bg-gray-50 rounded-lg space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Layers className="w-4 h-4" />題目歸屬（選填）
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-600">主題</Label>
                    <Select value={selectedTopicId || "__none__"} onValueChange={handleTopicChange}>
                      <SelectTrigger><SelectValue placeholder="選擇主題" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">不指定</SelectItem>
                        {topicsWithUnits.map((topic) => <SelectItem key={topic.id} value={topic.id}>{topic.title}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-600">單元</Label>
                    <Select value={selectedUnitId || "__none__"} onValueChange={(val) => setSelectedUnitId(val === "__none__" ? "" : val)} disabled={!selectedTopicId}>
                      <SelectTrigger><SelectValue placeholder={selectedTopicId ? "選擇單元" : "請先選擇主題"} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">不指定</SelectItem>
                        {selectedTopicUnits.map((unit) => <SelectItem key={unit.id} value={unit.id}>{unit.title}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-600">難易度</Label>
                  <div className="flex gap-3">
                    {DIFFICULTY_OPTIONS.map((option) => (
                      <button key={option.value} type="button" onClick={() => setDifficulty(option.value)}
                        className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${difficulty === option.value ? (option.value === "basic" ? "border-green-500 bg-green-50" : "border-orange-500 bg-orange-50") : "border-gray-200 hover:border-gray-300"}`}>
                        <span className={`text-sm font-medium ${difficulty === option.value ? (option.value === "basic" ? "text-green-700" : "text-orange-700") : "text-gray-600"}`}>{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {parentQuestion && <div className="p-3 bg-purple-50 rounded-lg text-sm text-purple-700">子題繼承母題的單元和難易度</div>}

            {!isGroupMode && (
              <div className="space-y-2">
                <Label>題型</Label>
                <Select value={questionTypeId} onValueChange={setQuestionTypeId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{questionTypes.map((type) => <SelectItem key={type.id} value={type.id}>{type.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>{isGroupMode ? "題組說明" : "題目內容"}</Label>
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder={isGroupMode ? "輸入題組說明..." : "輸入題目..."} rows={isGroupMode ? 6 : 3} />
            </div>

            {!isGroupMode && isChoiceType && (
              <div className="space-y-2">
                <Label>選項</Label>
                {["A", "B", "C", "D"].map((key) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-sm">{key}</span>
                    <Input value={options[key] || ""} onChange={(e) => setOptions({ ...options, [key]: e.target.value })} placeholder={`選項 ${key}`} />
                  </div>
                ))}
              </div>
            )}

            {!isGroupMode && (
              <div className="space-y-2">
                <Label>正確答案</Label>
                {isChoiceType ? (
                  <Select value={answer} onValueChange={setAnswer}>
                    <SelectTrigger><SelectValue placeholder="選擇正確答案" /></SelectTrigger>
                    <SelectContent>{["A", "B", "C", "D"].filter((key) => options[key]?.trim()).map((key) => <SelectItem key={key} value={key}>{key}. {options[key]}</SelectItem>)}</SelectContent>
                  </Select>
                ) : isTrueFalseType ? (
                  <Select value={answer} onValueChange={setAnswer}>
                    <SelectTrigger><SelectValue placeholder="選擇正確答案" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">是 (O)</SelectItem>
                      <SelectItem value="false">否 (X)</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="輸入正確答案..." />
                )}
              </div>
            )}

            {!isGroupMode && (
              <div className="space-y-2">
                <Label>解析（選填）</Label>
                <Textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} placeholder="輸入解析..." rows={2} />
              </div>
            )}

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
            <AlertDialogDescription>
              {questionToDelete?.is_group ? "刪除題組將同時刪除所有子題" : "刪除後無法復原"}
            </AlertDialogDescription>
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
