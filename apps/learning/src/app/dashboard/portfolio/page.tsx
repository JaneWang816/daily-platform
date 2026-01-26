// apps/learning/src/app/dashboard/portfolio/page.tsx
"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@daily/database/client"
import type { Tables } from "@daily/database"
import { FileDown } from "lucide-react"
import {
  Card,
  CardContent,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@daily/ui"
import {
  Plus,
  FolderOpen,
  Search,
  Link as LinkIcon,
  Image as ImageIcon,
  Clock,
  MoreVertical,
  Pencil,
  Trash2,
  Filter,
} from "lucide-react"

// 使用 Supabase 生成的類型
type LearningPortfolio = Tables<'learning_portfolios'>
type Subject = Tables<'subjects'>

// 歷程類型定義
type PortfolioLogType = 'study' | 'experiment' | 'visit' | 'reading' | 'reflection'

// 擴展類型（含關聯資料）
interface LearningPortfolioWithRelations extends LearningPortfolio {
  subject: { id: string; title: string } | null
  topic: { id: string; title: string } | null
  link_count?: number
}

// 類型對照
const LOG_TYPE_MAP: Record<PortfolioLogType, { label: string; icon: string; color: string; bgColor: string }> = {
  study: { label: '課堂學習', icon: '📝', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  experiment: { label: '實驗記錄', icon: '🧪', color: 'text-green-600', bgColor: 'bg-green-100' },
  visit: { label: '參訪活動', icon: '🏛️', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  reading: { label: '延伸閱讀', icon: '📖', color: 'text-amber-600', bgColor: 'bg-amber-100' },
  reflection: { label: '反思統整', icon: '💭', color: 'text-pink-600', bgColor: 'bg-pink-100' },
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

// 格式化日期為年月
function formatYearMonth(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.getFullYear()}年${date.getMonth() + 1}月`
}

// 格式化日期
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
}

export default function PortfolioPage() {
  const router = useRouter()
  const [portfolios, setPortfolios] = useState<LearningPortfolioWithRelations[]>([])
  const [subjects, setSubjects] = useState<Pick<Subject, 'id' | 'title'>[]>([])
  const [loading, setLoading] = useState(true)

  // 篩選狀態
  const [filterSubject, setFilterSubject] = useState<string>("all")
  const [filterType, setFilterType] = useState<string>("all")
  const [filterMonth, setFilterMonth] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")

  // 刪除確認
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [portfolioToDelete, setPortfolioToDelete] = useState<LearningPortfolioWithRelations | null>(null)

  // 下拉選單
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  // 取得可選的月份列表
  const [availableMonths, setAvailableMonths] = useState<string[]>([])

  const fetchData = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 取得科目列表
    const { data: subjectsData } = await supabase
      .from("subjects")
      .select("id, title")
      .eq("user_id", user.id)
      .order("title")

    if (subjectsData) {
      setSubjects(subjectsData)
    }

    // 取得學習歷程列表（含關聯）
    const { data: portfoliosData } = await supabase
      .from("learning_portfolios")
      .select(`
        *,
        subject:subjects(id, title),
        topic:topics(id, title)
      `)
      .eq("user_id", user.id)
      .order("study_date", { ascending: false })

    if (portfoliosData) {
      const typedData = portfoliosData as unknown as LearningPortfolioWithRelations[]
      
      // 取得每筆歷程的連結數量
      const portfoliosWithLinkCount = await Promise.all(
        typedData.map(async (portfolio) => {
          const { count } = await supabase
            .from("learning_portfolio_links")
            .select("*", { count: "exact", head: true })
            .eq("portfolio_id", portfolio.id)
          return { ...portfolio, link_count: count || 0 }
        })
      )
      setPortfolios(portfoliosWithLinkCount)

      // 取得可選月份
      const months = [...new Set(typedData.map(p => {
        const date = new Date(p.study_date)
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      }))].sort().reverse()
      setAvailableMonths(months)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // 篩選邏輯
  const filteredPortfolios = portfolios.filter((portfolio) => {
    // 科目篩選
    if (filterSubject !== "all" && portfolio.subject_id !== filterSubject) {
      return false
    }
    // 類型篩選
    if (filterType !== "all" && portfolio.log_type !== filterType) {
      return false
    }
    // 月份篩選
    if (filterMonth !== "all") {
      const date = new Date(portfolio.study_date)
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (month !== filterMonth) return false
    }
    // 搜尋
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchTitle = portfolio.title.toLowerCase().includes(query)
      const matchSubject = portfolio.subject?.title.toLowerCase().includes(query)
      const matchTopic = portfolio.topic?.title.toLowerCase().includes(query)
      if (!matchTitle && !matchSubject && !matchTopic) return false
    }
    return true
  })

  // 依月份分組
  const groupedPortfolios = filteredPortfolios.reduce((acc, portfolio) => {
    const yearMonth = formatYearMonth(portfolio.study_date)
    if (!acc[yearMonth]) {
      acc[yearMonth] = []
    }
    acc[yearMonth].push(portfolio)
    return acc
  }, {} as Record<string, LearningPortfolioWithRelations[]>)

  // 刪除處理
  const handleDelete = async () => {
    if (!portfolioToDelete) return

    const supabase = createClient()
    await supabase
      .from("learning_portfolios")
      .delete()
      .eq("id", portfolioToDelete.id)

    setDeleteDialogOpen(false)
    setPortfolioToDelete(null)
    fetchData()
  }

  const confirmDelete = (portfolio: LearningPortfolioWithRelations) => {
    setPortfolioToDelete(portfolio)
    setDeleteDialogOpen(true)
    setOpenMenuId(null)
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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">學習歷程</h1>
          <p className="text-gray-600 mt-1">記錄你的學習過程與心得</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/portfolio/export">
            <Button variant="outline">匯出學習單</Button>
          </Link>

          <Button onClick={() => router.push("/dashboard/portfolio/new")}>
            新增記錄
          </Button>
        </div>
      </div>

      {/* 篩選工具列 */}
      <div className="flex flex-wrap items-center gap-3">
        {/* 科目篩選 */}
        <Select value={filterSubject} onValueChange={setFilterSubject}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="所有科目" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">所有科目</SelectItem>
            {subjects.map((subject) => (
              <SelectItem key={subject.id} value={subject.id}>
                {subject.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 類型篩選 */}
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="所有類型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">所有類型</SelectItem>
            {Object.entries(LOG_TYPE_MAP).map(([value, { label, icon }]) => (
              <SelectItem key={value} value={value}>
                {icon} {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 月份篩選 */}
        <Select value={filterMonth} onValueChange={setFilterMonth}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="所有月份" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">所有月份</SelectItem>
            {availableMonths.map((month) => {
              const [year, m] = month.split('-')
              return (
                <SelectItem key={month} value={month}>
                  {year}年{parseInt(m)}月
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>

        {/* 搜尋 */}
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="搜尋標題、科目..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* 統計 */}
        <span className="text-sm text-gray-500 ml-auto">
          共 {filteredPortfolios.length} 筆記錄
        </span>
      </div>

      {/* 歷程列表 */}
      {portfolios.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <FolderOpen className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 mb-4">還沒有任何學習歷程</p>
            <Button 
              onClick={() => router.push("/dashboard/portfolio/new")} 
              variant="outline"
            >
              <Plus className="w-4 h-4 mr-2" />
              建立第一筆記錄
            </Button>
          </CardContent>
        </Card>
      ) : filteredPortfolios.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Filter className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500">沒有符合篩選條件的記錄</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedPortfolios).map(([yearMonth, items]) => (
            <div key={yearMonth}>
              {/* 月份標題 */}
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-sm font-medium text-gray-500 px-2">
                  {yearMonth}
                </span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              {/* 該月份的歷程卡片 */}
              <div className="space-y-3">
                {items.map((portfolio) => {
                  const typeInfo = LOG_TYPE_MAP[portfolio.log_type as PortfolioLogType] || LOG_TYPE_MAP.study
                  const photoCount = portfolio.photos?.length || 0

                  return (
                    <Card 
                      key={portfolio.id} 
                      className="hover:shadow-md transition-shadow relative group"
                    >
                      <Link href={`/dashboard/portfolio/${portfolio.id}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            {/* 日期 + 類型 */}
                            <div className="flex flex-col items-center min-w-[60px]">
                              <span className="text-lg font-bold text-gray-800">
                                {formatDate(portfolio.study_date)}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${typeInfo.bgColor} ${typeInfo.color}`}>
                                {typeInfo.icon} {typeInfo.label}
                              </span>
                            </div>

                            {/* 內容 */}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-800 truncate">
                                {portfolio.title}
                              </h3>
                              <p className="text-sm text-gray-500 mt-1">
                                📖 {portfolio.subject?.title} &gt; {portfolio.topic?.title}
                              </p>
                              
                              {/* 標籤列 */}
                              <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                                {portfolio.link_count && portfolio.link_count > 0 && (
                                  <span className="flex items-center gap-1">
                                    <LinkIcon className="w-3 h-3" />
                                    {portfolio.link_count}
                                  </span>
                                )}
                                {photoCount > 0 && (
                                  <span className="flex items-center gap-1">
                                    <ImageIcon className="w-3 h-3" />
                                    {photoCount}
                                  </span>
                                )}
                                {portfolio.duration_minutes && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {formatDuration(portfolio.duration_minutes)}
                                  </span>
                                )}
                                {portfolio.location && (
                                  <span className="truncate max-w-[150px]">
                                    📍 {portfolio.location}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Link>

                      {/* 更多選單按鈕 */}
                      <div className="absolute top-3 right-3">
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setOpenMenuId(openMenuId === portfolio.id ? null : portfolio.id)
                          }}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {/* 下拉選單 */}
                        {openMenuId === portfolio.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setOpenMenuId(null)}
                            />
                            <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  setOpenMenuId(null)
                                  router.push(`/dashboard/portfolio/${portfolio.id}`)
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <Pencil className="w-4 h-4" />
                                編輯
                              </button>
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  confirmDelete(portfolio)
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                                刪除
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 刪除確認 Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確定要刪除嗎？</AlertDialogTitle>
            <AlertDialogDescription>
              刪除「{portfolioToDelete?.title}」後，所有相關的連結和關聯單元都會一併刪除，此操作無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
