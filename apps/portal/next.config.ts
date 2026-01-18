//apps/portal/next.config.ts
import type { NextConfig } from 'next'
import { config } from 'dotenv'
import { resolve } from 'path'

// 載入根目錄的 .env.local
config({ path: resolve(__dirname, '../../.env.local') })

const nextConfig: NextConfig = {
  transpilePackages: ['@daily/ui', '@daily/utils', '@daily/database'],
}

export default nextConfig