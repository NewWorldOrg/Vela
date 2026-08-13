import { carinaClient } from '@/repository/client/carina'

export interface HealthResult {
  status: string
}

export async function getHealth(): Promise<HealthResult> {
  const { data, response } = await carinaClient().GET('/api/health')

  if (!response.ok || data === undefined) {
    throw new Error(`GET /api/health answered ${response.status}`)
  }

  return { status: data.status }
}
