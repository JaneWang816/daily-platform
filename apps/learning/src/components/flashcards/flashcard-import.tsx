// components/flashcards/flashcard-import.tsx
"use client"

import { useState, useRef } from "react"
import { createClient } from "@daily/database"
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

interface FlashcardImportProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  deckId: string
  onSuccess: () => void
}

interface ParsedCard {
  front: string
  back: string
  note: string
  note2: string
  valid: boolean
  error?: string
}

export function FlashcardImport({
  open,
  onOpenChange,
  deckId,
  onSuccess,
}: FlashcardImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [parsedCards, setParsedCards] = useState<ParsedCard[]>([])
  const [importing, setImporting] = useState(false)
  const [step, setStep] = useState<"upload" | "preview" | "done">("upload")
  const [importResult, setImportResult] = useState({ success: 0, failed: 0 })

  // 重置狀態
  const resetState = () => {
    setFile(null)
    setParsedCards([])
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
    const template = `正面,背面,備註,備註2
apple,蘋果,水果的一種,可食用
book,書本,I love reading books.,我喜歡讀書
computer,電腦,,
"Hello, how are you?",你好，你好嗎？,常用問候語,
光合作用的產物是什麼？,葡萄糖和氧氣,6CO2 + 6H2O → C6H12O6 + 6O2,`

    const blob = new Blob(["\uFEFF" + template], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "flashcards-template.csv"
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
  const parseCSV = (text: string): ParsedCard[] => {
    const lines = text.split(/\r?\n/).filter((line) => line.trim())
    const cards: ParsedCard[] = []

    // 跳過標題行
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const values = parseCSVLine(line)

      if (values.length < 2) {
        cards.push({
          front: values[0] || "",
          back: "",
          note: "",
          note2: "",
          valid: false,
          error: "格式錯誤：缺少背面內容",
        })
        continue
      }

      const front = values[0].trim()
      const back = values[1].trim()
      const note = values[2]?.trim() || ""
      const note2 = values[3]?.trim() || ""

      if (!front) {
        cards.push({ front, back, note, note2, valid: false, error: "正面不能為空" })
        continue
      }

      if (!back) {
        cards.push({ front, back, note, note2, valid: false, error: "背面不能為空" })
        continue
      }

      cards.push({ front, back, note, note2, valid: true })
    }

    return cards
  }

  // 處理檔案上傳
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const cards = parseCSV(text)
      setParsedCards(cards)
      setStep("preview")
    }
    reader.readAsText(selectedFile, "UTF-8")
  }

  // 執行匯入
  const handleImport = async () => {
    const validCards = parsedCards.filter((c) => c.valid)
    if (validCards.length === 0) return

    setImporting(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setImporting(false)
      return
    }

    let success = 0
    let failed = 0

    // 批次插入
    const cardsToInsert = validCards.map((card) => ({
      user_id: user.id,
      deck_id: deckId,
      front: card.front,
      back: card.back,
      note: card.note || null,
      note2: card.note2 || null,
      next_review_at: new Date().toISOString(),
      interval: 0,
      ease_factor: 2.5,
      repetition_count: 0,
    }))

    const { error } = await (supabase.from("flashcards") as any).insert(cardsToInsert)

    if (error) {
      failed = validCards.length
    } else {
      success = validCards.length
    }

    setImportResult({ success, failed })
    setImporting(false)
    setStep("done")
  }

  const validCount = parsedCards.filter((c) => c.valid).length
  const invalidCount = parsedCards.filter((c) => !c.valid).length
  const withNoteCount = parsedCards.filter((c) => c.valid && (c.note || c.note2)).length

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>批次匯入卡片</DialogTitle>
          <DialogDescription>上傳 CSV 檔案批次新增記憶卡片</DialogDescription>
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
                <li>第一行為標題行（正面,背面,備註）</li>
                <li>正面和背面為必填，備註為選填</li>
                <li>含有逗號的內容請用雙引號包裹</li>
                <li>支援 UTF-8 編碼</li>
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
              {withNoteCount > 0 && (
                <div className="flex items-center gap-2 text-gray-500">
                  <span>含備註: {withNoteCount}</span>
                </div>
              )}
            </div>

            {/* 預覽列表 */}
            <div className="border rounded-lg max-h-60 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-600 w-10">狀態</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">正面</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">背面</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">備註</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">備註2</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {parsedCards.map((card, index) => (
                    <tr key={index} className={card.valid ? "" : "bg-red-50"}>
                      <td className="px-3 py-2">
                        {card.valid ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <span title={card.error}>
                            <AlertCircle className="w-4 h-4 text-red-500" />
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span className="line-clamp-1">{card.front}</span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="line-clamp-1">{card.back}</span>
                      </td>
                      <td className="px-3 py-2 text-gray-500">
                        <span className="line-clamp-1">{card.note || "-"}</span>
                      </td>
                      <td className="px-3 py-2 text-gray-500">
                        <span className="line-clamp-1">{card.note2 || "-"}</span>
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
              成功匯入 {importResult.success} 張卡片
              {importResult.failed > 0 && `，失敗 ${importResult.failed} 張`}
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
                {importing ? "匯入中..." : `匯入 ${validCount} 張卡片`}
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
