// apps/portal/src/app/auth/callback/route.ts
// 處理 Email 確認和 OAuth 回調

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // 如果有錯誤，重定向到登入頁
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
