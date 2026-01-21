//apps/life/src/app/auth/callback/route.ts
import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@daily/database/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/dashboard"

  if (code) {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // 如果沒有 code 或交換失敗，重導向到 Portal 登入頁
  const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || "http://localhost:3000"
  return NextResponse.redirect(`${portalUrl}/login?error=auth_failed`)
}
