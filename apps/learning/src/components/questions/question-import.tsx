// components/questions/question-import.tsx
"use client"

import { useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@daily/ui"
import { Upload, FileText, Download, CheckCircle, XCircle, AlertCircle } from "lucide-react"

interface QuestionImportProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  subjectId: string
  onSuccess: () => void
}

interface ParsedQuestion {
  type: string
  content: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  answer: string
  explanation: string
  difficulty: number
  valid: boolean
  error?: string
}

// 題型對應表
const typeMap: Record<string, string> = {
  "是非題": "true_false",
  "選擇題": "choice",
  "填空題": "fill_blank",
  "簡答題": "short_answer",
}

export function QuestionImport({
  open,
  onOpenChange,
  subjectId,
  onSuccess,
}: QuestionImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([])
  const [importing, setImporting] = useState(false)
  const [step, setStep] = useState<"upload" | "preview" | "done">("upload")
  const [importResult, setImportResult] = useState({ success: 0, failed: 0 })

  // 重置狀態
  const resetState = () => {
    setFile(null)
    setParsedQuestions([])
    setStep("upload")
    setImportResult({ success: 0, failed: 0 })
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // 關閉對話框
  const handleClose = () => {
    if (step === "done") {
      onSuccess()
    }
    resetState()
    onOpenChange(false)
  }

  // 下載範本
  const downloadTemplate = () => {
    const template = `題型,題目內容,選項A,選項B,選項C,選項D,正確答案,解析,難度
是非題,地球是太陽系中最大的行星,,,,,X,木星才是最大的行星,1
選擇題,台灣最高的山是？,玉山,阿里山,雪山,合歡山,玉山,玉山海拔3952公尺,2
填空題,水的化學式是____,,,,,H2O,,1
簡答題,請說明光合作用的過程,,,,,植物利用陽光將二氧化碳和水轉換成葡萄糖和氧氣,,3`

    const blob = new Blob(["\uFEFF" + template], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "題目匯入範本.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  // 解析單行 CSV
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = []
    let current = ""
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      const nextChar = line[i + 1]

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === "," && !inQuotes) {
        result.push(current)
        current = ""
      } else {
        current += char
      }
    }
    result.push(current)

    return result
  }

  // 解析 CSV
  const parseCSV = (text: string): ParsedQuestion[] => {
    const lines = text.split(/\r?\n/).filter((line) => line.trim())
    const questions: ParsedQuestion[] = []

    // 跳過標題行
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const values = parseCSVLine(line)

      const type = values[0]?.trim() || ""
      const content = values[1]?.trim() || ""
      const optionA = values[2]?.trim() || ""
      const optionB = values[3]?.trim() || ""
      const optionC = values[4]?.trim() || ""
      const optionD = values[5]?.trim() || ""
      const answer = values[6]?.trim() || ""
      const explanation = values[7]?.trim() || ""
      const difficulty = parseInt(values[8]?.trim() || "2") || 2

      // 驗證
      let valid = true
      let error: string | undefined

      if (!type || !typeMap[type]) {
        valid = false
        error = `無效的題型：${type}`
      } else if (!content) {
        valid = false
        error = "題目內容不能為空"
      } else if (!answer) {
        valid = false
        error = "正確答案不能為空"
      } else if (type === "選擇題" && !optionA && !optionB) {
        valid = false
        error = "選擇題至少需要兩個選項"
      }

      questions.push({
        type,
        content,
        optionA,
        optionB,
        optionC,
        optionD,
        answer,
        explanation,
        difficulty: Math.min(3, Math.max(1, difficulty)),
        valid,
        error,
      })
    }

    return questions
  }

  // 處理檔案上傳
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const questions = parseCSV(text)
      setParsedQuestions(questions)
      setStep("preview")
    }
    reader.readAsText(selectedFile, "UTF-8")
  }

  // 執行匯入
  const handleImport = async () => {
    const validQuestions = parsedQuestions.filter((q) => q.valid)
    if (validQuestions.length === 0) return

    setImporting(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setImporting(false)
      return
    }

    let success = 0
    let failed = 0

    // 逐筆插入
    for (const q of validQuestions) {
      const questionType = typeMap[q.type] as "choice" | "true_false" | "fill_blank" | "short_answer"
      
      // 處理選項
      const options = questionType === "choice"
        ? [q.optionA, q.optionB, q.optionC, q.optionD].filter(Boolean)
        : null

      // 處理是非題答案
      let correctAnswer = q.answer
      if (questionType === "true_false") {
        correctAnswer = q.answer.toUpperCase() === "O" || q.answer === "是" || q.answer.toLowerCase() === "true"
          ? "true"
          : "false"
      }

      const { error } = await (supabase.from("questions") as any).insert({
        user_id: user.id,
        subject_id: subjectId,
        question_type: questionType,
        question_text: q.content,
        options,
        correct_answer: correctAnswer,
        explanation: q.explanation || null,
        difficulty: q.difficulty,
        times_practiced: 0,
        times_correct: 0,
        streak: 0,
      })

      if (error) {
        failed++
      } else {
        success++
      }
    }

    setImportResult({ success, failed })
    setImporting(false)
    setStep("done")
  }

  const validCount = parsedQuestions.filter((q) => q.valid).length
  const invalidCount = parsedQuestions.filter((q) => !q.valid).length

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>批次匯入題目</DialogTitle>
          <DialogDescription>上傳 CSV 檔案批次新增題目</DialogDescription>
        </DialogHeader>

        {/* 步驟一：上傳 */}
        {step === "upload" && (
          <div className="space-y-4 py-4">
            {/* 範本下載 */}
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-800">CSV 範本</p>
                  <p className="text-sm text-blue-600">下載範本檔案查看格式</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="w-4 h-4 mr-2" />
                下載範本
              </Button>
            </div>

            {/* 格式說明 */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="font-medium text-gray-800 mb-2">CSV 格式說明</p>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>題型：是非題、選擇題、填空題、簡答題</li>
                <li>是非題答案：O/X 或 是/否</li>
                <li>選擇題答案：填入正確選項的內容</li>
                <li>難度：1(簡單)、2(中等)、3(困難)</li>
              </ul>
            </div>

            {/* 上傳區域 */}
            <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <Upload className="w-10 h-10 text-gray-400 mb-3" />
              <p className="text-gray-600">點擊選擇 CSV 檔案</p>
              <p className="text-sm text-gray-400 mt-1">或拖曳檔案到此處</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          </div>
        )}

        {/* 步驟二：預覽 */}
        {step === "preview" && (
          <div className="space-y-4 py-4">
            {/* 統計資訊 */}
            <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-green-700">可匯入: {validCount}</span>
              </div>
              {invalidCount > 0 && (
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <span className="text-red-700">無效: {invalidCount}</span>
                </div>
              )}
            </div>

            {/* 預覽列表 */}
            <div className="border rounded-lg max-h-60 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-600 w-10">狀態</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600 w-20">題型</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">題目內容</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600 w-24">答案</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {parsedQuestions.map((q, index) => (
                    <tr key={index} className={q.valid ? "" : "bg-red-50"}>
                      <td className="px-3 py-2">
                        {q.valid ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <span title={q.error}>
                            <AlertCircle className="w-4 h-4 text-red-500" />
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-600">{q.type}</td>
                      <td className="px-3 py-2">
                        <span className="line-clamp-1">{q.content}</span>
                      </td>
                      <td className="px-3 py-2 text-gray-500">
                        <span className="line-clamp-1">{q.answer}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {invalidCount > 0 && (
              <p className="text-sm text-amber-600">
                ⚠️ 有 {invalidCount} 筆資料格式錯誤，將不會被匯入
              </p>
            )}
          </div>
        )}

        {/* 步驟三：完成 */}
        {step === "done" && (
          <div className="py-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">匯入完成</h3>
            <p className="text-gray-600">
              成功匯入 {importResult.success} 道題目
              {importResult.failed > 0 && `，失敗 ${importResult.failed} 道`}
            </p>
          </div>
        )}

        <DialogFooter>
          {step === "upload" && (
            <Button variant="outline" onClick={handleClose}>
              取消
            </Button>
          )}
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={() => { resetState(); setStep("upload") }}>
                重新選擇
              </Button>
              <Button
                onClick={handleImport}
                disabled={importing || validCount === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {importing ? "匯入中..." : `匯入 ${validCount} 道題目`}
              </Button>
            </>
          )}
          {step === "done" && (
            <Button onClick={handleClose} className="bg-blue-600 hover:bg-blue-700">
              完成
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
