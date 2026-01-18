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

  // 如果沒有 code 或交換失敗，重導向到登入頁
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
