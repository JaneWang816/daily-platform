// apps/life/src/components/photo-uploader.tsx
"use client"

import { createClient } from "@daily/database"
import { Button } from "@daily/ui"
import { Upload, X, Image } from "lucide-react"
import { useRef, useState } from "react"

interface PhotoUploaderProps {
  photos: string[]
  onChange: (photos: string[]) => void
  maxPhotos?: number
  bucket?: string
}

export function PhotoUploader({
  photos,
  onChange,
  maxPhotos = 3,
  bucket = "travel-photos"
}: PhotoUploaderProps) {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 檢查數量限制
    if (photos.length + files.length > maxPhotos) {
      alert(`最多只能上傳 ${maxPhotos} 張照片`)
      return
    }

    setUploading(true)

    try {
      const newUrls: string[] = []
      
      for (const file of Array.from(files)) {
        // 檢查檔案類型
        if (!file.type.startsWith("image/")) {
          alert("只能上傳圖片檔案")
          continue
        }

        // 檢查檔案大小 (5MB)
        if (file.size > 5 * 1024 * 1024) {
          alert("圖片大小不能超過 5MB")
          continue
        }

        const fileExt = file.name.split(".").pop()
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(fileName, file)

        if (uploadError) {
          console.error("上傳失敗:", uploadError)
          continue
        }

        const { data: urlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(fileName)

        if (urlData.publicUrl) {
          newUrls.push(urlData.publicUrl)
        }
      }

      onChange([...photos, ...newUrls])
    } catch (error) {
      console.error("上傳錯誤:", error)
    }

    setUploading(false)
    // 清空 input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const removePhoto = async (url: string) => {
    // 從 URL 提取檔案路徑
    const path = url.split(`/${bucket}/`)[1]
    if (path) {
      await supabase.storage.from(bucket).remove([path])
    }
    onChange(photos.filter(u => u !== url))
  }

  return (
    <div className="space-y-3">
      {/* 照片預覽 */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((url, index) => (
            <div key={index} className="relative aspect-square rounded-lg overflow-hidden border">
              <img
                src={url}
                alt={`照片 ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => removePhoto(url)}
                className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 上傳按鈕 */}
      {photos.length < maxPhotos && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleUpload}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                上傳中...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                上傳照片 ({photos.length}/{maxPhotos})
              </>
            )}
          </Button>
          <p className="text-xs text-gray-500 mt-1">
            支援 JPG、PNG、WebP，每張最大 5MB
          </p>
        </div>
      )}
    </div>
  )
}
