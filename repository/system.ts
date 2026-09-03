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
  | { state: 'ok'; status: string; degraded: string[] }
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

/**
 * A part the screen asks about but that may not answer. Every reading the
 * system screen takes comes back in this shape, so a part that cannot be read
 * is drawn the same way whichever part it is.
 */
export type Reading<T> =
  | { state: 'ok'; value: T }
  | { state: 'unauthenticated' }
  | { state: 'unavailable' }

export interface TunerCensus {
  /** Rows in the ledger. */
  total: number
  /** Held by a session right now. */
  busy: number
  disabled: number
  faulted: number
  /** The ledger and what the driver reports disagree. */
  drifted: boolean
}

export interface StorageCensus {
  roots: number
  freeBytes: number
  totalBytes: number
  /** Roots that cannot be written to. */
  unwritable: number
  /** Recordings writing into these roots right now. */
  inFlight: number
  /** Set when a root is short of what the schedule commits it to. */
  short: boolean
}

export interface CollectionCensus {
  /** Transport streams the collector walks. */
  streams: number
  /** Streams whose last visit did not complete. */
  troubled: number
}

export interface LiveCensus {
  sessions: number
  viewers: number
}

export interface SystemStatus {
  api: ApiHealthResult
  driver: DriverStatusResult
  tuners: Reading<TunerCensus>
  storage: Reading<StorageCensus>
  collection: Reading<CollectionCensus>
  live: Reading<LiveCensus>
}

export async function getSystemStatus(): Promise<SystemStatus> {
  let client: CarinaClient

  try {
    client = carinaClient()
  } catch {
    return {
      api: { state: 'unconfigured' },
      driver: { state: 'unconfigured' },
      ...UNREADABLE,
    }
  }

  const [api, driver, tuners, storage, collection, live] = await Promise.all([
    readHealth(client),
    readDriverStatus(client),
    readTuners(client),
    readStorage(client),
    readCollection(client),
    readLive(client),
  ])

  return { api, driver, tuners, storage, collection, live }
}

const UNREADABLE = {
  tuners: { state: 'unavailable' },
  storage: { state: 'unavailable' },
  collection: { state: 'unavailable' },
  live: { state: 'unavailable' },
} as const

/**
 * Every census below reads one endpoint and counts. The counting is here
 * rather than on the screen because it is the same question each time — how
 * many of these are there, and how many of them are not right — and an answer
 * a screen works out for itself is an answer only that screen has.
 *
 * Signed out is not the same as unreadable, so it keeps its own answer: the
 * screen says which, and only one of the two is a fault.
 */
async function census<T>(take: () => Promise<Reading<T>>): Promise<Reading<T>> {
  try {
    return await take()
  } catch (error) {
    unstable_rethrow(error)

    return { state: 'unavailable' }
  }
}

async function readTuners(client: CarinaClient): Promise<Reading<TunerCensus>> {
  return census<TunerCensus>(async () => {
    const { data, response } = await client.GET('/api/tuners')

    if (response.status === 401) {
      return { state: 'unauthenticated' }
    }

    const ledger = data?.data

    if (!ledger) {
      return { state: 'unavailable' }
    }

    const observed = ledger.observed ?? []

    return {
      state: 'ok',
      value: {
        total: ledger.desired.length,
        busy: observed.filter((row) => row.state === 'busy').length,
        disabled: ledger.desired.filter((row) => row.disabled).length,
        faulted: observed.filter(
          (row) => row.state === 'faulted' || row.health === 'faulted',
        ).length,
        drifted: ledger.drifted,
      },
    }
  })
}

async function readStorage(
  client: CarinaClient,
): Promise<Reading<StorageCensus>> {
  return census<StorageCensus>(async () => {
    const { data, response } = await client.GET('/api/storage')

    if (response.status === 401) {
      return { state: 'unauthenticated' }
    }

    const roots = data?.data?.roots

    if (!roots) {
      return { state: 'unavailable' }
    }

    return {
      state: 'ok',
      value: {
        roots: roots.length,
        freeBytes: roots.reduce((sum, root) => sum + Number(root.freeBytes), 0),
        totalBytes: roots.reduce(
          (sum, root) => sum + Number(root.totalBytes),
          0,
        ),
        unwritable: roots.filter((root) => !root.writable).length,
        inFlight: roots.reduce(
          (sum, root) => sum + Number(root.recordingsInFlight),
          0,
        ),
        short: roots.some((root) => root.shortfall !== null),
      },
    }
  })
}

/** A visit that ended in any of these left the stream short of a full read. */
const INCOMPLETE_VISIT: ReadonlySet<string> = new Set([
  'neverVisited',
  'incomplete',
  'interrupted',
  'noLock',
  'noBytes',
])

async function readCollection(
  client: CarinaClient,
): Promise<Reading<CollectionCensus>> {
  return census<CollectionCensus>(async () => {
    const { data, response } = await client.GET('/api/epg/collection-status')

    if (response.status === 401) {
      return { state: 'unauthenticated' }
    }

    const streams = data?.data?.streams

    if (!streams) {
      return { state: 'unavailable' }
    }

    return {
      state: 'ok',
      value: {
        streams: streams.length,
        troubled: streams.filter((stream) =>
          INCOMPLETE_VISIT.has(stream.outcome),
        ).length,
      },
    }
  })
}

async function readLive(client: CarinaClient): Promise<Reading<LiveCensus>> {
  return census<LiveCensus>(async () => {
    const { data, response } = await client.GET('/api/live/sessions')

    if (response.status === 401) {
      return { state: 'unauthenticated' }
    }

    const sessions = data?.data

    if (!sessions) {
      return { state: 'unavailable' }
    }

    return {
      state: 'ok',
      value: {
        sessions: sessions.length,
        viewers: sessions.reduce(
          (sum, session) => sum + Number(session.viewers),
          0,
        ),
      },
    }
  })
}

async function readHealth(client: CarinaClient): Promise<ApiHealthResult> {
  try {
    const { data, response } = await client.GET('/api/health')

    if (data === undefined) {
      return { state: 'failed', httpStatus: response.status }
    }

    return { state: 'ok', status: data.status, degraded: data.degraded }
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
