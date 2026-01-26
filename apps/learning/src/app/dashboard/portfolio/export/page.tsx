// apps/learning/src/app/dashboard/portfolio/export/page.tsx
"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import dynamic from "next/dynamic"
import { createClient } from "@daily/database/client"
import type { Tables } from "@daily/database"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Checkbox,
} from "@daily/ui"
import {
  ArrowLeft,
  FileDown,
  Loader2,
  Filter,
  Calendar,
  BookOpen,
  FileText,
  Clock,
  Image as ImageIcon,
  Link as LinkIcon,
} from "lucide-react"

// 動態載入 PDF 元件（避免 SSR 問題）
const PDFDownloadButton = dynamic(
  () => import("./pdf-document").then(mod => mod.PDFDownloadButton),
  { ssr: false, loading: () => <Button disabled><Loader2 className="w-4 h-4 mr-2 animate-spin" />載入中...</Button> }
)

// 類型定義
type Subject = Tables<'subjects'>

// 歷程資料類型（匯出用）
interface PortfolioForExport {
  id: string
  title: string
  study_date: string
  log_type: string
  content: { text?: string } | null
  reflection: string | null
  duration_minutes: number | null
  location: string | null
  photos: string[] | null
  subject_id: string
  subject: { id: string; title: string } | null
  topic: { id: string; title: string } | null
  links: { id: string; url: string; title: string | null; link_type: string | null }[]
  units: { unit: { id: string; title: string } | null }[]
}

// 類型對照
const LOG_TYPE_MAP: Record<string, { label: string; icon: string; color: string }> = {
  study: { label: '課堂學習', icon: '📝', color: 'text-blue-600' },
  experiment: { label: '實驗記錄', icon: '🧪', color: 'text-green-600' },
  visit: { label: '參訪活動', icon: '🏛️', color: 'text-purple-600' },
  reading: { label: '延伸閱讀', icon: '📖', color: 'text-amber-600' },
  reflection: { label: '反思統整', icon: '💭', color: 'text-pink-600' },
}

// 格式化日期
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
}

// 格式化時長
function formatDuration(minutes: number | null | undefined): string {
  if (!minutes) return ''
  if (minutes < 60) return `${minutes}分鐘`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) return `${hours}小時`
  return `${hours}小時${mins}分鐘`
}

// 取得月份選項（最近 12 個月）
function getMonthOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = []
  const today = new Date()
  
  for (let i = 0; i < 12; i++) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const label = `${date.getFullYear()} 年 ${date.getMonth() + 1} 月`
    options.push({ value, label })
  }
  
  return options
}

export default function ExportPortfolioPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  // 篩選條件
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([])
  const [selectedMonth, setSelectedMonth] = useState<string>("")

  // 歷程資料
  const [portfolios, setPortfolios] = useState<PortfolioForExport[]>([])
  const [filteredPortfolios, setFilteredPortfolios] = useState<PortfolioForExport[]>([])

  // 月份選項
  const monthOptions = getMonthOptions()

  // 取得科目列表
  const fetchSubjects = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from("subjects")
      .select("*")
      .eq("user_id", user.id)
      .order("title")

    if (data) {
      setSubjects(data)
    }
  }, [])

  // 取得所有歷程
  const fetchPortfolios = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 定義查詢結果類型
    type PortfolioQueryResult = {
      id: string
      title: string
      study_date: string
      log_type: string
      content: { text?: string } | null
      reflection: string | null
      duration_minutes: number | null
      location: string | null
      photos: string[] | null
      subject_id: string
      subject: { id: string; title: string } | null
      topic: { id: string; title: string } | null
      links: { id: string; url: string; title: string | null; link_type: string | null }[]
    }

    // 先取得歷程主資料和基本關聯
    const { data, error } = await supabase
      .from("learning_portfolios")
      .select(`
        *,
        subject:subjects(id, title),
        topic:topics(id, title),
        links:learning_portfolio_links(id, url, title, link_type)
      `)
      .eq("user_id", user.id)
      .order("study_date", { ascending: false })

    if (error) {
      console.error("Error fetching portfolios:", error)
      setLoading(false)
      return
    }

    // 類型斷言
    const portfolioData = (data || []) as PortfolioQueryResult[]

    if (portfolioData.length === 0) {
      setPortfolios([])
      setLoading(false)
      return
    }

    // 取得所有歷程的關聯單元
    const portfolioIds = portfolioData.map(p => p.id)
    const { data: unitRelations } = await supabase
      .from("learning_portfolio_units")
      .select(`
        portfolio_id,
        unit:units(id, title)
      `)
      .in("portfolio_id", portfolioIds)

    // 類型斷言
    const unitData = (unitRelations || []) as { portfolio_id: string; unit: { id: string; title: string } | null }[]

    // 組合資料
    const portfoliosWithUnits: PortfolioForExport[] = portfolioData.map(portfolio => {
      const portfolioUnits = unitData
        .filter(ur => ur.portfolio_id === portfolio.id)
        .map(ur => ({ unit: ur.unit }))

      return {
        id: portfolio.id,
        title: portfolio.title,
        study_date: portfolio.study_date,
        log_type: portfolio.log_type,
        content: portfolio.content,
        reflection: portfolio.reflection,
        duration_minutes: portfolio.duration_minutes,
        location: portfolio.location,
        photos: portfolio.photos,
        subject_id: portfolio.subject_id,
        subject: portfolio.subject,
        topic: portfolio.topic,
        links: portfolio.links || [],
        units: portfolioUnits,
      }
    })

    setPortfolios(portfoliosWithUnits)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchSubjects()
    fetchPortfolios()
  }, [fetchSubjects, fetchPortfolios])

  // 篩選歷程
  useEffect(() => {
    let filtered = [...portfolios]

    // 按科目篩選
    if (selectedSubjectIds.length > 0) {
      filtered = filtered.filter(p => selectedSubjectIds.includes(p.subject_id))
    }

    // 按月份篩選
    if (selectedMonth && selectedMonth !== "all") {
      const [year, month] = selectedMonth.split("-")
      filtered = filtered.filter(p => {
        const date = new Date(p.study_date)
        return date.getFullYear() === parseInt(year) && 
               date.getMonth() + 1 === parseInt(month)
      })
    }

    // 依日期排序（舊到新，PDF 閱讀順序）
    filtered.sort((a, b) => 
      new Date(a.study_date).getTime() - new Date(b.study_date).getTime()
    )

    setFilteredPortfolios(filtered)
  }, [portfolios, selectedSubjectIds, selectedMonth])

  // 切換科目選取
  const toggleSubjectSelection = (subjectId: string) => {
    setSelectedSubjectIds(prev =>
      prev.includes(subjectId)
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    )
  }

  // 全選/取消全選科目
  const toggleAllSubjects = () => {
    if (selectedSubjectIds.length === subjects.length) {
      setSelectedSubjectIds([])
    } else {
      setSelectedSubjectIds(subjects.map(s => s.id))
    }
  }

  // 計算統計
  const stats = {
    count: filteredPortfolios.length,
    totalMinutes: filteredPortfolios.reduce((sum, p) => sum + (p.duration_minutes || 0), 0),
    photoCount: filteredPortfolios.reduce((sum, p) => sum + (p.photos?.length || 0), 0),
    linkCount: filteredPortfolios.reduce((sum, p) => sum + (p.links?.length || 0), 0),
  }

  // 生成檔案名稱
  const getFileName = () => {
    const parts = ["學習歷程"]
    
    if (selectedMonth && selectedMonth !== "all") {
      const [year, month] = selectedMonth.split("-")
      parts.push(`${year}年${month}月`)
    }
    
    if (selectedSubjectIds.length === 1) {
      const subject = subjects.find(s => s.id === selectedSubjectIds[0])
      if (subject) parts.push(subject.title)
    } else if (selectedSubjectIds.length > 1 && selectedSubjectIds.length < subjects.length) {
      parts.push(`${selectedSubjectIds.length}科目`)
    }
    
    return parts.join("_") + ".pdf"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* 頁面標題 */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/portfolio"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">匯出學習歷程</h1>
          <p className="text-sm text-gray-500 mt-1">
            選擇篩選條件，匯出成 PDF 檔案
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左側：篩選條件 */}
        <div className="lg:col-span-1 space-y-6">
          {/* 月份篩選 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                月份
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={selectedMonth}
                onValueChange={setSelectedMonth}
              >
                <SelectTrigger>
                  <SelectValue placeholder="全部月份" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部月份</SelectItem>
                  {monthOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedMonth && selectedMonth !== "all" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-gray-500"
                  onClick={() => setSelectedMonth("")}
                >
                  清除篩選
                </Button>
              )}
            </CardContent>
          </Card>

          {/* 科目篩選 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  科目
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleAllSubjects}
                  className="text-xs"
                >
                  {selectedSubjectIds.length === subjects.length ? "取消全選" : "全選"}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {subjects.length === 0 ? (
                <p className="text-sm text-gray-500">尚無科目</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {subjects.map(subject => (
                    <label
                      key={subject.id}
                      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors text-sm ${
                        selectedSubjectIds.includes(subject.id)
                          ? "bg-indigo-50"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <Checkbox
                        checked={selectedSubjectIds.includes(subject.id)}
                        onCheckedChange={() => toggleSubjectSelection(subject.id)}
                      />
                      <span className="truncate">{subject.title}</span>
                    </label>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 匯出統計 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="w-4 h-4" />
                匯出內容
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">歷程筆數</span>
                  <span className="font-medium">{stats.count} 筆</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">總學習時長</span>
                  <span className="font-medium">
                    {stats.totalMinutes > 0 ? formatDuration(stats.totalMinutes) : "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">照片數量</span>
                  <span className="font-medium">{stats.photoCount} 張</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">參考連結</span>
                  <span className="font-medium">{stats.linkCount} 個</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 匯出按鈕 */}
          <Card className="bg-indigo-50 border-indigo-200">
            <CardContent className="pt-6">
              {filteredPortfolios.length === 0 ? (
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-3">
                    沒有符合條件的歷程
                  </p>
                  <Button disabled className="w-full">
                    <FileDown className="w-4 h-4 mr-2" />
                    匯出 PDF
                  </Button>
                </div>
              ) : (
                <PDFDownloadButton
                  portfolios={filteredPortfolios}
                  fileName={getFileName()}
                  filterInfo={{
                    month: selectedMonth && selectedMonth !== "all" 
                      ? monthOptions.find(m => m.value === selectedMonth)?.label 
                      : undefined,
                    subjects: selectedSubjectIds.length > 0 && selectedSubjectIds.length < subjects.length
                      ? subjects.filter(s => selectedSubjectIds.includes(s.id)).map(s => s.title)
                      : undefined,
                  }}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* 右側：預覽列表 */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4" />
                預覽（{filteredPortfolios.length} 筆）
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredPortfolios.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">
                    {portfolios.length === 0 
                      ? "尚無學習歷程" 
                      : "沒有符合篩選條件的歷程"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {filteredPortfolios.map((portfolio, index) => {
                    const typeInfo = LOG_TYPE_MAP[portfolio.log_type] || LOG_TYPE_MAP.study
                    const contentText = portfolio.content?.text || ""
                    
                    return (
                      <div
                        key={portfolio.id}
                        className="p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-gray-400 text-sm font-mono">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg">{typeInfo.icon}</span>
                              <span className="font-medium text-gray-800 truncate">
                                {portfolio.title}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                              <span>{formatDate(portfolio.study_date)}</span>
                              <span>{portfolio.subject?.title}</span>
                              <span>{portfolio.topic?.title}</span>
                              {portfolio.duration_minutes && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatDuration(portfolio.duration_minutes)}
                                </span>
                              )}
                              {(portfolio.photos?.length || 0) > 0 && (
                                <span className="flex items-center gap-1">
                                  <ImageIcon className="w-3 h-3" />
                                  {portfolio.photos?.length}
                                </span>
                              )}
                              {portfolio.links.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <LinkIcon className="w-3 h-3" />
                                  {portfolio.links.length}
                                </span>
                              )}
                            </div>
                            {contentText && (
                              <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                                {contentText}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
