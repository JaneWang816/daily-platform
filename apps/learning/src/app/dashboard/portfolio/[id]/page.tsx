// apps/learning/src/app/dashboard/portfolio/[id]/page.tsx
"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { createClient } from "@daily/database/client"
import type { Tables, TablesInsert, TablesUpdate } from "@daily/database"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Checkbox,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Dialog,
  DialogContent,
} from "@daily/ui"
import {
  ArrowLeft,
  Save,
  Plus,
  X,
  Link as LinkIcon,
  Clock,
  MapPin,
  Image as ImageIcon,
  Loader2,
  BookOpen,
  Trash2,
  Pencil,
  ExternalLink,
  Calendar,
  Upload,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

// 類型定義
type Subject = Tables<'subjects'>
type Topic = Tables<'topics'>
type Unit = Tables<'units'>
type LearningPortfolio = Tables<'learning_portfolios'>
type LearningPortfolioLink = Tables<'learning_portfolio_links'>
type LearningPortfolioUnit = Tables<'learning_portfolio_units'>

type PortfolioLogType = 'study' | 'experiment' | 'visit' | 'reading' | 'reflection'
type PortfolioLinkType = 'website' | 'video' | 'article' | 'document'

interface PortfolioLink {
  id: string
  url: string
  title: string
  link_type: PortfolioLinkType
  isNew?: boolean  // 標記是否為新增的連結
}

// 類型對照
const LOG_TYPE_OPTIONS: { value: PortfolioLogType; label: string; icon: string; description: string }[] = [
  { value: 'study', label: '課堂學習', icon: '📝', description: '記錄課堂上學到的重點' },
  { value: 'experiment', label: '實驗記錄', icon: '🧪', description: '記錄實驗過程與結果' },
  { value: 'visit', label: '參訪活動', icon: '🏛️', description: '記錄校外參訪或活動' },
  { value: 'reading', label: '延伸閱讀', icon: '📖', description: '記錄課外閱讀心得' },
  { value: 'reflection', label: '反思統整', icon: '💭', description: '學習反思與階段總結' },
]

const LOG_TYPE_MAP: Record<PortfolioLogType, { label: string; icon: string; color: string; bgColor: string }> = {
  study: { label: '課堂學習', icon: '📝', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  experiment: { label: '實驗記錄', icon: '🧪', color: 'text-green-600', bgColor: 'bg-green-100' },
  visit: { label: '參訪活動', icon: '🏛️', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  reading: { label: '延伸閱讀', icon: '📖', color: 'text-amber-600', bgColor: 'bg-amber-100' },
  reflection: { label: '反思統整', icon: '💭', color: 'text-pink-600', bgColor: 'bg-pink-100' },
}

const LINK_TYPE_OPTIONS: { value: PortfolioLinkType; label: string; icon: string }[] = [
  { value: 'website', label: '網站', icon: '🌐' },
  { value: 'video', label: '影片', icon: '🎬' },
  { value: 'article', label: '文章', icon: '📄' },
  { value: 'document', label: '文件', icon: '📁' },
]

const LINK_TYPE_MAP: Record<PortfolioLinkType, { label: string; icon: string }> = {
  website: { label: '網站', icon: '🌐' },
  video: { label: '影片', icon: '🎬' },
  article: { label: '文章', icon: '📄' },
  document: { label: '文件', icon: '📁' },
}

// 允許的圖片格式
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_PHOTOS = 6 // 最多上傳 6 張照片

// 格式化時長
function formatDuration(minutes: number | null | undefined): string {
  if (!minutes) return ''
  if (minutes < 60) return `${minutes} 分鐘`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) return `${hours} 小時`
  return `${hours} 小時 ${mins} 分鐘`
}

// 格式化日期
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
}

// 生成臨時 ID
function generateTempId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// 生成檔案路徑
function generateFilePath(userId: string, fileName: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substr(2, 9)
  const ext = fileName.split('.').pop()?.toLowerCase() || 'jpg'
  return `${userId}/${timestamp}-${random}.${ext}`
}

export default function PortfolioDetailPage() {
  const router = useRouter()
  const params = useParams()
  const portfolioId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  // 原始資料（用於取消編輯時還原）
  const [originalData, setOriginalData] = useState<{
    portfolio: LearningPortfolio | null
    units: { id: string; title: string }[]
    links: LearningPortfolioLink[]
  } | null>(null)

  // 關聯資料
  const [subject, setSubject] = useState<{ id: string; title: string } | null>(null)
  const [topic, setTopic] = useState<{ id: string; title: string } | null>(null)

  // 選項資料（編輯模式用）
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [units, setUnits] = useState<Unit[]>([])

  // 表單狀態
  const [subjectId, setSubjectId] = useState<string>("")
  const [topicId, setTopicId] = useState<string>("")
  const [studyDate, setStudyDate] = useState<string>("")
  const [title, setTitle] = useState<string>("")
  const [logType, setLogType] = useState<PortfolioLogType>("study")
  const [content, setContent] = useState<string>("")
  const [reflection, setReflection] = useState<string>("")
  const [durationMinutes, setDurationMinutes] = useState<string>("")
  const [location, setLocation] = useState<string>("")

  // 關聯單元
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([])
  const [relatedUnits, setRelatedUnits] = useState<{ id: string; title: string }[]>([])

  // 參考連結
  const [links, setLinks] = useState<PortfolioLink[]>([])

  // 照片
  const [photos, setPhotos] = useState<string[]>([])
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 照片檢視 Dialog
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)

  // 刪除確認
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // 取得資料
  const fetchData = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 取得歷程主記錄
    const { data: portfolioData, error: portfolioError } = await supabase
      .from("learning_portfolios")
      .select(`
        *,
        subject:subjects(id, title),
        topic:topics(id, title)
      `)
      .eq("id", portfolioId)
      .eq("user_id", user.id)
      .single()

    if (portfolioError || !portfolioData) {
      console.error("Error fetching portfolio:", portfolioError)
      router.push("/dashboard/portfolio")
      return
    }

    // 取得關聯單元
    const { data: unitRelations } = await supabase
      .from("learning_portfolio_units")
      .select(`
        unit_id,
        unit:units(id, title)
      `)
      .eq("portfolio_id", portfolioId) as { data: { unit_id: string; unit: { id: string; title: string } | null }[] | null }

    const relatedUnitsData = unitRelations
      ?.map(r => r.unit)
      .filter((u): u is { id: string; title: string } => u !== null) || []

    // 取得參考連結
    const { data: linksData } = await supabase
      .from("learning_portfolio_links")
      .select("*")
      .eq("portfolio_id", portfolioId)
      .order("created_at") as { data: LearningPortfolioLink[] | null }

    // 設定資料
    const portfolio = portfolioData as unknown as LearningPortfolio & {
      subject: { id: string; title: string } | null
      topic: { id: string; title: string } | null
    }

    setSubject(portfolio.subject)
    setTopic(portfolio.topic)
    setSubjectId(portfolio.subject_id)
    setTopicId(portfolio.topic_id)
    setStudyDate(portfolio.study_date)
    setTitle(portfolio.title)
    setLogType(portfolio.log_type as PortfolioLogType)
    
    // 解析 content
    const contentObj = portfolio.content as { text?: string } | null
    setContent(contentObj?.text || "")
    
    setReflection(portfolio.reflection || "")
    setDurationMinutes(portfolio.duration_minutes?.toString() || "")
    setLocation(portfolio.location || "")
    setPhotos(portfolio.photos || [])
    
    setRelatedUnits(relatedUnitsData)
    setSelectedUnitIds(relatedUnitsData.map(u => u.id))
    
    const formattedLinks: PortfolioLink[] = (linksData || []).map(link => ({
      id: link.id,
      url: link.url,
      title: link.title || "",
      link_type: (link.link_type || "website") as PortfolioLinkType,
    }))
    setLinks(formattedLinks)

    // 儲存原始資料
    setOriginalData({
      portfolio: portfolio,
      units: relatedUnitsData,
      links: linksData || [],
    })

    setLoading(false)
  }, [portfolioId, router])

  // 取得科目列表（編輯模式用）
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

  // 科目變更時，取得主題列表
  const fetchTopics = useCallback(async (subjectId: string) => {
    if (!subjectId) {
      setTopics([])
      return
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from("topics")
      .select("*")
      .eq("user_id", user.id)
      .eq("subject_id", subjectId)
      .order("order")

    if (data) {
      setTopics(data)
    }
  }, [])

  // 主題變更時，取得單元列表
  const fetchUnits = useCallback(async (topicId: string) => {
    if (!topicId) {
      setUnits([])
      return
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from("units")
      .select("*")
      .eq("user_id", user.id)
      .eq("topic_id", topicId)
      .order("order")

    if (data) {
      setUnits(data)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // 進入編輯模式時載入選項
  useEffect(() => {
    if (isEditing) {
      fetchSubjects()
      if (subjectId) fetchTopics(subjectId)
      if (topicId) fetchUnits(topicId)
    }
  }, [isEditing, subjectId, topicId, fetchSubjects, fetchTopics, fetchUnits])

  // 切換單元選取
  const toggleUnitSelection = (unitId: string) => {
    setSelectedUnitIds(prev =>
      prev.includes(unitId)
        ? prev.filter(id => id !== unitId)
        : [...prev, unitId]
    )
  }

  // 新增參考連結
  const addLink = () => {
    setLinks(prev => [...prev, {
      id: generateTempId(),
      url: "",
      title: "",
      link_type: "website",
      isNew: true,
    }])
  }

  // 更新參考連結
  const updateLink = (id: string, field: keyof PortfolioLink, value: string) => {
    setLinks(prev => prev.map(link =>
      link.id === id ? { ...link, [field]: value } : link
    ))
  }

  // 刪除參考連結
  const removeLink = (id: string) => {
    setLinks(prev => prev.filter(link => link.id !== id))
  }

  // ============================================
  // 照片上傳相關函式
  // ============================================

  // 觸發檔案選擇
  const triggerFileSelect = () => {
    fileInputRef.current?.click()
  }

  // 處理照片上傳
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    // 檢查是否超過最大數量
    if (photos.length + files.length > MAX_PHOTOS) {
      alert(`最多只能上傳 ${MAX_PHOTOS} 張照片`)
      return
    }

    setUploadingPhotos(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert("請先登入")
        return
      }

      const uploadedUrls: string[] = []

      for (const file of Array.from(files)) {
        // 驗證檔案類型
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
          alert(`不支援的圖片格式：${file.name}。請使用 JPG、PNG、GIF 或 WebP`)
          continue
        }

        // 驗證檔案大小
        if (file.size > MAX_FILE_SIZE) {
          alert(`檔案 ${file.name} 超過 5MB 限制`)
          continue
        }

        // 生成檔案路徑
        const filePath = generateFilePath(user.id, file.name)

        // 上傳到 Supabase Storage
        const { data, error } = await supabase.storage
          .from("portfolio-photos")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false
          })

        if (error) {
          console.error("Upload error:", error)
          alert(`上傳 ${file.name} 失敗：${error.message}`)
          continue
        }

        // 取得公開 URL
        const { data: { publicUrl } } = supabase.storage
          .from("portfolio-photos")
          .getPublicUrl(data.path)

        uploadedUrls.push(publicUrl)
      }

      // 更新照片列表
      if (uploadedUrls.length > 0) {
        setPhotos(prev => [...prev, ...uploadedUrls])
      }
    } catch (error) {
      console.error("Photo upload error:", error)
      alert("上傳照片時發生錯誤")
    } finally {
      setUploadingPhotos(false)
      // 清除 input value 以便重複選擇同檔案
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  // 刪除照片
  const removePhoto = async (photoUrl: string) => {
    // 從 URL 提取檔案路徑
    try {
      const supabase = createClient()
      
      // URL 格式：https://.../storage/v1/object/public/portfolio-photos/user_id/filename
      const urlParts = photoUrl.split("/portfolio-photos/")
      if (urlParts.length > 1) {
        const filePath = urlParts[1]
        
        // 嘗試從 Storage 刪除
        const { error } = await supabase.storage
          .from("portfolio-photos")
          .remove([filePath])
        
        if (error) {
          console.error("Delete storage error:", error)
          // 即使刪除失敗也繼續從列表移除
        }
      }
    } catch (error) {
      console.error("Error deleting photo from storage:", error)
    }

    // 從列表移除
    setPhotos(prev => prev.filter(url => url !== photoUrl))
  }

  // 開啟照片檢視器
  const openPhotoViewer = (index: number) => {
    setCurrentPhotoIndex(index)
    setPhotoViewerOpen(true)
  }

  // 上一張照片
  const prevPhoto = () => {
    setCurrentPhotoIndex(prev => 
      prev === 0 ? photos.length - 1 : prev - 1
    )
  }

  // 下一張照片
  const nextPhoto = () => {
    setCurrentPhotoIndex(prev => 
      prev === photos.length - 1 ? 0 : prev + 1
    )
  }

  // ============================================
  // 儲存與刪除
  // ============================================

  // 取消編輯
  const cancelEdit = () => {
    if (!originalData) return

    const portfolio = originalData.portfolio
    if (!portfolio) return

    // 還原資料
    setSubjectId(portfolio.subject_id)
    setTopicId(portfolio.topic_id)
    setStudyDate(portfolio.study_date)
    setTitle(portfolio.title)
    setLogType(portfolio.log_type as PortfolioLogType)
    
    const contentObj = portfolio.content as { text?: string } | null
    setContent(contentObj?.text || "")
    
    setReflection(portfolio.reflection || "")
    setDurationMinutes(portfolio.duration_minutes?.toString() || "")
    setLocation(portfolio.location || "")
    setPhotos(portfolio.photos || [])
    
    setSelectedUnitIds(originalData.units.map(u => u.id))
    
    const formattedLinks: PortfolioLink[] = originalData.links.map(link => ({
      id: link.id,
      url: link.url,
      title: link.title || "",
      link_type: (link.link_type || "website") as PortfolioLinkType,
    }))
    setLinks(formattedLinks)

    setIsEditing(false)
  }

  // 儲存
  const handleSave = async () => {
    // 驗證必填欄位
    if (!subjectId) {
      alert("請選擇科目")
      return
    }
    if (!topicId) {
      alert("請選擇主題")
      return
    }
    if (!title.trim()) {
      alert("請輸入標題")
      return
    }
    if (!studyDate) {
      alert("請選擇日期")
      return
    }

    setSaving(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert("請先登入")
        return
      }

      // 更新歷程主記錄
      const portfolioData: TablesUpdate<'learning_portfolios'> = {
        subject_id: subjectId,
        topic_id: topicId,
        study_date: studyDate,
        title: title.trim(),
        log_type: logType,
        content: { text: content.trim() },
        reflection: reflection.trim() || null,
        duration_minutes: durationMinutes ? parseInt(durationMinutes) : null,
        location: location.trim() || null,
        photos: photos.length > 0 ? photos : [],
      }

      const { error: portfolioError } = await supabase
        .from("learning_portfolios")
        // @ts-expect-error - Supabase SSR 類型推斷問題，資料已由 TablesUpdate 驗證
        .update(portfolioData)
        .eq("id", portfolioId)

      if (portfolioError) {
        console.error("Error updating portfolio:", portfolioError)
        alert("儲存失敗：" + portfolioError.message)
        return
      }

      // 更新關聯單元：先刪除再新增
      const { error: deleteUnitsError } = await supabase
        .from("learning_portfolio_units")
        .delete()
        .eq("portfolio_id", portfolioId)

      if (deleteUnitsError) {
        console.error("Error deleting unit relations:", deleteUnitsError)
      }

      if (selectedUnitIds.length > 0) {
        const unitInserts: TablesInsert<'learning_portfolio_units'>[] = selectedUnitIds.map(unitId => ({
          portfolio_id: portfolioId,
          unit_id: unitId
        }))

        const { error: unitsError } = await supabase
          .from("learning_portfolio_units")
          // @ts-expect-error - Supabase SSR 類型推斷問題，資料已由 TablesInsert 驗證
          .insert(unitInserts)

        if (unitsError) {
          console.error("Error creating unit relations:", unitsError)
        }
      }

      // 更新參考連結：先刪除再新增
      const { error: deleteLinksError } = await supabase
        .from("learning_portfolio_links")
        .delete()
        .eq("portfolio_id", portfolioId)

      if (deleteLinksError) {
        console.error("Error deleting links:", deleteLinksError)
      }

      const validLinks = links.filter(link => link.url.trim())
      if (validLinks.length > 0) {
        const linkInserts: TablesInsert<'learning_portfolio_links'>[] = validLinks.map(link => ({
          portfolio_id: portfolioId,
          url: link.url.trim(),
          title: link.title.trim() || null,
          link_type: link.link_type
        }))

        const { error: linksError } = await supabase
          .from("learning_portfolio_links")
          // @ts-expect-error - Supabase SSR 類型推斷問題，資料已由 TablesInsert 驗證
          .insert(linkInserts)

        if (linksError) {
          console.error("Error creating links:", linksError)
        }
      }

      // 重新載入資料
      await fetchData()
      setIsEditing(false)

    } catch (error) {
      console.error("Save error:", error)
      alert("儲存時發生錯誤")
    } finally {
      setSaving(false)
    }
  }

  // 刪除
  const handleDelete = async () => {
    const supabase = createClient()

    // 刪除相關的 Storage 照片
    if (photos.length > 0) {
      const filePaths = photos.map(url => {
        const urlParts = url.split("/portfolio-photos/")
        return urlParts.length > 1 ? urlParts[1] : null
      }).filter((p): p is string => p !== null)

      if (filePaths.length > 0) {
        await supabase.storage
          .from("portfolio-photos")
          .remove(filePaths)
      }
    }

    const { error } = await supabase
      .from("learning_portfolios")
      .delete()
      .eq("id", portfolioId)

    if (error) {
      console.error("Error deleting portfolio:", error)
      alert("刪除失敗：" + error.message)
      return
    }

    router.push("/dashboard/portfolio")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const typeInfo = LOG_TYPE_MAP[logType] || LOG_TYPE_MAP.study

  // ============================================
  // 檢視模式
  // ============================================
  if (!isEditing) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        {/* 頁面標題 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/portfolio"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                <span className={`px-2 py-0.5 rounded-full ${typeInfo.bgColor} ${typeInfo.color}`}>
                  {typeInfo.icon} {typeInfo.label}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDate(studyDate)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="w-4 h-4 mr-2" />
              編輯
            </Button>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(true)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              刪除
            </Button>
          </div>
        </div>

        {/* 基本資訊 */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500">科目</span>
                <p className="font-medium mt-1">{subject?.title || "-"}</p>
              </div>
              <div>
                <span className="text-gray-500">主題</span>
                <p className="font-medium mt-1">{topic?.title || "-"}</p>
              </div>
              {durationMinutes && (
                <div>
                  <span className="text-gray-500">學習時長</span>
                  <p className="font-medium mt-1 flex items-center gap-1">
                    <Clock className="w-4 h-4 text-gray-400" />
                    {formatDuration(parseInt(durationMinutes))}
                  </p>
                </div>
              )}
              {location && (
                <div>
                  <span className="text-gray-500">地點</span>
                  <p className="font-medium mt-1 flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    {location}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 學習內容 */}
        {content && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">學習內容</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-gray-700">{content}</p>
            </CardContent>
          </Card>
        )}

        {/* 心得反思 */}
        {reflection && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">心得反思</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-gray-700">{reflection}</p>
            </CardContent>
          </Card>
        )}

        {/* 照片 */}
        {photos.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                照片 ({photos.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {photos.map((photo, index) => (
                  <div
                    key={photo}
                    className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group"
                    onClick={() => openPhotoViewer(index)}
                  >
                    <Image
                      src={photo}
                      alt={`照片 ${index + 1}`}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                      sizes="(max-width: 768px) 50vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 關聯單元 */}
        {relatedUnits.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                關聯單元
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {relatedUnits.map(unit => (
                  <span
                    key={unit.id}
                    className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm"
                  >
                    {unit.title}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 參考連結 */}
        {links.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <LinkIcon className="w-5 h-5" />
                參考連結
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {links.map(link => {
                  const linkTypeInfo = LINK_TYPE_MAP[link.link_type] || LINK_TYPE_MAP.website
                  return (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
                    >
                      <span className="text-lg">{linkTypeInfo.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 truncate">
                          {link.title || link.url}
                        </p>
                        {link.title && (
                          <p className="text-sm text-gray-500 truncate">{link.url}</p>
                        )}
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-indigo-600" />
                    </a>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 照片檢視 Dialog */}
        <Dialog open={photoViewerOpen} onOpenChange={setPhotoViewerOpen}>
          <DialogContent className="max-w-4xl p-0 bg-black/95">
            <div className="relative w-full h-[80vh] flex items-center justify-center">
              {/* 關閉按鈕 */}
              <button
                onClick={() => setPhotoViewerOpen(false)}
                className="absolute top-4 right-4 p-2 text-white/80 hover:text-white z-10"
              >
                <X className="w-6 h-6" />
              </button>
              
              {/* 圖片 */}
              {photos[currentPhotoIndex] && (
                <Image
                  src={photos[currentPhotoIndex]}
                  alt={`照片 ${currentPhotoIndex + 1}`}
                  fill
                  className="object-contain"
                  sizes="100vw"
                />
              )}

              {/* 導航按鈕 */}
              {photos.length > 1 && (
                <>
                  <button
                    onClick={prevPhoto}
                    className="absolute left-4 p-2 text-white/80 hover:text-white bg-black/30 rounded-full"
                  >
                    <ChevronLeft className="w-8 h-8" />
                  </button>
                  <button
                    onClick={nextPhoto}
                    className="absolute right-4 p-2 text-white/80 hover:text-white bg-black/30 rounded-full"
                  >
                    <ChevronRight className="w-8 h-8" />
                  </button>
                </>
              )}

              {/* 圖片計數 */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm">
                {currentPhotoIndex + 1} / {photos.length}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 刪除確認 Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>確定要刪除嗎？</AlertDialogTitle>
              <AlertDialogDescription>
                刪除「{title}」後，所有相關的連結、關聯單元和照片都會一併刪除，此操作無法復原。
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

  // ============================================
  // 編輯模式
  // ============================================
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* 頁面標題 */}
      <div className="flex items-center gap-4">
        <button
          onClick={cancelEdit}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-2xl font-bold text-gray-800">編輯學習歷程</h1>
      </div>

      {/* 基本資訊 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">基本資訊</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 日期 & 類型 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="studyDate">學習日期 *</Label>
              <Input
                id="studyDate"
                type="date"
                value={studyDate}
                onChange={(e) => setStudyDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>歷程類型 *</Label>
              <Select
                value={logType}
                onValueChange={(v) => setLogType(v as PortfolioLogType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOG_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span className="flex items-center gap-2">
                        <span>{option.icon}</span>
                        <span>{option.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 科目 & 主題 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>科目 *</Label>
              <Select
                value={subjectId}
                onValueChange={(v) => {
                  setSubjectId(v)
                  setTopicId("")
                  setSelectedUnitIds([])
                  fetchTopics(v)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="選擇科目" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>主題 *</Label>
              <Select
                value={topicId}
                onValueChange={(v) => {
                  setTopicId(v)
                  setSelectedUnitIds([])
                  fetchUnits(v)
                }}
                disabled={!subjectId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={subjectId ? "選擇主題" : "請先選擇科目"} />
                </SelectTrigger>
                <SelectContent>
                  {topics.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 標題 */}
          <div className="space-y-2">
            <Label htmlFor="title">標題 *</Label>
            <Input
              id="title"
              placeholder="為這次學習記錄取個標題"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* 時長 & 地點 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration" className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                學習時長（分鐘）
              </Label>
              <Input
                id="duration"
                type="number"
                min="0"
                placeholder="例如：45"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                地點
              </Label>
              <Input
                id="location"
                placeholder="例如：教室、圖書館、博物館"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 學習內容 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">學習內容</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="content">內容記錄</Label>
            <Textarea
              id="content"
              placeholder="記錄這次學習的重點、過程、觀察..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reflection">心得反思</Label>
            <Textarea
              id="reflection"
              placeholder="這次學習有什麼心得？有什麼收穫或困惑？"
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* 關聯單元 */}
      {topicId && units.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              關聯單元
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-3">
              選擇這次學習涵蓋的單元（可多選）
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {units.map((unit) => (
                <label
                  key={unit.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedUnitIds.includes(unit.id)
                      ? "bg-indigo-50 border-indigo-300"
                      : "bg-white border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <Checkbox
                    checked={selectedUnitIds.includes(unit.id)}
                    onCheckedChange={() => toggleUnitSelection(unit.id)}
                  />
                  <span className="text-sm">{unit.title}</span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 參考連結 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2">
              <LinkIcon className="w-5 h-5" />
              參考連結
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addLink}
            >
              <Plus className="w-4 h-4 mr-1" />
              新增連結
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {links.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              尚未新增任何參考連結
            </p>
          ) : (
            <div className="space-y-3">
              {links.map((link) => (
                <div
                  key={link.id}
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <Select
                        value={link.link_type}
                        onValueChange={(v) => updateLink(link.id, 'link_type', v)}
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LINK_TYPE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <span className="flex items-center gap-1">
                                <span>{option.icon}</span>
                                <span>{option.label}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="連結標題（選填）"
                        value={link.title}
                        onChange={(e) => updateLink(link.id, 'title', e.target.value)}
                        className="flex-1"
                      />
                    </div>
                    <Input
                      placeholder="https://..."
                      value={link.url}
                      onChange={(e) => updateLink(link.id, 'url', e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLink(link.id)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 照片上傳 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              照片
              {photos.length > 0 && (
                <span className="text-sm font-normal text-gray-500">
                  ({photos.length}/{MAX_PHOTOS})
                </span>
              )}
            </span>
            {photos.length < MAX_PHOTOS && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={triggerFileSelect}
                disabled={uploadingPhotos}
              >
                {uploadingPhotos ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    上傳中...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-1" />
                    上傳照片
                  </>
                )}
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* 隱藏的 file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            multiple
            onChange={handlePhotoUpload}
            className="hidden"
          />

          {photos.length === 0 ? (
            <div
              className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors"
              onClick={triggerFileSelect}
            >
              <Upload className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-600 mb-1">
                點擊或拖曳上傳照片
              </p>
              <p className="text-xs text-gray-400">
                支援 JPG、PNG、GIF、WebP，每張最大 5MB
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 照片網格 */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {photos.map((photo, index) => (
                  <div
                    key={photo}
                    className="relative aspect-square rounded-lg overflow-hidden group"
                  >
                    <Image
                      src={photo}
                      alt={`照片 ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, 33vw"
                    />
                    {/* 刪除按鈕 */}
                    <button
                      type="button"
                      onClick={() => removePhoto(photo)}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    {/* 序號 */}
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 text-white text-xs rounded">
                      {index + 1}
                    </div>
                  </div>
                ))}

                {/* 新增照片按鈕 */}
                {photos.length < MAX_PHOTOS && (
                  <div
                    className="aspect-square rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors"
                    onClick={triggerFileSelect}
                  >
                    {uploadingPhotos ? (
                      <Loader2 className="w-8 h-8 text-gray-300 animate-spin" />
                    ) : (
                      <>
                        <Plus className="w-8 h-8 text-gray-300" />
                        <span className="text-xs text-gray-400 mt-1">新增照片</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* 提示文字 */}
              <p className="text-xs text-gray-400 text-center">
                支援 JPG、PNG、GIF、WebP，每張最大 5MB，最多 {MAX_PHOTOS} 張
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 儲存按鈕 */}
      <div className="flex justify-end gap-3 pb-8">
        <Button
          variant="outline"
          onClick={cancelEdit}
          disabled={saving}
        >
          取消
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving || uploadingPhotos}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              儲存中...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              儲存
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
