# 日曆 2.0 (Daily Platform)

生活記錄與學習平台的 Monorepo 專案

## 專案結構

```
daily-platform/
├── apps/
│   ├── portal/          # 入口應用 (port 3000)
│   ├── life/            # 生活記錄平台 (port 3001)
│   └── learning/        # 學習平台 (port 3002)
├── packages/
│   ├── shared/          # 共用邏輯 (Supabase, hooks, types)
│   └── ui/              # 共用 UI 元件
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## 快速開始

### 1. 安裝依賴

```bash
pnpm install
```

### 2. 設定環境變數

```bash
cp .env.local.example .env.local
# 編輯 .env.local，填入 Supabase 連線資訊
```

### 3. 啟動開發伺服器

```bash
# 啟動所有應用
pnpm dev

# 或單獨啟動
pnpm dev:portal    # http://localhost:3000
pnpm dev:life      # http://localhost:3001
pnpm dev:learning  # http://localhost:3002
```

## 應用說明

### Portal (入口)
- 登入/註冊
- 選擇平台（生活記錄 / 學習平台）

### Life (生活記錄)
- 每日行程
- 任務管理
- 習慣打卡
- 多種日誌（生活、感恩、遊覽、閱讀）
- 財務記錄
- 健康追蹤
- 運動記錄

### Learning (學習平台)
- 科目管理
- 單元/章節
- 字卡（間隔重複）
- 題庫
- 練習模式
- 學習日誌
- 學習統計

## 技術棧

- **框架**: Next.js 15, React 19
- **語言**: TypeScript
- **樣式**: Tailwind CSS v3
- **UI**: shadcn/ui
- **資料庫**: Supabase
- **Monorepo**: Turborepo + pnpm

## 遷移指南

從原專案遷移元件時，需要：

1. 更新 Supabase import:
   ```typescript
   // 舊
   import { supabase } from '@/lib/supabaseClient'
   
   // 新
   import { createClient } from '@daily/shared/supabase'
   const supabase = createClient()
   ```

2. 更新 UI 元件 import:
   ```typescript
   // 舊
   // import { Button } from '@/components/ui/button'
   
   // 新
   import { Button } from '@daily/ui'
   ```

3. 更新 cn 函數 import:
   ```typescript
   // 舊
   import { cn } from '@/lib/utils'
   
   // 新
   import { cn } from '@daily/shared/utils'
   ```

## 指令

```bash
pnpm dev          # 開發模式
pnpm build        # 建置
pnpm lint         # 檢查程式碼
pnpm typecheck    # 類型檢查
pnpm clean        # 清理快取
```

## 資料庫注意事項

建立新表格時，記得加入權限：

```sql
GRANT ALL ON [table_name] TO authenticated;
GRANT ALL ON [table_name] TO anon;
```
