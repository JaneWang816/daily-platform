// apps/learning/src/app/dashboard/pomodoro/page.tsx
"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, Button, Input, Label } from "@daily/ui"
import {
  Play,
  Pause,
  RotateCcw,
  Settings,
  Coffee,
  Brain,
  Volume2,
  VolumeX,
  CheckCircle,
  Clock,
} from "lucide-react"

type TimerMode = "focus" | "shortBreak" | "longBreak"

interface PomodoroSettings {
  focusMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  sessionsUntilLongBreak: number
  autoStartBreaks: boolean
  autoStartFocus: boolean
  soundEnabled: boolean
}

const DEFAULT_SETTINGS: PomodoroSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsUntilLongBreak: 4,
  autoStartBreaks: false,
  autoStartFocus: false,
  soundEnabled: true,
}

const MODE_COLORS = {
  focus: "from-red-500 to-orange-500",
  shortBreak: "from-green-500 to-teal-500",
  longBreak: "from-blue-500 to-indigo-500",
}

const MODE_LABELS = {
  focus: "專注時間",
  shortBreak: "短休息",
  longBreak: "長休息",
}

export default function PomodoroPage() {
  const [settings, setSettings] = useState<PomodoroSettings>(DEFAULT_SETTINGS)
  const [showSettings, setShowSettings] = useState(false)
  
  const [mode, setMode] = useState<TimerMode>("focus")
  const [timeLeft, setTimeLeft] = useState(DEFAULT_SETTINGS.focusMinutes * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [completedSessions, setCompletedSessions] = useState(0)
  
  // 今日統計
  const [todayStats, setTodayStats] = useState({
    focusSessions: 0,
    totalFocusMinutes: 0,
  })
  
  const audioContextRef = useRef<AudioContext | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // 載入設定
  useEffect(() => {
    const saved = localStorage.getItem("pomodoroSettings")
    if (saved) {
      const parsed = JSON.parse(saved)
      setSettings(parsed)
      setTimeLeft(parsed.focusMinutes * 60)
    }

    // 載入今日統計
    const todayKey = `pomodoroStats_${new Date().toISOString().split("T")[0]}`
    const todayData = localStorage.getItem(todayKey)
    if (todayData) {
      setTodayStats(JSON.parse(todayData))
    }
  }, [])

  // 儲存設定
  const saveSettings = (newSettings: PomodoroSettings) => {
    setSettings(newSettings)
    localStorage.setItem("pomodoroSettings", JSON.stringify(newSettings))
    
    // 重置計時器
    if (!isRunning) {
      setTimeLeft(newSettings.focusMinutes * 60)
    }
  }

  // 播放提示音（使用 Web Audio API）
  const playSound = useCallback(() => {
    if (!settings.soundEnabled) return

    try {
      // 初始化或恢復 AudioContext
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }
      
      const ctx = audioContextRef.current
      if (ctx.state === "suspended") {
        ctx.resume()
      }

      // 創建簡單的鈴聲
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)
      
      oscillator.frequency.setValueAtTime(800, ctx.currentTime)
      oscillator.type = "sine"
      
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)
      
      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.5)

      // 播放第二個音
      setTimeout(() => {
        const osc2 = ctx.createOscillator()
        const gain2 = ctx.createGain()
        
        osc2.connect(gain2)
        gain2.connect(ctx.destination)
        
        osc2.frequency.setValueAtTime(1000, ctx.currentTime)
        osc2.type = "sine"
        
        gain2.gain.setValueAtTime(0.3, ctx.currentTime)
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)
        
        osc2.start(ctx.currentTime)
        osc2.stop(ctx.currentTime + 0.5)
      }, 200)
    } catch (e) {
      console.log("Audio not supported")
    }
  }, [settings.soundEnabled])

  // 記錄學習時間到資料庫（使用 daily_study_summary 表）
  const recordStudyTime = useCallback(async (minutes: number) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const today = new Date().toISOString().split("T")[0]
    
    // 檢查今天是否已有記錄
    const { data: existing } = await supabase
      .from("daily_study_summary")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", today)
      .single()

    if (existing) {
      await (supabase.from("daily_study_summary") as any)
        .update({
          study_minutes: (existing.study_minutes || 0) + minutes,
        })
        .eq("id", existing.id)
    } else {
      await (supabase.from("daily_study_summary") as any)
        .insert({
          user_id: user.id,
          date: today,
          study_minutes: minutes,
          question_practiced: 0,
          question_correct: 0,
          flashcard_reviewed: 0,
          flashcard_correct: 0,
        })
    }
  }, [])

  // 計時器完成
  const handleTimerComplete = useCallback(() => {
    playSound()
    setIsRunning(false)

    if (mode === "focus") {
      // 完成一個專注時段
      const newCompleted = completedSessions + 1
      setCompletedSessions(newCompleted)

      // 更新今日統計
      const newStats = {
        focusSessions: todayStats.focusSessions + 1,
        totalFocusMinutes: todayStats.totalFocusMinutes + settings.focusMinutes,
      }
      setTodayStats(newStats)
      const todayKey = `pomodoroStats_${new Date().toISOString().split("T")[0]}`
      localStorage.setItem(todayKey, JSON.stringify(newStats))

      // 記錄到資料庫
      recordStudyTime(settings.focusMinutes)

      // 決定下一個模式
      if (newCompleted % settings.sessionsUntilLongBreak === 0) {
        setMode("longBreak")
        setTimeLeft(settings.longBreakMinutes * 60)
        if (settings.autoStartBreaks) {
          setIsRunning(true)
        }
      } else {
        setMode("shortBreak")
        setTimeLeft(settings.shortBreakMinutes * 60)
        if (settings.autoStartBreaks) {
          setIsRunning(true)
        }
      }
    } else {
      // 休息結束，回到專注模式
      setMode("focus")
      setTimeLeft(settings.focusMinutes * 60)
      if (settings.autoStartFocus) {
        setIsRunning(true)
      }
    }
  }, [mode, completedSessions, settings, todayStats, playSound, recordStudyTime])

  // 計時器
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1)
      }, 1000)
    } else if (timeLeft === 0 && isRunning) {
      handleTimerComplete()
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning, timeLeft, handleTimerComplete])

  // 格式化時間
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // 計算進度
  const getProgress = () => {
    let total: number
    switch (mode) {
      case "focus":
        total = settings.focusMinutes * 60
        break
      case "shortBreak":
        total = settings.shortBreakMinutes * 60
        break
      case "longBreak":
        total = settings.longBreakMinutes * 60
        break
    }
    return ((total - timeLeft) / total) * 100
  }

  // 切換模式
  const switchMode = (newMode: TimerMode) => {
    setIsRunning(false)
    setMode(newMode)
    switch (newMode) {
      case "focus":
        setTimeLeft(settings.focusMinutes * 60)
        break
      case "shortBreak":
        setTimeLeft(settings.shortBreakMinutes * 60)
        break
      case "longBreak":
        setTimeLeft(settings.longBreakMinutes * 60)
        break
    }
  }

  // 重置
  const handleReset = () => {
    setIsRunning(false)
    switchMode(mode)
  }

  // 切換播放/暫停
  const toggleTimer = () => {
    setIsRunning(!isRunning)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* 頁面標題 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">番茄鐘</h1>
          <p className="text-gray-600 mt-1">專注 25 分鐘，休息 5 分鐘</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSettings(!showSettings)}
        >
          <Settings className="w-4 h-4 mr-2" />
          設定
        </Button>
      </div>

      {/* 設定面板 */}
      {showSettings && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-gray-800 mb-4">計時器設定</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>專注時間（分鐘）</Label>
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={settings.focusMinutes}
                  onChange={(e) =>
                    saveSettings({ ...settings, focusMinutes: parseInt(e.target.value) || 25 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>短休息（分鐘）</Label>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={settings.shortBreakMinutes}
                  onChange={(e) =>
                    saveSettings({ ...settings, shortBreakMinutes: parseInt(e.target.value) || 5 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>長休息（分鐘）</Label>
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={settings.longBreakMinutes}
                  onChange={(e) =>
                    saveSettings({ ...settings, longBreakMinutes: parseInt(e.target.value) || 15 })
                  }
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-4 mt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoStartBreaks}
                  onChange={(e) =>
                    saveSettings({ ...settings, autoStartBreaks: e.target.checked })
                  }
                  className="rounded"
                />
                <span className="text-sm text-gray-600">自動開始休息</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoStartFocus}
                  onChange={(e) =>
                    saveSettings({ ...settings, autoStartFocus: e.target.checked })
                  }
                  className="rounded"
                />
                <span className="text-sm text-gray-600">自動開始專注</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.soundEnabled}
                  onChange={(e) =>
                    saveSettings({ ...settings, soundEnabled: e.target.checked })
                  }
                  className="rounded"
                />
                <span className="text-sm text-gray-600">提示音效</span>
              </label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 模式切換 */}
      <div className="flex justify-center gap-2">
        <Button
          variant={mode === "focus" ? "default" : "outline"}
          onClick={() => switchMode("focus")}
          className={mode === "focus" ? "bg-red-500 hover:bg-red-600" : ""}
        >
          <Brain className="w-4 h-4 mr-2" />
          專注
        </Button>
        <Button
          variant={mode === "shortBreak" ? "default" : "outline"}
          onClick={() => switchMode("shortBreak")}
          className={mode === "shortBreak" ? "bg-green-500 hover:bg-green-600" : ""}
        >
          <Coffee className="w-4 h-4 mr-2" />
          短休息
        </Button>
        <Button
          variant={mode === "longBreak" ? "default" : "outline"}
          onClick={() => switchMode("longBreak")}
          className={mode === "longBreak" ? "bg-blue-500 hover:bg-blue-600" : ""}
        >
          <Coffee className="w-4 h-4 mr-2" />
          長休息
        </Button>
      </div>

      {/* 計時器 */}
      <Card className={`bg-gradient-to-br ${MODE_COLORS[mode]} text-white overflow-hidden`}>
        <CardContent className="p-8 text-center relative">
          {/* 進度背景 */}
          <div
            className="absolute inset-0 bg-black/10 transition-all"
            style={{ width: `${getProgress()}%` }}
          />

          {/* 內容 */}
          <div className="relative z-10">
            <p className="text-white/80 mb-2">{MODE_LABELS[mode]}</p>
            <p className="text-7xl md:text-8xl font-bold font-mono tracking-wider">
              {formatTime(timeLeft)}
            </p>

            {/* 控制按鈕 */}
            <div className="flex items-center justify-center gap-4 mt-8">
              <Button
                variant="secondary"
                size="lg"
                onClick={handleReset}
                className="w-14 h-14 rounded-full p-0"
              >
                <RotateCcw className="w-6 h-6" />
              </Button>
              <Button
                size="lg"
                onClick={toggleTimer}
                className="w-20 h-20 rounded-full p-0 bg-white text-gray-800 hover:bg-gray-100"
              >
                {isRunning ? (
                  <Pause className="w-8 h-8" />
                ) : (
                  <Play className="w-8 h-8 ml-1" />
                )}
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => saveSettings({ ...settings, soundEnabled: !settings.soundEnabled })}
                className="w-14 h-14 rounded-full p-0"
              >
                {settings.soundEnabled ? (
                  <Volume2 className="w-6 h-6" />
                ) : (
                  <VolumeX className="w-6 h-6" />
                )}
              </Button>
            </div>

            {/* 番茄進度 */}
            <div className="flex items-center justify-center gap-2 mt-8">
              {Array.from({ length: settings.sessionsUntilLongBreak }).map((_, i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full transition-all ${
                    i < (completedSessions % settings.sessionsUntilLongBreak)
                      ? "bg-white"
                      : "bg-white/30"
                  }`}
                />
              ))}
            </div>
            <p className="text-white/60 text-sm mt-2">
              第 {(completedSessions % settings.sessionsUntilLongBreak) + 1} 個番茄 / 共 {settings.sessionsUntilLongBreak} 個
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 今日統計 */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-800">{todayStats.focusSessions}</p>
            <p className="text-sm text-gray-500">今日完成番茄</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="w-6 h-6 text-indigo-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-800">{todayStats.totalFocusMinutes}</p>
            <p className="text-sm text-gray-500">專注時間（分鐘）</p>
          </CardContent>
        </Card>
      </div>

      {/* 使用說明 */}
      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="p-4">
          <h3 className="font-medium text-amber-800 mb-2">🍅 番茄工作法</h3>
          <ul className="text-sm text-amber-700 space-y-1">
            <li>1. 選擇一個任務，開始 25 分鐘專注計時</li>
            <li>2. 專注工作直到計時結束</li>
            <li>3. 短休息 5 分鐘</li>
            <li>4. 每完成 4 個番茄，進行 15 分鐘長休息</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
