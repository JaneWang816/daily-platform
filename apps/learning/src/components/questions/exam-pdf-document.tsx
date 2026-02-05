// apps/learning/src/components/questions/exam-pdf-document.tsx
"use client"

import { useState } from "react"
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  pdf,
} from "@react-pdf/renderer"
import { Button } from "@daily/ui"
import { FileDown, Loader2, Check } from "lucide-react"

// 註冊中文字型（使用本地思源黑體）
Font.register({
  family: "NotoSansSC",
  src: "/fonts/NotoSansSC-Regular.ttf",
})

// 自訂斷詞邏輯：讓每個字元可以斷開，但不加連字符
Font.registerHyphenationCallback((word) => {
  const result: string[] = []
  for (const char of word) {
    result.push(char)
    result.push('')
  }
  return result
})

// PDF 樣式
const styles = StyleSheet.create({
  page: {
    fontFamily: "NotoSansSC",
    fontSize: 10,
    padding: 40,
    backgroundColor: "#ffffff",
  },
  // 頁首
  header: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: "#1e293b",
  },
  headerTitle: {
    fontSize: 18,
    color: "#1e293b",
    textAlign: "center",
    marginBottom: 12,
  },
  headerInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  headerInfoItem: {
    fontSize: 10,
    color: "#475569",
    marginBottom: 4,
  },
  // 作答資訊區（空白試卷用）
  answerInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  answerInfoItem: {
    fontSize: 10,
    color: "#475569",
  },
  answerBlank: {
    borderBottomWidth: 1,
    borderBottomColor: "#94a3b8",
    width: 80,
    marginLeft: 8,
  },
  // 成績區（含答案版用）
  scoreBox: {
    marginTop: 10,
    padding: 12,
    backgroundColor: "#f1f5f9",
    borderRadius: 4,
  },
  scoreText: {
    fontSize: 14,
    color: "#1e293b",
    textAlign: "center",
  },
  // 題目區
  questionSection: {
    marginTop: 20,
  },
  // 題組
  questionGroup: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
  },
  groupLabel: {
    fontSize: 9,
    color: "#6366f1",
    marginBottom: 6,
  },
  groupContent: {
    fontSize: 11,
    color: "#1e293b",
    lineHeight: 1.6,
    marginBottom: 12,
  },
  // 一般題目
  questionItem: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  questionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  questionNumber: {
    fontSize: 10,
    color: "#1e293b",
    fontWeight: "bold",
    marginRight: 8,
    minWidth: 25,
  },
  questionContent: {
    fontSize: 10,
    color: "#1e293b",
    lineHeight: 1.6,
    flex: 1,
  },
  questionMeta: {
    flexDirection: "row",
    marginBottom: 6,
  },
  questionType: {
    fontSize: 8,
    color: "#6b7280",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  questionScore: {
    fontSize: 8,
    color: "#6366f1",
    backgroundColor: "#eef2ff",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  // 選項
  optionsContainer: {
    marginLeft: 25,
    marginTop: 8,
  },
  optionItem: {
    flexDirection: "row",
    marginBottom: 4,
  },
  optionKey: {
    fontSize: 10,
    color: "#374151",
    width: 20,
  },
  optionValue: {
    fontSize: 10,
    color: "#374151",
    flex: 1,
    lineHeight: 1.5,
  },
  // 是非題選項
  trueFalseOptions: {
    flexDirection: "row",
    marginLeft: 25,
    marginTop: 8,
  },
  trueFalseOption: {
    fontSize: 10,
    color: "#374151",
    marginRight: 24,
  },
  // 填充題作答區
  fillBlankArea: {
    marginLeft: 25,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 4,
    padding: 8,
    minHeight: 30,
  },
  fillBlankLabel: {
    fontSize: 9,
    color: "#9ca3af",
  },
  // 答案區（含答案版）
  answerArea: {
    marginLeft: 25,
    marginTop: 8,
    padding: 8,
    backgroundColor: "#f0fdf4",
    borderRadius: 4,
  },
  answerCorrect: {
    fontSize: 9,
    color: "#15803d",
    marginBottom: 2,
  },
  answerUser: {
    fontSize: 9,
    color: "#dc2626",
  },
  answerUserCorrect: {
    fontSize: 9,
    color: "#15803d",
  },
  // 頁尾
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: {
    fontSize: 8,
    color: "#94a3b8",
  },
  pageNumber: {
    fontSize: 8,
    color: "#94a3b8",
  },
})

// 類型定義
interface QuestionType {
  id: string
  name: string
  label: string
}

interface Question {
  id: string
  content: string
  options: Record<string, string> | null
  answer: Record<string, unknown> | null
  explanation: string | null
  question_type_id: string
  difficulty: string | null
  is_group: boolean | null
  parent_id: string | null
  order: number | null
  question_types?: QuestionType
  children?: Question[]
}

interface ExamAnswer {
  id: string
  exam_id: string
  question_id: string
  question_order: number
  score: number
  user_answer: Record<string, unknown> | null
  is_correct: boolean | null
  earned_score: number | null
  question?: Question
}

interface Exam {
  id: string
  exam_code: string
  subject_id: string
  total_score: number
  earned_score: number | null
  question_count: number
  correct_count: number | null
  time_spent_seconds: number | null
  status: string
  created_at: string
  subjects?: { id: string; title: string }
}

interface ExamPDFProps {
  exam: Exam
  examAnswers: ExamAnswer[]
  userAnswers: Record<string, string>
  includeAnswers: boolean
}

// 取得正確答案
function getCorrectAnswer(question: Question): string {
  const ans = question.answer as Record<string, unknown> | null
  if (!ans) return ""
  if (ans.correct !== undefined) {
    if (typeof ans.correct === "boolean") {
      return ans.correct ? "是" : "否"
    }
    return String(ans.correct)
  }
  if (ans.text !== undefined) {
    return String(ans.text)
  }
  return ""
}

// 格式化時間
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}分${secs}秒`
}

// 格式化日期
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`
}

// PDF 文件元件
function ExamPDFDocument({ exam, examAnswers, userAnswers, includeAnswers }: ExamPDFProps) {
  let questionNumber = 0

  // 計算總題數
  const getTotalQuestionCount = () => {
    let count = 0
    examAnswers.forEach(a => {
      if (a.question?.is_group && a.question.children) {
        count += a.question.children.length
      } else {
        count += 1
      }
    })
    return count
  }

  // 渲染單一題目
  const renderQuestion = (question: Question, score: number, parentNumber?: number) => {
    questionNumber++
    const displayNumber = parentNumber ? `${parentNumber}-${questionNumber}` : `${questionNumber}`
    const userAnswer = userAnswers[question.id] || ""
    const correctAnswer = getCorrectAnswer(question)
    const isCorrect = userAnswer.toLowerCase() === correctAnswer.toLowerCase()
    const questionType = question.question_types?.name || ""
    const questionTypeLabel = question.question_types?.label || "題目"

    return (
      <View key={question.id} style={styles.questionItem} wrap={false}>
        {/* 題目標題 */}
        <View style={styles.questionMeta}>
          <Text style={styles.questionType}>{questionTypeLabel}</Text>
          <Text style={styles.questionScore}>{score} 分</Text>
        </View>

        <View style={styles.questionHeader}>
          <Text style={styles.questionNumber}>{displayNumber}.</Text>
          <Text style={styles.questionContent}>{question.content}</Text>
        </View>

        {/* 選擇題選項 */}
        {(questionType === "single_choice" || questionType === "multiple_choice") && question.options && (
          <View style={styles.optionsContainer}>
            {Object.entries(question.options).map(([key, value]) => (
              <View key={key} style={styles.optionItem}>
                <Text style={styles.optionKey}>{key}.</Text>
                <Text style={styles.optionValue}>{value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 是非題選項 */}
        {questionType === "true_false" && (
          <View style={styles.trueFalseOptions}>
            <Text style={styles.trueFalseOption}>○ 是</Text>
            <Text style={styles.trueFalseOption}>○ 否</Text>
          </View>
        )}

        {/* 填充題作答區（空白試卷） */}
        {!includeAnswers && (questionType === "fill_in_blank" || questionType === "fill_blank" || questionType === "essay" || questionType === "short_answer") && (
          <View style={styles.fillBlankArea}>
            <Text style={styles.fillBlankLabel}>作答區</Text>
          </View>
        )}

        {/* 答案區（含答案版） */}
        {includeAnswers && (
          <View style={styles.answerArea}>
            <Text style={styles.answerCorrect}>正確答案：{correctAnswer}</Text>
            {userAnswer && (
              <Text style={isCorrect ? styles.answerUserCorrect : styles.answerUser}>
                你的答案：{userAnswer} {isCorrect ? "✓" : "✗"}
              </Text>
            )}
          </View>
        )}
      </View>
    )
  }

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        {/* 頁首 */}
        <View style={styles.header} fixed>
          <Text style={styles.headerTitle}>{exam.subjects?.title || "試卷"}</Text>
          <View style={styles.headerInfo}>
            <Text style={styles.headerInfoItem}>試卷編號：{exam.exam_code}</Text>
            <Text style={styles.headerInfoItem}>日期：{formatDate(exam.created_at)}</Text>
            <Text style={styles.headerInfoItem}>題數：{getTotalQuestionCount()} 題</Text>
            <Text style={styles.headerInfoItem}>總分：{exam.total_score} 分</Text>
          </View>

          {/* 空白試卷的作答資訊區 */}
          {!includeAnswers && (
            <View style={styles.answerInfo}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={styles.answerInfoItem}>姓名：</Text>
                <View style={styles.answerBlank} />
              </View>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={styles.answerInfoItem}>得分：</Text>
                <View style={styles.answerBlank} />
              </View>
            </View>
          )}

          {/* 含答案版的成績 */}
          {includeAnswers && exam.earned_score !== null && (
            <View style={styles.scoreBox}>
              <Text style={styles.scoreText}>
                得分：{exam.earned_score} / {exam.total_score} 分
                （答對 {exam.correct_count} / {getTotalQuestionCount()} 題）
                {exam.time_spent_seconds && `　作答時間：${formatTime(exam.time_spent_seconds)}`}
              </Text>
            </View>
          )}
        </View>

        {/* 題目區 */}
        <View style={styles.questionSection}>
          {examAnswers.map((examAnswer) => {
            const question = examAnswer.question
            if (!question) return null

            // 題組
            if (question.is_group && question.children && question.children.length > 0) {
              const childScore = Math.round(examAnswer.score / question.children.length)
              const groupStartNumber = questionNumber + 1

              return (
                <View key={examAnswer.id} style={styles.questionGroup} wrap={false}>
                  <Text style={styles.groupLabel}>【題組】</Text>
                  <Text style={styles.groupContent}>{question.content}</Text>
                  {question.children.map((child) => renderQuestion(child, childScore))}
                </View>
              )
            }

            // 一般題目
            return renderQuestion(question, examAnswer.score)
          })}
        </View>

        {/* 頁尾 */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {includeAnswers ? "（含答案）" : ""}
          </Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  )
}

// 下載按鈕元件
interface ExamPDFDownloadButtonProps {
  exam: Exam
  examAnswers: ExamAnswer[]
  userAnswers: Record<string, string>
  includeAnswers: boolean
  variant?: "outline" | "default"
}

export function ExamPDFDownloadButton({
  exam,
  examAnswers,
  userAnswers,
  includeAnswers,
  variant = "outline",
}: ExamPDFDownloadButtonProps) {
  const [generating, setGenerating] = useState(false)
  const [done, setDone] = useState(false)

  const handleDownload = async () => {
    setGenerating(true)
    setDone(false)

    try {
      const blob = await pdf(
        <ExamPDFDocument
          exam={exam}
          examAnswers={examAnswers}
          userAnswers={userAnswers}
          includeAnswers={includeAnswers}
        />
      ).toBlob()

      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${exam.exam_code}${includeAnswers ? "_含答案" : "_空白試卷"}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setDone(true)
      setTimeout(() => setDone(false), 3000)
    } catch (error) {
      console.error("PDF generation error:", error)
      alert("PDF 生成失敗，請檢查網路連線後再試")
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Button onClick={handleDownload} disabled={generating} variant={variant}>
      {generating ? (
        <>
          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          生成中...
        </>
      ) : done ? (
        <>
          <Check className="w-4 h-4 mr-1" />
          完成
        </>
      ) : (
        <>
          <FileDown className="w-4 h-4 mr-1" />
          {includeAnswers ? "含答案" : "空白試卷"}
        </>
      )}
    </Button>
  )
}

export default ExamPDFDocument
