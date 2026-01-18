// apps/learning/src/middleware.ts
// Next.js Middleware - 放在 src/ 根目錄

import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from './lib/supabase/proxy'

export async function middleware(request: NextRequest) {
  const { user, supabaseResponse } = await updateSession(request)

  // 取得當前路徑
  const pathname = request.nextUrl.pathname

  // 定義保護路由
  const protectedRoutes = ['/dashboard']
  const authRoutes = ['/login', '/register', '/auth']

  // 檢查是否為保護路由
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))

  // 未登入用戶嘗試訪問保護路由 → 重定向到 Portal 登入頁
  if (isProtectedRoute && !user) {
    // 跳轉到 Portal 的登入頁
    const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3000'
    const loginUrl = new URL('/login', portalUrl)
    loginUrl.searchParams.set('redirect', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // 已登入用戶嘗試訪問登入頁 → 重定向到 dashboard
  if (isAuthRoute && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
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
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
