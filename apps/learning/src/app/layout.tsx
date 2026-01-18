// apps/learning/src/app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '學習管理 | Daily Platform',
  description: '科目筆記、字卡複習、題庫練習、學習統計',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-TW">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
