import { unstable_rethrow } from 'next/navigation'

import { carinaClient } from '@/repository/client/carina'
import type { components } from '@/repository/client/schema'

type CarinaClient = ReturnType<typeof carinaClient>
type DriverStatusResponder = components['schemas']['DriverStatusResponder']

export type DriverConnection = 'notConnected' | 'connected' | 'draining'

export interface DriverHello {
  protocolVersion: string
  instanceId: string | null
  capabilities: string[]
  draining: boolean
}

export interface DriverStatus {
  connection: DriverConnection
  hello: DriverHello | null
  appProtocolVersion: string
  missingCapabilities: string[]
  driverUpdateRequired: boolean
  observedAt: string
}

export type ApiHealthResult =
  | { state: 'ok'; status: string }
  | { state: 'unconfigured' }
  | { state: 'unreachable' }
  | { state: 'failed'; httpStatus: number }

export type DriverStatusResult =
  | { state: 'ok'; status: DriverStatus }
  | { state: 'unauthenticated' }
  | { state: 'unavailable'; message: string }
  | { state: 'unconfigured' }
  | { state: 'unreachable' }
  | { state: 'failed'; httpStatus: number }

export interface SystemStatus {
  api: ApiHealthResult
  driver: DriverStatusResult
}

export async function getSystemStatus(): Promise<SystemStatus> {
  let client: CarinaClient

  try {
    client = carinaClient()
  } catch {
    return { api: { state: 'unconfigured' }, driver: { state: 'unconfigured' } }
  }

  const [api, driver] = await Promise.all([
    readHealth(client),
    readDriverStatus(client),
  ])

  return { api, driver }
}

async function readHealth(client: CarinaClient): Promise<ApiHealthResult> {
  try {
    const { data, response } = await client.GET('/api/health')

    if (data === undefined) {
      return { state: 'failed', httpStatus: response.status }
    }

    return { state: 'ok', status: data.status }
  } catch (error) {
    unstable_rethrow(error)

    return { state: 'unreachable' }
  }
}

async function readDriverStatus(
  client: CarinaClient,
): Promise<DriverStatusResult> {
  try {
    const { data, error, response } = await client.GET('/api/driver/status')

    if (response.status === 401) {
      return { state: 'unauthenticated' }
    }

    const body = data ?? error

    if (body === undefined) {
      return { state: 'failed', httpStatus: response.status }
    }

    if (body.data === null) {
      return {
        state: 'unavailable',
        message: `API は ${response.status} を返しました。`,
      }
    }

    return { state: 'ok', status: toDriverStatus(body.data) }
  } catch (error) {
    unstable_rethrow(error)

    return { state: 'unreachable' }
  }
}

function toDriverStatus(responder: DriverStatusResponder): DriverStatus {
  const { hello } = responder

  return {
    connection: responder.connection,
    hello: hello && {
      protocolVersion: String(hello.protocolVersion),
      instanceId: hello.instanceId,
      capabilities: hello.capabilities,
      draining: hello.draining,
    },
    appProtocolVersion: String(responder.appProtocolVersion),
    missingCapabilities: responder.missingCapabilities,
    driverUpdateRequired: responder.driverUpdateRequired,
    observedAt: responder.observedAt,
  }
}
