import createClient from 'openapi-fetch'
import type { paths } from '@/repository/client/schema'

export function carinaClient() {
  const baseUrl = process.env.CARINA_API_BASE_URL

  if (!baseUrl) {
    throw new Error('CARINA_API_BASE_URL is not set')
  }

  return createClient<paths>({ baseUrl })
}
