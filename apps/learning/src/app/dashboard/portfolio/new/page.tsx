// apps/learning/src/app/dashboard/portfolio/new/page.tsx
"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { createClient } from "@daily/database/client"
import type { Tables, TablesInsert } from "@daily/database"
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
  Upload,
  Lightbulb,
} from "lucide-react"

// 類型定義
type Subject = Tables<'subjects'>
type Topic = Tables<'topics'>
type Unit = Tables<'units'>

type PortfolioLogType = 'study' | 'experiment' | 'visit' | 'reading' | 'reflection'
type PortfolioLinkType = 'website' | 'video' | 'article' | 'document'

interface PortfolioLink {
  id: string
  url: string
  title: string
  link_type: PortfolioLinkType
}

// 類型對照
const LOG_TYPE_OPTIONS: { value: PortfolioLogType; label: string; icon: string; description: string }[] = [
  { value: 'study', label: '課堂學習', icon: '📝', description: '記錄課堂上學到的重點' },
  { value: 'experiment', label: '實驗記錄', icon: '🧪', description: '記錄實驗過程與結果' },
  { value: 'visit', label: '參訪活動', icon: '🏛️', description: '記錄校外參訪或活動' },
  { value: 'reading', label: '延伸閱讀', icon: '📖', description: '記錄課外閱讀心得' },
  { value: 'reflection', label: '反思統整', icon: '💭', description: '學習反思與階段總結' },
]

const LINK_TYPE_OPTIONS: { value: PortfolioLinkType; label: string; icon: string }[] = [
  { value: 'website', label: '網站', icon: '🌐' },
  { value: 'video', label: '影片', icon: '🎬' },
  { value: 'article', label: '文章', icon: '📄' },
  { value: 'document', label: '文件', icon: '📁' },
]

// 各類型填寫提示
const TYPE_HINTS: Record<PortfolioLogType, string[]> = {
  study: [
    '今天學了哪些重點？',
    '有什麼新的概念或知識？',
    '哪些地方還不太懂？',
  ],
  experiment: [
    '實驗目的是什麼？',
    '使用了哪些器材？',
    '觀察到什麼現象？',
    '結果和預期一樣嗎？為什麼？',
  ],
  visit: [
    '參訪了什麼地方？',
    '印象最深刻的是什麼？',
    '學到了什麼新知識？',
    '和課堂學習有什麼關聯？',
  ],
  reading: [
    '這本書/文章的主題是什麼？',
    '作者想表達的核心觀點？',
    '有哪些值得記下的內容？',
    '對我有什麼啟發？',
  ],
  reflection: [
    '這段時間學了哪些相關內容？',
    '各單元之間有什麼關聯？',
    '有什麼心得或體悟？',
    '未來想更深入了解什麼？',
  ],
}

// 允許的圖片格式
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_PHOTOS = 6 // 最多上傳 6 張照片

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

// 自動偵測連結類型
function detectLinkType(url: string): PortfolioLinkType {
  const lowerUrl = url.toLowerCase()
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be') || 
      lowerUrl.includes('vimeo.com') || lowerUrl.includes('bilibili.com')) {
    return 'video'
  }
  if (lowerUrl.endsWith('.pdf') || lowerUrl.endsWith('.doc') || 
      lowerUrl.endsWith('.docx') || lowerUrl.includes('drive.google.com')) {
    return 'document'
  }
  if (lowerUrl.includes('medium.com') || lowerUrl.includes('blog') || 
      lowerUrl.includes('article')) {
    return 'article'
  }
  return 'website'
}

// 取得今天日期（本地時區）
function getTodayDate(): string {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

export default function NewPortfolioPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [saving, setSaving] = useState(false)

  // 選項資料
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [units, setUnits] = useState<Unit[]>([])

  // 表單狀態
  const [subjectId, setSubjectId] = useState<string>("")
  const [topicId, setTopicId] = useState<string>("")
  const [studyDate, setStudyDate] = useState<string>(getTodayDate())
  const [title, setTitle] = useState<string>("")
  const [logType, setLogType] = useState<PortfolioLogType>("study")
  const [content, setContent] = useState<string>("")
  const [reflection, setReflection] = useState<string>("")
  const [durationMinutes, setDurationMinutes] = useState<string>("")
  const [location, setLocation] = useState<string>("")

  // 關聯單元
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([])

  // 參考連結
  const [links, setLinks] = useState<PortfolioLink[]>([])

  // 照片
  const [photos, setPhotos] = useState<string[]>([])
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    fetchSubjects()
  }, [fetchSubjects])

  // 從 URL 參數預填科目和主題
  useEffect(() => {
    const subjectParam = searchParams.get('subject')
    const topicParam = searchParams.get('topic')
    
    if (subjectParam) {
      setSubjectId(subjectParam)
      fetchTopics(subjectParam)
    }
    if (topicParam) {
      setTopicId(topicParam)
      fetchUnits(topicParam)
    }
  }, [searchParams, fetchTopics, fetchUnits])

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
    }])
  }

  // 更新參考連結
  const updateLink = (id: string, field: keyof PortfolioLink, value: string) => {
    setLinks(prev => prev.map(link => {
      if (link.id !== id) return link
      
      const updated = { ...link, [field]: value }
      
      // 自動偵測連結類型
      if (field === 'url' && value.trim()) {
        updated.link_type = detectLinkType(value)
      }
      
      return updated
    }))
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
        }
      }
    } catch (error) {
      console.error("Error deleting photo from storage:", error)
    }

    // 從列表移除
    setPhotos(prev => prev.filter(url => url !== photoUrl))
  }

  // ============================================
  // 儲存
  // ============================================

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

      // 新增歷程主記錄
      const portfolioData: TablesInsert<'learning_portfolios'> = {
        user_id: user.id,
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

      const { data: portfolio, error: portfolioError } = await supabase
        .from("learning_portfolios")
        .insert(portfolioData)
        .select()
        .single() as { data: { id: string } | null; error: Error | null }

      if (portfolioError || !portfolio) {
        console.error("Error creating portfolio:", portfolioError)
        alert("新增失敗：" + portfolioError?.message)
        return
      }

      // 新增關聯單元
      if (selectedUnitIds.length > 0) {
        const unitInserts: TablesInsert<'learning_portfolio_units'>[] = selectedUnitIds.map(unitId => ({
          portfolio_id: portfolio.id,
          unit_id: unitId
        }))

        const { error: unitsError } = await supabase
          .from("learning_portfolio_units")
          .insert(unitInserts)

        if (unitsError) {
          console.error("Error creating unit relations:", unitsError)
        }
      }

      // 新增參考連結
      const validLinks = links.filter(link => link.url.trim())
      if (validLinks.length > 0) {
        const linkInserts: TablesInsert<'learning_portfolio_links'>[] = validLinks.map(link => ({
          portfolio_id: portfolio.id,
          url: link.url.trim(),
          title: link.title.trim() || null,
          link_type: link.link_type
        }))

        const { error: linksError } = await supabase
          .from("learning_portfolio_links")
          .insert(linkInserts)

        if (linksError) {
          console.error("Error creating links:", linksError)
        }
      }

      // 導向詳情頁
      router.push(`/dashboard/portfolio/${portfolio.id}`)

    } catch (error) {
      console.error("Save error:", error)
      alert("新增時發生錯誤")
    } finally {
      setSaving(false)
    }
  }

  // 目前類型的提示
  const currentHints = TYPE_HINTS[logType] || TYPE_HINTS.study

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* 頁面標題 */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/portfolio"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">新增學習歷程</h1>
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
          {/* 填寫提示 */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Lightbulb className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800 mb-1">
                  {LOG_TYPE_OPTIONS.find(o => o.value === logType)?.label}的填寫提示
                </p>
                <ul className="text-sm text-amber-700 space-y-0.5">
                  {currentHints.map((hint, index) => (
                    <li key={index}>• {hint}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

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
        <Link href="/dashboard/portfolio">
          <Button variant="outline" disabled={saving}>
            取消
          </Button>
        </Link>
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
