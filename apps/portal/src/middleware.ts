// apps/portal/src/middleware.ts
// Next.js Middleware - 放在 src/ 根目錄

import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from './lib/supabase/proxy'

export async function middleware(request: NextRequest) {
  const { user, supabaseResponse } = await updateSession(request)

  const pathname = request.nextUrl.pathname

  // Portal 路由邏輯：
  // - `/` (選擇平台頁) → 需要登入
  // - `/login` → 已登入則跳轉首頁

  const isLoginPage = pathname === '/login'
  const isAuthCallback = pathname.startsWith('/auth/callback')

  // Auth callback 不需要驗證
  if (isAuthCallback) {
    return supabaseResponse
  }

  // 未登入 + 不在登入頁 → 跳轉登入頁
  if (!user && !isLoginPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // 已登入 + 在登入頁 → 跳轉首頁（選擇平台）
  if (user && isLoginPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
