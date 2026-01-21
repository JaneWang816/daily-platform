# Daily Platform - 專案架構文件
# 更新日期：2025-01-16

## 專案概述
- 框架：Next.js 15 (App Router) + TypeScript
- 架構：pnpm monorepo (Turborepo)
- 資料庫：Supabase (使用 @supabase/ssr)
- UI：Tailwind CSS + shadcn/ui
- 主要功能：生活管理 + 學習管理平台

---

## 根目錄結構

```
daily-platform/
├── apps/
│   ├── portal/                  # 主入口 (登入/註冊/導向)
│   ├── life/                    # 生活管理 App
│   └── learning/                # 學習管理 App
├── packages/
│   ├── database/                # 共用資料庫套件
│   ├── ui/                      # 共用 UI 元件
│   └── utils/                   # 共用工具函數
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.json
```

---

## Apps 角色分工

| App | 用途 | 主要功能 |
|-----|------|----------|
| **portal** | 主入口 | 登入、註冊、Auth callback、導向各模組 |
| **life** | 生活管理 | 任務、習慣、日誌、財務、健康、目標 |
| **learning** | 學習管理 | 題庫、單字卡、筆記、學習追蹤 |

---

## apps/portal 結構

```
apps/portal/
├── src/
│   ├── app/
│   │   ├── layout.tsx           # 根 Layout
│   │   ├── page.tsx             # 首頁 (導向登入或選擇模組)
│   │   ├── globals.css          # 全域樣式
│   │   ├── login/
│   │   │   └── page.tsx         # 登入頁
│   │   ├── auth/
│   │   │   └── callback/
│   │   │       └── route.ts     # OAuth callback
│   │   └── logout-button.tsx    # 登出按鈕元件
│   └── lib/                     # Portal 專用工具
├── middleware.ts                # Auth 保護
├── public/
│   └── favicon.ico              # 網站 icon (主入口)
├── next.config.js
├── package.json
├── tailwind.config.js
└── tsconfig.json
```

---

## packages/database 結構

```
packages/database/
├── src/
│   ├── client.ts                # Browser Client (Client Components 用)
│   ├── server.ts                # Server Client (Server Components 用)
│   ├── middleware.ts            # Middleware 用的 session 更新
│   ├── index.ts                 # 主導出檔
│   └── types/
│       ├── database.types.ts    # Supabase 自動生成的類型
│       ├── custom.ts            # 自定義類型 (Task, Habit, Goal 等)
│       └── index.ts             # 類型導出
├── package.json
└── tsconfig.json
```

### packages/database/src/index.ts
```typescript
export { createClient } from './client'
export { createServerSupabaseClient } from './server'  // 不從主入口導出，避免 Client Component 問題
export { updateSession } from './middleware'
export * from './types'
export type { Database } from './types/database.types'
```

### packages/database/src/types/index.ts
```typescript
export * from "./database.types"
export * from "./custom"
```

### packages/database/src/client.ts (Supabase SSR 新版寫法)
```typescript
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

---

## packages/ui 結構

```
packages/ui/
├── src/
│   ├── components/
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── textarea.tsx
│   │   ├── checkbox.tsx
│   │   ├── dialog.tsx
│   │   ├── select.tsx
│   │   ├── alert-dialog.tsx
│   │   ├── card.tsx
│   │   ├── switch.tsx
│   │   └── ... (其他 shadcn/ui 元件)
│   └── index.ts                 # 統一導出所有元件
├── package.json
└── tsconfig.json
```

### packages/ui/src/index.ts
```typescript
export * from "./components/button"
export * from "./components/input"
export * from "./components/label"
export * from "./components/textarea"
export * from "./components/checkbox"
export * from "./components/dialog"
export * from "./components/select"
export * from "./components/alert-dialog"
// ... 其他元件
```

---

## packages/utils 結構

```
packages/utils/
├── src/
│   ├── cn.ts                    # className 合併工具
│   └── index.ts
├── package.json
└── tsconfig.json
```

---

## apps/life 結構

```
apps/life/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx             # 首頁 (導向登入或 dashboard)
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   └── page.tsx
│   │   ├── auth/
│   │   │   └── callback/
│   │   │       └── route.ts
│   │   └── dashboard/
│   │       ├── layout.tsx       # Dashboard 共用 Layout (含 Sidebar)
│   │       ├── page.tsx         # Dashboard 主頁 (日曆 + 今日提醒 + 目標)
│   │       ├── day/
│   │       │   └── [date]/
│   │       │       └── page.tsx # 日期詳情頁 (12個可收合模組)
│   │       ├── tasks/
│   │       │   └── page.tsx
│   │       ├── habits/
│   │       │   └── page.tsx
│   │       ├── schedule/
│   │       │   └── page.tsx
│   │       ├── plans/
│   │       │   └── page.tsx
│   │       ├── journal/
│   │       │   ├── life/
│   │       │   │   └── page.tsx
│   │       │   ├── learning/
│   │       │   │   └── page.tsx
│   │       │   ├── reading/
│   │       │   │   └── page.tsx
│   │       │   ├── gratitude/
│   │       │   │   └── page.tsx
│   │       │   └── travel/
│   │       │       └── page.tsx
│   │       ├── finance/
│   │       │   └── page.tsx
│   │       ├── health/
│   │       │   └── page.tsx
│   │       ├── goals/
│   │       │   └── page.tsx
│   │       └── settings/
│   │           └── page.tsx
│   ├── components/
│   │   ├── dialogs/             # 所有對話框元件
│   │   │   ├── index.ts
│   │   │   ├── task-dialog.tsx
│   │   │   ├── daily-plan-dialog.tsx
│   │   │   ├── journal-life-dialog.tsx
│   │   │   ├── journal-learning-dialog.tsx
│   │   │   ├── journal-reading-dialog.tsx
│   │   │   ├── journal-gratitude-dialog.tsx
│   │   │   ├── journal-travel-dialog.tsx
│   │   │   ├── finance-dialog.tsx
│   │   │   ├── exercise-dialog.tsx
│   │   │   └── health-metric-dialog.tsx
│   │   ├── panels/              # 面板元件 (用於日期詳情頁)
│   │   │   ├── index.ts
│   │   │   ├── constants.ts     # 共用常數 (MOOD_CONFIG, WEATHER_OPTIONS 等)
│   │   │   ├── schedule-panel.tsx
│   │   │   ├── task-panel.tsx
│   │   │   ├── habit-panel.tsx
│   │   │   ├── daily-plan-panel.tsx
│   │   │   └── ... 其他 panels
│   │   ├── photo-uploader.tsx   # 照片上傳元件 (遊覽日誌用)
│   │   ├── sidebar.tsx          # 側邊欄
│   │   └── header.tsx           # 頂部導航
│   ├── hooks/
│   │   ├── index.ts
│   │   ├── use-dashboard-data.ts
│   │   └── use-goal-progress.ts
│   └── middleware.ts            # Next.js middleware (Auth 保護)
├── public/
├── .env.local
├── next.config.js
├── package.json
├── tailwind.config.js
└── tsconfig.json
```

---

## Import 規則

### 從 packages 導入
```typescript
// UI 元件
import { Button, Input, Dialog, ... } from "@daily/ui"

// 資料庫
import { createClient } from "@daily/database"
import type { Task, Habit, Goal, MOOD_LABELS } from "@daily/database"

// 工具函數
import { cn } from "@daily/utils"
```

### 從本地導入 (apps/life 內)
```typescript
// 對話框
import { TaskDialog, FinanceDialog } from "@/components/dialogs"

// Hooks
import { useDashboardData } from "@/hooks"

// 本地元件
import { PhotoUploader } from "@/components/photo-uploader"
```

---

## Supabase 使用規則 (SSR 新版)

### Client Components ("use client")
```typescript
import { createClient } from "@daily/database"

function MyComponent() {
  const handleAction = async () => {
    const supabase = createClient()  // 在函數內呼叫
    const { data } = await supabase.from("tasks").select("*")
  }
}
```

### Server Components
```typescript
import { createServerSupabaseClient } from "@daily/database/server"

async function MyServerComponent() {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase.from("tasks").select("*")
}
```

### 處理類型推斷問題 (never 類型)
```typescript
// 查詢後加類型斷言
const { data } = await supabase.from("tasks").select("due_date")
const tasksList = (data ?? []) as { due_date: string | null }[]

// insert/update/delete 用 as any
await (supabase.from("tasks") as any).insert({ ... })
await (supabase.from("tasks") as any).update({ ... }).eq("id", id)
await (supabase.from("tasks") as any).delete().eq("id", id)
```

---

## 資料庫表格 (Supabase)

### 核心表格
- profiles - 用戶設定
- tasks - 任務
- habits - 習慣
- habit_logs - 習慣打卡記錄
- schedule_slots - 課表
- daily_plans - 每日行程
- goals - 目標追蹤

### 日誌表格
- journals_life - 生活日誌
- journals_learning - 學習日誌
- journals_reading - 閱讀日誌
- journals_gratitude - 感恩日誌
- journals_travel - 遊覽日誌

### 財務表格
- finance_records - 收支記錄
- finance_categories - 收支分類

### 健康表格
- health_exercises - 運動記錄
- health_metrics - 健康數據

### 學習表格 (apps/learning 用)
- subjects - 科目
- topics - 主題
- units - 單元
- questions - 題目
- decks - 單字卡牌組
- flashcards - 單字卡

---

## 對話框元件 Props 標準介面

```typescript
interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  formData: Record<string, any>
  setFormData: (data: Record<string, any>) => void
  onSave: () => void
  saving: boolean
  dateLabel: string
  isEdit: boolean
}

// 特殊：JournalTravelDialog 額外需要
interface JournalTravelDialogProps extends DialogProps {
  photos: string[]
  setPhotos: (photos: string[]) => void
}
```

---

## 待完成的 Dialog 元件清單

需要建立的對話框（參考 FinanceDialog 的結構）：
- [x] finance-dialog.tsx
- [x] journal-travel-dialog.tsx
- [ ] task-dialog.tsx
- [ ] daily-plan-dialog.tsx
- [ ] journal-life-dialog.tsx
- [ ] journal-learning-dialog.tsx
- [ ] journal-reading-dialog.tsx
- [ ] journal-gratitude-dialog.tsx
- [ ] exercise-dialog.tsx
- [ ] health-metric-dialog.tsx

---

## 常用指令

```bash
# 開發
pnpm dev                    # 啟動所有 apps
pnpm dev --filter portal    # 只啟動 portal app
pnpm dev --filter life      # 只啟動 life app
pnpm dev --filter learning  # 只啟動 learning app

# 清除快取
Remove-Item -Recurse -Force apps/portal/.next
Remove-Item -Recurse -Force apps/life/.next
Remove-Item -Recurse -Force apps/learning/.next

# 生成 Supabase 類型
npx supabase gen types typescript --linked > packages/database/src/types/database.types.ts

# 安裝依賴
pnpm install
```

---

## Vercel 部署設定

Monorepo 中每個 App 需要**獨立的 Vercel Project**：

### Portal (主入口)
| 設定項目 | 值 |
|---------|-----|
| Root Directory | `apps/portal` |
| Build Command | `cd ../.. && pnpm turbo build --filter=portal` |
| Install Command | `pnpm install` |

### Life (生活管理)
| 設定項目 | 值 |
|---------|-----|
| Root Directory | `apps/life` |
| Build Command | `cd ../.. && pnpm turbo build --filter=life` |
| Install Command | `pnpm install` |

### Learning (學習管理)
| 設定項目 | 值 |
|---------|-----|
| Root Directory | `apps/learning` |
| Build Command | `cd ../.. && pnpm turbo build --filter=learning` |
| Install Command | `pnpm install` |

### 環境變數 (所有專案都需要)
```
NEXT_PUBLIC_SUPABASE_URL=你的_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的_supabase_anon_key
```

---

## 注意事項

1. **VS Code 編輯問題**：有時 VS Code 不會正確保存檔案，建議用 Notepad++ 確認
2. **UTF-8 編碼**：database.types.ts 必須是 UTF-8 編碼
3. **Supabase 權限**：建表時必須加 `GRANT ALL ON [table] TO authenticated; GRANT ALL ON [table] TO anon;`
4. **Server 導出**：不要從 `@daily/database` 主入口導出 server.ts，否則 Client Components 會報錯
