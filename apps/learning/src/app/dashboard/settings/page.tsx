// apps/learning/src/app/dashboard/settings/page.tsx
"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, Button, Input, Label } from "@daily/ui"
import {
  User,
  LogOut,
  Save,
  Bell,
  Moon,
  Volume2,
  Target,
  Clock,
} from "lucide-react"

interface Profile {
  id: string
  nickname: string | null
  avatar_url: string | null
}

interface LearningSettings {
  dailyQuestionGoal: number
  dailyFlashcardGoal: number
  dailyStudyTimeGoal: number
  reminderEnabled: boolean
  reminderTime: string
  soundEnabled: boolean
  darkMode: boolean
}

const DEFAULT_SETTINGS: LearningSettings = {
  dailyQuestionGoal: 20,
  dailyFlashcardGoal: 30,
  dailyStudyTimeGoal: 60,
  reminderEnabled: false,
  reminderTime: "20:00",
  soundEnabled: true,
  darkMode: false,
}

export default function SettingsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [email, setEmail] = useState("")
  const [nickname, setNickname] = useState("")
  const [settings, setSettings] = useState<LearningSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const fetchData = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push("/")
      return
    }

    setEmail(user.email || "")

    // 取得個人資料
    const { data: profileData } = await supabase
      .from("profiles")
      .select("id, nickname, avatar_url")
      .eq("id", user.id)
      .single()

    if (profileData) {
      setProfile(profileData as Profile)
      setNickname(profileData.nickname || "")
    }

    // 載入學習設定（從 localStorage）
    const savedSettings = localStorage.getItem("learningSettings")
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings))
    }

    setLoading(false)
  }, [router])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const saveProfile = async () => {
    if (!profile) return

    setSaving(true)
    setMessage(null)

    const supabase = createClient()
    const { error } = await (supabase.from("profiles") as any)
      .update({ nickname: nickname.trim() || null })
      .eq("id", profile.id)

    if (error) {
      setMessage({ type: "error", text: "儲存失敗，請稍後再試" })
    } else {
      setMessage({ type: "success", text: "個人資料已更新" })
    }

    setSaving(false)
  }

  const saveSettings = () => {
    localStorage.setItem("learningSettings", JSON.stringify(settings))
    setMessage({ type: "success", text: "設定已儲存" })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* 頁面標題 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">設定</h1>
        <p className="text-gray-600 mt-1">管理你的帳號和學習偏好</p>
      </div>

      {/* 訊息提示 */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* 個人資料 */}
      <Card>
        <CardContent className="p-6">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-indigo-500" />
            個人資料
          </h2>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>電子郵件</Label>
              <Input value={email} disabled className="bg-gray-50" />
              <p className="text-xs text-gray-500">電子郵件無法更改</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nickname">暱稱</Label>
              <Input
                id="nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="輸入你的暱稱..."
              />
            </div>

            <Button onClick={saveProfile} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? "儲存中..." : "儲存資料"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 學習目標 */}
      <Card>
        <CardContent className="p-6">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-green-500" />
            每日學習目標
          </h2>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>題目練習（題）</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={settings.dailyQuestionGoal}
                  onChange={(e) =>
                    setSettings({ ...settings, dailyQuestionGoal: parseInt(e.target.value) || 20 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>字卡複習（張）</Label>
                <Input
                  type="number"
                  min={1}
                  max={200}
                  value={settings.dailyFlashcardGoal}
                  onChange={(e) =>
                    setSettings({ ...settings, dailyFlashcardGoal: parseInt(e.target.value) || 30 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>學習時間（分鐘）</Label>
                <Input
                  type="number"
                  min={10}
                  max={480}
                  value={settings.dailyStudyTimeGoal}
                  onChange={(e) =>
                    setSettings({ ...settings, dailyStudyTimeGoal: parseInt(e.target.value) || 60 })
                  }
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 提醒設定 */}
      <Card>
        <CardContent className="p-6">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-amber-500" />
            學習提醒
          </h2>

          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">啟用每日提醒</p>
                <p className="text-sm text-gray-500">在指定時間提醒你學習</p>
              </div>
              <input
                type="checkbox"
                checked={settings.reminderEnabled}
                onChange={(e) =>
                  setSettings({ ...settings, reminderEnabled: e.target.checked })
                }
                className="w-5 h-5 rounded text-indigo-600"
              />
            </label>

            {settings.reminderEnabled && (
              <div className="space-y-2">
                <Label>提醒時間</Label>
                <Input
                  type="time"
                  value={settings.reminderTime}
                  onChange={(e) =>
                    setSettings({ ...settings, reminderTime: e.target.value })
                  }
                  className="w-40"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 其他設定 */}
      <Card>
        <CardContent className="p-6">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2 mb-4">
            <Volume2 className="w-5 h-5 text-blue-500" />
            偏好設定
          </h2>

          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">音效</p>
                <p className="text-sm text-gray-500">練習完成時播放提示音</p>
              </div>
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={(e) =>
                  setSettings({ ...settings, soundEnabled: e.target.checked })
                }
                className="w-5 h-5 rounded text-indigo-600"
              />
            </label>
          </div>
        </CardContent>
      </Card>

      {/* 儲存按鈕 */}
      <Button onClick={saveSettings} className="w-full">
        <Save className="w-4 h-4 mr-2" />
        儲存所有設定
      </Button>

      {/* 登出 */}
      <Card className="border-red-200">
        <CardContent className="p-6">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2 mb-4">
            <LogOut className="w-5 h-5 text-red-500" />
            帳號
          </h2>

          <p className="text-sm text-gray-600 mb-4">
            登出後需要重新登入才能使用學習功能
          </p>

          <Button
            variant="outline"
            onClick={handleLogout}
            className="text-red-600 border-red-200 hover:bg-red-50"
          >
            <LogOut className="w-4 h-4 mr-2" />
            登出
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
