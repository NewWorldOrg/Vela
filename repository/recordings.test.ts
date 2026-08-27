import assert from 'node:assert/strict'
import { mock, test } from 'node:test'

/**
 * The library and the recording detail, with the API standing in for itself.
 *
 * Only the module that reaches the network is replaced; reading the address,
 * naming the channel and spelling a recording for the screen all run for real.
 * What the store was asked for is recorded as well as what came back.
 */

interface Asked {
  path: string
  query: Record<string, unknown>
}

const asked: Asked[] = []

const store: {
  services: unknown[]
  pages: unknown[]
  detail: unknown
  detailStatus: number
} = { services: [], pages: [], detail: undefined, detailStatus: 200 }

const service = (
  networkId: number,
  serviceId: number,
  name: string,
  remoteControlKeyId?: number,
) => ({
  networkId,
  serviceId,
  name,
  category: 'television',
  remoteControlKeyId: remoteControlKeyId ?? null,
  selectedChannel: { system: 'isdbT' },
  candidates: [],
})

interface Over {
  [key: string]: unknown
}

const drops = (over: Over = {}) => ({
  ccMeasured: true,
  ccDroppedPackets: 0,
  ccTotalPackets: 1_000_000,
  scrambledPackets: 0,
  eovfCount: 0,
  measuredUpdatedAt: '2026-08-09T14:30:00Z',
  ...over,
})

const recording = (over: Over = {}) => ({
  id: 'a1',
  reservationId: null,
  programme: {
    networkId: 131,
    serviceId: 1310,
    eventId: 40001,
    startsAt: '2026-08-09T14:00:00Z',
    name: '週末キッチンの手帖',
    summary: '旬の野菜だけで組み立てる仕込みと保存',
    capturedAt: '2026-08-09T13:00:00Z',
  },
  standing: 'ended',
  outcome: 'complete',
  outcomeDetail: [],
  startedAt: '2026-08-09T14:00:00Z',
  stoppedAt: '2026-08-09T14:30:04Z',
  abortedAt: '2026-08-09T14:30:04Z',
  expectedWindow: {
    start: '2026-08-09T14:00:00Z',
    end: '2026-08-09T14:30:00Z',
    durationMs: 1_800_000,
  },
  writtenDurationMs: 1_804_000,
  resumeCount: 0,
  fileSizeBytes: 3_650_722_201,
  outputRoot: '/srv/recordings',
  fileName: 'a1.m2ts',
  tunerDeviceId: 'adapter1/frontend0',
  drops: drops(),
  thumbnail: { state: 'ready', fault: null, showsAnUnfinishedRecording: false },
  ...over,
})

const page = (items: unknown[], over: Over = {}) => ({
  items,
  total: items.length,
  currentPage: 1,
  lastPage: 1,
  perPage: 200,
  ...over,
})

const detailOf = (one: unknown, over: Over = {}) => ({
  recording: one,
  reconciliation: {
    sizeObserved: true,
    fileSizeBytes: 3_650_722_201,
    observedAt: '2026-08-09T14:31:00Z',
    writtenDurationMs: 1_804_000,
    expectedWindow: {
      start: '2026-08-09T14:00:00Z',
      end: '2026-08-09T14:30:00Z',
      durationMs: 1_800_000,
    },
    coverage: 1,
    stoppedUnasked: false,
  },
  interruptions: [],
  positions: { located: true, anchorPcr: 12, buckets: [], reanchors: [] },
  ...over,
})

mock.module('@/repository/client/carina', {
  namedExports: {
    carinaClient: () => ({
      GET: async (
        path: string,
        init?: {
          params?: { query?: Record<string, unknown>; path?: { id: string } }
        },
      ) => {
        asked.push({ path, query: init?.params?.query ?? {} })

        if (path === '/api/services') {
          return { data: { data: store.services }, response: { status: 200 } }
        }

        if (path === '/api/recordings/{id}') {
          return store.detailStatus === 200
            ? { data: { data: store.detail }, response: { status: 200 } }
            : { data: undefined, response: { status: store.detailStatus } }
        }

        const wanted = Number(init?.params?.query?.page ?? 1)

        return {
          data: { data: store.pages[wanted - 1] },
          response: { status: 200 },
        }
      },
    }),
    revalidatingCarinaClient: () => {
      throw new Error('the library does not revalidate')
    },
  },
})

const { getRecording, listRecordings, recordedAtLabelOf, spanLabel, spotsOf } =
  await import('./recordings.ts')

function standing(items: unknown[] = [recording()]): void {
  asked.length = 0
  store.services = [service(131, 1310, '中央テレビ1', 1)]
  store.pages = [page(items)]
  store.detail = detailOf(items[0])
  store.detailStatus = 200
}

const only = async (items?: unknown[]) => {
  standing(items)

  const result = await listRecordings({})

  assert.equal(result.items.length, 1)

  return result.items[0]
}

test('a recording is named by the channel the services call it', async () => {
  const one = await only()

  assert.equal(one.channel, '中央テレビ1')
})

/**
 * A recording outlives the service list — a station can be dropped from it —
 * so the row has to keep saying which channel it was, rather than going blank.
 */
test('a channel the services no longer name is still named', async () => {
  standing()
  store.services = []

  const result = await listRecordings({})

  assert.equal(result.items[0].channel, '131-1310')
})

test('a recording still being written has no outcome yet, and reads as one', async () => {
  const one = await only([
    recording({ standing: 'inFlight', outcome: null, stoppedAt: null }),
  ])

  assert.equal(one.outcome, 'recording')
  assert.equal(one.lengthSec, undefined)
  assert.equal(one.recordedAtNote, 'いま')
  assert.match(one.recordedRange, /進行中$/)
})

test('a recording that ended carries what was written as its length', async () => {
  const one = await only()

  assert.equal(one.outcome, 'complete')
  assert.equal(one.lengthSec, 1804)
  assert.equal(one.recordedRange, '2026/08/09(日) 23:00 — 23:30')
})

/**
 * The expected length is drawn beside the written one, which only says
 * something where the two differ. Putting it on every row would draw
 * `30:04 / 30:00` against a recording nothing went wrong with.
 */
test('the length it was supposed to be is shown for a recording cut short', async () => {
  const cut = await only([recording({ outcome: 'truncated' })])

  assert.equal(cut.expectedLengthSec, 1800)

  const whole = await only()

  assert.equal(whole.expectedLengthSec, undefined)
})

test('a size that was never observed is absent, not nothing at all', async () => {
  const one = await only([
    recording({
      standing: 'inFlight',
      outcome: null,
      stoppedAt: null,
      fileSizeBytes: null,
    }),
  ])

  assert.equal(one.sizeBytes, undefined)
})

test('a size that was observed comes through as the number it is', async () => {
  const one = await only()

  assert.equal(one.sizeBytes, 3_650_722_201)
})

test('a recording nothing measured is not good, it is unmeasured', async () => {
  const one = await only([
    recording({
      drops: drops({
        ccMeasured: false,
        ccDroppedPackets: null,
        ccTotalPackets: null,
        measuredUpdatedAt: null,
      }),
    }),
  ])

  assert.equal(one.quality.measured, false)
  assert.equal(one.quality.level, undefined)
})

test('the quality falls as the share of dropped packets rises', async () => {
  const levelAt = async (dropped: number) =>
    (
      await only([
        recording({
          drops: drops({
            ccDroppedPackets: dropped,
            ccTotalPackets: 1_000_000,
          }),
        }),
      ])
    ).quality.level

  assert.equal(await levelAt(0), 'good')
  assert.equal(await levelAt(200), 'good')
  assert.equal(await levelAt(201), 'warn')
  assert.equal(await levelAt(1_000), 'warn')
  assert.equal(await levelAt(1_001), 'danger')
})

test('the count of dropped packets is spelled with its thousands apart', async () => {
  const one = await only([
    recording({
      drops: drops({ ccDroppedPackets: 38_412, ccTotalPackets: 100_000_000 }),
    }),
  ])

  assert.equal(one.quality.detail, 'ドロップ 38,412')
})

test('a thumbnail that was not going to be made says so', async () => {
  const skipped = await only([
    recording({
      thumbnail: {
        state: 'skipped',
        fault: null,
        showsAnUnfinishedRecording: false,
      },
    }),
  ])

  assert.equal(skipped.thumbnail, 'none')
  assert.equal(skipped.thumbnailLabel, '作成されません')

  const drawn = await only()

  assert.equal(drawn.thumbnail, 'shot')
  assert.equal(drawn.thumbnailLabel, undefined)
})

/**
 * The store hands out a page at a time; the screen says it is showing all of
 * them. Stopping at the first page would leave that sentence counting the
 * store's page size.
 */
test('every page the store names is walked, not only the first', async () => {
  standing()
  store.pages = [
    page([recording({ id: 'a1' })], { total: 2, currentPage: 1, lastPage: 2 }),
    page([recording({ id: 'a2' })], { total: 2, currentPage: 2, lastPage: 2 }),
  ]

  const result = await listRecordings({})

  assert.deepEqual(
    result.items.map((one) => one.id),
    ['a1', 'a2'],
  )
  assert.equal(result.total, 2)
  assert.deepEqual(
    asked
      .filter((one) => one.path === '/api/recordings')
      .map((one) => one.query.page),
    [1, 2],
  )
})

test('the total counts the library, not the rows a filter left', async () => {
  standing([
    recording({ id: 'a1', outcome: 'complete' }),
    recording({ id: 'a2', outcome: 'failed' }),
  ])

  const result = await listRecordings({ state: '尻切れ・失敗' })

  assert.deepEqual(
    result.items.map((one) => one.id),
    ['a2'],
  )
  assert.equal(result.total, 2)
})

test('a keyword keeps what carries it and drops what does not', async () => {
  standing([
    recording({
      id: 'a1',
      programme: {
        ...recording().programme,
        name: '週末キッチンの手帖',
        summary: '夏野菜の作り置き',
      },
    }),
    recording({
      id: 'a2',
      programme: {
        ...recording().programme,
        name: 'コメット急行',
        summary: '夜行列車をゆく',
      },
    }),
  ])

  const byName = await listRecordings({ q: 'キッチン' })

  assert.deepEqual(
    byName.items.map((one) => one.id),
    ['a1'],
  )

  const bySummary = await listRecordings({ q: '夜行列車' })

  assert.deepEqual(
    bySummary.items.map((one) => one.id),
    ['a2'],
  )
})

/**
 * The state a reader may narrow by is one of a named few. Anything else is
 * not a narrower reading of the library, it is an address that means nothing,
 * and answering it with an empty library would read as "there is nothing".
 */
test('a state nobody offers narrows nothing and is not carried back', async () => {
  standing([recording({ id: 'a1' }), recording({ id: 'a2' })])

  const result = await listRecordings({ state: '壊れた録画' })

  assert.equal(result.items.length, 2)
  assert.equal(result.filter.state, undefined)
})

test('a channel that is offered narrows to it', async () => {
  standing([
    recording({ id: 'a1' }),
    recording({
      id: 'a2',
      programme: { ...recording().programme, networkId: 161, serviceId: 1610 },
    }),
  ])
  store.services = [
    service(131, 1310, '中央テレビ1', 1),
    service(161, 1610, '東都テレビ1', 6),
  ]

  const result = await listRecordings({ ch: '東都テレビ1' })

  assert.deepEqual(
    result.items.map((one) => one.id),
    ['a2'],
  )
  assert.deepEqual(result.channels, ['中央テレビ1', '東都テレビ1'])
})

/**
 * The genre is a condition the library offers, and the recording's own
 * snapshot of its programme does not carry one. An empty list of genres is
 * the honest answer; inventing one would put a filter in front of a reader
 * that silently matches nothing.
 */
test('the genres on offer are empty, because a recording carries none', async () => {
  standing()

  const result = await listRecordings({})

  assert.deepEqual(result.genres, [])
  assert.equal(result.items[0].genre, undefined)
})

test('a year that was recorded in is offered, and narrows to it', async () => {
  standing([
    recording({ id: 'a1' }),
    recording({
      id: 'a2',
      startedAt: '2024-05-12T14:00:00Z',
      stoppedAt: '2024-05-12T14:30:00Z',
    }),
  ])

  const result = await listRecordings({ year: '2024' })

  assert.deepEqual(
    result.items.map((one) => one.id),
    ['a2'],
  )
  assert.deepEqual(result.years, [2026, 2024])
})

test('a recording detail names the channel number beside the channel', async () => {
  standing()

  const detail = await getRecording('d1')

  assert.equal(detail?.channelNo, '1')
  assert.equal(
    detail?.reconcile?.sub,
    '書けた尺 30:04 / 実効ウィンドウ 30:00 · 被覆率 100.0%(判定の許容差は暫定値)',
  )
})

test('a recording the store does not have is not a recording', async () => {
  standing()
  store.detailStatus = 404

  assert.equal(await getRecording('nope'), undefined)
})

/**
 * The four ways a tuning can fail are named on the screen, and which of them
 * happened is the whole point of the row. Leaving it off would say "選局失敗"
 * and stop.
 */
test('a tuning that failed says which of the four ways it failed', async () => {
  const failed = recording({
    outcome: 'failed',
    fileSizeBytes: 0,
    outcomeDetail: [
      {
        fault: 'tuneFailed',
        tuneFailure: 'incompletePsi',
        note: '',
        noticedAt: '2026-08-09T14:00:10Z',
      },
    ],
  })
  standing([failed])
  store.detail = detailOf(failed)

  const detail = await getRecording('d2')

  assert.equal(detail?.failureReason?.title, '選局失敗')
  assert.match(detail?.failureReason?.body ?? '', /今回は ③ PSI 不完全。$/)
})

test('a stop somebody asked for is not read as the clock running out', async () => {
  const byHand = recording({
    outcome: 'truncated',
    outcomeDetail: [
      {
        fault: 'stoppedByHand',
        tuneFailure: null,
        note: '',
        noticedAt: '2026-08-09T14:10:00Z',
      },
    ],
  })
  standing([byHand])
  store.detail = detailOf(byHand)

  assert.equal((await getRecording('d3'))?.stopReason, '手動停止')

  standing()

  assert.equal(
    (await getRecording('d4'))?.stopReason,
    '自分の abort(終了時刻に到達)',
  )
})

test('drops in the same minute are one spot, and a clean second is none', () => {
  const spots = spotsOf(
    [
      { second: 720, continuity: 600, scrambled: 0 },
      { second: 740, continuity: 380, scrambled: 0 },
      { second: 900, continuity: 0, scrambled: 12 },
      { second: 2_640, continuity: 224, scrambled: 0 },
    ],
    new Date('2026-08-09T12:00:00Z'),
  )

  assert.deepEqual(spots, [
    { at: '21:12 付近', packets: '980 パケット' },
    { at: '21:44 付近', packets: '224 パケット' },
  ])
})

/**
 * The day alone places a recording in whichever year the reader is in. The
 * year in front is what stops a recording from two years ago reading as one
 * from last week.
 */
test('a recording from another year is spelled with the year in front', () => {
  const now = new Date('2026-08-27T00:00:00Z')

  assert.equal(
    recordedAtLabelOf(new Date('2026-08-09T14:00:00Z'), now),
    '08/09(日) 23:00',
  )
  assert.equal(
    recordedAtLabelOf(new Date('2024-05-12T14:00:00Z'), now),
    '2024/05/12(日) 23:00',
  )
})

/**
 * The last hour of the 31st in Tokyo is the next day in UTC, and the year of
 * a recording made in the last hours of December turns over with it.
 */
test('a recording is placed in the day Tokyo was in, not the day UTC was', () => {
  assert.equal(
    recordedAtLabelOf(
      new Date('2025-12-31T16:30:00Z'),
      new Date('2026-01-05T00:00:00Z'),
    ),
    '01/01(木) 01:30',
  )
})

test('a span is spelled in hours once there is an hour to spell', () => {
  assert.equal(spanLabel(1_800_000), '30分')
  assert.equal(spanLabel(6_843_000), '1時間54分')
})
