import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import type { NextConfig } from 'next'

const devOrigins = process.env.DEV_ALLOWED_ORIGINS?.split(',').filter(Boolean)

const { version } = JSON.parse(
  readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'),
) as { version: string }

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  typedRoutes: true,
  env: { VELA_VERSION: version },
  ...(devOrigins?.length ? { allowedDevOrigins: devOrigins } : {}),
}

export default nextConfig
