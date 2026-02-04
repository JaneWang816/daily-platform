// apps/learning/src/app/dashboard/practice/page.tsx
"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  Card,
  CardContent,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label,
} from "@daily/ui"
import {
  FileQuestion,
  FolderOpen,
  Play,
  Target,
  CheckCircle,
  XCircle,
  Zap,
  BookOpen,
  Layers,
  Filter,
} from "lucide-react"

interface Subject {
  id: string
  title: string
  description: string | null
  cover_url: string | null
}

interface Topic {
  id: string
  title: string
  subject_id: string
}

interface SubjectWithStats extends Subject {
  questionCount: number
  mistakeCount: number
  masteredCount: number
  basicCount: number
  advancedCount: number
  topics: Topic[]
}

export default function PracticePage() {
  const router = useRouter()
  const [subjects, setSubjects] = useState<SubjectWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [totalStats, setTotalStats] = useState({
    questions: 0,
    mistakes: 0,
    mastered: 0,
    basic: 0,
    advanced: 0,
  })

  // 練習選項對話框狀態
  const [practiceDialogOpen, setPracticeDialogOpen] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState<SubjectWithStats | null>(null)
  const [practiceTopicId, setPracticeTopicId] = useState<string>("all")
  const [practiceDifficulty, setPracticeDifficulty] = useState<string>("all")
  const [practiceMode, setPracticeMode] = useState<string>("all")

  const fetchData = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 取得所有科目
    const { data: subjectsData } = await supabase
      .from("subjects")
      .select("id, title, description, cover_url")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (subjectsData) {
      // 取得每個科目的題目統計
      const subjectsWithStats = await Promise.all(
        (subjectsData as Subject[]).map(async (subject) => {
          // 取得該科目的所有題目（排除子題）
          const { data: questionsData } = await supabase
            .from("questions")
            .select("id, consecutive_correct, attempt_count, difficulty")
            .eq("user_id", user.id)
            .eq("subject_id", subject.id)
            .is("parent_id", null)

          const questions = questionsData || []
          
          // 計算各項統計
          const questionCount = questions.length
          const mistakeCount = questions.filter(
            q => (q.attempt_count || 0) > 0 && (q.consecutive_correct || 0) < 3
          ).length
          const masteredCount = questions.filter(
            q => (q.consecutive_correct || 0) >= 3
          ).length
          const basicCount = questions.filter(
            q => !q.difficulty || q.difficulty === "basic"
          ).length
          const advancedCount = questions.filter(
            q => q.difficulty === "advanced"
          ).length

          // 取得該科目的主題
          const { data: topicsData } = await supabase
            .from("topics")
            .select("id, title, subject_id")
            .eq("subject_id", subject.id)
            .eq("user_id", user.id)
            .order("order", { ascending: true })

          return {
            ...subject,
            questionCount,
            mistakeCount,
            masteredCount,
            basicCount,
            advancedCount,
            topics: (topicsData || []) as Topic[],
          }
        })
      )

      setSubjects(subjectsWithStats)

      // 計算總統計
      const totals = subjectsWithStats.reduce(
        (acc, s) => ({
          questions: acc.questions + s.questionCount,
          mistakes: acc.mistakes + s.mistakeCount,
          mastered: acc.mastered + s.masteredCount,
          basic: acc.basic + s.basicCount,
          advanced: acc.advanced + s.advancedCount,
        }),
        { questions: 0, mistakes: 0, mastered: 0, basic: 0, advanced: 0 }
      )
      setTotalStats(totals)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // 開啟練習選項對話框
  const openPracticeDialog = (subject: SubjectWithStats) => {
    setSelectedSubject(subject)
    setPracticeTopicId("all")
    setPracticeDifficulty("all")
    setPracticeMode("all")
    setPracticeDialogOpen(true)
  }

  // 開始練習
  const startPractice = () => {
    if (!selectedSubject) return

    const params = new URLSearchParams()
    params.set("subject", selectedSubject.id)
    
    if (practiceTopicId !== "all") {
      params.set("topic", practiceTopicId)
    }
    if (practiceDifficulty !== "all") {
      params.set("difficulty", practiceDifficulty)
    }
    if (practiceMode !== "all") {
      params.set("mode", practiceMode)
    }

    setPracticeDialogOpen(false)
    router.push(`/dashboard/practice/session?${params.toString()}`)
  }

  // 快速隨機練習（所有科目）
  const startRandomPractice = () => {
    const params = new URLSearchParams()
    if (practiceDifficulty !== "all") {
      params.set("difficulty", practiceDifficulty)
    }
    router.push(`/dashboard/practice/session${params.toString() ? '?' + params.toString() : ''}`)
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
          <h1 className="text-2xl font-bold text-gray-800">題庫練習</h1>
          <p className="text-gray-600 mt-1">選擇科目開始練習</p>
        </div>
        {totalStats.mistakes > 0 && (
          <Link href="/dashboard/practice/session?mode=mistakes">
            <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
              <XCircle className="w-4 h-4 mr-2" />
              錯題本 ({totalStats.mistakes})
            </Button>
          </Link>
        )}
      </div>

      {/* 總統計 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <FileQuestion className="w-6 h-6 text-indigo-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-800">{totalStats.questions}</p>
            <p className="text-sm text-gray-500">總題目</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <BookOpen className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-600">{totalStats.basic}</p>
            <p className="text-sm text-gray-500">基礎題</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Zap className="w-6 h-6 text-orange-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-orange-600">{totalStats.advanced}</p>
            <p className="text-sm text-gray-500">進階題</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <XCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-red-600">{totalStats.mistakes}</p>
            <p className="text-sm text-gray-500">待加強</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-emerald-600">{totalStats.mastered}</p>
            <p className="text-sm text-gray-500">已熟練</p>
          </CardContent>
        </Card>
      </div>

      {/* 科目列表 */}
      {subjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <FileQuestion className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 mb-4">還沒有任何科目</p>
            <Link href="/dashboard/subjects">
              <Button variant="outline">
                前往建立科目
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {subjects.map((subject) => (
            <Card
              key={subject.id}
              className="hover:shadow-md transition-shadow"
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  {/* 圖標 */}
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 bg-indigo-100">
                    <FolderOpen className="w-6 h-6 text-indigo-600" />
                  </div>

                  {/* 內容 */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-800">{subject.title}</h3>
                    {subject.description && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-1">{subject.description}</p>
                    )}

                    {/* 統計標籤 */}
                    <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                        {subject.questionCount} 題
                      </span>
                      {subject.basicCount > 0 && (
                        <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded">
                          基礎 {subject.basicCount}
                        </span>
                      )}
                      {subject.advancedCount > 0 && (
                        <span className="px-2 py-0.5 bg-orange-50 text-orange-600 rounded">
                          進階 {subject.advancedCount}
                        </span>
                      )}
                      {subject.mistakeCount > 0 && (
                        <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded">
                          待加強 {subject.mistakeCount}
                        </span>
                      )}
                      {subject.masteredCount > 0 && (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded">
                          已熟練 {subject.masteredCount}
                        </span>
                      )}
                    </div>

                    {/* 進度條 */}
                    {subject.questionCount > 0 && (
                      <div className="mt-3">
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 transition-all"
                            style={{
                              width: `${(subject.masteredCount / subject.questionCount) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 操作按鈕 */}
                <div className="flex gap-2 mt-4">
                  <Link href={`/dashboard/practice/${subject.id}`} className="flex-1">
                    <Button variant="outline" className="w-full" size="sm">
                      <Target className="w-4 h-4 mr-2" />
                      管理題目
                    </Button>
                  </Link>
                  {subject.questionCount > 0 && (
                    <Button
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                      size="sm"
                      onClick={() => openPracticeDialog(subject)}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      開始練習
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 快速練習入口 */}
      {totalStats.questions > 0 && (
        <Card className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">隨機練習</h3>
                <p className="text-indigo-100 text-sm mt-1">
                  從所有科目隨機抽取題目練習
                </p>
              </div>
              <Link href="/dashboard/practice/session">
                <Button variant="secondary" size="lg">
                  <Play className="w-5 h-5 mr-2" />
                  開始
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 練習選項對話框 */}
      <Dialog open={practiceDialogOpen} onOpenChange={setPracticeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-indigo-600" />
              練習設定
            </DialogTitle>
            <DialogDescription>
              選擇練習範圍和難度
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 科目名稱 */}
            <div className="p-3 bg-indigo-50 rounded-lg">
              <p className="text-sm text-indigo-600 font-medium">
                {selectedSubject?.title}
              </p>
              <p className="text-xs text-indigo-500 mt-1">
                共 {selectedSubject?.questionCount} 題
              </p>
            </div>

            {/* 主題選擇 */}
            {selectedSubject && selectedSubject.topics.length > 0 && (
              <div className="space-y-2">
                <Label>練習範圍</Label>
                <Select value={practiceTopicId} onValueChange={setPracticeTopicId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部主題</SelectItem>
                    {selectedSubject.topics.map((topic) => (
                      <SelectItem key={topic.id} value={topic.id}>
                        {topic.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* 難易度選擇 */}
            <div className="space-y-2">
              <Label>難易度</Label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPracticeDifficulty("all")}
                  className={`p-3 rounded-lg border-2 transition-colors text-center ${
                    practiceDifficulty === "all"
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <Layers className={`w-5 h-5 mx-auto mb-1 ${
                    practiceDifficulty === "all" ? "text-indigo-600" : "text-gray-400"
                  }`} />
                  <span className={`text-sm font-medium ${
                    practiceDifficulty === "all" ? "text-indigo-700" : "text-gray-600"
                  }`}>
                    全部
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setPracticeDifficulty("basic")}
                  className={`p-3 rounded-lg border-2 transition-colors text-center ${
                    practiceDifficulty === "basic"
                      ? "border-green-500 bg-green-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <BookOpen className={`w-5 h-5 mx-auto mb-1 ${
                    practiceDifficulty === "basic" ? "text-green-600" : "text-gray-400"
                  }`} />
                  <span className={`text-sm font-medium ${
                    practiceDifficulty === "basic" ? "text-green-700" : "text-gray-600"
                  }`}>
                    基礎
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setPracticeDifficulty("advanced")}
                  className={`p-3 rounded-lg border-2 transition-colors text-center ${
                    practiceDifficulty === "advanced"
                      ? "border-orange-500 bg-orange-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <Zap className={`w-5 h-5 mx-auto mb-1 ${
                    practiceDifficulty === "advanced" ? "text-orange-600" : "text-gray-400"
                  }`} />
                  <span className={`text-sm font-medium ${
                    practiceDifficulty === "advanced" ? "text-orange-700" : "text-gray-600"
                  }`}>
                    進階
                  </span>
                </button>
              </div>
            </div>

            {/* 練習模式 */}
            <div className="space-y-2">
              <Label>練習模式</Label>
              <Select value={practiceMode} onValueChange={setPracticeMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部題目</SelectItem>
                  <SelectItem value="new">只練新題</SelectItem>
                  <SelectItem value="mistakes">只練錯題</SelectItem>
                  <SelectItem value="review">複習已熟練</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 按鈕 */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setPracticeDialogOpen(false)}
            >
              取消
            </Button>
            <Button
              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
              onClick={startPractice}
            >
              <Play className="w-4 h-4 mr-2" />
              開始練習
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
