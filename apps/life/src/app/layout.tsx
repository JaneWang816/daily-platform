//apps/life/src/app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '生活管理 | Daily Platform',
  description: '習慣追蹤、任務管理、日記、健康、財務',
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