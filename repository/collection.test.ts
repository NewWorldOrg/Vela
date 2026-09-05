import assert from 'node:assert/strict'
import { mock, test } from 'node:test'

/**
 * The banner over the guide, read from what the collector says about the
 * streams and from the line-up it visited them for.
 *
 * A visit is made to a transport stream, and how it went is a fact about the
 * stream. What the reader has in front of them is columns, so the two are held
 * together here: the judgement is the stream's, and every channel it carries is
 * named by it.
 */

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
  refusing?: { path: string; status: number; message: string }
} = {
  streams: [],
  services: [],
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
      data: { data: { wantedCoverageHours: 192, streams: store.streams } },
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

const { coverageWarningOf, getCollectionStatus } =
  await import('./collection.ts')

function standing(over: Record<string, unknown> = {}): void {
  store.refusing = undefined
  store.streams = [stream(over)]
  store.services = [
    service(101, '海辺テレビ1'),
    service(102, '海辺テレビ2'),
    service(103, '海辺テレビ3'),
    service(108, '海辺ワンセグ', 'oneSeg'),
  ]
}

test('a stream freshly collected puts nothing over the guide', async () => {
  standing()

  assert.equal(
    coverageWarningOf(await getCollectionStatus(), 'terrestrial'),
    undefined,
  )
})

/**
 * The defect this stands against: the judgement was the stream's and the name
 * was its lead service's, so a stream failing on all three of its channels
 * named the one channel whose column was full — and the sentence read as a
 * claim about that channel that the screen beside it contradicted.
 */
test('a stream in trouble names every channel it carries, not its lead', async () => {
  standing({ outcome: 'incomplete', consecutiveIncomplete: 9 })

  assert.deepEqual(
    coverageWarningOf(await getCollectionStatus(), 'terrestrial'),
    {
      emphasis:
        '海辺テレビ1・海辺テレビ2 ほか 1 チャンネル の番組情報が不足しています。',
    },
  )
})

/** A stream last collected long enough ago that what it left is not coverage. */
test('a stream whose last collection has gone stale is named as well', async () => {
  standing({
    lastCompletedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
  })

  assert.equal(
    coverageWarningOf(await getCollectionStatus(), 'terrestrial')?.emphasis,
    '海辺テレビ1・海辺テレビ2 ほか 1 チャンネル の番組情報が不足しています。',
  )
})

/** Only the channels are named. The one-segment service is not one of them. */
test('a channel the guide never draws is not one the banner names', async () => {
  standing({ outcome: 'incomplete', consecutiveIncomplete: 9 })

  const warning = coverageWarningOf(await getCollectionStatus(), 'terrestrial')

  assert.ok(!warning?.emphasis.includes('ワンセグ'))
})

/** A stream the service list no longer names still has to be namable. */
test('a stream with no channel left to name falls back to the stream', async () => {
  standing({ outcome: 'incomplete', consecutiveIncomplete: 9 })
  store.services = []

  assert.equal(
    coverageWarningOf(await getCollectionStatus(), 'terrestrial')?.emphasis,
    'TS 32701 の番組情報が不足しています。',
  )
})

test('a collection ledger that refuses throws what the API said about it', async () => {
  standing()
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
