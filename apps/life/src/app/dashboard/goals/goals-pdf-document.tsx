// apps/life/src/app/dashboard/goals/goals-pdf-document.tsx
"use client"

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  pdf,
} from "@react-pdf/renderer"
import { format } from "date-fns"

// 註冊中文字型（與 portfolio 相同路徑）
Font.register({
  family: "NotoSansSC",
  src: "/fonts/NotoSansSC-Regular.ttf",
})

// 每個字元可斷行，不加連字符
Font.registerHyphenationCallback((word) => {
  const result: string[] = []
  for (const char of word) {
    result.push(char)
    result.push("")
  }
  return result
})

// 移除 emoji（NotoSansSC 不支援，會顯示亂碼）
function stripEmoji(text: string): string {
  if (!text) return ""
  return text
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, "")   // 大部分 emoji
    .replace(/[\u{2600}-\u{27BF}]/gu, "")       // 符號類 emoji
    .replace(/[\uFE00-\uFE0F]/gu, "")           // variation selectors
    .replace(/[\u200D]/gu, "")                  // zero width joiner
    .trim()
}

// ============================================
// 樣式
// ============================================
const styles = StyleSheet.create({
  page: {
    fontFamily: "NotoSansSC",
    fontSize: 10,
    padding: 40,
    backgroundColor: "#ffffff",
  },
  // 封面
  coverPage: {
    fontFamily: "NotoSansSC",
    padding: 60,
    backgroundColor: "#ffffff",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
  },
  coverTitle: {
    fontSize: 26,
    color: "#1e3a8a",
    marginBottom: 16,
  },
  coverSub: {
    fontSize: 14,
    color: "#475569",
    marginBottom: 8,
  },
  coverInfo: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 40,
  },
  // 頁首
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerTitle: { fontSize: 8, color: "#94a3b8" },
  pageNumber: { fontSize: 8, color: "#94a3b8" },
  // 摘要區塊
  summaryBox: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#f8fafc",
    borderRadius: 6,
    padding: 16,
    marginBottom: 24,
  },
  summaryItem: { alignItems: "center" },
  summaryNumber: { fontSize: 20, color: "#1e3a8a" },
  summaryLabel: { fontSize: 9, color: "#64748b", marginTop: 4 },
  // 區塊標題
  sectionTitle: {
    fontSize: 11,
    color: "#1e293b",
    marginBottom: 12,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  // 目標卡片
  goalCard: {
    marginBottom: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 6,
    backgroundColor: "#fafafa",
  },
  goalCardAchieved: {
    borderColor: "#bbf7d0",
    backgroundColor: "#f0fdf4",
  },
  goalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  goalTitle: { fontSize: 11, color: "#111827", flex: 1 },
  badge: {
    fontSize: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 8,
  },
  badgeAchieved: { color: "#15803d", backgroundColor: "#dcfce7" },
  badgePending: { color: "#9a3412", backgroundColor: "#fee2e2" },
  goalProgress: { fontSize: 9, color: "#6b7280", marginBottom: 4 },
  goalCompletedAt: { fontSize: 8, color: "#10b981" },
  // 書單
  bookListTitle: { fontSize: 9, color: "#374151", marginTop: 8, marginBottom: 4 },
  bookItem: { fontSize: 9, color: "#4b5563", marginBottom: 3, marginLeft: 8 },
  bookNote: { fontSize: 8, color: "#ef4444", marginTop: 4, marginLeft: 8 },
  // 頁尾
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "center",
  },
  footerText: { fontSize: 8, color: "#cbd5e1" },
})

// ============================================
// 型別
// ============================================
export interface GoalExportData {
  id: string
  title: string
  icon: string | null
  goal_type: string | null
  track_source: string | null
  status: string | null
  direction: string | null
  period_type: string | null
  target_value: number | null
  target_count: number | null
  period_target: number | null
  start_value: number | null
  unit: string | null
  completed_at: string | null
  // 計算後的本月進度
  _currentCount: number
  _currentValue: number
  _achieved: boolean
}

export interface BookExportData {
  title: string
  author: string | null
  date: string
}

interface GoalsPDFProps {
  year: number
  month: number
  goals: GoalExportData[]
  books: BookExportData[]
}

// ============================================
// PDF 文件元件
// ============================================
function GoalsPDFDocument({ year, month, goals, books }: GoalsPDFProps) {
  const exportDate = format(new Date(), "yyyy/MM/dd HH:mm")
  const monthLabel = `${year} 年 ${month} 月`

  const achieved = goals.filter((g) => g._achieved)
  const notAchieved = goals.filter((g) => !g._achieved)
  const achieveRate = goals.length > 0 ? Math.round((achieved.length / goals.length) * 100) : 0

  // 讀書目標（用來對應書單）
  const readingGoals = goals.filter((g) => g.track_source === "reading_books")

  function getProgressText(goal: GoalExportData): string {
    switch (goal.goal_type) {
      case "count":
      case "streak": {
        const target =
          goal.period_type !== "once"
            ? (goal.period_target ?? 0)
            : (goal.target_count ?? 0)
        return `${goal._currentCount} / ${target} ${goal.unit || "次"}`
      }
      case "numeric":
        return `${goal._currentValue} / ${goal.target_value ?? 0} ${goal.unit || ""}`
      case "countdown":
        return ""
      default:
        return ""
    }
  }

  return (
    <Document>
      {/* 封面 */}
      <Page size="A4" style={styles.coverPage}>
        <Text style={styles.coverTitle}>目標達成報告</Text>
        <Text style={styles.coverSub}>{monthLabel}</Text>
        <Text style={styles.coverSub}>
          共 {goals.length} 個目標　　達成 {achieved.length} 個（{achieveRate}%）
        </Text>
        <Text style={styles.coverInfo}>匯出日期：{exportDate}</Text>
      </Page>

      {/* 內容頁 */}
      <Page size="A4" style={styles.page} wrap>
        {/* 頁首 */}
        <View style={styles.header} fixed>
          <Text style={styles.headerTitle}>{monthLabel} 目標達成報告</Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>

        {/* 摘要 */}
        <View style={styles.summaryBox}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{goals.length}</Text>
            <Text style={styles.summaryLabel}>目標總數</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, { color: "#16a34a" }]}>{achieved.length}</Text>
            <Text style={styles.summaryLabel}>已達成</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, { color: "#dc2626" }]}>{notAchieved.length}</Text>
            <Text style={styles.summaryLabel}>未達成</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, { color: "#2563eb" }]}>{achieveRate}%</Text>
            <Text style={styles.summaryLabel}>達成率</Text>
          </View>
        </View>

        {/* 目標列表 */}
        <Text style={styles.sectionTitle}>目標達成狀況</Text>
        {goals.map((goal) => {
          const progressText = getProgressText(goal)
          return (
            <View
              key={goal.id}
              style={[styles.goalCard, goal._achieved ? styles.goalCardAchieved : {}]}
              wrap={false}
            >
              <View style={styles.goalHeader}>
                <Text style={styles.goalTitle}>
                  {stripEmoji(goal.title)}
                </Text>
                <Text style={[styles.badge, goal._achieved ? styles.badgeAchieved : styles.badgePending]}>
                  {goal._achieved ? "已達成" : "未達成"}
                </Text>
              </View>
              {progressText ? (
                <Text style={styles.goalProgress}>進度：{progressText}</Text>
              ) : null}
              {goal.completed_at ? (
                <Text style={styles.goalCompletedAt}>
                  達成日期：{format(new Date(goal.completed_at), "yyyy/MM/dd")}
                </Text>
              ) : null}
            </View>
          )
        })}

        {/* 本月書單（有讀書目標才顯示） */}
        {readingGoals.length > 0 && (
          <View style={{ marginTop: 20 }} wrap={false}>
            <Text style={styles.sectionTitle}>本月讀完書籍</Text>
            {books.length === 0 ? (
              <Text style={styles.goalProgress}>本月尚無完成記錄</Text>
            ) : (
              <>
                {books.map((book, i) => (
                  <Text key={i} style={styles.bookItem}>
                    {i + 1}.  {stripEmoji(book.title)}
                    {book.author ? `（${book.author}）` : ""}
                    {"   "}
                    {book.date}
                  </Text>
                ))}
                {/* 防重刷提示 */}
                {(() => {
                  const uniqueTitles = new Set(books.map((b) => b.title))
                  const dupCount = books.length - uniqueTitles.size
                  return dupCount > 0 ? (
                    <Text style={styles.bookNote}>
                      注意：本月有 {dupCount} 筆書名重複，請確認是否為同一本書。
                    </Text>
                  ) : null
                })()}
              </>
            )}
          </View>
        )}

        {/* 頁尾 */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Generated by Daily Platform</Text>
        </View>
      </Page>
    </Document>
  )
}

// ============================================
// 匯出函數（供 page.tsx 呼叫）
// ============================================
export async function generateGoalsPDF(
  year: number,
  month: number,
  goals: GoalExportData[],
  books: BookExportData[]
): Promise<void> {
  const blob = await pdf(
    <GoalsPDFDocument year={year} month={month} goals={goals} books={books} />
  ).toBlob()

  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `目標達成報告_${year}${String(month).padStart(2, "0")}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default GoalsPDFDocument
