import assert from 'node:assert/strict'
import { mock, test } from 'node:test'

const STREAM = { networkId: 32701, transportStreamId: 32701 }

const service = (serviceId: number, name: string, category = 'television') => ({
  networkId: STREAM.networkId,
  serviceId,
  name,
  category,
  remoteControlKeyId: 3,
  selectedChannel: { system: 'isdbT', physicalChannel: 30 },
  candidates: [],
})

const FAR = Date.parse('2026-09-01T00:00:00Z')

const covers = (serviceId: number, coveredUntil: string | null) => ({
  serviceId,
  coveredUntil,
  meetsWantedCoverage: coveredUntil !== null && Date.parse(coveredUntil) > FAR,
})

const REACHED = '2026-09-30T00:00:00Z'

const SHORT = '2026-08-20T00:00:00Z'

const stream = (over: Record<string, unknown> = {}) => ({
  ...STREAM,
  tuning: { system: 'isdbT', physicalChannel: 30, transportStreamId: null },
  rotation: {
    state: 'active',
    consecutiveFailures: 0,
    nextAttemptAt: null,
    needsAttentionSince: null,
  },
  outcome: 'complete',
  lastAttemptedAt: new Date().toISOString(),
  lastCompletedAt: new Date().toISOString(),
  consecutiveIncomplete: 0,
  lastDurationMilliseconds: 60000,
  notBefore: null,
  serviceIds: [101, 102, 103, 108],
  coverage: [],
  tally: [],
  ...over,
})

const store: {
  streams: unknown[]
  services: unknown[]
  wantedCoverageHours: number
  refusing?: { path: string; status: number; message: string }
} = {
  streams: [],
  services: [],
  wantedCoverageHours: 192,
}

const answer = async (path: string) => {
  if (store.refusing?.path === path) {
    return {
      data: undefined,
      error: { status: false, message: store.refusing.message, data: null },
      response: { status: store.refusing.status, ok: false },
    }
  }

  if (path === '/api/epg/collection-status') {
    return {
      data: {
        data: {
          wantedCoverageHours: store.wantedCoverageHours,
          streams: store.streams,
        },
      },
      response: { status: 200 },
    }
  }

  if (path === '/api/services') {
    return { data: { data: store.services }, response: { status: 200 } }
  }

  throw new Error(`nothing stands in for ${path}`)
}

mock.module('@/repository/client/carina', {
  namedExports: {
    carinaClient: () => ({ GET: answer }),
    revalidatingCarinaClient: () => ({ GET: answer }),
  },
})

const { coverageDaysOf, coverageWarningOf, getCollectionStatus } =
  await import('@/repository/collection')

function standing(over: Record<string, unknown> = {}): void {
  store.refusing = undefined
  store.wantedCoverageHours = 192
  store.streams = [stream(over)]
  store.services = [
    service(101, '海辺テレビ1'),
    service(102, '海辺テレビ2'),
    service(103, '海辺テレビ3'),
    service(108, '海辺ワンセグ', 'oneSeg'),
  ]
}

test('a stream whose channels all reach the wanted coverage says nothing', async () => {
  standing({
    coverage: [
      covers(101, REACHED),
      covers(102, REACHED),
      covers(103, REACHED),
      covers(108, REACHED),
    ],
  })

  assert.equal(
    coverageWarningOf(await getCollectionStatus(), 'terrestrial'),
    undefined,
  )
})

test('a stream that keeps failing says nothing while the server calls it covered', async () => {
  standing({
    outcome: 'incomplete',
    consecutiveIncomplete: 9,
    lastCompletedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    coverage: [
      covers(101, REACHED),
      covers(102, REACHED),
      covers(103, REACHED),
    ],
  })

  assert.equal(
    coverageWarningOf(await getCollectionStatus(), 'terrestrial'),
    undefined,
  )
})

test('the banner counts the channels the server judged short of what it wants', async () => {
  standing({
    coverage: [covers(101, SHORT), covers(102, SHORT), covers(103, REACHED)],
  })

  assert.deepEqual(
    coverageWarningOf(await getCollectionStatus(), 'terrestrial'),
    {
      tone: 'warn',
      emphasis: '2 チャンネルの番組情報が 8 日先まで届いていません。',
    },
  )
})

test('a channel never collected at all is the heavier of the two things said', async () => {
  standing({
    coverage: [covers(101, null), covers(102, null), covers(103, SHORT)],
  })

  assert.deepEqual(
    coverageWarningOf(await getCollectionStatus(), 'terrestrial'),
    {
      tone: 'danger',
      emphasis: '2 チャンネルの番組情報がまだ一度も取れていません。',
      detail: 'ほかに 1 チャンネルが 8 日先まで届いていません。',
    },
  )
})

test('nothing is said about the rest when every short channel was never collected', async () => {
  standing({ coverage: [covers(101, null), covers(102, REACHED)] })

  assert.deepEqual(
    coverageWarningOf(await getCollectionStatus(), 'terrestrial'),
    {
      tone: 'danger',
      emphasis: '1 チャンネルの番組情報がまだ一度も取れていません。',
      detail: undefined,
    },
  )
})

test('a channel the guide never draws is not one the banner counts', async () => {
  standing({ coverage: [covers(101, REACHED), covers(108, null)] })

  assert.equal(
    coverageWarningOf(await getCollectionStatus(), 'terrestrial'),
    undefined,
  )
})

test('a wanted coverage that is not whole days is said in the hours it was set to', async () => {
  standing({ coverage: [covers(101, SHORT)] })
  store.wantedCoverageHours = 100

  assert.equal(
    coverageWarningOf(await getCollectionStatus(), 'terrestrial')?.emphasis,
    '1 チャンネルの番組情報が 100 時間先まで届いていません。',
  )
})

test('a kind with no stream of its own is left out of the banner', async () => {
  standing({ coverage: [covers(101, null)] })

  assert.equal(coverageWarningOf(await getCollectionStatus(), 'bs'), undefined)
})

test('how far the guide reaches is the farthest the server says it covers', async () => {
  standing({
    coverage: [covers(101, '2026-09-13T12:00:00Z'), covers(102, null)],
  })

  assert.equal(
    coverageDaysOf(
      await getCollectionStatus(),
      'terrestrial',
      new Date('2026-09-10T00:00:00Z'),
    ),
    3,
  )
})

test('a coverage that has already run out reaches no further than nothing', async () => {
  standing({ coverage: [covers(101, '2026-09-09T00:00:00Z')] })

  assert.equal(
    coverageDaysOf(
      await getCollectionStatus(),
      'terrestrial',
      new Date('2026-09-10T00:00:00Z'),
    ),
    0,
  )
})

test('a collection ledger that refuses throws what the API said about it', async () => {
  standing({ coverage: [] })
  store.refusing = {
    path: '/api/epg/collection-status',
    status: 503,
    message: 'The collector is not answering for its streams.',
  }
  await assert.rejects(
    () => getCollectionStatus(),
    /The collector is not answering for its streams\./,
  )

  store.refusing = {
    path: '/api/services',
    status: 503,
    message: 'The service ledger is out of reach.',
  }
  await assert.rejects(
    () => getCollectionStatus(),
    /The service ledger is out of reach\./,
  )

  store.refusing = { path: '/api/services', status: 503, message: '' }
  await assert.rejects(
    () => getCollectionStatus(),
    /チャンネルを読めませんでした/,
  )

  store.refusing = undefined
})
