//apps/portal/next.config.ts
import type { NextConfig } from 'next'
import { config } from 'dotenv'
import { resolve } from 'path'
import withPWAInit from 'next-pwa'

// 載入根目錄的 .env.local
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
