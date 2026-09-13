import assert from 'node:assert/strict'
import { mock, test } from 'node:test'

const STREAM = { networkId: 32701, transportStreamId: 32701 }

const service = (
  serviceId: number,
  name: string,
  category = 'television',
  networkId = STREAM.networkId,
  system = 'isdbT',
) => ({
  networkId,
  serviceId,
  name,
  category,
  remoteControlKeyId: 3,
  selectedChannel: { system, physicalChannel: 30 },
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

const { coverageDaysOf, epgHealthOf, getCollectionStatus } =
  await import('@/repository/collection')

const AERIAL_SERVICES = [
  service(101, '海辺テレビ1'),
  service(102, '海辺テレビ2'),
  service(103, '海辺テレビ3'),
  service(108, '海辺ワンセグ', 'oneSeg'),
]

const SATELLITE_SERVICES = [
  service(201, '波の上ビーエス', 'television', 4, 'isdbSBs'),
  service(301, '波の上シーエス', 'television', 6, 'isdbSCs110'),
]

function standing(...overs: Record<string, unknown>[]): void {
  store.refusing = undefined
  store.wantedCoverageHours = 192
  store.streams = (overs.length === 0 ? [{}] : overs).map((over) =>
    stream(over),
  )
  store.services = [...AERIAL_SERVICES, ...SATELLITE_SERVICES]
}

function whereNoSatelliteAnswers(): void {
  store.services = [...AERIAL_SERVICES]
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
    epgHealthOf(await getCollectionStatus(), 'terrestrial'),
    undefined,
  )
})

test('a stream that keeps failing is headlined as collection, never in the words of coverage', async () => {
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

  assert.deepEqual(epgHealthOf(await getCollectionStatus(), 'terrestrial'), {
    tone: 'warn',
    facts: [
      {
        subject: 'trouble',
        emphasis: '1 TS の収集が連続して揃っていません。',
      },
    ],
  })
})

test('the banner counts the channels the server judged short of what it wants', async () => {
  standing({
    coverage: [covers(101, SHORT), covers(102, SHORT), covers(103, REACHED)],
  })

  assert.deepEqual(epgHealthOf(await getCollectionStatus(), 'terrestrial'), {
    tone: 'warn',
    facts: [
      {
        subject: 'coverage',
        emphasis: '2 チャンネルの番組情報が 8 日先まで届いていません。',
      },
    ],
  })
})

test('a channel never collected at all is the heavier of the two things said', async () => {
  standing({
    coverage: [covers(101, null), covers(102, null), covers(103, SHORT)],
  })

  assert.deepEqual(epgHealthOf(await getCollectionStatus(), 'terrestrial'), {
    tone: 'danger',
    facts: [
      {
        subject: 'coverage',
        emphasis: '2 チャンネルの番組情報がまだ一度も取れていません。',
        detail: 'ほかに 1 チャンネルが 8 日先まで届いていません。',
      },
    ],
  })
})

test('nothing is said about the rest when every short channel was never collected', async () => {
  standing({ coverage: [covers(101, null), covers(102, REACHED)] })

  assert.deepEqual(epgHealthOf(await getCollectionStatus(), 'terrestrial'), {
    tone: 'danger',
    facts: [
      {
        subject: 'coverage',
        emphasis: '1 チャンネルの番組情報がまだ一度も取れていません。',
        detail: undefined,
      },
    ],
  })
})

test('a channel the guide never draws is not one the banner counts', async () => {
  standing({ coverage: [covers(101, REACHED), covers(108, null)] })

  assert.equal(
    epgHealthOf(await getCollectionStatus(), 'terrestrial'),
    undefined,
  )
})

test('a wanted coverage that is not whole days is said in the hours it was set to', async () => {
  standing({ coverage: [covers(101, SHORT)] })
  store.wantedCoverageHours = 100

  assert.equal(
    epgHealthOf(await getCollectionStatus(), 'terrestrial')?.facts[0].emphasis,
    '1 チャンネルの番組情報が 100 時間先まで届いていません。',
  )
})

test('a kind with no stream of its own is left out of the banner', async () => {
  standing({ coverage: [covers(101, null)] })

  assert.equal(epgHealthOf(await getCollectionStatus(), 'bs'), undefined)
})

test('the tuner side is said about the kind being shown and no other', async () => {
  standing({
    coverage: [
      covers(101, REACHED),
      covers(102, REACHED),
      covers(103, REACHED),
    ],
  })
  whereNoSatelliteAnswers()

  assert.equal(
    epgHealthOf(await getCollectionStatus(), 'terrestrial'),
    undefined,
  )

  assert.deepEqual(epgHealthOf(await getCollectionStatus(), 'bs'), {
    tone: 'warn',
    facts: [
      {
        subject: 'noServices',
        emphasis: 'チューナー側で BS のサービスが 0 件です。',
      },
    ],
  })

  assert.deepEqual(epgHealthOf(await getCollectionStatus(), 'cs110'), {
    tone: 'warn',
    facts: [
      {
        subject: 'noServices',
        emphasis: 'チューナー側で CS110 のサービスが 0 件です。',
      },
    ],
  })
})

test('the run of incomplete visits is what the server counted, not what the last visit ended as', async () => {
  standing(
    {
      serviceIds: [101],
      outcome: 'interrupted',
      consecutiveIncomplete: 3,
      coverage: [covers(101, REACHED)],
    },
    {
      transportStreamId: 32702,
      serviceIds: [102],
      outcome: 'incomplete',
      consecutiveIncomplete: 0,
      coverage: [covers(102, REACHED)],
    },
  )

  assert.deepEqual(epgHealthOf(await getCollectionStatus(), 'terrestrial'), {
    tone: 'warn',
    facts: [
      {
        subject: 'trouble',
        emphasis: '1 TS の収集が連続して揃っていません。',
      },
    ],
  })
})

test('the trouble headlined is the trouble of the kind being shown', async () => {
  standing(
    {
      coverage: [
        covers(101, REACHED),
        covers(102, REACHED),
        covers(103, REACHED),
      ],
    },
    {
      networkId: 4,
      transportStreamId: 16625,
      serviceIds: [201],
      outcome: 'incomplete',
      consecutiveIncomplete: 4,
      coverage: [covers(201, REACHED)],
    },
  )

  assert.equal(
    epgHealthOf(await getCollectionStatus(), 'terrestrial'),
    undefined,
  )

  assert.deepEqual(epgHealthOf(await getCollectionStatus(), 'bs'), {
    tone: 'warn',
    facts: [
      {
        subject: 'trouble',
        emphasis: '1 TS の収集が連続して揃っていません。',
      },
    ],
  })
})

test('every fact of the shown kind is headlined at once, coverage before collection', async () => {
  standing({
    outcome: 'incomplete',
    consecutiveIncomplete: 2,
    coverage: [covers(101, null), covers(102, SHORT), covers(103, REACHED)],
  })
  whereNoSatelliteAnswers()

  assert.deepEqual(epgHealthOf(await getCollectionStatus(), 'terrestrial'), {
    tone: 'danger',
    facts: [
      {
        subject: 'coverage',
        emphasis: '1 チャンネルの番組情報がまだ一度も取れていません。',
        detail: 'ほかに 1 チャンネルが 8 日先まで届いていません。',
      },
      {
        subject: 'trouble',
        emphasis: '1 TS の収集が連続して揃っていません。',
      },
    ],
  })
})

test('the tuner side stacks under the collection trouble of the same kind', async () => {
  standing(
    {
      coverage: [
        covers(101, REACHED),
        covers(102, REACHED),
        covers(103, REACHED),
      ],
    },
    {
      networkId: 4,
      transportStreamId: 16625,
      serviceIds: [201],
      outcome: 'incomplete',
      consecutiveIncomplete: 4,
      coverage: [covers(201, REACHED)],
    },
  )
  whereNoSatelliteAnswers()

  assert.deepEqual(epgHealthOf(await getCollectionStatus(), 'bs'), {
    tone: 'warn',
    facts: [
      {
        subject: 'trouble',
        emphasis: '1 TS の収集が連続して揃っていません。',
      },
      {
        subject: 'noServices',
        emphasis: 'チューナー側で BS のサービスが 0 件です。',
      },
    ],
  })
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
