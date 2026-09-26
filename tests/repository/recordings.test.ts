import assert from 'node:assert/strict'
import { mock, test } from 'node:test'
import { formatMoment, formatMomentSpan, formatMomentUntil } from '@/lib/format'

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
  detailMessage: string
  listingStatus: number
  listingMessage: string
  remake: unknown
  remakeStatus: number
  discarded: unknown
  discardStatus: number
} = {
  services: [],
  pages: [],
  detail: undefined,
  detailStatus: 200,
  detailMessage: '',
  listingStatus: 200,
  listingMessage: '',
  remake: { remake: 'drawn', thumbnail: { state: 'ready' } },
  remakeStatus: 200,
  discarded: { recordingId: '7e7a14cf', filesRemoved: 2 },
  discardStatus: 200,
}

const service = (
  networkId: number,
  serviceId: number,
  name: string,
  remoteControlKeyId?: number,
  logo: { declaration: string; url?: string } = { declaration: 'notYetRead' },
) => ({
  networkId,
  serviceId,
  name,
  category: 'television',
  remoteControlKeyId: remoteControlKeyId ?? null,
  selectedChannel: { system: 'isdbT' },
  candidates: [],
  logoDeclaration: logo.declaration,
  logo:
    logo.url === undefined
      ? null
      : { url: logo.url, collectedAt: '2026-09-05T09:00:00Z' },
})

interface Over {
  [key: string]: unknown
}

const drops = (over: Over = {}) => ({
  quality: 'good',
  scrambleQuality: 'good',
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
    extended: '',
    genres: [],
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
  promisedWindowEnd: '2026-08-09T14:30:00Z',
  writtenDurationMs: 1_804_000,
  resumeCount: 0,
  observedAt: '2026-08-09T14:31:00Z',
  fileSizeBytes: 3_650_722_201,
  outputRoot: '/srv/recordings',
  fileName: 'a1.m2ts',
  tunerDeviceId: 'adapter1/frontend0',
  drops: drops(),
  thumbnail: { state: 'ready', fault: null, showsAnUnfinishedRecording: false },
  broadcastGroup: { key: null, role: 'standalone' },
  encode: { standing: 'notEncoded', whenRecorded: true },
  unfinishedDeletion: null,
  leftScrambled: false,
  descrambledAt: null,
  ...over,
})

const programme = (over: Over = {}) => ({
  ...recording().programme,
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
            : {
                data: undefined,
                error: {
                  status: false,
                  message: store.detailMessage,
                  data: null,
                },
                response: { status: store.detailStatus },
              }
        }

        if (store.listingStatus !== 200) {
          return {
            data: undefined,
            error: {
              status: false,
              message: store.listingMessage,
              data: null,
            },
            response: { status: store.listingStatus },
          }
        }

        const wanted = Number(init?.params?.query?.page ?? 1)

        return {
          data: { data: store.pages[wanted - 1] },
          response: { status: 200 },
        }
      },
      POST: async (
        path: string,
        init?: { params?: { path?: { id: string } } },
      ) => {
        asked.push({ path, query: { id: init?.params?.path?.id ?? '' } })

        return {
          data:
            store.remakeStatus === 200
              ? { status: true, message: '', data: store.remake }
              : undefined,
          response: {
            status: store.remakeStatus,
            ok: store.remakeStatus < 400,
          },
        }
      },
      DELETE: async (
        path: string,
        init?: { params?: { path?: { id: string } } },
      ) => {
        asked.push({ path, query: { id: init?.params?.path?.id ?? '' } })

        const ok = store.discardStatus < 400
        const body = { status: ok, message: '', data: store.discarded }

        return {
          ...(ok ? { data: body } : { error: body }),
          response: { status: store.discardStatus, ok },
        }
      },
    }),
    revalidatingCarinaClient: () => {
      throw new Error('the library does not revalidate')
    },
  },
})

const {
  discardRecording,
  discardRecordings,
  getRecording,
  listRecordings,
  listRecordingsByReservation,
  remakeThumbnail,
  spanLabel,
  spotsOf,
} = await import('@/repository/recordings')

function standing(items: unknown[] = [recording()]): void {
  asked.length = 0
  store.services = [service(131, 1310, '中央テレビ1', 1)]
  store.pages = [page(items)]
  store.detail = detailOf(items[0])
  store.detailStatus = 200
  store.detailMessage = ''
  store.listingStatus = 200
  store.listingMessage = ''
}

const only = async (items?: unknown[]) => {
  standing(items)

  const result = await listRecordings({})

  assert.equal(result.items.length, 1)

  return result.items[0]
}

test('a recording carries the reservation it was made for', async () => {
  const one = await only([recording({ reservationId: 'res-1' })])

  assert.equal(one.reservationId, 'res-1')
})

test('a recording no reservation asked for carries none', async () => {
  const one = await only([recording({ reservationId: null })])

  assert.equal(one.reservationId, undefined)
  assert.equal(one.id, 'a1')
})

test('the reservations each recording came from are keyed by reservation', async () => {
  standing([
    recording({ id: 'rec-1', reservationId: 'res-1' }),
    recording({ id: 'rec-2', reservationId: 'res-2' }),
  ])

  const found = await listRecordingsByReservation()

  assert.deepEqual(
    [...found.entries()],
    [
      ['res-1', 'rec-1'],
      ['res-2', 'rec-2'],
    ],
  )
})

test('a recording no reservation asked for is left out of the keying', async () => {
  standing([
    recording({ id: 'rec-1', reservationId: null }),
    recording({ id: 'rec-2', reservationId: 'res-2' }),
  ])

  const found = await listRecordingsByReservation()

  assert.deepEqual([...found.entries()], [['res-2', 'rec-2']])
})

test('a recording is named by the channel the services call it', async () => {
  const one = await only()

  assert.equal(one.channel, '中央テレビ1')
})

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
  assert.equal(
    one.recordedRange,
    formatMomentSpan('2026-08-09T14:00:00Z', '2026-08-09T14:30:04Z'),
  )
})

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

test('a row of the library says when its file was last seen, in the words the detail uses', async () => {
  const ended = await only()

  assert.equal(
    ended.sizeObservedAt,
    `取得 ${formatMoment('2026-08-09T14:31:00Z')}`,
  )

  const writing = await only([
    recording({
      standing: 'inFlight',
      outcome: null,
      stoppedAt: null,
      observedAt: '2026-08-09T14:12:00Z',
    }),
  ])

  assert.equal(
    writing.sizeObservedAt,
    `取得 ${formatMoment('2026-08-09T14:12:00Z')}`,
  )
})

test('a row whose file was never measured says nothing about when', async () => {
  const one = await only([recording({ observedAt: null })])

  assert.equal(one.sizeObservedAt, undefined)
})

test('an ended recording whose end was followed later says how far it moved', async () => {
  const moved = await only([
    recording({
      stoppedAt: '2026-08-09T14:40:04Z',
      expectedWindow: {
        start: '2026-08-09T14:00:00Z',
        end: '2026-08-09T14:40:00Z',
        durationMs: 2_400_000,
      },
    }),
  ])

  assert.equal(
    moved.recordedRange,
    `${formatMomentSpan('2026-08-09T14:00:00Z', '2026-08-09T14:40:04Z')}(延長 +10 分)`,
  )

  const kept = await only()

  assert.equal(
    kept.recordedRange,
    formatMomentSpan('2026-08-09T14:00:00Z', '2026-08-09T14:30:04Z'),
  )
})

test('a recording still being written whose end moved says until when', async () => {
  const writing = {
    standing: 'inFlight',
    outcome: null,
    stoppedAt: null,
  }
  const moved = await only([
    recording({
      ...writing,
      expectedWindow: {
        start: '2026-08-09T14:00:00Z',
        end: '2026-08-09T14:45:00Z',
        durationMs: 2_700_000,
      },
    }),
  ])

  assert.equal(
    moved.recordedRange,
    `${formatMomentSpan('2026-08-09T14:00:00Z', '2026-08-09T14:45:00Z')} まで(延長 +15 分)`,
  )

  const kept = await only([recording(writing)])

  assert.equal(
    kept.recordedRange,
    formatMomentUntil('2026-08-09T14:00:00Z', '進行中'),
  )
})

test('a recording nothing measured is not good, it is unmeasured', async () => {
  const one = await only([
    recording({
      drops: drops({
        quality: 'unmeasured',
        ccMeasured: false,
        ccDroppedPackets: null,
        ccTotalPackets: null,
        scrambledPackets: null,
        measuredUpdatedAt: null,
      }),
    }),
  ])

  assert.equal(one.quality.measured, false)
  assert.equal(one.quality.level, undefined)
})

test('the quality is the level the API graded, not one counted from the drops', async () => {
  const levelOf = async (over: Over) =>
    (await only([recording({ drops: drops(over) })])).quality.level

  assert.equal(await levelOf({ quality: 'good' }), 'good')
  assert.equal(await levelOf({ quality: 'warning' }), 'warning')
  assert.equal(
    await levelOf({
      quality: 'mayNotBeWatchable',
      ccDroppedPackets: 0,
      ccTotalPackets: 5_302_549,
      scrambledPackets: 5_042_768,
    }),
    'mayNotBeWatchable',
  )
})

test('the count of dropped packets is spelled with its thousands apart', async () => {
  const one = await only([
    recording({
      drops: drops({ ccDroppedPackets: 38_412, ccTotalPackets: 100_000_000 }),
    }),
  ])

  assert.equal(one.quality.detail, 'ドロップ 38,412')
})

test('the reading under the badge names the scrambled packets where there are any', async () => {
  const one = await only([
    recording({
      drops: drops({
        quality: 'mayNotBeWatchable',
        ccDroppedPackets: 0,
        ccTotalPackets: 5_302_549,
        scrambledPackets: 5_042_768,
      }),
    }),
  ])

  assert.equal(one.quality.detail, 'ドロップ 0 / スクランブル残存 5,042,768')
  assert.equal(one.scrambledShare, 5_042_768 / 5_302_549)
})

test('the scramble level is the one the API graded, carried beside the overall one', async () => {
  const scrambled = await only([
    recording({
      drops: drops({
        quality: 'mayNotBeWatchable',
        scrambleQuality: 'mayNotBeWatchable',
      }),
    }),
  ])
  const droppedOnly = await only([
    recording({
      drops: drops({ quality: 'mayNotBeWatchable', scrambleQuality: 'good' }),
    }),
  ])

  assert.equal(scrambled.scrambleQuality, 'mayNotBeWatchable')
  assert.equal(droppedOnly.quality.level, 'mayNotBeWatchable')
  assert.equal(droppedOnly.scrambleQuality, 'good')
})

test('a recording no deletion has stopped short on carries no unfinished deletion', async () => {
  const one = await only([recording()])

  assert.equal(one.unfinishedDeletion, undefined)
})

test('a deletion that left files behind is carried, with the count when the API gave one', async () => {
  const counted = await only([
    recording({
      unfinishedDeletion: {
        leftBehindAt: '2026-08-10T03:00:00Z',
        filesLeft: '2',
      },
    }),
  ])
  const uncounted = await only([
    recording({
      unfinishedDeletion: {
        leftBehindAt: '2026-08-10T03:00:00Z',
        filesLeft: null,
      },
    }),
  ])

  assert.deepEqual(counted.unfinishedDeletion, { filesLeft: 2 })
  assert.deepEqual(uncounted.unfinishedDeletion, { filesLeft: undefined })
})

const ENDED_SCRAMBLED = {
  fault: 'scramblingUnresolved',
  tuneFailure: null,
  note: '',
  noticedAt: '2026-08-09T14:30:04Z',
}

test('a recording that came out whole but was left scrambled carries both', async () => {
  const one = await only([
    recording({ outcomeDetail: [ENDED_SCRAMBLED], leftScrambled: true }),
  ])

  assert.equal(one.outcome, 'complete')
  assert.equal(one.leftScrambled, true)
  assert.equal(one.outcomeDetail, 'スクランブル解除失敗')
})

test('a recording nothing was left scrambled on does not say it was', async () => {
  const one = await only([recording()])

  assert.equal(one.leftScrambled, false)
})

test('a recording descrambled since says nothing more about the scrambling it ended with', async () => {
  const one = await only([
    recording({
      outcomeDetail: [ENDED_SCRAMBLED],
      leftScrambled: false,
      descrambledAt: '2026-08-10T03:00:00Z',
    }),
  ])

  assert.equal(one.leftScrambled, false)
  assert.equal(one.outcomeDetail, undefined)
})

test('a failed recording descrambled since still names what else it failed of', async () => {
  const failed = recording({
    outcome: 'failed',
    outcomeDetail: [
      ENDED_SCRAMBLED,
      { ...ENDED_SCRAMBLED, fault: 'diskExhausted' },
    ],
    descrambledAt: '2026-08-10T03:00:00Z',
  })
  standing([failed])
  store.detail = detailOf(failed)

  const detail = await getRecording('d-descrambled')

  assert.equal(detail?.outcomeDetail, '書き込み中にディスクが尽きた')
  assert.equal(detail?.failureReason?.title, '書き込み中にディスクが尽きた')
})

test('a recording nothing counted carries no scrambled share', async () => {
  const one = await only([
    recording({
      drops: drops({
        ccTotalPackets: null,
        scrambledPackets: null,
      }),
    }),
  ])

  assert.equal(one.scrambledShare, undefined)
})

test('the times the recorder overflowed are spelled with their thousands apart', async () => {
  standing([recording({ drops: drops({ eovfCount: 12_400 }) })])

  assert.equal((await getRecording('d1'))?.eoverflow, '12,400 回')
})

test('a recording nothing counted the overflows on carries none, not a count of zero', async () => {
  standing([recording({ drops: drops({ eovfCount: null }) })])

  assert.equal((await getRecording('d1'))?.eoverflow, undefined)
})

test('the encode standing is the one the API folded, not one read again here', async () => {
  const running = await only([
    recording({ encode: { standing: 'running', whenRecorded: true } }),
  ])

  assert.equal(running.encode, 'running')

  const none = await only()

  assert.equal(none.encode, 'notEncoded')
})

test('whether the recording was to be encoded once it was recorded comes through', async () => {
  const skipped = await only([
    recording({ encode: { standing: 'notEncoded', whenRecorded: false } }),
  ])

  assert.equal(skipped.encode, 'notEncoded')
  assert.equal(skipped.encodeWhenRecorded, false)

  const asked = await only()

  assert.equal(asked.encode, 'notEncoded')
  assert.equal(asked.encodeWhenRecorded, true)
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

test('a recording still being written comes first, however long ago it started', async () => {
  standing()
  store.pages = [
    page(
      [
        recording({ id: 'a1', startedAt: '2026-08-10T14:00:00Z' }),
        recording({ id: 'a2', startedAt: '2026-08-10T13:00:00Z' }),
      ],
      { total: 3, currentPage: 1, lastPage: 2 },
    ),
    page(
      [
        recording({
          id: 'a3',
          startedAt: '2026-08-10T11:00:00Z',
          standing: 'inFlight',
          outcome: null,
          stoppedAt: null,
        }),
      ],
      { total: 3, currentPage: 2, lastPage: 2 },
    ),
  ]

  const result = await listRecordings({})

  assert.deepEqual(
    result.items.map((one) => one.id),
    ['a3', 'a1', 'a2'],
  )
  assert.equal(result.total, 3)
})

test('a filter narrows before the rows being written are lifted', async () => {
  const writing = {
    standing: 'inFlight',
    outcome: null,
    stoppedAt: null,
    drops: drops({ quality: 'unmeasured' }),
  }

  standing([
    recording({ id: 'a1', drops: drops({ quality: 'unmeasured' }) }),
    recording({ id: 'a2', outcome: 'failed' }),
    recording({ id: 'a3', ...writing }),
  ])

  const unmeasured = await listRecordings({ state: '未計測' })

  assert.deepEqual(
    unmeasured.items.map((one) => one.id),
    ['a3', 'a1'],
  )

  const cutShort = await listRecordings({ state: '尻切れ・失敗' })

  assert.deepEqual(
    cutShort.items.map((one) => one.id),
    ['a2'],
  )
  assert.equal(cutShort.total, 3)
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

test('the genres on offer are the ones the recordings name', async () => {
  standing([
    recording({
      id: 'a1',
      programme: programme({ genres: [{ kind: 5, sort: 3 }] }),
    }),
    recording({
      id: 'a2',
      programme: programme({
        genres: [
          { kind: 8, sort: 0 },
          { kind: 0, sort: 8 },
        ],
      }),
    }),
  ])

  const result = await listRecordings({})

  assert.deepEqual(result.genres, ['バラエティ', 'ドキュメンタリー/教養'])
  assert.equal(result.items[0].genre, 'バラエティ')
})

test('a genre that is offered narrows to it', async () => {
  standing([
    recording({
      id: 'a1',
      programme: programme({ genres: [{ kind: 5, sort: 3 }] }),
    }),
    recording({
      id: 'a2',
      programme: programme({ genres: [{ kind: 8, sort: 0 }] }),
    }),
  ])

  const result = await listRecordings({ genre: 'ドキュメンタリー/教養' })

  assert.deepEqual(
    result.items.map((one) => one.id),
    ['a2'],
  )
})

test('a recording that names no genre offers none', async () => {
  const one = await only()

  assert.equal(one.genre, undefined)
})

test('a genre kind this build has no name for is called その他', async () => {
  const one = await only([
    recording({ programme: programme({ genres: [{ kind: 13, sort: 0 }] }) }),
  ])

  assert.equal(one.genre, 'その他')
})

test('the genres a recording detail carries are named in full', async () => {
  standing([
    recording({
      programme: programme({
        genres: [
          { kind: 5, sort: 3 },
          { kind: 5, sort: 2 },
          { kind: 2, sort: 3 },
        ],
      }),
    }),
  ])

  const detail = await getRecording('d1')

  assert.deepEqual(detail?.genres, ['バラエティ', '情報/ワイドショー'])
})

test('the cast the extended detail names is carried, and searches', async () => {
  standing([
    recording({
      id: 'a1',
      programme: programme({
        extended:
          '◇番組内容\n海辺の町の朝を追う\n\n◇出演者\n宇津木 千歳\n\nゲスト\n真名瀬 湊\n\n◇おしらせ\n再放送は翌週です',
      }),
    }),
    recording({ id: 'a2' }),
  ])

  const result = await listRecordings({})

  assert.deepEqual(result.items[0].cast, ['宇津木 千歳', '真名瀬 湊'])

  const byCast = await listRecordings({ q: '真名瀬' })

  assert.deepEqual(
    byCast.items.map((one) => one.id),
    ['a1'],
  )
})

test('a staff heading is not read as cast', async () => {
  const one = await only([
    recording({
      programme: programme({
        extended: '◇番組内容\n海辺の町の朝を追う\n\nスタッフ\n演出 岬 早苗',
      }),
    }),
  ])

  assert.equal(one.cast, undefined)
})

test('the lead of the extended detail becomes the sub line of the row', async () => {
  const one = await only([
    recording({
      programme: programme({
        extended: '◇番組内容\n海辺の町の朝を\n追う\n\n◇出演者\n宇津木 千歳',
      }),
    }),
  ])

  assert.equal(one.note, '海辺の町の朝を 追う')
})

test('a recording whose extended detail is empty carries no sub line', async () => {
  const one = await only()

  assert.equal(one.note, undefined)
  assert.equal(one.cast, undefined)
})

test('recordings of one broadcast group count each other as segments', async () => {
  standing([
    recording({
      id: 'a1',
      broadcastGroup: { key: 'g-1', role: 'relaySegment' },
    }),
    recording({
      id: 'a2',
      broadcastGroup: { key: 'g-1', role: 'relaySegment' },
    }),
    recording({
      id: 'a3',
      broadcastGroup: { key: 'g-2', role: 'movementPrimary' },
    }),
    recording({ id: 'a4' }),
  ])

  const result = await listRecordings({})

  assert.deepEqual(
    result.items.map((one) => one.segments),
    [2, 2, undefined, undefined],
  )
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
  assert.deepEqual(detail?.reconcile, {
    size: '3.4 GB',
    written: '30:04',
    planned: '30:00',
  })
})

test('a recording the store does not have is not a recording', async () => {
  standing()
  store.detailStatus = 404

  assert.equal(await getRecording('nope'), undefined)
})

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
  assert.equal(detail?.failureReason?.body, '③ 情報が揃わない')
})

test('each way a recording can be judged a failure names itself', async () => {
  const said: Record<string, string> = {
    shortOfTheWindow: '書けた尺が予定に届かなかった',
    nothingLanded: '0 バイトで終わった',
    sizeUnobserved: 'ファイルの大きさを観測できなかった',
    lighterThanTheStream: 'ファイルが尺のわりに小さい',
    heavierThanTheStream: 'ファイルが尺のわりに大きい',
  }

  for (const [fault, title] of Object.entries(said)) {
    const failed = recording({
      outcome: 'failed',
      outcomeDetail: [
        {
          fault,
          tuneFailure: null,
          note: '',
          noticedAt: '2026-08-09T14:20:00Z',
        },
      ],
    })
    standing([failed])
    store.detail = detailOf(failed)

    const detail = await getRecording('d-fault')

    assert.equal(detail?.failureReason?.title, title)
  }
})

test('a failure this build has no name for is still said out loud', async () => {
  const failed = recording({
    outcome: 'failed',
    outcomeDetail: [
      {
        fault: 'somethingElseEntirely',
        tuneFailure: null,
        note: '',
        noticedAt: '2026-08-09T14:20:00Z',
      },
    ],
  })
  standing([failed])
  store.detail = detailOf(failed)

  assert.equal(
    (await getRecording('d-unknown'))?.failureReason?.title,
    'この版がまだ知らない値',
  )
})

test('nothing the server wrote about the failure reaches the screen', async () => {
  const failed = recording({
    outcome: 'failed',
    outcomeDetail: [
      {
        fault: 'scramblingUnresolved',
        tuneFailure: null,
        note: 'covered 0.9812 of the window',
        noticedAt: '2026-08-09T14:20:00Z',
      },
    ],
  })
  standing([failed])
  store.detail = detailOf(failed)

  const detail = await getRecording('d-note')

  assert.equal(detail?.failureReason?.title, 'スクランブル解除失敗')
  assert.equal(
    detail?.failureReason?.body,
    '閾値を超えた残存パケットを検出しました。',
  )
  assert.equal(
    detail?.failureReason?.noticedAt,
    formatMoment('2026-08-09T14:20:00Z'),
  )
  assert.deepEqual(Object.keys(detail?.failureReason ?? {}).sort(), [
    'body',
    'noticedAt',
    'title',
  ])
})

test('a failure this build has no name for still says when it was noticed', async () => {
  const failed = recording({
    outcome: 'failed',
    outcomeDetail: [
      {
        fault: 'somethingElseEntirely',
        tuneFailure: null,
        note: 'the recorder said this much about it',
        noticedAt: '2026-08-09T14:20:00Z',
      },
    ],
  })
  standing([failed])
  store.detail = detailOf(failed)

  const detail = await getRecording('d-unknown-note')

  assert.equal(detail?.failureReason?.title, 'この版がまだ知らない値')
  assert.equal(
    detail?.failureReason?.noticedAt,
    formatMoment('2026-08-09T14:20:00Z'),
  )
  assert.deepEqual(Object.keys(detail?.failureReason ?? {}).sort(), [
    'noticedAt',
    'title',
  ])
})

test('a failure the server wrote nothing about still says when it was noticed', async () => {
  const failed = recording({
    outcome: 'failed',
    outcomeDetail: [
      {
        fault: 'nothingLanded',
        tuneFailure: null,
        note: '',
        noticedAt: '2026-08-09T14:20:00Z',
      },
    ],
  })
  standing([failed])
  store.detail = detailOf(failed)

  const detail = await getRecording('d-no-note')

  assert.equal(detail?.failureReason?.title, '0 バイトで終わった')
  assert.equal(
    detail?.failureReason?.noticedAt,
    formatMoment('2026-08-09T14:20:00Z'),
  )
})

test('a failure with nothing recorded against it says nothing', async () => {
  const failed = recording({ outcome: 'failed', outcomeDetail: [] })
  standing([failed])
  store.detail = detailOf(failed)

  assert.equal((await getRecording('d-quiet'))?.failureReason, undefined)
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

  assert.equal((await getRecording('d4'))?.stopReason, '終了時刻に到達')
})

test('drops in the same minute are one spot, and a clean second is none', () => {
  const spots = spotsOf([
    { second: 720, continuity: 600, scrambled: 0 },
    { second: 740, continuity: 380, scrambled: 0 },
    { second: 900, continuity: 0, scrambled: 12 },
    { second: 2_640, continuity: 224, scrambled: 0 },
  ])

  assert.deepEqual(spots, [
    { at: '0:12:00 付近', packets: '980 パケット', second: 720 },
    { at: '0:44:00 付近', packets: '224 パケット', second: 2_640 },
  ])
})

test('a span is spelled in hours once there is an hour to spell', () => {
  assert.equal(spanLabel(1_800_000), '30分')
  assert.equal(spanLabel(6_843_000), '1時間54分')
})

test('a picture asked for names the recording it is asked about', async () => {
  asked.length = 0
  store.remakeStatus = 200
  store.remake = { remake: 'drawn', thumbnail: { state: 'ready' } }

  const result = await remakeThumbnail('7e7a14cf')

  assert.deepEqual(result, { state: 'ok', remake: 'drawn' })
  assert.deepEqual(asked.at(-1), {
    path: '/api/recordings/{id}/thumbnail',
    query: { id: '7e7a14cf' },
  })
})

test('a pass that drew nothing is still an answer, not a refusal', async () => {
  for (const remake of ['skipped', 'failed'] as const) {
    store.remakeStatus = 200
    store.remake = { remake, thumbnail: { state: remake } }

    assert.deepEqual(await remakeThumbnail('7e7a14cf'), {
      state: 'ok',
      remake,
    })
  }
})

test('a recording still being written is refused in its own words', async () => {
  store.remakeStatus = 409

  const result = await remakeThumbnail('7e7a14cf')

  assert.equal(result.state, 'rejected')
  assert.match(result.state === 'rejected' ? result.message : '', /録画中/)
})

test('each refusal the endpoint can give is told apart from the others', async () => {
  const said = new Set<string>()

  for (const status of [400, 404, 409, 503]) {
    store.remakeStatus = status

    const result = await remakeThumbnail('7e7a14cf')

    assert.equal(result.state, 'rejected')
    said.add(result.state === 'rejected' ? result.message : '')
  }

  assert.equal(said.size, 4)
})

test('a status the endpoint does not name falls back to saying which it was', async () => {
  store.remakeStatus = 500

  const result = await remakeThumbnail('7e7a14cf')

  assert.equal(result.state, 'rejected')
  assert.match(result.state === 'rejected' ? result.message : '', /\(500\)/)
})

function discarding(status: number, data: unknown): void {
  store.discardStatus = status
  store.discarded = data
}

test('throwing a recording away names the recording, and counts the files', async () => {
  discarding(200, { recordingId: '7e7a14cf', filesRemoved: 2 })

  const result = await discardRecording('7e7a14cf')

  assert.deepEqual(result, { state: 'ok', filesRemoved: 2 })
  assert.deepEqual(asked.at(-1), {
    path: '/api/recordings/{id}',
    query: { id: '7e7a14cf' },
  })
})

test('a count the API spells as a string still reads as a number', async () => {
  discarding(200, { recordingId: 're-1', filesRemoved: '3' })

  assert.deepEqual(await discardRecording('re-1'), {
    state: 'ok',
    filesRemoved: 3,
  })
})

test('nothing left to remove is an answer, not a refusal', async () => {
  discarding(200, { recordingId: 're-1', filesRemoved: 0 })

  assert.deepEqual(await discardRecording('re-1'), {
    state: 'ok',
    filesRemoved: 0,
  })
})

test('throwing several away removes them one after another, in the order chosen', async () => {
  discarding(200, { recordingId: 're-1', filesRemoved: 1 })

  const before = asked.length
  const result = await discardRecordings(['re-1', 're-2', 're-3'])

  assert.deepEqual(result, { state: 'ok', done: 3 })
  assert.deepEqual(
    asked.slice(before).map((one) => one.query),
    [{ id: 're-1' }, { id: 're-2' }, { id: 're-3' }],
  )
})

test('the first refusal stops the rest and says how many went before it', async () => {
  discarding(409, { recordingId: 're-1', refusal: 'stillRecording' })

  const before = asked.length
  const result = await discardRecordings(['re-1', 're-2'])

  assert.equal(result.state, 'rejected')
  assert.equal(result.done, 0)
  assert.equal(asked.length - before, 1)
})

test('a signed-out answer stops the rest as well', async () => {
  discarding(401, {})

  assert.deepEqual(await discardRecordings(['re-1', 're-2']), {
    state: 'unauthenticated',
    done: 0,
  })
})

const REFUSALS = [
  ['noSuchRecording', 404],
  ['stillRecording', 409],
  ['oneIsAlreadyBeingDiscarded', 409],
  ['rootOutOfReach', 409],
  ['fileOutOfReach', 503],
  ['driverUnreachable', 503],
  ['driverRefused', 502],
  ['filesLeftBehind', 503],
  ['alreadyEnded', 409],
  ['notBeingWritten', 409],
  ['nowhereToPutPictures', 503],
] as const

test('every refusal the endpoint can give is said in words of its own', async () => {
  const said = new Set<string>()

  for (const [refusal, status] of REFUSALS) {
    discarding(status, { recordingId: 're-1', refusal })

    const result = await discardRecording('re-1')

    assert.equal(result.state, 'rejected', refusal)

    const message = result.state === 'rejected' ? result.message : ''

    assert.notEqual(message, '', refusal)
    assert.doesNotMatch(message, /undefined/, refusal)
    said.add(message)
  }

  assert.equal(said.size, REFUSALS.length)
})

test('two refusals that share a status are still told apart', async () => {
  discarding(409, { recordingId: 're-1', refusal: 'stillRecording' })

  const writing = await discardRecording('re-1')

  discarding(409, {
    recordingId: 're-1',
    refusal: 'oneIsAlreadyBeingDiscarded',
  })

  const busy = await discardRecording('re-1')

  assert.match(
    writing.state === 'rejected' ? writing.message : '',
    /書き込み中/,
  )
  assert.match(busy.state === 'rejected' ? busy.message : '', /同時に 1 件/)
})

test('a refusal that says the files are still there says so, not that it failed', async () => {
  discarding(409, { recordingId: 're-1', refusal: 'rootOutOfReach' })

  const result = await discardRecording('re-1')

  assert.match(
    result.state === 'rejected' ? result.message : '',
    /録画ファイルは残っています/,
  )
})

test('a refusal carrying no reason falls back to saying which status it was', async () => {
  discarding(400, null)

  const result = await discardRecording('re-1')

  assert.equal(result.state, 'rejected')
  assert.match(result.state === 'rejected' ? result.message : '', /\(400\)/)
})

test('a session that has run out is not a refusal of the deletion', async () => {
  discarding(401, null)

  assert.deepEqual(await discardRecording('re-1'), {
    state: 'unauthenticated',
  })
})

test('a recording that cannot be read throws what the API said about it', async () => {
  standing()
  store.detailStatus = 500
  store.detailMessage = 'The recording ledger would not answer for this row.'

  await assert.rejects(
    () => getRecording('7e7a14cf'),
    /The recording ledger would not answer for this row\./,
  )

  standing()
  store.detailStatus = 500
  await assert.rejects(() => getRecording('7e7a14cf'), /録画を読めませんでした/)

  standing()
  store.listingStatus = 503
  store.listingMessage = 'The recording ledger is out of reach.'
  await assert.rejects(
    () => listRecordings({}),
    /The recording ledger is out of reach\./,
  )
})

test('a row of the library carries the station it was recorded off, key and logo', async () => {
  standing()
  store.services = [
    service(131, 1310, '中央テレビ1', 1, {
      declaration: 'inTheCommonDataTable',
      url: '/api/services/131-1310/logo',
    }),
  ]

  const result = await listRecordings({})

  assert.equal(result.items[0].channel, '中央テレビ1')
  assert.equal(result.items[0].channelNo, '1')
  assert.deepEqual(result.items[0].channelLogo, {
    declaration: 'inTheCommonDataTable',
    href: '/api/services/131-1310/logo',
  })
})

test('a recording off a station no longer in the ledger keeps its key and asks for no picture', async () => {
  standing()
  store.services = []

  const result = await listRecordings({})

  assert.equal(result.items[0].channelNo, undefined)
  assert.equal(result.items[0].channelLogo, undefined)
})
