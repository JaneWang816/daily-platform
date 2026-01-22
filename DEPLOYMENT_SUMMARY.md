# Daily Platform 部署與設定總結

## 專案架構

```
daily-platform/
├── apps/
│   ├── portal/     # 主入口（登入/註冊）- 統一登入點
│   ├── life/       # 生活管理平台
│   └── learning/   # 學習管理平台
└── packages/
    ├── database/   # Supabase 資料庫
    ├── ui/         # 共用 UI 元件
    └── utils/      # 共用工具函式
```

---

## Vercel 部署設定

### 三個獨立專案

| App | URL | Root Directory |
|-----|-----|----------------|
| Portal | `https://daily-platform-portal.vercel.app` | `apps/portal` |
| Life | `https://daily-platform-life.vercel.app` | `apps/life` |
| Learning | `https://daily-platform-learning.vercel.app` | `apps/learning` |

### Build Command

```
cd ../.. && pnpm turbo build --filter=@daily/portal
cd ../.. && pnpm turbo build --filter=@daily/life
cd ../.. && pnpm turbo build --filter=@daily/learning
```

### 環境變數（三個專案都要設定）

```
NEXT_PUBLIC_SUPABASE_URL=你的Supabase URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的Supabase Anon Key
NEXT_PUBLIC_PORTAL_URL=https://daily-platform-portal.vercel.app
NEXT_PUBLIC_LIFE_URL=https://daily-platform-life.vercel.app
NEXT_PUBLIC_LEARNING_URL=https://daily-platform-learning.vercel.app
```

---

## Supabase Auth 設定

### Site URL
```
https://daily-platform-portal.vercel.app
```

### Redirect URLs（全部）
```
# 舊版平台
https://self-learning-v1.vercel.app/

# 本地開發
http://localhost:3000
http://localhost:3000/auth/callback
http://localhost:3001/auth/callback
http://localhost:3002/auth/callback

# 新版平台
https://daily-platform-portal.vercel.app/auth/callback
https://daily-platform-life.vercel.app/auth/callback
https://daily-platform-learning.vercel.app/auth/callback
```

---

## 跨平台 Session Transfer 機制

### 運作流程

```
1. 用戶在 Portal 登入
2. 點擊「生活管理」或「學習平台」
3. Portal 取得 session token，跳轉到目標平台的 /auth/transfer
4. 目標平台用 token 建立 session
5. 自動導向 /dashboard ✅
```

### 相關檔案

| 檔案 | 用途 |
|------|------|
| `apps/portal/src/app/page.tsx` | 登入後選擇平台，跳轉時帶 token |
| `apps/life/src/app/auth/transfer/page.tsx` | 接收 token 並建立 session |
| `apps/learning/src/app/auth/transfer/page.tsx` | 接收 token 並建立 session |
| `apps/life/src/app/auth/callback/route.ts` | OAuth 回調處理 |
| `apps/learning/src/app/auth/callback/route.ts` | OAuth 回調處理 |

### 注意事項

- `useSearchParams()` 需要用 `Suspense` 包裹
- 需要加上 `export const dynamic = 'force-dynamic'` 禁止預渲染
- 未登入時導向 `${portalUrl}/login`

---

## PWA 設定（Portal）

### 安裝套件

```powershell
cd apps/portal
pnpm add next-pwa
```

### 檔案結構

```
apps/portal/
├── next.config.ts          # 含 PWA 設定
├── next-pwa.d.ts           # 類型宣告
├── src/app/
│   └── layout.tsx          # 含 PWA metadata
└── public/
    ├── manifest.json       # PWA manifest
    ├── favicon.ico
    ├── icon-192.png        # 192x192
    └── icon-512.png        # 512x512
```

### next.config.ts

```typescript
import type { NextConfig } from 'next'
import { config } from 'dotenv'
import { resolve } from 'path'
import withPWAInit from 'next-pwa'

config({ path: resolve(__dirname, '../../.env.local') })

const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
})

const nextConfig: NextConfig = {
  transpilePackages: ['@daily/ui', '@daily/utils', '@daily/database'],
}

export default withPWA(nextConfig)
```

### manifest.json

```json
{
  "name": "點滴日日",
  "short_name": "點滴日日",
  "description": "生活管理 + 學習管理平台",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

---

## 常見問題與解決方式

### 1. Vercel 部署失敗：Cannot find module

**原因：** 快取問題或 import 路徑錯誤

**解決：**
- Redeploy 時勾選 **Clear Build Cache**
- 檢查 import 路徑是否正確

### 2. useSearchParams() 預渲染錯誤

**原因：** Next.js build 時嘗試預渲染，但沒有 URL 參數

**解決：**
```typescript
export const dynamic = 'force-dynamic'

// 用 Suspense 包裹
<Suspense fallback={...}>
  <使用 useSearchParams 的元件 />
</Suspense>
```

### 3. Multiple GoTrueClient instances 警告

**原因：** 多個地方呼叫 `createClient()`

**解決：** 在 `packages/database/src/client.ts` 使用 Singleton 模式

### 4. TypeScript 找不到模組類型

**解決：**
1. VS Code 按 `Ctrl + Shift + P` → `TypeScript: Restart TS Server`
2. 或建立 `.d.ts` 類型宣告檔

### 5. 跨域 Cookie/Session 無法共享

**原因：** 不同域名的 Cookie 無法共享

**解決：** 使用 Token Transfer 機制（本專案採用的方案）

---

## 更新部署流程

設定完成後，之後更新只需要：

```
修改程式碼 → git push → Vercel 自動部署 → 完成 ✅
```

不需要重新設定任何東西！

---

## 檔案修改總覽

### Portal

| 檔案 | 狀態 |
|------|------|
| `src/app/page.tsx` | 修改（Client Component，帶 token 跳轉） |
| `src/app/layout.tsx` | 修改（PWA metadata） |
| `next.config.ts` | 修改（PWA 設定） |
| `next-pwa.d.ts` | 新增（類型宣告） |
| `public/manifest.json` | 新增 |
| `public/icon-192.png` | 新增 |
| `public/icon-512.png` | 新增 |

### Life

| 檔案 | 狀態 |
|------|------|
| `src/app/auth/callback/route.ts` | 新增 |
| `src/app/auth/transfer/page.tsx` | 新增 |
| `src/app/dashboard/layout.tsx` | 修改（導向 Portal） |
| `src/components/layout/sidebar.tsx` | 修改（Token Transfer 切換平台） |
| `src/app/login/` | 刪除 |

### Learning

| 檔案 | 狀態 |
|------|------|
| `src/app/auth/callback/route.ts` | 修改（錯誤導向 Portal） |
| `src/app/auth/transfer/page.tsx` | 新增 |
| `src/app/dashboard/layout.tsx` | 修改（統一 import 路徑） |
| `src/components/layout/sidebar.tsx` | 修改（Token Transfer 切換平台） |
| `src/app/login/` | 刪除 |

### Packages

| 檔案 | 狀態 |
|------|------|
| `packages/database/src/client.ts` | 可選修改（Singleton 模式） |
