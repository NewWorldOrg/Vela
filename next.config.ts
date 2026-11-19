import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import type { NextConfig } from 'next'

const devOrigins = process.env.DEV_ALLOWED_ORIGINS?.split(',').filter(Boolean)

const { version } = JSON.parse(
  readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'),
) as { version: string }

const FRAME_POLICY = "frame-src 'self'"

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingExcludes: {
    '*': ['node_modules/sharp/**', 'node_modules/@img/**'],
  },
  productionBrowserSourceMaps: process.env.VELA_BROWSER_SOURCE_MAPS === '1',
  reactStrictMode: true,
  typedRoutes: true,
  env: { VELA_VERSION: version },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [{ key: 'Content-Security-Policy', value: FRAME_POLICY }],
      },
      {
        source: '/sw.js',
        headers: [{ key: 'Cache-Control', value: 'no-cache' }],
      },
    ]
  },
  ...(devOrigins?.length ? { allowedDevOrigins: devOrigins } : {}),
}

export default nextConfig
