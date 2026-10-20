import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { beforeEach, mock, test } from 'node:test'

const NAVIGATION = 'next/navigation'

const STOOD_IN = 'vela-stand-in:next/navigation'

registerHooks({
  resolve(specifier, context, next) {
    return specifier === NAVIGATION
      ? { url: STOOD_IN, shortCircuit: true }
      : next(specifier, context)
  },
  load(url, context, next) {
    return url === STOOD_IN
      ? {
          format: 'module',
          source: 'export const unstable_rethrow = () => {}',
          shortCircuit: true,
        }
      : next(url, context)
  },
})

const asked: string[] = []

const store: {
  status: unknown
  services: unknown[]
  httpStatus: number
  throwing: boolean
  servicesThrowing: boolean
} = {
  status: null,
  services: [],
  httpStatus: 200,
  throwing: false,
  servicesThrowing: false,
}

const LEARNING_DATA = {
  recordings: 3,
  seconds: 5400,
  bytes: 5000000123,
  waiting: 12,
}

const SUMMARY = { boundaryRecallWithin2s: 0.96 }

const STATUS = {
  learning: true,
  learningData: LEARNING_DATA,
  catalog: {
    cm: 820,
    opening: 0,
    ending: 0,
    programmeFixture: 40,
    stationFixture: 6,
    unknown: 133,
  },
  version: {
    number: 3,
    state: 'active',
    byHand: false,
    trainedAt: '2026-11-01T18:00:00Z',
    adoptedAt: '2026-11-01T18:05:00Z',
  },
  evidence: {
    recordings: 12,
    boundaries: 148,
    enough: true,
    recordingsNeeded: 10,
    boundariesNeeded: 100,
  },
  metrics: {
    boundaryRecallWithin2s: 0.93,
    boundaryRecallWithin1s: null,
    kinds: [
      { kind: 'ending', recall: null },
      { kind: 'programme', recall: 0.99 },
      { kind: 'break', recall: 0.95 },
      { kind: 'trailer', recall: 0.5 },
    ],
    returnedAfterSkipShare: 0.03,
    skips: 64,
  },
  stations: [
    { networkId: 1, serviceId: 101, recordings: 5, metrics: SUMMARY },
    {
      networkId: 1,
      serviceId: 109,
      recordings: 2,
      metrics: { boundaryRecallWithin2s: null },
    },
  ],
  versions: [
    {
      number: 3,
      state: 'active',
      byHand: false,
      trainedAt: '2026-11-01T18:00:00Z',
      adoptedAt: '2026-11-01T18:05:00Z',
      retiredAt: null,
      rolledBack: null,
      metrics: SUMMARY,
    },
    {
      number: 2,
      state: 'retired',
      byHand: false,
      trainedAt: '2026-10-25T18:00:00Z',
      adoptedAt: '2026-10-25T18:05:00Z',
      retiredAt: '2026-10-28T12:40:00Z',
      rolledBack: {
        at: '2026-10-28T12:40:00Z',
        returnedAfterSkipShare: 0.09,
        previousShare: 0.03,
        skips: 25,
      },
      metrics: SUMMARY,
    },
    {
      number: 1,
      state: 'retired',
      byHand: false,
      trainedAt: '2026-10-18T03:00:00Z',
      adoptedAt: '2026-10-18T03:00:00Z',
      retiredAt: '2026-10-25T18:05:00Z',
      rolledBack: null,
      metrics: null,
    },
  ],
  skipThreshold: { current: 0.7 },
}

const LOGO = { declaration: 'inTheCommonDataTable', href: '/logo/1-101' }

const STATION = {
  id: '1-101',
  no: '1',
  name: '湾岸放送1',
  kind: 'terrestrial',
  logo: LOGO,
  networkId: 1,
  serviceId: 101,
  sortKey: [1, 1, 101],
}

const answered = (status: number) => ({ status, ok: status < 400 })

const client = () => ({
  GET: async (path: string) => {
    asked.push(path)

    if (store.throwing) {
      throw new Error('the API is not there')
    }

    if (store.httpStatus >= 400) {
      return {
        error: { status: false, message: '', data: null },
        response: answered(store.httpStatus),
      }
    }

    return {
      data: { status: true, message: '', data: store.status },
      response: answered(store.httpStatus),
    }
  },
})

mock.module('@/repository/client/carina', {
  namedExports: { carinaClient: client, revalidatingCarinaClient: client },
})

mock.module('@/repository/programs', {
  namedExports: {
    fetchServiceChannels: async () => {
      asked.push('services')

      if (store.servicesThrowing) {
        throw new Error('the services are not there')
      }

      return store.services
    },
  },
})

const { formatMoment } = await import('@/lib/format')
const { getSegmentStatus } = await import('@/repository/segment-status')

beforeEach(() => {
  asked.length = 0
  store.status = STATUS
  store.services = [STATION]
  store.httpStatus = 200
  store.throwing = false
  store.servicesThrowing = false
})

async function readValue() {
  const read = await getSegmentStatus()

  assert.equal(read.state, 'ok')

  return read.state === 'ok' ? read.value : assert.fail('the status is unread')
}

test('the status is read as the API answers it', async () => {
  const status = await readValue()

  assert.equal(status.learning, true)
  assert.deepEqual(status.learningData, LEARNING_DATA)
  assert.deepEqual(status.catalog, { cm: 820, programmeFixture: 40 })
  assert.deepEqual(status.version, {
    number: 3,
    byHand: false,
    adoptedAt: formatMoment('2026-11-01T18:05:00Z'),
  })
  assert.deepEqual(status.evidence, STATUS.evidence)
  assert.deepEqual(status.metrics, {
    boundaryRecallWithin2s: 0.93,
    boundaryRecallWithin1s: undefined,
    kinds: [
      { kind: 'break', recall: 0.95 },
      { kind: 'ending', recall: undefined },
    ],
    returnedAfterSkipping: 0.03,
  })
  assert.deepEqual(status.skipThreshold, { current: 0.7 })
  assert.deepEqual(asked.sort(), ['/api/segments/status', 'services'])
})

test('a station is named the way the other screens name it, and by its numbers when unknown', async () => {
  const { stations } = await readValue()

  assert.deepEqual(stations, [
    {
      key: '1-101',
      name: '湾岸放送1',
      no: '1',
      logo: LOGO,
      recordings: 5,
      metrics: SUMMARY,
    },
    {
      key: '1-109',
      name: '1-109',
      no: undefined,
      logo: undefined,
      recordings: 2,
      metrics: { boundaryRecallWithin2s: undefined },
    },
  ])

  store.servicesThrowing = true

  assert.deepEqual(
    (await readValue()).stations.map((one) => one.name),
    ['1-101', '1-109'],
  )
})

test('the history keeps when each version was made and when one was put back', async () => {
  const { versions } = await readValue()

  assert.deepEqual(versions, [
    {
      number: 3,
      state: 'active',
      trainedAt: formatMoment('2026-11-01T18:00:00Z'),
      rolledBackAt: undefined,
      metrics: SUMMARY,
    },
    {
      number: 2,
      state: 'retired',
      trainedAt: formatMoment('2026-10-25T18:00:00Z'),
      rolledBackAt: formatMoment('2026-10-28T12:40:00Z'),
      metrics: SUMMARY,
    },
    {
      number: 1,
      state: 'retired',
      trainedAt: formatMoment('2026-10-18T03:00:00Z'),
      rolledBackAt: undefined,
      metrics: undefined,
    },
  ])
})

test('what is not there yet is read as not there', async () => {
  store.status = {
    ...STATUS,
    version: { ...STATUS.version, number: 1, adoptedAt: null },
    metrics: null,
    stations: [],
  }

  const status = await readValue()

  assert.equal(status.version.adoptedAt, undefined)
  assert.equal(status.metrics, undefined)
  assert.deepEqual(status.stations, [])
})

test('a count the API spells as a string is read as a number', async () => {
  store.status = {
    ...STATUS,
    learningData: {
      recordings: '312',
      seconds: '674100',
      bytes: '450887680',
      waiting: '0',
    },
    evidence: {
      recordings: '4',
      boundaries: '37',
      enough: false,
      recordingsNeeded: '10',
      boundariesNeeded: '100',
    },
    stations: [{ ...STATUS.stations[0], recordings: '5' }],
    skipThreshold: { current: '0.7' },
  }

  const status = await readValue()

  assert.deepEqual(status.learningData, {
    recordings: 312,
    seconds: 674100,
    bytes: 450887680,
    waiting: 0,
  })
  assert.deepEqual(status.evidence, {
    recordings: 4,
    boundaries: 37,
    enough: false,
    recordingsNeeded: 10,
    boundariesNeeded: 100,
  })
  assert.equal(status.stations[0].recordings, 5)
  assert.deepEqual(status.skipThreshold, { current: 0.7 })
})

test('a status the API cannot be asked for, or answers without, is unread', async () => {
  store.throwing = true

  assert.deepEqual(await getSegmentStatus(), { state: 'unavailable' })

  store.throwing = false
  store.status = null

  assert.deepEqual(await getSegmentStatus(), { state: 'unavailable' })

  store.status = STATUS
  store.httpStatus = 500

  assert.deepEqual(await getSegmentStatus(), { state: 'unavailable' })
})

test('a status read without a session says so', async () => {
  store.httpStatus = 401

  assert.deepEqual(await getSegmentStatus(), { state: 'unauthenticated' })
})
