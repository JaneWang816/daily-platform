// components/questions/exam-generator-dialog.tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Input,
  Label,
} from "@daily/ui"
import {
  FileText,
  Plus,
  Minus,
  Shuffle,
  AlertCircle,
} from "lucide-react"

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

interface QuestionTypeConfig {
  typeId: string
  typeName: string
  typeLabel: string
  count: number
  scorePerQuestion: number
  available: number
}

interface DifficultyConfig {
  difficulty: "basic" | "advanced"
  label: string
  count: number
  available: number
}

interface ExamGeneratorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  subjectId: string
  subjectTitle: string
  topicsWithUnits: TopicWithUnits[]
  questionTypes: QuestionType[]
}

export function ExamGeneratorDialog({
  open,
  onOpenChange,
  subjectId,
  subjectTitle,
  topicsWithUnits,
  questionTypes,
}: ExamGeneratorDialogProps) {
  const router = useRouter()

  // 選擇範圍
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([])
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([])

  // 題型配置
  const [typeConfigs, setTypeConfigs] = useState<QuestionTypeConfig[]>([])
  const [difficultyConfigs, setDifficultyConfigs] = useState<DifficultyConfig[]>([
    { difficulty: "basic", label: "基礎", count: 0, available: 0 },
    { difficulty: "advanced", label: "進階", count: 0, available: 0 },
  ])

  // 配分模式
  const [scoreMode, setScoreMode] = useState<"auto" | "by_type" | "per_question">("auto")
  const [totalScore] = useState(100)

  // 統計
  const [availableQuestions, setAvailableQuestions] = useState<{
    total: number
    byType: Record<string, number>
    byDifficulty: Record<string, number>
  }>({ total: 0, byType: {}, byDifficulty: {} })

  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState("")

  // 取得可選單元
  const availableUnits = selectedTopicIds.length > 0
    ? topicsWithUnits
        .filter(t => selectedTopicIds.includes(t.id))
        .flatMap(t => t.units)
    : topicsWithUnits.flatMap(t => t.units)

  // 查詢可用題目數量
  const fetchAvailableQuestions = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 取得符合條件的單元 ID
    let unitIds: string[] = []
    if (selectedUnitIds.length > 0) {
      unitIds = selectedUnitIds
    } else if (selectedTopicIds.length > 0) {
      unitIds = topicsWithUnits
        .filter(t => selectedTopicIds.includes(t.id))
        .flatMap(t => t.units.map(u => u.id))
    }

    // 查詢題目
    let query = supabase
      .from("questions")
      .select("id, question_type_id, difficulty, is_group, parent_id")
      .eq("user_id", user.id)
      .eq("subject_id", subjectId)
      .is("parent_id", null) // 只取父題或獨立題

    if (unitIds.length > 0) {
      query = query.in("unit_id", unitIds)
    }

    const { data: questions } = await query

    if (!questions) {
      setAvailableQuestions({ total: 0, byType: {}, byDifficulty: {} })
      return
    }

    // 統計
    const byType: Record<string, number> = {}
    const byDifficulty: Record<string, number> = { basic: 0, advanced: 0 }

    questions.forEach(q => {
      // 按題型統計
      byType[q.question_type_id] = (byType[q.question_type_id] || 0) + 1
      // 按難度統計
      const diff = q.difficulty || "basic"
      byDifficulty[diff] = (byDifficulty[diff] || 0) + 1
    })

    setAvailableQuestions({
      total: questions.length,
      byType,
      byDifficulty,
    })

    // 更新題型配置的可用數量
    setTypeConfigs(prev => prev.map(config => ({
      ...config,
      available: byType[config.typeId] || 0,
    })))

    // 更新難度配置的可用數量
    setDifficultyConfigs(prev => prev.map(config => ({
      ...config,
      available: byDifficulty[config.difficulty] || 0,
    })))
  }, [subjectId, selectedTopicIds, selectedUnitIds, topicsWithUnits])

  // 初始化題型配置
  useEffect(() => {
    if (questionTypes.length > 0 && typeConfigs.length === 0) {
      setTypeConfigs(questionTypes.map(type => ({
        typeId: type.id,
        typeName: type.name,
        typeLabel: type.label,
        count: 0,
        scorePerQuestion: 0,
        available: 0,
      })))
    }
  }, [questionTypes, typeConfigs.length])

  // 當選擇範圍變更時，重新查詢
  useEffect(() => {
    if (open) {
      fetchAvailableQuestions()
    }
  }, [open, fetchAvailableQuestions])

  // 計算總題數
  const totalQuestionCount = typeConfigs.reduce((sum, c) => sum + c.count, 0)

  // 計算預估分數
  const calculateScores = () => {
    if (totalQuestionCount === 0) return []

    if (scoreMode === "auto") {
      // 平均分配
      const baseScore = Math.floor(totalScore / totalQuestionCount)
      const remainder = totalScore - baseScore * totalQuestionCount
      return typeConfigs.map((config, idx) => ({
        ...config,
        scorePerQuestion: baseScore + (idx < remainder ? 1 : 0),
      }))
    }

    return typeConfigs
  }

  // 更新題型數量（增減）
  const updateTypeCount = (typeId: string, delta: number) => {
    setTypeConfigs(prev => prev.map(config => {
      if (config.typeId !== typeId) return config
      const newCount = Math.max(0, Math.min(config.available, config.count + delta))
      return { ...config, count: newCount }
    }))
  }

  // 直接設定題型數量
  const setTypeCount = (typeId: string, value: number) => {
    setTypeConfigs(prev => prev.map(config => {
      if (config.typeId !== typeId) return config
      const newCount = Math.max(0, Math.min(config.available, value))
      return { ...config, count: newCount }
    }))
  }

  // 更新題型配分
  const updateTypeScore = (typeId: string, score: number) => {
    setTypeConfigs(prev => prev.map(config => {
      if (config.typeId !== typeId) return config
      return { ...config, scorePerQuestion: Math.max(0, score) }
    }))
  }

  // 主題選擇變更
  const toggleTopic = (topicId: string) => {
    setSelectedTopicIds(prev => {
      if (prev.includes(topicId)) {
        // 移除主題時，也移除其下的單元選擇
        const topic = topicsWithUnits.find(t => t.id === topicId)
        if (topic) {
          const unitIdsToRemove = topic.units.map(u => u.id)
          setSelectedUnitIds(prevUnits => prevUnits.filter(id => !unitIdsToRemove.includes(id)))
        }
        return prev.filter(id => id !== topicId)
      }
      return [...prev, topicId]
    })
  }

  // 單元選擇變更
  const toggleUnit = (unitId: string) => {
    setSelectedUnitIds(prev => {
      if (prev.includes(unitId)) {
        return prev.filter(id => id !== unitId)
      }
      return [...prev, unitId]
    })
  }

  // 產生試卷
  const handleGenerate = async () => {
    if (totalQuestionCount === 0) {
      setError("請至少選擇一題")
      return
    }

    setGenerating(true)
    setError("")

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("請先登入")

      // 取得符合條件的單元 ID
      let unitIds: string[] = []
      if (selectedUnitIds.length > 0) {
        unitIds = selectedUnitIds
      } else if (selectedTopicIds.length > 0) {
        unitIds = topicsWithUnits
          .filter(t => selectedTopicIds.includes(t.id))
          .flatMap(t => t.units.map(u => u.id))
      }

      // 查詢所有符合條件的題目
      let query = supabase
        .from("questions")
        .select("id, question_type_id, difficulty, is_group, parent_id")
        .eq("user_id", user.id)
        .eq("subject_id", subjectId)
        .is("parent_id", null)

      if (unitIds.length > 0) {
        query = query.in("unit_id", unitIds)
      }

      const { data: allQuestions } = await query

      if (!allQuestions || allQuestions.length === 0) {
        throw new Error("沒有符合條件的題目")
      }

      // 按題型分組
      const questionsByType: Record<string, typeof allQuestions> = {}
      allQuestions.forEach(q => {
        if (!questionsByType[q.question_type_id]) {
          questionsByType[q.question_type_id] = []
        }
        questionsByType[q.question_type_id].push(q)
      })

      // 抽題
      const selectedQuestionIds: string[] = []
      const scoreConfigs = calculateScores()

      for (const config of scoreConfigs) {
        if (config.count === 0) continue

        const available = questionsByType[config.typeId] || []
        if (available.length < config.count) {
          throw new Error(`${config.typeLabel}題目不足，需要 ${config.count} 題但只有 ${available.length} 題`)
        }

        // 隨機抽取
        const shuffled = [...available].sort(() => Math.random() - 0.5)
        const selected = shuffled.slice(0, config.count)
        selectedQuestionIds.push(...selected.map(q => q.id))
      }

      // 如果有題組，需要取得子題數量來計算配分
      const { data: groupChildren } = await supabase
        .from("questions")
        .select("id, parent_id")
        .in("parent_id", selectedQuestionIds)

      // 計算實際題數（題組要算子題數）
      const childrenByParent: Record<string, number> = {}
      groupChildren?.forEach(child => {
        if (child.parent_id) {
          childrenByParent[child.parent_id] = (childrenByParent[child.parent_id] || 0) + 1
        }
      })

      // 計算實際題數
      let actualQuestionCount = 0
      const questionInfos = allQuestions.filter(q => selectedQuestionIds.includes(q.id))
      questionInfos.forEach(q => {
        if (q.is_group) {
          actualQuestionCount += childrenByParent[q.id] || 0
        } else {
          actualQuestionCount += 1
        }
      })

      // 產生試卷編號
      const now = new Date()
      const examCode = `EX${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`

      // 建立試卷
      const { data: exam, error: examError } = await supabase
        .from("exams")
        .insert({
          user_id: user.id,
          exam_code: examCode,
          subject_id: subjectId,
          topic_ids: selectedTopicIds.length > 0 ? selectedTopicIds : null,
          unit_ids: selectedUnitIds.length > 0 ? selectedUnitIds : null,
          total_score: totalScore,
          question_count: actualQuestionCount,
          status: "draft",
        })
        .select()
        .single()

      if (examError) throw examError

      // 計算每題配分
      const scorePerQuestion = Math.round(totalScore / actualQuestionCount)

      // 建立題目記錄（打亂順序）
      const shuffledIds = [...selectedQuestionIds].sort(() => Math.random() - 0.5)
      const examAnswers = shuffledIds.map((questionId, index) => ({
        exam_id: exam.id,
        question_id: questionId,
        question_order: index + 1,
        score: scorePerQuestion,
      }))

      const { error: answersError } = await supabase
        .from("exam_answers")
        .insert(examAnswers)

      if (answersError) throw answersError

      // 導向試卷作答頁面
      onOpenChange(false)
      router.push(`/dashboard/practice/exam/${exam.id}`)

    } catch (err) {
      console.error("Generate exam error:", err)
      setError(err instanceof Error ? err.message : "產生試卷失敗")
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            產生試卷
          </DialogTitle>
          <DialogDescription>
            科目：{subjectTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          {/* 範圍選擇 */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-800">選擇範圍</h3>

            {/* 主題選擇 */}
            <div>
              <Label className="text-sm text-gray-600 mb-2 block">主題（不選 = 全部主題）</Label>
              <div className="flex flex-wrap gap-2">
                {topicsWithUnits.map(topic => (
                  <button
                    key={topic.id}
                    onClick={() => toggleTopic(topic.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                      selectedTopicIds.includes(topic.id)
                        ? "bg-indigo-100 border-indigo-300 text-indigo-700"
                        : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {topic.title}
                  </button>
                ))}
                {topicsWithUnits.length === 0 && (
                  <span className="text-sm text-gray-400">尚無主題</span>
                )}
              </div>
            </div>

            {/* 單元選擇 */}
            {availableUnits.length > 0 && (
              <div>
                <Label className="text-sm text-gray-600 mb-2 block">單元（不選 = 所選主題的全部單元）</Label>
                <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                  {availableUnits.map(unit => (
                    <button
                      key={unit.id}
                      onClick={() => toggleUnit(unit.id)}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                        selectedUnitIds.includes(unit.id)
                          ? "bg-blue-100 border-blue-300 text-blue-700"
                          : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {unit.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 可用題數統計 */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                符合條件的題目：<span className="font-bold text-indigo-600">{availableQuestions.total}</span> 題
              </p>
            </div>
          </div>

          {/* 題型與題數設定 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-800">題型與題數</h3>
              <div className="text-sm text-gray-500">
                已選：<span className="font-bold text-indigo-600">{totalQuestionCount}</span> 題
              </div>
            </div>

            <div className="space-y-2">
              {typeConfigs.map(config => (
                <div
                  key={config.typeId}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700 w-20">
                      {config.typeLabel}
                    </span>
                    <span className="text-xs text-gray-400">
                      可用 {config.available} 題
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateTypeCount(config.typeId, -1)}
                      disabled={config.count === 0}
                      className="p-1 rounded hover:bg-gray-200 disabled:opacity-30"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      value={config.count}
                      onChange={(e) => setTypeCount(config.typeId, parseInt(e.target.value) || 0)}
                      min={0}
                      max={config.available}
                      className="w-12 h-8 text-center font-medium border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                      onClick={() => updateTypeCount(config.typeId, 1)}
                      disabled={config.count >= config.available}
                      className="p-1 rounded hover:bg-gray-200 disabled:opacity-30"
                    >
                      <Plus className="w-4 h-4" />
                    </button>

                    {scoreMode === "by_type" && (
                      <div className="flex items-center gap-1 ml-4">
                        <Input
                          type="number"
                          value={config.scorePerQuestion}
                          onChange={(e) => updateTypeScore(config.typeId, parseInt(e.target.value) || 0)}
                          className="w-16 h-8 text-center text-sm"
                          min={0}
                        />
                        <span className="text-xs text-gray-500">分/題</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 配分模式 */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-800">配分方式</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setScoreMode("auto")}
                className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
                  scoreMode === "auto"
                    ? "bg-indigo-100 border-indigo-300 text-indigo-700"
                    : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Shuffle className="w-4 h-4 inline mr-1" />
                平均分配
              </button>
              <button
                onClick={() => setScoreMode("by_type")}
                className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
                  scoreMode === "by_type"
                    ? "bg-indigo-100 border-indigo-300 text-indigo-700"
                    : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                }`}
              >
                依題型設定
              </button>
            </div>

            {scoreMode === "auto" && totalQuestionCount > 0 && (
              <p className="text-sm text-gray-500">
                每題約 {Math.round(totalScore / totalQuestionCount)} 分（總分 {totalScore} 分）
              </p>
            )}
          </div>

          {/* 錯誤訊息 */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>

        {/* 底部按鈕 */}
        <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={generating || totalQuestionCount === 0}
          >
            {generating ? "產生中..." : `產生試卷 (${totalQuestionCount} 題)`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
