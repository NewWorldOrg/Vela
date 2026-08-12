import { NextConfig } from 'next'

const devOrigins = process.env.DEV_ALLOWED_ORIGINS?.split(',').filter(Boolean)

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  typedRoutes: true,
  ...(devOrigins?.length ? { allowedDevOrigins: devOrigins } : {}),
}

export default nextConfig
