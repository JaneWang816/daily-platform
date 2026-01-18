//apps/life/src/app/dashboard/health/stats/page.tsx
"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { createBrowserClient } from '@supabase/ssr'
import { Button, Card, CardContent } from "@daily/ui"
import { cn } from "@daily/utils"
import { format, subDays } from "date-fns"
import { zhTW } from "date-fns/locale"
import {
  ArrowLeft, Scale, Heart, Moon, Footprints, Droplets, TrendingUp, TrendingDown, Minus,
  AlertCircle, CheckCircle, Info,
} from "lucide-react"
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts"

// ============================================
// 類型定義
// ============================================
type HealthMetric = {
  id: string
  user_id: string
  date: string
  metric_type: string
  value_primary: number
  value_secondary: number | null
  value_tertiary: number | null
  measured_time: string | null
  note: string | null
}

type HealthAdvice = {
  type: "success" | "warning" | "info"
  title: string
  message: string
}

type UserProfile = {
  height_cm: number | null
  birth_year: number | null
}

// ============================================
// 常數
// ============================================
const COLORS = {
  weight: "#3b82f6",
  blood_pressure: "#ef4444",
  sleep: "#8b5cf6",
  steps: "#22c55e",
  water: "#06b6d4",
}

// ============================================
// Supabase Client
// ============================================
function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// ============================================
// 主元件
// ============================================
export default function HealthStatsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<30 | 90 | 180>(30)
  const [metrics, setMetrics] = useState<HealthMetric[]>([])
  const [profile, setProfile] = useState<UserProfile | null>(null)

  // 載入資料
  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const startDate = format(subDays(new Date(), timeRange), "yyyy-MM-dd")

    const metricsRes = await supabase
      .from("health_metrics")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", startDate)
      .order("date", { ascending: true })

    if (metricsRes.data) setMetrics(metricsRes.data as HealthMetric[])

    // profiles 表查詢
    try {
      const profileRes = await supabase
        .from("profiles")
        .select("height_cm, birth_year")
        .eq("id", user.id)
        .single()
      if (profileRes.data && !profileRes.error) {
        setProfile(profileRes.data as UserProfile)
      }
    } catch {
      // profiles 查詢失敗，忽略錯誤
    }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [timeRange])

  // 按類型分組資料
  const weightData = metrics.filter(m => m.metric_type === "weight")
  const bloodPressureData = metrics.filter(m => m.metric_type === "blood_pressure")
  const sleepData = metrics.filter(m => m.metric_type === "sleep")
  const stepsData = metrics.filter(m => m.metric_type === "steps")
  const waterData = metrics.filter(m => m.metric_type === "water")

  // 計算年齡
  const calculateAge = (): number | null => {
    if (!profile?.birth_year) return null
    const currentYear = new Date().getFullYear()
    return currentYear - profile.birth_year
  }

  // 計算 BMI
  const calculateBMI = (): number | null => {
    if (!profile?.height_cm || weightData.length === 0) return null
    const latestWeight = weightData[weightData.length - 1].value_primary
    const heightM = profile.height_cm / 100
    return latestWeight / (heightM * heightM)
  }

  // BMI 分類
  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { label: "體重過輕", color: "text-blue-600", bg: "bg-blue-50" }
    if (bmi < 24) return { label: "正常範圍", color: "text-green-600", bg: "bg-green-50" }
    if (bmi < 27) return { label: "過重", color: "text-amber-600", bg: "bg-amber-50" }
    return { label: "肥胖", color: "text-red-600", bg: "bg-red-50" }
  }

  // 計算趨勢
  const calculateTrend = (data: HealthMetric[]) => {
    if (data.length < 2) return "stable"
    const recent = data.slice(-7)
    if (recent.length < 2) return "stable"
    const first = recent[0].value_primary
    const last = recent[recent.length - 1].value_primary
    const change = ((last - first) / first) * 100
    if (change > 3) return "up"
    if (change < -3) return "down"
    return "stable"
  }

  // 取得最新數值
  const getLatestValue = (data: HealthMetric[]) => data.length > 0 ? data[data.length - 1] : null
  const getAverage = (data: HealthMetric[]) => data.length > 0 ? data.reduce((sum, d) => sum + d.value_primary, 0) / data.length : null

  // 生成健康建議
  const generateAdvice = (): HealthAdvice[] => {
    const advice: HealthAdvice[] = []
    const age = calculateAge()
    const bmi = calculateBMI()

    // BMI 建議
    if (bmi) {
      if (bmi < 18.5) {
        advice.push({ type: "warning", title: "體重偏輕", message: "建議增加營養攝取，可諮詢營養師制定增重計畫。" })
      } else if (bmi >= 24 && bmi < 27) {
        advice.push({ type: "warning", title: "體重稍微過重", message: "建議適度控制飲食，增加運動量。每天至少運動 30 分鐘。" })
      } else if (bmi >= 27) {
        advice.push({ type: "warning", title: "需注意體重管理", message: "建議制定減重計畫，可諮詢醫師或營養師。控制高熱量食物攝取。" })
      } else {
        advice.push({ type: "success", title: "BMI 正常", message: "繼續保持健康的生活習慣！" })
      }
    }

    // 血壓建議
    if (bloodPressureData.length > 0) {
      const latestBP = bloodPressureData[bloodPressureData.length - 1]
      const systolic = latestBP.value_primary
      const diastolic = latestBP.value_secondary || 0
      if (systolic >= 140 || diastolic >= 90) {
        advice.push({ type: "warning", title: "血壓偏高", message: "建議減少鈉攝取、規律運動、保持健康體重。如持續偏高請諮詢醫師。" })
      } else if (systolic < 90 || diastolic < 60) {
        advice.push({ type: "info", title: "血壓偏低", message: "注意是否有頭暈症狀。起身時動作放慢，多補充水分。" })
      } else {
        advice.push({ type: "success", title: "血壓正常", message: "血壓維持在健康範圍內，繼續保持！" })
      }
    }

    // 步數建議
    if (stepsData.length > 0) {
      const avgSteps = stepsData.reduce((sum, d) => sum + d.value_primary, 0) / stepsData.length
      if (avgSteps < 5000) {
        advice.push({ type: "warning", title: "活動量不足", message: "建議每天至少走 8000-10000 步。可以嘗試走路上學、課間多走動。" })
      } else if (avgSteps >= 10000) {
        advice.push({ type: "success", title: "活動量充足", message: "很棒！你的日均步數達到建議標準。" })
      } else {
        advice.push({ type: "info", title: "活動量適中", message: "目前活動量尚可，可嘗試再增加一些日常活動。" })
      }
    }

    // 睡眠建議
    if (sleepData.length > 0 && age) {
      const avgSleep = sleepData.reduce((sum, d) => sum + d.value_primary, 0) / sleepData.length
      const minSleep = age < 18 ? 8 : 7
      const maxSleep = age < 18 ? 10 : 9
      if (avgSleep < minSleep) {
        advice.push({ type: "warning", title: "睡眠時間不足", message: `${age < 18 ? "青少年" : "成人"}建議每晚睡 ${minSleep}-${maxSleep} 小時。睡眠不足會影響專注力。` })
      } else if (avgSleep > maxSleep + 1) {
        advice.push({ type: "info", title: "睡眠時間較長", message: "睡眠時間超過建議範圍，注意是否有嗜睡問題。" })
      } else {
        advice.push({ type: "success", title: "睡眠充足", message: "睡眠時間充足，有助於學習和成長！" })
      }
    }

    return advice
  }

  // 格式化圖表數據
  const formatChartData = (data: HealthMetric[]) => {
    return data.map(d => ({
      date: d.date.slice(5),
      value: d.value_primary,
      secondary: d.value_secondary,
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-pink-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const bmi = calculateBMI()
  const bmiCategory = bmi ? getBMICategory(bmi) : null
  const age = calculateAge()
  const advice = generateAdvice()

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/health">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">📊 健康統計</h1>
            <p className="text-gray-500">追蹤你的健康趨勢</p>
          </div>
        </div>
        <div className="flex gap-2">
          {[30, 90, 180].map((days) => (
            <Button
              key={days}
              variant={timeRange === days ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeRange(days as 30 | 90 | 180)}
              className={timeRange === days ? "bg-pink-600 hover:bg-pink-700" : ""}
            >
              {days}天
            </Button>
          ))}
        </div>
      </div>

      {/* BMI 卡片 */}
      {bmi && profile?.height_cm && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">身體質量指數 (BMI)</h3>
                <div className="flex items-center gap-4">
                  <span className="text-4xl font-bold text-gray-800">{bmi.toFixed(1)}</span>
                  {bmiCategory && (
                    <span className={cn("px-3 py-1 rounded-full text-sm font-medium", bmiCategory.color, bmiCategory.bg)}>
                      {bmiCategory.label}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  身高 {profile.height_cm} cm・體重 {getLatestValue(weightData)?.value_primary || "--"} kg
                  {age && ` ・ ${age} 歲`}
                </p>
              </div>
              <div className="text-right text-sm text-gray-500">
                <p>過輕：&lt; 18.5</p>
                <p className="text-green-600 font-medium">正常：18.5 - 24</p>
                <p>過重：24 - 27</p>
                <p>肥胖：≥ 27</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 統計卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Scale className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">
                  {getLatestValue(weightData)?.value_primary.toFixed(1) || "--"}
                  <span className="text-sm font-normal text-gray-500 ml-1">kg</span>
                </p>
                <div className="flex items-center gap-1">
                  <p className="text-sm text-gray-500">最新體重</p>
                  {weightData.length > 1 && (
                    calculateTrend(weightData) === "up" ? <TrendingUp className="w-4 h-4 text-red-500" /> :
                    calculateTrend(weightData) === "down" ? <TrendingDown className="w-4 h-4 text-green-500" /> :
                    <Minus className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <Heart className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">
                  {getLatestValue(bloodPressureData)
                    ? `${getLatestValue(bloodPressureData)!.value_primary}/${getLatestValue(bloodPressureData)!.value_secondary || 0}`
                    : "--"}
                </p>
                <p className="text-sm text-gray-500">最新血壓 mmHg</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Footprints className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">
                  {getAverage(stepsData)?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || "--"}
                </p>
                <p className="text-sm text-gray-500">日均步數</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Moon className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">
                  {getAverage(sleepData)?.toFixed(1) || "--"}
                  <span className="text-sm font-normal text-gray-500 ml-1">hr</span>
                </p>
                <p className="text-sm text-gray-500">平均睡眠</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 體重趨勢 */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Scale className="w-5 h-5 text-blue-600" />
            體重趨勢
          </h3>
          {weightData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={formatChartData(weightData)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} domain={['dataMin - 2', 'dataMax + 2']} />
                <Tooltip
                  contentStyle={{ backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "8px" }}
                  formatter={(value) => [`${value ?? 0} kg`, "體重"]}
                />
                <Area type="monotone" dataKey="value" stroke={COLORS.weight} fill={COLORS.weight} fillOpacity={0.2} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-gray-400">尚無體重記錄</div>
          )}
        </CardContent>
      </Card>

      {/* 血壓趨勢 */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-600" />
            血壓趨勢
          </h3>
          {bloodPressureData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={formatChartData(bloodPressureData)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} domain={[60, 160]} />
                <Tooltip
                  contentStyle={{ backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "8px" }}
                  formatter={(value, name) => [value, name === "value" ? "收縮壓" : "舒張壓"]}
                />
                <Line type="monotone" dataKey="value" stroke="#ef4444" strokeWidth={2} dot={{ fill: "#ef4444" }} name="收縮壓" />
                <Line type="monotone" dataKey="secondary" stroke="#f97316" strokeWidth={2} dot={{ fill: "#f97316" }} name="舒張壓" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-gray-400">尚無血壓記錄</div>
          )}
        </CardContent>
      </Card>

      {/* 睡眠趨勢 */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Moon className="w-5 h-5 text-purple-600" />
            睡眠趨勢
          </h3>
          {sleepData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={formatChartData(sleepData)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} domain={[0, 12]} />
                <Tooltip
                  contentStyle={{ backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "8px" }}
                  formatter={(value) => [`${value} 小時`, "睡眠"]}
                />
                <Area type="monotone" dataKey="value" stroke={COLORS.sleep} fill={COLORS.sleep} fillOpacity={0.2} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-400">尚無睡眠記錄</div>
          )}
        </CardContent>
      </Card>

      {/* 步數趨勢 */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Footprints className="w-5 h-5 text-green-600" />
            步數趨勢
          </h3>
          {stepsData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={formatChartData(stepsData)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "8px" }}
                  formatter={(value) => [`${(value as number).toLocaleString()} 步`, "步數"]}
                />
                <Area type="monotone" dataKey="value" stroke={COLORS.steps} fill={COLORS.steps} fillOpacity={0.2} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-400">尚無步數記錄</div>
          )}
        </CardContent>
      </Card>

      {/* 健康建議 */}
      {advice.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">💡 健康建議</h3>
            <div className="space-y-3">
              {advice.map((item, index) => (
                <div
                  key={index}
                  className={cn(
                    "p-4 rounded-lg flex items-start gap-3",
                    item.type === "success" && "bg-green-50",
                    item.type === "warning" && "bg-amber-50",
                    item.type === "info" && "bg-blue-50"
                  )}
                >
                  {item.type === "success" && <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />}
                  {item.type === "warning" && <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />}
                  {item.type === "info" && <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />}
                  <div>
                    <h4 className={cn(
                      "font-medium",
                      item.type === "success" && "text-green-800",
                      item.type === "warning" && "text-amber-800",
                      item.type === "info" && "text-blue-800"
                    )}>
                      {item.title}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">{item.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
