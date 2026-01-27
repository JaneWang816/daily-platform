// apps/learning/src/app/dashboard/portfolio/export/pdf-document.tsx
"use client"

import { useState } from "react"
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
  Link,
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
// 返回格式：['字', '', '元', ''] - 空字串表示可以在此斷開但不加連字符
Font.registerHyphenationCallback((word) => {
  // 把每個字元後面加上空字串，表示這裡可以換行但不要加連字符
  const result: string[] = []
  for (const char of word) {
    result.push(char)
    result.push('') // 空字串 = 可斷點但無連字符
  }
  return result
})

// 文字處理（不再需要插入零寬空格）
function processTextForWrapping(text: string): string {
  if (!text) return ''
  return text
}

// PDF 樣式
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
    fontSize: 28,
    color: "#1e293b",
    marginBottom: 24,
  },
  coverSubtitle: {
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
  headerTitle: {
    fontSize: 8,
    color: "#94a3b8",
  },
  pageNumber: {
    fontSize: 8,
    color: "#94a3b8",
  },
  // 歷程卡片
  portfolioCard: {
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  portfolioTitle: {
    fontSize: 14,
    color: "#111827",
    marginBottom: 8,
  },
  portfolioMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 10,
  },
  metaItem: {
    fontSize: 9,
    color: "#6b7280",
    marginRight: 16,
    marginBottom: 4,
  },
  // 內容區塊
  section: {
    marginTop: 14,
  },
  sectionLabel: {
    fontSize: 10,
    color: "#374151",
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
  },
  // 學生內容區塊（加外框）
  contentBox: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 4,
    padding: 12,
  },
  sectionContent: {
    fontSize: 10,
    color: "#111827",
    lineHeight: 1.8,
    marginBottom: 6,
  },
  // 單元標籤
  unitTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
  },
  unitTag: {
    fontSize: 8,
    color: "#4f46e5",
    backgroundColor: "#eef2ff",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginRight: 6,
    marginBottom: 4,
  },
  // 連結
  linkList: {
    marginTop: 6,
  },
  linkItem: {
    fontSize: 9,
    color: "#1d4ed8",
    marginBottom: 4,
  },
  // 照片
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  photo: {
    width: 120,
    height: 90,
    objectFit: "cover",
    borderRadius: 4,
    marginRight: 8,
    marginBottom: 8,
  },
  photoLarge: {
    width: "100%",
    maxHeight: 300,
    objectFit: "contain",
    borderRadius: 4,
    marginTop: 8,
  },
  // 頁尾
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "center",
  },
  footerText: {
    fontSize: 8,
    color: "#cbd5e1",
  },
})

// 類型對照（移除 emoji，字型不支援）
const LOG_TYPE_MAP: Record<string, { label: string }> = {
  study: { label: "課堂學習" },
  experiment: { label: "實驗記錄" },
  visit: { label: "參訪活動" },
  reading: { label: "延伸閱讀" },
  reflection: { label: "反思統整" },
}

// 連結類型對照
const LINK_TYPE_MAP: Record<string, string> = {
  website: "[網站]",
  video: "[影片]",
  article: "[文章]",
  document: "[文件]",
}

// 格式化日期
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`
}

// 格式化時長
function formatDuration(minutes: number | null | undefined): string {
  if (!minutes) return ""
  if (minutes < 60) return `${minutes}分鐘`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) return `${hours}小時`
  return `${hours}小時${mins}分鐘`
}

// Portfolio 類型定義（與 export page 一致）
interface PortfolioData {
  id: string
  title: string
  study_date: string
  log_type: string
  content: { text?: string } | null
  reflection: string | null
  duration_minutes: number | null
  location: string | null
  photos: string[] | null
  subject: { id: string; title: string } | null
  topic: { id: string; title: string } | null
  links: { id: string; url: string; title: string | null; link_type: string | null }[]
  units: { unit: { id: string; title: string } | null }[]
}

interface PDFDocumentProps {
  portfolios: PortfolioData[]
  filterInfo?: {
    month?: string
    subjects?: string[]
  }
}

// PDF 文件元件
function PortfolioPDFDocument({ portfolios, filterInfo }: PDFDocumentProps) {
  const today = new Date()
  const exportDate = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, "0")}/${String(today.getDate()).padStart(2, "0")}`

  return (
    <Document>
      {/* 封面頁 */}
      <Page size="A4" style={styles.coverPage}>
        <Text style={styles.coverTitle}>學習歷程檔案</Text>
        {filterInfo?.month && (
          <Text style={styles.coverSubtitle}>{filterInfo.month}</Text>
        )}
        {filterInfo?.subjects && filterInfo.subjects.length > 0 && (
          <Text style={styles.coverSubtitle}>
            {filterInfo.subjects.join("、")}
          </Text>
        )}
        <Text style={styles.coverSubtitle}>共 {portfolios.length} 筆紀錄</Text>
        <Text style={styles.coverInfo}>匯出日期：{exportDate}</Text>
      </Page>

      {/* 內容頁 */}
      <Page size="A4" style={styles.page} wrap>
        {/* 頁首 */}
        <View style={styles.header} fixed>
          <Text style={styles.headerTitle}>學習歷程檔案</Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) =>
              `${pageNumber} / ${totalPages}`
            }
          />
        </View>

        {/* 歷程列表 */}
        {portfolios.map((portfolio, index) => {
          const typeInfo = LOG_TYPE_MAP[portfolio.log_type] || LOG_TYPE_MAP.study
          const contentText = portfolio.content?.text || ""
          const units = portfolio.units
            .map((u) => u.unit)
            .filter((u): u is { id: string; title: string } => u !== null)

          return (
            <View key={portfolio.id} style={styles.portfolioCard} wrap={true}>
              {/* 標題區 */}
              <Text style={styles.portfolioTitle}>{processTextForWrapping(portfolio.title)}</Text>
              <View style={styles.portfolioMeta}>
                <Text style={styles.metaItem}>
                  {formatDate(portfolio.study_date)}
                </Text>
                <Text style={styles.metaItem}>{typeInfo.label}</Text>
                {portfolio.subject && (
                  <Text style={styles.metaItem}>
                    {portfolio.subject.title}
                  </Text>
                )}
                {portfolio.topic && (
                  <Text style={styles.metaItem}>
                    {portfolio.topic.title}
                  </Text>
                )}
                {portfolio.duration_minutes && (
                  <Text style={styles.metaItem}>
                    {formatDuration(portfolio.duration_minutes)}
                  </Text>
                )}
                {portfolio.location && (
                  <Text style={styles.metaItem}>{processTextForWrapping(portfolio.location)}</Text>
                )}
              </View>

              {/* 學習內容 */}
              {contentText && (
                <View style={styles.section} wrap={true}>
                  <Text style={styles.sectionLabel}>學習內容</Text>
                  <View style={styles.contentBox}>
                    {contentText.split('\n').filter(p => p.trim()).map((paragraph, idx) => (
                      <Text key={idx} style={styles.sectionContent}>
                        {processTextForWrapping(paragraph)}
                      </Text>
                    ))}
                  </View>
                </View>
              )}

              {/* 心得反思 */}
              {portfolio.reflection && (
                <View style={styles.section} wrap={true}>
                  <Text style={styles.sectionLabel}>心得反思</Text>
                  <View style={styles.contentBox}>
                    {portfolio.reflection.split('\n').filter(p => p.trim()).map((paragraph, idx) => (
                      <Text key={idx} style={styles.sectionContent}>
                        {processTextForWrapping(paragraph)}
                      </Text>
                    ))}
                  </View>
                </View>
              )}

              {/* 關聯單元 */}
              {units.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>關聯單元</Text>
                  <View style={styles.unitTags}>
                    {units.map((unit) => (
                      <Text key={unit.id} style={styles.unitTag}>
                        {unit.title}
                      </Text>
                    ))}
                  </View>
                </View>
              )}

              {/* 參考連結 */}
              {portfolio.links.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>參考連結</Text>
                  <View style={styles.linkList}>
                    {portfolio.links.map((link) => (
                      <Link key={link.id} src={link.url} style={styles.linkItem}>
                        {LINK_TYPE_MAP[link.link_type || "website"] || "[連結]"}{" "}
                        {link.title || link.url}
                      </Link>
                    ))}
                  </View>
                </View>
              )}

              {/* 照片 */}
              {portfolio.photos && portfolio.photos.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>
                    照片（{portfolio.photos.length}張）
                  </Text>
                  <View style={styles.photoGrid}>
                    {portfolio.photos.slice(0, 6).map((photo, photoIndex) => (
                      <Image
                        key={photoIndex}
                        src={photo}
                        style={
                          portfolio.photos!.length === 1
                            ? styles.photoLarge
                            : styles.photo
                        }
                      />
                    ))}
                  </View>
                </View>
              )}
            </View>
          )
        })}

        {/* 頁尾 */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Generated by Daily Platform
          </Text>
        </View>
      </Page>
    </Document>
  )
}

// 下載按鈕元件
interface PDFDownloadButtonProps {
  portfolios: PortfolioData[]
  fileName: string
  filterInfo?: {
    month?: string
    subjects?: string[]
  }
}

export function PDFDownloadButton({
  portfolios,
  fileName,
  filterInfo,
}: PDFDownloadButtonProps) {
  const [generating, setGenerating] = useState(false)
  const [done, setDone] = useState(false)

  const handleDownload = async () => {
    setGenerating(true)
    setDone(false)

    try {
      // 生成 PDF blob
      const blob = await pdf(
        <PortfolioPDFDocument portfolios={portfolios} filterInfo={filterInfo} />
      ).toBlob()

      // 建立下載連結
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = fileName
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
    <Button
      onClick={handleDownload}
      disabled={generating}
      className="w-full bg-indigo-600 hover:bg-indigo-700"
    >
      {generating ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          生成中...
        </>
      ) : done ? (
        <>
          <Check className="w-4 h-4 mr-2" />
          下載完成
        </>
      ) : (
        <>
          <FileDown className="w-4 h-4 mr-2" />
          匯出 PDF（{portfolios.length} 筆）
        </>
      )}
    </Button>
  )
}

export default PortfolioPDFDocument
