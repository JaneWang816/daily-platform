// apps/learning/src/app/dashboard/practice/[subjectId]/page.tsx
"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { ExamGeneratorDialog } from "@/components/questions/exam-generator-dialog"
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
  FileText,
  History,
  MoreVertical,
  Pencil,
  Trash2,
  Play,
  CheckCircle,
  XCircle,
  HelpCircle,
  Layers,
  LayoutList,
  Download,
  Upload,
  FileJson,
  PlusCircle,
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
  units?: { id: string; title: string; topic_id: string } | null
  children?: Question[]
}

// 匯出格式
interface ExportQuestion {
  content: string
  type: string
  options: Record<string, string> | null
  answer: Record<string, unknown> | null
  explanation: string | null
  difficulty: string
  is_group: boolean
  children?: ExportQuestion[]
}

interface ExportData {
  version: string
  exported_at: string
  subject: string
  questions: ExportQuestion[]
}

// CSV 匯入的題目格式
interface CsvQuestion {
  type: string
  content: string
  optionA?: string
  optionB?: string
  optionC?: string
  optionD?: string
  answer: string
  explanation?: string
  difficulty?: string
}

const DIFFICULTY_OPTIONS = [
  { value: "basic", label: "基礎", color: "bg-green-100 text-green-700" },
  { value: "advanced", label: "進階", color: "bg-orange-100 text-orange-700" },
]

export default function SubjectQuestionsPage() {
  const params = useParams()
  const subjectId = params.subjectId as string
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [subject, setSubject] = useState<Subject | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [questionTypes, setQuestionTypes] = useState<QuestionType[]>([])
  const [topicsWithUnits, setTopicsWithUnits] = useState<TopicWithUnits[]>([])
  const [loading, setLoading] = useState(true)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [questionToDelete, setQuestionToDelete] = useState<Question | null>(null)

  // 匯入匯出 Dialog
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importPreview, setImportPreview] = useState<ExportData | null>(null)
  const [importTopicId, setImportTopicId] = useState("")
  const [importUnitId, setImportUnitId] = useState("")

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

  // ✨ 連續新增模式
  const [continueAdding, setContinueAdding] = useState(false)

  // 新增主題/單元 Dialog
  const [newTopicDialogOpen, setNewTopicDialogOpen] = useState(false)
  const [newUnitDialogOpen, setNewUnitDialogOpen] = useState(false)
  const [newItemTitle, setNewItemTitle] = useState("")
  const [savingNewItem, setSavingNewItem] = useState(false)

  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterDifficulty, setFilterDifficulty] = useState<string>("all")
  const [filterTopicId, setFilterTopicId] = useState<string>("all")

  const [examDialogOpen, setExamDialogOpen] = useState(false)

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
          (childrenData as Question[]).forEach(child => {
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
    // 保留主題和單元選擇（方便連續新增）
    setDifficulty("basic")
    setEditingQuestion(null)
    setIsGroupMode(false)
    setParentQuestion(null)
  }

  const openCreateDialog = () => {
    resetForm()
    setDialogOpen(true)
  }

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

  // ✨ 新增主題
  const handleAddTopic = async () => {
    if (!newItemTitle.trim()) return
    
    setSavingNewItem(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSavingNewItem(false); return }

    const { data: maxOrderData } = await supabase
      .from("topics")
      .select("order")
      .eq("subject_id", subjectId)
      .order("order", { ascending: false })
      .limit(1)
      .maybeSingle()

    const newOrder = ((maxOrderData as any)?.order ?? -1) + 1

    const { data: newTopic } = await (supabase.from("topics") as any)
      .insert({
        user_id: user.id,
        subject_id: subjectId,
        title: newItemTitle.trim(),
        order: newOrder,
      })
      .select()
      .single()

    if (newTopic) {
      setTopicsWithUnits(prev => [...prev, { ...newTopic, units: [] }])
      setSelectedTopicId(newTopic.id)
    }

    setSavingNewItem(false)
    setNewTopicDialogOpen(false)
    setNewItemTitle("")
  }

  // ✨ 新增單元
  const handleAddUnit = async () => {
    if (!newItemTitle.trim() || !selectedTopicId) return
    
    setSavingNewItem(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSavingNewItem(false); return }

    const { data: maxOrderData } = await supabase
      .from("units")
      .select("order")
      .eq("topic_id", selectedTopicId)
      .order("order", { ascending: false })
      .limit(1)
      .maybeSingle()

    const newOrder = ((maxOrderData as any)?.order ?? -1) + 1

    const { data: newUnit } = await (supabase.from("units") as any)
      .insert({
        user_id: user.id,
        topic_id: selectedTopicId,
        title: newItemTitle.trim(),
        order: newOrder,
      })
      .select()
      .single()

    if (newUnit) {
      setTopicsWithUnits(prev => prev.map(t => 
        t.id === selectedTopicId 
          ? { ...t, units: [...t.units, newUnit] }
          : t
      ))
      setSelectedUnitId(newUnit.id)
    }

    setSavingNewItem(false)
    setNewUnitDialogOpen(false)
    setNewItemTitle("")
  }

  const handleSave = async (andContinue: boolean = false) => {
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
    
    // ✨ 連續新增：清空表單但不關閉 Dialog
    if (andContinue && !editingQuestion) {
      setContent("")
      setOptions({ A: "", B: "", C: "", D: "" })
      setAnswer("")
      setExplanation("")
      // 保留：主題、單元、難易度、題型
    } else {
      setDialogOpen(false)
      resetForm()
    }
    
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

  // ✨ 匯出功能（JSON）
  const handleExportJSON = () => {
    // 根據選擇的主題/單元過濾題目
    const filteredQuestions = questions.filter(q => {
      if (exportTopicId && q.units?.topic_id !== exportTopicId) return false
      if (exportUnitId && q.unit_id !== exportUnitId) return false
      return true
    })

    const exportQuestions: ExportQuestion[] = filteredQuestions.map(q => ({
      content: q.content,
      type: q.question_types?.name || "short_answer",
      options: q.options,
      answer: q.answer,
      explanation: q.explanation,
      difficulty: q.difficulty || "basic",
      is_group: q.is_group || false,
      children: q.children?.map(child => ({
        content: child.content,
        type: child.question_types?.name || "short_answer",
        options: child.options,
        answer: child.answer,
        explanation: child.explanation,
        difficulty: child.difficulty || "basic",
        is_group: false,
      }))
    }))

    const exportData: ExportData = {
      version: "1.0",
      exported_at: new Date().toISOString(),
      subject: subject?.title || "",
      questions: exportQuestions,
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${subject?.title || "questions"}_${new Date().toISOString().split("T")[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ✨ 匯出功能（CSV）
  const handleExportCSV = () => {
    // 根據選擇的主題/單元過濾題目
    const filteredQuestions = questions.filter(q => {
      if (exportTopicId && q.units?.topic_id !== exportTopicId) return false
      if (exportUnitId && q.unit_id !== exportUnitId) return false
      return true
    })

    // 展開所有題目（包含題組子題）
    const allQuestions: Question[] = []
    filteredQuestions.forEach(q => {
      if (q.is_group && q.children) {
        q.children.forEach(child => allQuestions.push(child))
      } else if (!q.is_group) {
        allQuestions.push(q)
      }
    })

    // CSV 標題
    const headers = ['題型', '題目', '選項A', '選項B', '選項C', '選項D', '答案', '解析', '難易度']
    
    // CSV 內容
    const rows = allQuestions.map(q => {
      const typeName = q.question_types?.name || 'short_answer'
      const typeLabel = typeName === 'single_choice' ? '選擇題' 
        : typeName === 'true_false' ? '是非題' 
        : typeName === 'fill_blank' ? '填充題'
        : '簡答題'
      
      // 取得答案文字
      let answerText = ''
      const ans = q.answer as Record<string, unknown> | null
      if (ans?.correct !== undefined) {
        if (typeof ans.correct === 'boolean') {
          answerText = ans.correct ? 'O' : 'X'
        } else {
          answerText = String(ans.correct)
        }
      } else if (ans?.text !== undefined) {
        answerText = String(ans.text)
      }

      // 處理逗號和換行
      const escape = (str: string | null | undefined) => {
        if (!str) return ''
        if (str.includes(',') || str.includes('\n') || str.includes('"')) {
          return `"${str.replace(/"/g, '""')}"`
        }
        return str
      }

      return [
        typeLabel,
        escape(q.content),
        escape(q.options?.A),
        escape(q.options?.B),
        escape(q.options?.C),
        escape(q.options?.D),
        escape(answerText),
        escape(q.explanation),
        q.difficulty === 'advanced' ? '進階' : '基礎'
      ].join(',')
    })

    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: "text/csv;charset=utf-8" }) // BOM for Excel
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${subject?.title || "questions"}_${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ✨ 下載 CSV 範本
  const handleDownloadTemplate = () => {
    const template = `題型,題目,選項A,選項B,選項C,選項D,答案,解析,難易度
選擇題,1+1=?,1,2,3,4,B,基本加法,基礎
是非題,地球是圓的,,,,,O,,基礎
填充題,台灣的首都是?,,,,,台北,,基礎
選擇題,下列何者為質數?,4,6,7,9,C,質數只能被1和自己整除,進階`

    const blob = new Blob(['\ufeff' + template], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "題目範本.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  // 匯出選單狀態
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [exportTopicId, setExportTopicId] = useState("")
  const [exportUnitId, setExportUnitId] = useState("")
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("csv")

  // ✨ 解析 CSV 內容（支援 UTF-8 和 Big5 編碼，即使標題亂碼也能根據位置解析）
  const parseCSV = (text: string): ExportQuestion[] => {
    const lines = text.split(/\r?\n/).filter(line => line.trim())
    if (lines.length < 2) return []

    const questions: ExportQuestion[] = []
    
    // 第一行是標題，嘗試識別欄位
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    
    // 偵測欄位索引（支援中文和英文標題）
    const findIndex = (...keys: string[]) => {
      for (const key of keys) {
        const idx = headers.findIndex(h => h.includes(key))
        if (idx >= 0) return idx
      }
      return -1
    }

    // 嘗試找出各欄位的索引
    let typeIdx = findIndex('題型', 'type', '類型')
    let contentIdx = findIndex('題目', 'content', '內容', '問題')
    let optAIdx = findIndex('選項a', 'optiona', '選項 a')
    let optBIdx = findIndex('選項b', 'optionb', '選項 b') 
    let optCIdx = findIndex('選項c', 'optionc', '選項 c')
    let optDIdx = findIndex('選項d', 'optiond', '選項 d')
    let answerIdx = findIndex('答案', 'answer', '正確答案')
    let explanationIdx = findIndex('解析', 'explanation', '說明')
    let difficultyIdx = findIndex('難易度', 'difficulty', '難度')

    // 如果無法識別標題（可能是亂碼），使用預設位置
    // 標準格式：題型,題目,選項A,選項B,選項C,選項D,答案,解析,難易度
    const usePositionFallback = typeIdx < 0 && contentIdx < 0 && answerIdx < 0
    if (usePositionFallback) {
      console.log('Using position-based parsing (headers not recognized)')
      typeIdx = 0
      contentIdx = 1
      optAIdx = 2
      optBIdx = 3
      optCIdx = 4
      optDIdx = 5
      answerIdx = 6
      explanationIdx = 7
      difficultyIdx = 8
    }

    // 確保至少有題目和答案欄位
    const actualContentIdx = contentIdx >= 0 ? contentIdx : 1
    const actualAnswerIdx = answerIdx >= 0 ? answerIdx : 6

    for (let i = 1; i < lines.length; i++) {
      // 處理 CSV 中可能包含逗號的欄位（用引號包裹）
      const values: string[] = []
      let current = ''
      let inQuotes = false
      
      for (const char of lines[i]) {
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      values.push(current.trim())

      if (values.length < 2) continue

      // 取得各欄位值
      const getVal = (idx: number, fallback: number = -1) => {
        const actualIdx = idx >= 0 ? idx : fallback
        return actualIdx >= 0 && actualIdx < values.length ? values[actualIdx] : ''
      }

      const type = getVal(typeIdx, 0)
      const content = getVal(contentIdx, 1)
      const optionA = getVal(optAIdx, 2)
      const optionB = getVal(optBIdx, 3)
      const optionC = getVal(optCIdx, 4)
      const optionD = getVal(optDIdx, 5)
      const answer = getVal(answerIdx, 6)
      const explanation = getVal(explanationIdx, 7)
      const difficulty = getVal(difficultyIdx, 8)

      if (!content) continue

      // 建立選項物件
      let options: Record<string, string> | null = null
      if (optionA || optionB || optionC || optionD) {
        options = {}
        if (optionA) options['A'] = optionA
        if (optionB) options['B'] = optionB
        if (optionC) options['C'] = optionC
        if (optionD) options['D'] = optionD
      }

      // 轉換題型名稱（對應資料庫的 question_types.name）
      let typeName = 'essay' // 預設用問答題
      const normalizedType = type.toLowerCase()
      if (normalizedType.includes('單選') || normalizedType.includes('選擇') || normalizedType === 'single_choice') {
        typeName = 'single_choice'
      } else if (normalizedType.includes('多選') || normalizedType.includes('複選') || normalizedType === 'multiple_choice') {
        typeName = 'multiple_choice'
      } else if (normalizedType.includes('是非') || normalizedType === 'true_false') {
        typeName = 'true_false'
      } else if (normalizedType.includes('填充') || normalizedType.includes('fill')) {
        typeName = 'fill_in_blank'  // ✨ 修正：使用 fill_in_blank
      } else if (normalizedType.includes('問答') || normalizedType.includes('essay')) {
        typeName = 'essay'
      } else if (normalizedType.includes('簡答') || normalizedType === 'short_answer') {
        typeName = 'short_answer'
      }

      // 建立答案物件
      let answerObj: Record<string, unknown> | null = null
      if (answer) {
        if (typeName === 'true_false') {
          const isTrue = ['true', 'o', '是', '對', 'yes', '1', 'ｏ', '○'].includes(answer.toLowerCase())
          answerObj = { correct: isTrue }
        } else if (typeName === 'single_choice' || typeName === 'multiple_choice') {
          answerObj = { correct: answer.toUpperCase() }
        } else {
          // 填充題和簡答題都用 text 格式
          answerObj = { text: answer }
        }
      }

      questions.push({
        content,
        type: typeName,
        options,
        answer: answerObj,
        explanation: explanation || null,
        difficulty: difficulty.includes('進階') || difficulty.toLowerCase() === 'advanced' ? 'advanced' : 'basic',
        is_group: false,
      })
    }

    return questions
  }

  // ✨ 解析 TXT 內容（每題一行，用 Tab 或 | 分隔）
  const parseTXT = (text: string): ExportQuestion[] => {
    const lines = text.split('\n').filter(line => line.trim() && !line.startsWith('#'))
    const questions: ExportQuestion[] = []

    for (const line of lines) {
      // 支援 Tab 或 | 分隔
      const parts = line.includes('\t') ? line.split('\t') : line.split('|')
      if (parts.length < 2) continue

      const content = parts[0]?.trim()
      const answer = parts[1]?.trim()
      const explanation = parts[2]?.trim() || null
      const difficulty = parts[3]?.trim() || 'basic'

      if (!content || !answer) continue

      questions.push({
        content,
        type: 'short_answer',
        options: null,
        answer: { text: answer },
        explanation,
        difficulty: difficulty === '進階' || difficulty === 'advanced' ? 'advanced' : 'basic',
        is_group: false,
      })
    }

    return questions
  }

  // ✨ 匯入功能（支援 JSON, CSV, TXT，自動偵測編碼）
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const fileName = file.name.toLowerCase()

    // 先嘗試用 UTF-8 讀取
    const readerUtf8 = new FileReader()
    readerUtf8.onload = (event) => {
      let text = event.target?.result as string
      
      // 檢查是否有中文字元且沒有亂碼特徵
      const hasValidChinese = /[\u4e00-\u9fff]/.test(text) && !/[\ufffd\x00-\x08]/.test(text)
      
      // 如果 UTF-8 讀取失敗或有亂碼，嘗試其他編碼
      if (!hasValidChinese && fileName.endsWith('.csv')) {
        // 嘗試用 Big5 讀取（透過 ArrayBuffer）
        const readerBinary = new FileReader()
        readerBinary.onload = (evt) => {
          const buffer = evt.target?.result as ArrayBuffer
          try {
            // 嘗試 Big5 解碼
            const decoder = new TextDecoder('big5')
            const big5Text = decoder.decode(buffer)
            if (/[\u4e00-\u9fff]/.test(big5Text)) {
              processImportText(big5Text, fileName)
              return
            }
          } catch (err) {
            console.log('Big5 decode failed, using original text')
          }
          // 如果 Big5 也失敗，用原始文字（根據位置解析）
          processImportText(text, fileName)
        }
        readerBinary.readAsArrayBuffer(file)
        return
      }
      
      processImportText(text, fileName)
    }
    readerUtf8.readAsText(file, 'UTF-8')
    e.target.value = ""
  }

  // 處理匯入的文字內容
  const processImportText = (text: string, fileName: string) => {
    try {
      let questions: ExportQuestion[] = []

      if (fileName.endsWith('.json')) {
        const data = JSON.parse(text) as ExportData
        if (!data.questions || !Array.isArray(data.questions)) {
          alert("無效的 JSON 格式")
          return
        }
        setImportPreview(data)
        setImportDialogOpen(true)
        return
      } else if (fileName.endsWith('.csv')) {
        questions = parseCSV(text)
      } else if (fileName.endsWith('.txt')) {
        questions = parseTXT(text)
      } else {
        alert("不支援的檔案格式，請使用 .json, .csv 或 .txt")
        return
      }

      if (questions.length === 0) {
        alert("沒有找到有效的題目。\n\n請確認：\n1. 用 Google 試算表編輯後下載為 CSV\n2. 或用 Excel「另存為 CSV UTF-8」格式\n\n格式：題型,題目,選項A,選項B,選項C,選項D,答案,解析,難易度")
        return
      }

      const data: ExportData = {
        version: "1.0",
        exported_at: new Date().toISOString(),
        subject: fileName.replace(/\.[^.]+$/, ''),
        questions,
      }
      setImportPreview(data)
      setImportDialogOpen(true)
    } catch (err) {
      console.error("Parse error:", err)
      alert("無法解析檔案")
    }
  }

  const handleImport = async () => {
    if (!importPreview) return

    setImporting(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setImporting(false); return }

    // ✨ 建立更彈性的題型對照表（支援多種名稱）
    const findQuestionTypeId = (typeName: string): string => {
      const normalized = typeName.toLowerCase()
      
      // 嘗試直接匹配
      const directMatch = questionTypes.find(t => t.name === typeName)
      if (directMatch) return directMatch.id

      // 根據關鍵字匹配
      if (normalized.includes('single') || normalized.includes('選擇') || normalized.includes('單選')) {
        const found = questionTypes.find(t => t.name === 'single_choice' || t.label?.includes('單選'))
        if (found) return found.id
      }
      if (normalized.includes('multiple') || normalized.includes('多選') || normalized.includes('複選')) {
        const found = questionTypes.find(t => t.name === 'multiple_choice' || t.label?.includes('複選') || t.label?.includes('多選'))
        if (found) return found.id
      }
      if (normalized.includes('true') || normalized.includes('false') || normalized.includes('是非')) {
        const found = questionTypes.find(t => t.name === 'true_false' || t.label?.includes('是非'))
        if (found) return found.id
      }
      if (normalized.includes('fill') || normalized.includes('填充')) {
        // ✨ 支援 fill_blank 和 fill_in_blank
        const found = questionTypes.find(t => t.name === 'fill_in_blank' || t.name === 'fill_blank' || t.label?.includes('填充'))
        if (found) return found.id
      }
      if (normalized.includes('essay') || normalized.includes('問答')) {
        const found = questionTypes.find(t => t.name === 'essay' || t.label?.includes('問答'))
        if (found) return found.id
      }
      if (normalized.includes('short') || normalized.includes('簡答')) {
        const found = questionTypes.find(t => t.name === 'short_answer' || t.label?.includes('簡答'))
        if (found) return found.id
      }

      // 找不到就用填充題（適合你的四則運算）或問答題
      const fillBlank = questionTypes.find(t => t.name === 'fill_in_blank' || t.name === 'fill_blank')
      if (fillBlank) return fillBlank.id
      
      const essay = questionTypes.find(t => t.name === 'essay')
      if (essay) return essay.id

      // 實在找不到就用第一個
      return questionTypes[0]?.id || ''
    }

    for (const q of importPreview.questions) {
      const questionData: Record<string, unknown> = {
        user_id: user.id,
        subject_id: subjectId,
        question_type_id: findQuestionTypeId(q.type),
        content: q.content,
        options: q.options || null,
        answer: q.answer || null,
        explanation: q.explanation || null,
        difficulty: q.difficulty || 'basic',
        is_group: q.is_group || false,
      }

      // ✨ 只有選了主題/單元才加入
      if (importUnitId) {
        questionData.unit_id = importUnitId
      }

      const { data: inserted, error } = await (supabase.from("questions") as any)
        .insert(questionData)
        .select()
        .single()

      if (error) {
        console.error("Import error:", error)
        continue
      }

      // 匯入子題
      if (q.is_group && q.children && inserted) {
        for (let i = 0; i < q.children.length; i++) {
          const child = q.children[i]
          const childData: Record<string, unknown> = {
            user_id: user.id,
            subject_id: subjectId,
            question_type_id: findQuestionTypeId(child.type),
            content: child.content,
            options: child.options || null,
            answer: child.answer || null,
            explanation: child.explanation || null,
            difficulty: child.difficulty || 'basic',
            is_group: false,
            parent_id: inserted.id,
            order: i,
          }

          // 子題也繼承主題/單元
          if (importUnitId) {
            childData.unit_id = importUnitId
          }

          await (supabase.from("questions") as any).insert(childData)
        }
      }
    }

    setImporting(false)
    setImportDialogOpen(false)
    setImportPreview(null)
    setImportTopicId("")
    setImportUnitId("")
    fetchQuestions()
  }

  const getStatusBadge = (question: Question) => {
    if (question.is_group) return null
    const attemptCount = question.attempt_count || 0
    const consecutiveCorrect = question.consecutive_correct || 0

    if (attemptCount === 0) {
      return <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded flex items-center gap-1"><HelpCircle className="w-3 h-3" />未練習</span>
    }
    if (consecutiveCorrect >= 3) {
      return <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded flex items-center gap-1"><CheckCircle className="w-3 h-3" />已熟練</span>
    }
    return <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded flex items-center gap-1"><XCircle className="w-3 h-3" />待加強</span>
  }

  const getDifficultyBadge = (question: Question) => {
    const diff = question.difficulty || "basic"
    const option = DIFFICULTY_OPTIONS.find(o => o.value === diff)
    return <span className={`text-xs px-2 py-0.5 rounded ${option?.color}`}>{option?.label}</span>
  }

  const getUnitBadge = (question: Question) => {
    if (!question.units) return null
    return <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded flex items-center gap-1"><Layers className="w-3 h-3" />{question.units.title}</span>
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

  const totalQuestionCount = questions.reduce((count, q) => count + (q.is_group ? (q.children?.length || 0) : 1), 0)

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
      <div className="flex flex-col gap-4">
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
        </div>
        
        {/* 操作按鈕列 */}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={openCreateDialog}>
            <Plus className="w-4 h-4 mr-2" />新增題目
          </Button>
          <Button variant="outline" onClick={openCreateGroupDialog}>
            <LayoutList className="w-4 h-4 mr-2" />新增題組
          </Button>
          
          <div className="flex-1" />

                    {/* 試卷按鈕 */}
          <Link href="/dashboard/practice/exams">
            <Button variant="outline" size="sm">
              <History className="w-4 h-4 mr-1" />
              試卷記錄
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExamDialogOpen(true)}
          >
            <FileText className="w-4 h-4 mr-1" />
            產生試卷
          </Button>
          
          {/* ✨ 匯入按鈕 */}
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4 mr-2" />匯入
          </Button>
          <input ref={fileInputRef} type="file" accept=".json,.csv,.txt" className="hidden" onChange={handleFileSelect} />
          
          {/* ✨ 匯出按鈕 */}
          <Button 
            variant="outline" 
            onClick={() => setExportDialogOpen(true)}
            disabled={questions.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />匯出
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
              <Button onClick={openCreateGroupDialog} variant="outline"><LayoutList className="w-4 h-4 mr-2" />新增題組</Button>
              <Button onClick={openCreateDialog} variant="outline"><Plus className="w-4 h-4 mr-2" />新增題目</Button>
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
              <Card className={`relative group ${question.is_group ? 'border-l-4 border-l-purple-400' : ''}`} style={{ zIndex: openMenuId === question.id ? 50 : 1 }}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {question.is_group ? (
                      <button onClick={() => toggleGroupExpand(question.id)} className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 flex-shrink-0 hover:bg-purple-200">
                        {expandedGroups.has(question.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    ) : (
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-600 flex-shrink-0">{index + 1}</div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {question.is_group ? (
                          <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded flex items-center gap-1"><LayoutList className="w-3 h-3" />題組 ({question.children?.length || 0} 題)</span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded">{question.question_types?.label || "未知"}</span>
                        )}
                        {getDifficultyBadge(question)}
                        {getUnitBadge(question)}
                        {getStatusBadge(question)}
                      </div>
                      <p className="text-gray-800 line-clamp-2">{question.content}</p>
                      {!question.is_group && (question.attempt_count || 0) > 0 && (
                        <p className="text-xs text-gray-400 mt-2">練習 {question.attempt_count} 次 · 連續正確 {question.consecutive_correct || 0} 次</p>
                      )}
                    </div>

                    <div className="relative z-10">
                      <button onClick={() => setOpenMenuId(openMenuId === question.id ? null : question.id)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {openMenuId === question.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                          <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
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
                            <div className="w-6 h-6 bg-purple-50 rounded-full flex items-center justify-center text-xs font-medium text-purple-600 flex-shrink-0">{childIndex + 1}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded">{child.question_types?.label || "未知"}</span>
                                {getStatusBadge(child)}
                              </div>
                              <p className="text-sm text-gray-800 line-clamp-2">{child.content}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => openEditDialog(child)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"><Pencil className="w-3 h-3" /></button>
                              <button onClick={() => confirmDelete(child)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-4 text-sm text-gray-400">尚無子題，<button onClick={() => openAddChildDialog(question)} className="text-purple-600 hover:underline">點此新增</button></div>
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

      {/* 新增/編輯 Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingQuestion ? (editingQuestion.is_group ? "編輯題組" : "編輯題目") : parentQuestion ? "新增子題" : isGroupMode ? "新增題組" : "新增題目"}
            </DialogTitle>
            <DialogDescription>
              {isGroupMode ? "題組是相關題目的容器" : parentQuestion ? `在題組下新增子題` : "建立新題目"}
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
                    <div className="flex items-center justify-between">
                      <Label className="text-gray-600">主題</Label>
                      <button onClick={() => setNewTopicDialogOpen(true)} className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                        <PlusCircle className="w-3 h-3" />新增
                      </button>
                    </div>
                    <Select value={selectedTopicId || "__none__"} onValueChange={handleTopicChange}>
                      <SelectTrigger><SelectValue placeholder="選擇主題" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">不指定</SelectItem>
                        {topicsWithUnits.map((topic) => <SelectItem key={topic.id} value={topic.id}>{topic.title}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-gray-600">單元</Label>
                      {selectedTopicId && (
                        <button onClick={() => setNewUnitDialogOpen(true)} className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                          <PlusCircle className="w-3 h-3" />新增
                        </button>
                      )}
                    </div>
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

            {/* ✨ 按鈕區：新增連續新增功能 */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
              {!editingQuestion && (
                <Button variant="outline" onClick={() => handleSave(true)} disabled={saving}>
                  {saving ? "儲存中..." : "儲存並繼續"}
                </Button>
              )}
              <Button onClick={() => handleSave(false)} disabled={saving}>{saving ? "儲存中..." : "儲存"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 新增主題 Dialog */}
      <Dialog open={newTopicDialogOpen} onOpenChange={setNewTopicDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>新增主題</DialogTitle>
            <DialogDescription>在此科目下建立新主題</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>主題名稱</Label>
              <Input value={newItemTitle} onChange={(e) => setNewItemTitle(e.target.value)} placeholder="例如：第一章、Unit 1..." />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setNewTopicDialogOpen(false); setNewItemTitle("") }}>取消</Button>
              <Button onClick={handleAddTopic} disabled={savingNewItem || !newItemTitle.trim()}>{savingNewItem ? "新增中..." : "新增"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 新增單元 Dialog */}
      <Dialog open={newUnitDialogOpen} onOpenChange={setNewUnitDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>新增單元</DialogTitle>
            <DialogDescription>在選定主題下建立新單元</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>單元名稱</Label>
              <Input value={newItemTitle} onChange={(e) => setNewItemTitle(e.target.value)} placeholder="例如：1-1 基本概念..." />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setNewUnitDialogOpen(false); setNewItemTitle("") }}>取消</Button>
              <Button onClick={handleAddUnit} disabled={savingNewItem || !newItemTitle.trim()}>{savingNewItem ? "新增中..." : "新增"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 匯入預覽 Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileJson className="w-5 h-5" />匯入題目</DialogTitle>
            <DialogDescription>確認匯入內容並設定歸屬</DialogDescription>
          </DialogHeader>
          {importPreview && (
            <div className="flex flex-col flex-1 overflow-hidden">
              {/* 可滾動區域 */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                {/* 檔案資訊 */}
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm"><span className="text-gray-500">來源：</span>{importPreview.subject || "未知"}</p>
                  <p className="text-sm"><span className="text-gray-500">題目數量：</span>{importPreview.questions.length} 題</p>
                </div>
                
                {/* ✨ 主題和單元選擇 */}
                <div className="p-4 bg-indigo-50 rounded-lg space-y-3">
                  <p className="text-sm font-medium text-indigo-700">設定題目歸屬（選填）</p>
                  
                  {/* 主題選擇 */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">主題</label>
                    <select
                      value={importTopicId}
                      onChange={(e) => {
                        setImportTopicId(e.target.value)
                        setImportUnitId("") // 切換主題時清空單元
                      }}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">不指定主題</option>
                      {topicsWithUnits.map(topic => (
                        <option key={topic.id} value={topic.id}>{topic.title}</option>
                      ))}
                    </select>
                  </div>

                  {/* 單元選擇（只有選了主題才顯示） */}
                  {importTopicId && (
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">單元</label>
                      <select
                        value={importUnitId}
                        onChange={(e) => setImportUnitId(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">不指定單元</option>
                        {topicsWithUnits.find(t => t.id === importTopicId)?.units.map(unit => (
                          <option key={unit.id} value={unit.id}>{unit.title}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* 題型與難度統計 */}
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    const typeCounts: Record<string, number> = {}
                    importPreview.questions.forEach(q => {
                      const typeLabel = q.type === 'single_choice' ? '單選題'
                        : q.type === 'multiple_choice' ? '複選題'
                        : q.type === 'true_false' ? '是非題'
                        : q.type === 'fill_in_blank' || q.type === 'fill_blank' ? '填充題'
                        : q.type === 'essay' ? '問答題'
                        : q.type
                      typeCounts[typeLabel] = (typeCounts[typeLabel] || 0) + 1
                    })
                    return Object.entries(typeCounts).map(([type, count]) => (
                      <span key={type} className="text-xs px-2 py-1 bg-blue-50 rounded border border-blue-200 text-blue-700">
                        {type}: {count}
                      </span>
                    ))
                  })()}
                  {(() => {
                    const basic = importPreview.questions.filter(q => q.difficulty === 'basic').length
                    const advanced = importPreview.questions.filter(q => q.difficulty === 'advanced').length
                    return (
                      <>
                        <span className="text-xs px-2 py-1 bg-green-50 rounded border border-green-200 text-green-700">基礎: {basic}</span>
                        <span className="text-xs px-2 py-1 bg-orange-50 rounded border border-orange-200 text-orange-700">進階: {advanced}</span>
                      </>
                    )
                  })()}
                </div>

                {/* 預覽前幾題 */}
                <div className="border rounded-lg p-3 max-h-24 overflow-y-auto bg-gray-50">
                  <p className="text-xs text-gray-500 mb-1">預覽：</p>
                  {importPreview.questions.slice(0, 3).map((q, idx) => (
                    <div key={idx} className="text-sm text-gray-700 truncate py-0.5">
                      {idx + 1}. {q.content.substring(0, 35)}{q.content.length > 35 ? '...' : ''}
                    </div>
                  ))}
                </div>
              </div>

              {/* 固定在底部的按鈕 */}
              <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
                <Button variant="outline" onClick={() => { setImportDialogOpen(false); setImportPreview(null); setImportTopicId(""); setImportUnitId("") }}>取消</Button>
                <Button onClick={handleImport} disabled={importing}>{importing ? "匯入中..." : "確認匯入"}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ✨ 匯出對話框 */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Download className="w-5 h-5" />匯出題目</DialogTitle>
            <DialogDescription>選擇要匯出的範圍和格式</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* 可滾動區域 */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {/* 篩選範圍 */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700">匯出範圍</p>
                
                {/* 主題選擇 */}
                <div>
                  <label className="block text-xs text-gray-600 mb-1">主題</label>
                  <select
                    value={exportTopicId}
                    onChange={(e) => {
                      setExportTopicId(e.target.value)
                      setExportUnitId("")
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">全部主題</option>
                    {topicsWithUnits.map(topic => (
                      <option key={topic.id} value={topic.id}>{topic.title}</option>
                    ))}
                  </select>
                </div>

                {/* 單元選擇 */}
                {exportTopicId && (
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">單元</label>
                    <select
                      value={exportUnitId}
                      onChange={(e) => setExportUnitId(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">全部單元</option>
                      {topicsWithUnits.find(t => t.id === exportTopicId)?.units.map(unit => (
                        <option key={unit.id} value={unit.id}>{unit.title}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* 統計資訊 */}
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    符合條件的題目：
                    <span className="font-bold text-indigo-600">
                      {questions.filter(q => {
                        if (exportTopicId && q.units?.topic_id !== exportTopicId) return false
                        if (exportUnitId && q.unit_id !== exportUnitId) return false
                        return true
                      }).length}
                    </span> 題
                  </p>
                </div>
              </div>

              {/* 匯出格式 */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">匯出格式</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setExportFormat("csv")}
                    className={`p-3 rounded-lg border-2 text-center transition-colors ${
                      exportFormat === "csv"
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className={`font-medium ${exportFormat === "csv" ? "text-indigo-700" : "text-gray-800"}`}>
                      CSV
                    </div>
                    <div className="text-xs text-gray-500">可用 Excel 編輯</div>
                  </button>
                  <button
                    onClick={() => setExportFormat("json")}
                    className={`p-3 rounded-lg border-2 text-center transition-colors ${
                      exportFormat === "json"
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className={`font-medium ${exportFormat === "json" ? "text-indigo-700" : "text-gray-800"}`}>
                      JSON
                    </div>
                    <div className="text-xs text-gray-500">含題組完整結構</div>
                  </button>
                </div>
              </div>
            </div>

            {/* 固定在底部的按鈕 */}
            <div className="flex gap-2 pt-4 mt-4 border-t">
              <Button variant="outline" onClick={handleDownloadTemplate} className="text-indigo-600">
                下載範本
              </Button>
              <div className="flex-1" />
              <Button variant="outline" onClick={() => setExportDialogOpen(false)}>取消</Button>
              <Button 
                onClick={() => {
                  if (exportFormat === "csv") {
                    handleExportCSV()
                  } else {
                    handleExportJSON()
                  }
                  setExportDialogOpen(false)
                }}
                disabled={questions.filter(q => {
                  if (exportTopicId && q.units?.topic_id !== exportTopicId) return false
                  if (exportUnitId && q.unit_id !== exportUnitId) return false
                  return true
                }).length === 0}
              >
                匯出
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 試卷產生 Dialog */}
      <ExamGeneratorDialog
        open={examDialogOpen}
        onOpenChange={setExamDialogOpen}
        subjectId={subjectId}
        subjectTitle={subject?.title || ""}
        topicsWithUnits={topicsWithUnits}
        questionTypes={questionTypes}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確定要刪除嗎？</AlertDialogTitle>
            <AlertDialogDescription>{questionToDelete?.is_group ? "刪除題組將同時刪除所有子題" : "刪除後無法復原"}</AlertDialogDescription>
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
