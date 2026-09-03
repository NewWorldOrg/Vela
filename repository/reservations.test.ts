import assert from 'node:assert/strict'
import { mock, test } from 'node:test'

/**
 * The reservation list and the four writes it offers, with the API standing in
 * for itself. Only the module that reaches the network is replaced; naming the
 * channel, spelling the window and reading the refusals all run for real.
 */

interface Sent {
  method: string
  path: string
  query: Record<string, unknown>
  id?: string
  body?: Record<string, unknown>
}

const sent: Sent[] = []

const store: {
  services: unknown[]
  pages: unknown[]
  recordings: unknown[]
  rules: unknown[]
  programme: unknown
  programmeStatus: number
  writeStatus: number
  settlement: unknown
  discardStatus: number
  discarded: unknown
} = {
  services: [],
  pages: [],
  recordings: [],
  rules: [],
  programme: undefined,
  programmeStatus: 200,
  writeStatus: 200,
  settlement: undefined,
  discardStatus: 200,
  discarded: { reservationId: 'a1' },
}

interface Over {
  [key: string]: unknown
}

const service = (networkId: number, serviceId: number, name: string) => ({
  networkId,
  serviceId,
  name,
  category: 'television',
  remoteControlKeyId: null,
  selectedChannel: { system: 'isdbT' },
  candidates: [],
})

const window = (startAt: string, endAt: string, over: Over = {}) => ({
  startAt,
  endAt,
  endAtConfirmed: true,
  marginBeforeSeconds: 0,
  marginAfterSeconds: 0,
  effectiveStartAt: startAt,
  effectiveEndAt: endAt,
  ...over,
})

const reservation = (over: Over = {}) => ({
  id: 'a1',
  programme: {
    id: '131-1310-40001',
    networkId: 131,
    serviceId: 1310,
    eventId: 40001,
    startsAt: '2026-08-08T12:10:00Z',
    name: '週末キッチンの手帖',
    summary: '旬の野菜だけで組み立てる仕込みと保存',
    extended: '',
    genres: [],
    capturedAt: '2026-08-08T10:00:00Z',
  },
  origin: 'byHand',
  ruleId: null,
  priority: 10,
  window: window('2026-08-08T12:10:00Z', '2026-08-08T13:40:00Z'),
  state: 'scheduled',
  standing: 'scheduled',
  startedAt: null,
  recordingOutcome: null,
  reception: { unavailable: false, since: null },
  epg: {
    diverged: false,
    detail: [],
    programmeMissing: false,
    acknowledgedAt: null,
  },
  broadcastGroup: { key: null, role: 'standalone' },
  createdAt: '2026-08-08T10:00:00Z',
  ...over,
})

const onNetwork = (
  id: string,
  networkId: number,
  name: string,
  over: Over = {},
) =>
  reservation({
    id,
    programme: {
      ...reservation().programme,
      id: `${networkId}-${networkId * 10}-1`,
      networkId,
      serviceId: networkId * 10,
      name,
    },
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

const answered = (status: number) => ({ status, ok: status < 400 })

const settlementOf = (verdict: string | null) => ({
  reservation: reservation(),
  verdict,
  instead: [],
  seatsLeftOut: 0,
})

interface Asking {
  params?: {
    query?: Record<string, unknown>
    path?: { id: string }
  }
  body?: Record<string, unknown>
}

const write = (method: string) => async (path: string, init?: Asking) => {
  sent.push({
    method,
    path,
    query: init?.params?.query ?? {},
    id: init?.params?.path?.id,
    body: init?.body,
  })

  return {
    data: { status: true, message: '', data: store.settlement },
    response: answered(store.writeStatus),
  }
}

mock.module('@/repository/client/carina', {
  namedExports: {
    carinaClient: () => ({
      GET: async (path: string, init?: Asking) => {
        sent.push({ method: 'GET', path, query: init?.params?.query ?? {} })

        if (path === '/api/services') {
          return { data: { data: store.services }, response: answered(200) }
        }

        if (path === '/api/rules') {
          return {
            data: { data: { rules: store.rules, total: store.rules.length } },
            response: answered(200),
          }
        }

        if (path === '/api/recordings') {
          return {
            data: { data: page(store.recordings) },
            response: answered(200),
          }
        }

        if (path === '/api/programs/{id}') {
          return store.programmeStatus === 200
            ? { data: { data: store.programme }, response: answered(200) }
            : { data: undefined, response: answered(store.programmeStatus) }
        }

        const wanted = Number(init?.params?.query?.page ?? 1)

        return {
          data: { data: store.pages[wanted - 1] },
          response: answered(200),
        }
      },
      POST: write('POST'),
      PATCH: write('PATCH'),
      /**
       * The generated client hands the parsed body back as `data` for an
       * answer it accepts and as `error` for one it does not — the same
       * either-or the production code has to read, because a stand-in that
       * always answered `data` would leave the refusal path untried.
       */
      DELETE: async (path: string, init?: Asking) => {
        sent.push({
          method: 'DELETE',
          path,
          query: {},
          id: init?.params?.path?.id,
        })

        const ok = store.discardStatus < 400
        const body = { status: ok, message: '', data: store.discarded }

        return {
          ...(ok ? { data: body } : { error: body }),
          response: answered(store.discardStatus),
        }
      },
    }),
    revalidatingCarinaClient: () => {
      throw new Error('reservations do not revalidate')
    },
  },
})

const {
  cancelReservation,
  cancelReservations,
  createReservation,
  discardReservation,
  discardReservations,
  listBookings,
  listReservations,
  restoreReservation,
  reviseReservation,
  setReservationPriority,
} = await import('./reservations.ts')

function standing(items: unknown[] = [reservation()]): void {
  sent.length = 0
  store.services = [
    service(131, 1310, '中央テレビ1'),
    service(132, 1320, '湾岸放送1'),
    service(133, 1330, 'みなと教育1'),
  ]
  store.pages = [page(items)]
  store.recordings = []
  store.rules = []
  store.programme = {
    id: '131-1310-40001',
    networkId: 131,
    serviceId: 1310,
    eventId: 40001,
    startsAt: '2026-08-08T12:10:00Z',
    name: '週末キッチンの手帖',
    summary: '',
    isShadow: false,
    hasSubtitles: false,
    isArchived: false,
    genres: [],
    items: [],
    related: [],
  }
  store.programmeStatus = 200
  store.writeStatus = 200
  store.settlement = settlementOf('secured')
}

/** Ahead of every window the fixtures are written for, so nothing has ended. */
const BEFORE_THEM_ALL = new Date('2026-08-08T00:00:00Z')

const listed = async (at: Date = BEFORE_THEM_ALL) =>
  (await listReservations({}, at)).items

const only = async (over: Over = {}) => {
  standing([reservation(over)])

  const rows = await listed()

  assert.equal(rows.length, 1)

  return rows[0]
}

/** The one shape of a recording this file reads: which reservation it was for. */
const madeFor = (id: string, reservationId: string | null) => ({
  id,
  reservationId,
  programme: {
    networkId: 131,
    serviceId: 1310,
    eventId: 40001,
    startsAt: '2026-08-08T12:10:00Z',
    name: '週末キッチンの手帖',
    summary: '',
    extended: '',
    genres: [],
    capturedAt: '2026-08-08T10:00:00Z',
  },
  standing: 'ended',
  outcome: 'complete',
  outcomeDetail: [],
  startedAt: '2026-08-08T12:10:00Z',
  stoppedAt: '2026-08-08T13:40:00Z',
  abortedAt: null,
  expectedWindow: {
    start: '2026-08-08T12:10:00Z',
    end: '2026-08-08T13:40:00Z',
    durationMs: 5_400_000,
  },
  writtenDurationMs: 5_400_000,
  resumeCount: 0,
  fileSizeBytes: 1,
  outputRoot: 'primary',
  fileName: `${id}.ts`,
  tunerDeviceId: null,
  drops: {
    ccMeasured: false,
    ccDroppedPackets: null,
    ccTotalPackets: null,
    scrambledPackets: null,
    eovfCount: 0,
    measuredUpdatedAt: null,
  },
  thumbnail: { state: 'ready', fault: null, showsAnUnfinishedRecording: false },
  broadcastGroup: { key: null, role: 'standalone' },
})

test('a reservation names the recording it came to', async () => {
  standing([reservation({ id: 'a1', standing: 'complete' })])
  store.recordings = [madeFor('rec-1', 'a1')]

  const rows = await listed()

  assert.equal(rows[0].recordingId, 'rec-1')
})

/**
 * The other half of the same claim. A reservation the broadcast is still ahead
 * of came to no recording, and the row is still there saying which state it is
 * in — an absence the screen would show identically if the row had been
 * dropped altogether.
 */
test('a reservation that came to no recording still stands, naming none', async () => {
  standing([reservation({ id: 'a1' })])
  store.recordings = [madeFor('rec-1', 'other')]

  const rows = await listed()

  assert.equal(rows.length, 1)
  assert.equal(rows[0].id, 'a1')
  assert.equal(rows[0].standing, 'scheduled')
  assert.equal(rows[0].recordingId, undefined)
})

test('a recording no reservation asked for reaches no reservation', async () => {
  standing([reservation({ id: 'a1' })])
  store.recordings = [madeFor('rec-1', null)]

  const rows = await listed()

  assert.equal(rows[0].recordingId, undefined)
})

/** Each reservation reads its own, rather than the first one the store held. */
test('two reservations read the recordings that name them', async () => {
  standing([
    reservation({ id: 'a1', standing: 'complete' }),
    onNetwork('a2', 132, '湾岸の朝', { standing: 'failed' }),
  ])
  store.recordings = [madeFor('rec-2', 'a2'), madeFor('rec-1', 'a1')]

  const rows = await listed()

  assert.deepEqual(
    rows.map((one) => [one.id, one.recordingId]),
    [
      ['a1', 'rec-1'],
      ['a2', 'rec-2'],
    ],
  )
})

test('a reservation is named by the channel the services call it', async () => {
  const one = await only()

  assert.equal(one.channelName, '中央テレビ1')
})

test('a channel the services no longer name is still named', async () => {
  standing()
  store.services = []

  const rows = await listed()

  assert.equal(rows[0].channelName, '131-1310')
})

test('the window is spelled in the zone broadcasting runs on', async () => {
  const one = await only()

  assert.equal(one.whenLabel, '08/08(土) 21:10–22:40')
})

/**
 * The three the API answers with separately. A recording under way is the
 * recording's standing, not a fifth state the reservation is in, and whether
 * the end is settled holds across every one of them.
 */
test('a recording under way leaves the reservation scheduled', async () => {
  const one = await only({
    standing: 'recording',
    startedAt: '2026-08-08T12:10:00Z',
  })

  assert.equal(one.state, 'scheduled')
  assert.equal(one.standing, 'recording')
})

test('an unsettled end holds beside a conflict rather than instead of it', async () => {
  const one = await only({
    state: 'conflict',
    standing: 'conflict',
    window: window('2026-08-08T12:10:00Z', '2026-08-08T13:40:00Z', {
      endAtConfirmed: false,
    }),
  })

  assert.equal(one.state, 'conflict')
  assert.equal(one.standing, 'conflict')
  assert.equal(one.endAtConfirmed, false)
})

test('a settled end says so', async () => {
  const one = await only()

  assert.equal(one.endAtConfirmed, true)
})

/** Not a standing: a reservation with no way to tune reads as secured without it. */
test('a service that cannot be received is marked', async () => {
  const one = await only({
    reception: { unavailable: true, since: '2026-08-07T00:00:00Z' },
  })

  assert.equal(one.standing, 'scheduled')
  assert.equal(one.receptionUnavailable, true)
})

test('a service that can be received is not marked', async () => {
  const one = await only()

  assert.equal(one.receptionUnavailable, false)
})

test('the priority the API carries reaches the screen', async () => {
  const one = await only({ priority: 25 })

  assert.equal(one.priority, 25)
})

test('the origin is spelled the way the screen names it', async () => {
  assert.equal((await only()).origin, '手動')
  assert.equal((await only({ origin: 'byRule' })).origin, 'ルール')
})

const CONTENDED = [
  onNetwork('a1', 131, '週末キッチンの手帖'),
  onNetwork('b2', 132, '金曜シネマ', {
    state: 'conflict',
    standing: 'conflict',
    window: window('2026-08-08T13:00:00Z', '2026-08-08T15:00:00Z'),
  }),
  onNetwork('c3', 133, '深夜アニメ劇場', {
    priority: 18,
    window: window('2026-08-08T13:10:00Z', '2026-08-08T14:00:00Z'),
  }),
  onNetwork('d4', 132, '同じ流れの裏番組', {
    window: window('2026-08-08T13:00:00Z', '2026-08-08T15:00:00Z'),
  }),
  onNetwork('e5', 134, '取り消された予約', {
    state: 'cancelled',
    standing: 'cancelled',
    window: window('2026-08-08T13:00:00Z', '2026-08-08T14:00:00Z'),
  }),
  onNetwork('f6', 135, '重ならない予約', {
    window: window('2026-08-08T16:00:00Z', '2026-08-08T17:00:00Z'),
  }),
]

const contended = async () => {
  standing(CONTENDED)

  const rows = await listed()
  const one = rows.find((row) => row.id === 'b2')

  assert.ok(one?.conflict)

  return one.conflict
}

test('the counterparts are the overlapping seats on another stream', async () => {
  const conflict = await contended()

  assert.deepEqual(
    conflict.entries.map((entry) => entry.title),
    ['週末キッチンの手帖', '深夜アニメ劇場'],
  )
})

test('a counterpart is spelled by its channel and its clock', async () => {
  const conflict = await contended()

  assert.equal(conflict.entries[0].meta, '中央テレビ1 · 21:10–22:40')
})

test('the headline counts the streams, not the reservations', async () => {
  const conflict = await contended()

  assert.equal(conflict.headline, '同時刻に地上波チューナー 2 本が録画予定です')
})

test('raising the priority asks for one above the highest counterpart', async () => {
  const conflict = await contended()

  assert.equal(conflict.raiseTo, 19)
})

test('a reservation holding its seat is offered no counterparts', async () => {
  standing(CONTENDED)

  const rows = await listed()

  assert.equal(rows.find((row) => row.id === 'a1')?.conflict, undefined)
})

test('every page the store names is walked', async () => {
  sent.length = 0
  store.services = []
  store.pages = [
    page([onNetwork('a1', 131, '一枚目')], { lastPage: 2, total: 2 }),
    page([onNetwork('b2', 132, '二枚目')], {
      currentPage: 2,
      lastPage: 2,
      total: 2,
    }),
  ]

  const rows = await listed()

  assert.deepEqual(
    rows.map((row) => row.title),
    ['一枚目', '二枚目'],
  )
})

/**
 * One list holding both kinds of cancellation and the settled standings, so a
 * run that leaves the whole list alone and a run that empties it are both
 * visibly wrong.
 */
const CANCELLED_EARLY = onNetwork('x1', 141, '取り消した昼の番組', {
  state: 'cancelled',
  standing: 'cancelled',
  window: window('2026-08-08T02:00:00Z', '2026-08-08T03:00:00Z'),
})

const MIXED = [
  CANCELLED_EARLY,
  onNetwork('x2', 142, '取り消した夜の番組', {
    state: 'cancelled',
    standing: 'cancelled',
    window: window('2026-08-08T12:00:00Z', '2026-08-08T13:00:00Z'),
  }),
  onNetwork('x3', 143, '撮り逃した番組', {
    state: 'missed',
    standing: 'missed',
    window: window('2026-08-08T01:00:00Z', '2026-08-08T02:00:00Z'),
  }),
  onNetwork('x4', 144, '録り終えた番組', {
    standing: 'complete',
    startedAt: '2026-08-08T01:00:00Z',
    recordingOutcome: 'complete',
    window: window('2026-08-08T01:00:00Z', '2026-08-08T02:00:00Z'),
  }),
  onNetwork('x5', 145, '録画に失敗した番組', {
    standing: 'failed',
    startedAt: '2026-08-08T01:00:00Z',
    recordingOutcome: 'failed',
    window: window('2026-08-08T01:00:00Z', '2026-08-08T02:00:00Z'),
  }),
  onNetwork('x6', 146, 'これから録る番組', {
    window: window('2026-08-08T12:00:00Z', '2026-08-08T13:00:00Z'),
  }),
]

const mixedAt = async (at: string, filter: { cancelled?: 'all' } = {}) => {
  standing(MIXED)

  return listReservations(filter, new Date(at))
}

const AFTER_THE_FIRST = '2026-08-08T06:00:00Z'

test('a cancellation whose broadcast has ended is left out', async () => {
  const { items } = await mixedAt(AFTER_THE_FIRST)

  assert.deepEqual(
    items.map((row) => row.id),
    ['x2', 'x3', 'x4', 'x5', 'x6'],
  )
})

test('the cancellation left out is listed when every one is asked for', async () => {
  const { items } = await mixedAt(AFTER_THE_FIRST, { cancelled: 'all' })

  assert.deepEqual(
    items.map((row) => row.id),
    ['x1', 'x2', 'x3', 'x4', 'x5', 'x6'],
  )
  assert.equal(
    items.find((row) => row.id === 'x1')?.title,
    '取り消した昼の番組',
  )
})

test('a cancellation still ahead of its end is listed either way', async () => {
  const held = await mixedAt(AFTER_THE_FIRST)
  const every = await mixedAt(AFTER_THE_FIRST, { cancelled: 'all' })

  for (const { items } of [held, every]) {
    assert.equal(
      items.find((row) => row.id === 'x2')?.title,
      '取り消した夜の番組',
    )
  }
})

test('the settled standings stay once their broadcast has ended', async () => {
  const { items } = await mixedAt('2026-08-09T00:00:00Z')

  assert.deepEqual(
    items.map((row) => row.id),
    ['x3', 'x4', 'x5', 'x6'],
  )
})

/** The end of the window, a second before it and a second after it. */
test('a second before the end still holds the cancellation in the list', async () => {
  const { items } = await mixedAt('2026-08-08T02:59:59Z')

  assert.deepEqual(
    items.map((row) => row.id),
    ['x1', 'x2', 'x3', 'x4', 'x5', 'x6'],
  )
})

test('the end of the broadcast is the moment the cancellation leaves', async () => {
  const { items } = await mixedAt('2026-08-08T03:00:00Z')

  assert.deepEqual(
    items.map((row) => row.id),
    ['x2', 'x3', 'x4', 'x5', 'x6'],
  )
})

test('a second after the end leaves the cancellation out', async () => {
  const { items } = await mixedAt('2026-08-08T03:00:01Z')

  assert.deepEqual(
    items.map((row) => row.id),
    ['x2', 'x3', 'x4', 'x5', 'x6'],
  )
})

test('the margin the recording would have run on does not hold it in', async () => {
  standing([
    onNetwork('x7', 147, '余白のついた取消', {
      state: 'cancelled',
      standing: 'cancelled',
      window: window('2026-08-08T02:00:00Z', '2026-08-08T03:00:00Z', {
        marginAfterSeconds: 600,
        effectiveEndAt: '2026-08-08T03:10:00Z',
      }),
    }),
  ])

  const { items } = await listReservations({}, new Date('2026-08-08T03:05:00Z'))

  assert.deepEqual(items, [])
})

test('the whole list is counted by the store, not by what is left in it', async () => {
  standing(MIXED)
  store.pages = [page(MIXED, { total: 41 })]

  const result = await listReservations({}, new Date(AFTER_THE_FIRST))

  assert.equal(result.total, 41)
  assert.deepEqual(
    result.items.map((row) => row.id),
    ['x2', 'x3', 'x4', 'x5', 'x6'],
  )
})

test('the filter it was asked for is handed back', async () => {
  assert.deepEqual((await mixedAt(AFTER_THE_FIRST)).filter, {})
  assert.deepEqual(
    (await mixedAt(AFTER_THE_FIRST, { cancelled: 'all' })).filter,
    {
      cancelled: 'all',
    },
  )
})

/** Nothing is said about when now is, so the clock the screen runs on answers. */
test('the clock it reads by default is the one running now', async () => {
  const at = Date.now()

  standing([
    onNetwork('y1', 151, '一分前に終わった取消', {
      state: 'cancelled',
      standing: 'cancelled',
      window: window(
        new Date(at - 3_600_000).toISOString(),
        new Date(at - 60_000).toISOString(),
      ),
    }),
    onNetwork('y2', 152, '一時間後に終わる取消', {
      state: 'cancelled',
      standing: 'cancelled',
      window: window(
        new Date(at - 60_000).toISOString(),
        new Date(at + 3_600_000).toISOString(),
      ),
    }),
  ])

  const { items } = await listReservations()

  assert.deepEqual(
    items.map((row) => row.id),
    ['y2'],
  )
})

test('creating asks with the start the programme is announced for', async () => {
  standing()

  const result = await createReservation('131-1310-40001')

  assert.deepEqual(result, { state: 'ok', verdict: 'secured' })

  const asked = sent.find(
    (one) => one.path === '/api/reservations' && one.method === 'POST',
  )

  assert.deepEqual(asked?.body, {
    programme: '131-1310-40001',
    programmeStartsAt: '2026-08-08T12:10:00Z',
  })
})

test('a broadcast the guide no longer holds is refused before it is asked for', async () => {
  standing()
  store.programmeStatus = 404

  const result = await createReservation('131-1310-40001')

  assert.deepEqual(result, {
    state: 'rejected',
    message:
      'この番組は番組表にもう無いため、予約できませんでした。番組表を読み直してください。',
  })
  assert.equal(
    sent.some((one) => one.method === 'POST'),
    false,
  )
})

test('a broadcast already reserved is sent back to the list, not reserved twice', async () => {
  standing()
  store.writeStatus = 409

  const result = await createReservation('131-1310-40001')

  assert.deepEqual(result, {
    state: 'rejected',
    message:
      'この番組はすでに予約されています。取り消した予約も残るため、作り直すのではなく予約一覧から復元してください。',
  })
})

test('cancelling names the reservation it was pressed on', async () => {
  standing()
  store.settlement = settlementOf(null)

  const result = await cancelReservation('b2')

  assert.deepEqual(result, { state: 'ok', verdict: undefined })
  assert.equal(sent.at(-1)?.path, '/api/reservations/{id}/cancel')
  assert.equal(sent.at(-1)?.id, 'b2')
})

test('a reservation being recorded is refused in the screen own words', async () => {
  standing()
  store.writeStatus = 409

  const result = await cancelReservation('b2')

  assert.deepEqual(result, {
    state: 'rejected',
    message:
      'この予約はいま録画中か、すでに終わっているため、取り消せませんでした。最新の状態を読み直してください。',
  })
})

test('restoring names the reservation it was pressed on', async () => {
  standing()

  const result = await restoreReservation('b2')

  assert.deepEqual(result, { state: 'ok', verdict: 'secured' })
  assert.equal(sent.at(-1)?.path, '/api/reservations/{id}/restore')
  assert.equal(sent.at(-1)?.id, 'b2')
})

test('the priority asked for is the one that was pressed for', async () => {
  standing()

  const result = await setReservationPriority('b2', 19)

  assert.deepEqual(result, { state: 'ok', verdict: 'secured' })
  assert.equal(sent.at(-1)?.method, 'PATCH')
  assert.deepEqual(sent.at(-1)?.body, { priority: 19 })
})

test('a status with no reading of its own keeps the number beside it', async () => {
  standing()
  store.writeStatus = 500

  const result = await restoreReservation('b2')

  assert.deepEqual(result, {
    state: 'rejected',
    message: '予約を復元できませんでした。(500)',
  })
})

test('the window a reservation was made with is carried onto the row', async () => {
  const one = await only({
    window: window('2026-08-08T12:10:00Z', '2026-08-08T13:40:00Z', {
      marginBeforeSeconds: 10,
      marginAfterSeconds: 30,
    }),
  })

  assert.equal(one.marginBeforeSeconds, 10)
  assert.equal(one.marginAfterSeconds, 30)
})

test('a margin the API spells as a string still reads as a number', async () => {
  const one = await only({
    window: window('2026-08-08T12:10:00Z', '2026-08-08T13:40:00Z', {
      marginBeforeSeconds: '45',
      marginAfterSeconds: '90',
    }),
  })

  assert.equal(one.marginBeforeSeconds, 45)
  assert.equal(one.marginAfterSeconds, 90)
})

test('a revision carries only what it was asked to change', async () => {
  standing()

  const result = await reviseReservation('b2', { marginAfterSeconds: 30 })

  assert.deepEqual(result, { state: 'ok', verdict: 'secured' })
  assert.equal(sent.at(-1)?.method, 'PATCH')
  assert.equal(sent.at(-1)?.path, '/api/reservations/{id}')
  assert.equal(sent.at(-1)?.id, 'b2')
  assert.deepEqual(sent.at(-1)?.body, { marginAfterSeconds: 30 })
})

test('a revision may name all three at once', async () => {
  standing()

  await reviseReservation('b2', {
    priority: 12,
    marginBeforeSeconds: 10,
    marginAfterSeconds: 30,
  })

  assert.deepEqual(sent.at(-1)?.body, {
    priority: 12,
    marginBeforeSeconds: 10,
    marginAfterSeconds: 30,
  })
})

test('each refusal a revision can meet is told apart from the others', async () => {
  const said = new Set<string>()

  for (const status of [400, 404, 409, 503]) {
    standing()
    store.writeStatus = status

    const result = await reviseReservation('b2', { priority: 12 })

    assert.equal(result.state, 'rejected')
    said.add(result.state === 'rejected' ? result.message : '')
  }

  assert.equal(said.size, 4)
})

test('a revision refused because the recording has started says which', async () => {
  standing()
  store.writeStatus = 409

  const result = await reviseReservation('b2', { priority: 12 })

  assert.equal(result.state, 'rejected')
  assert.match(
    result.state === 'rejected' ? result.message : '',
    /録画中か、すでに終わっている/,
  )
})

/**
 * A programme is booked only while a reservation is holding a seat for it. A
 * cancelled or already settled one leaves the programme free to ask for again,
 * and the panel that reads this offers the seat rather than the way out of it.
 */
test('only a reservation still holding a seat books its programme', async () => {
  const held = ['scheduled']
  const settled = [
    'cancelled',
    'missed',
    'conflict',
    'recording',
    'complete',
    'truncated',
    'failed',
  ]

  for (const state of [...held, ...settled]) {
    standing([reservation({ standing: state })])

    const bookings = await listBookings()

    assert.equal(
      bookings.has('131-1310-40001'),
      held.includes(state),
      `standing ${state}`,
    )
  }
})

test('a booking carries what the edit form has to fill itself with', async () => {
  standing([
    reservation({
      id: 'c3',
      priority: 12,
      window: window('2026-08-08T12:10:00Z', '2026-08-08T13:40:00Z', {
        marginBeforeSeconds: 10,
        marginAfterSeconds: 30,
      }),
    }),
  ])

  const booking = (await listBookings()).get('131-1310-40001')

  assert.deepEqual(booking, {
    id: 'c3',
    priority: 12,
    marginBeforeSeconds: 10,
    marginAfterSeconds: 30,
  })
})

test('a programme asked for twice is booked by the one that holds the seat', async () => {
  standing([
    reservation({ id: 'gone', standing: 'cancelled', priority: 1 }),
    reservation({ id: 'held', standing: 'scheduled', priority: 20 }),
  ])

  const booking = (await listBookings()).get('131-1310-40001')

  assert.equal(booking?.id, 'held')
  assert.equal(booking?.priority, 20)
})

/**
 * The name of the rule a reservation came from. The list answers with the
 * rule's identifier and nothing else, so the name is read off the rules the
 * API holds; both sides are asserted, because a row that named nothing at all
 * would satisfy the absent case on its own.
 */
const RULE = {
  id: 'e0b5bbef-79a6-44af-b651-510e2715b790',
  name: '深夜アニメを追う',
  query: 'keyword=%E6%96%B0%E7%95%AA%E7%B5%84',
  priority: 20,
  enabled: true,
  marginBeforeSeconds: 0,
  marginAfterSeconds: 0,
  createdAt: '2026-08-01T02:00:00Z',
}

test('a reservation a rule made is named by that rule', async () => {
  standing([reservation({ origin: 'byRule', ruleId: RULE.id })])
  store.rules = [RULE]

  const rows = await listed()

  assert.equal(rows[0].ruleName, '深夜アニメを追う')
})

test('a reservation nobody asked for by rule is named by no rule', async () => {
  standing([reservation({ origin: 'byHand', ruleId: null })])
  store.rules = [RULE]

  const rows = await listed()

  assert.equal(rows[0].ruleName, undefined)
})

test('a rule the API no longer holds leaves the row without a name', async () => {
  standing([reservation({ origin: 'byRule', ruleId: RULE.id })])
  store.rules = []

  const rows = await listed()

  assert.equal(rows[0].ruleName, undefined)
})

test('the rule behind a rival is named in the conflict it explains', async () => {
  standing([
    onNetwork('a1', 131, '週末キッチンの手帖', { standing: 'conflict' }),
    onNetwork('a2', 132, '灯台巡りの午後', {
      standing: 'scheduled',
      origin: 'byRule',
      ruleId: RULE.id,
    }),
  ])
  store.rules = [RULE]

  const rows = await listed()
  const conflict = rows.find((row) => row.id === 'a1')?.conflict

  assert.equal(conflict?.entries.length, 1)
  assert.equal(conflict?.entries[0].ruleName, '深夜アニメを追う')
})

/**
 * Throwing the record of a reservation away, and what the row says about
 * whether it may be. The refusals all arrive on one status, so a screen that
 * read the status alone would say the same thing to somebody who has to cancel
 * first and to somebody who has to throw a recording away first.
 */

function discarding(status: number, data: unknown): void {
  store.discardStatus = status
  store.discarded = data
}

test('deleting names the reservation it was pressed on', async () => {
  standing()
  discarding(200, { reservationId: 'a1' })

  const result = await discardReservation('a1')
  const asked = sent.find((one) => one.method === 'DELETE')

  assert.deepEqual(result, { state: 'ok' })
  assert.equal(asked?.path, '/api/reservations/{id}')
  assert.equal(asked?.id, 'a1')
})

const DISCARD_REFUSALS = [
  'noSuchReservation',
  'stillToBeRecorded',
  'turningIntoARecording',
  'recordingCameOfIt',
] as const

test('each reason a deletion is refused for is said apart from the others', async () => {
  standing()

  const said = new Set<string>()

  for (const refusal of DISCARD_REFUSALS) {
    discarding(refusal === 'noSuchReservation' ? 404 : 409, {
      reservationId: 'a1',
      refusal,
    })

    const result = await discardReservation('a1')

    assert.equal(result.state, 'rejected', refusal)

    const message = result.state === 'rejected' ? result.message : ''

    assert.doesNotMatch(message, /\(409\)/, refusal)
    said.add(message)
  }

  assert.equal(said.size, DISCARD_REFUSALS.length)
})

test('the reason is read from the answer, not from the status it shares', async () => {
  standing()
  discarding(409, { reservationId: 'a1', refusal: 'stillToBeRecorded' })

  const standingStill = await discardReservation('a1')

  discarding(409, { reservationId: 'a1', refusal: 'recordingCameOfIt' })

  const recorded = await discardReservation('a1')

  assert.match(
    standingStill.state === 'rejected' ? standingStill.message : '',
    /先に取り消してください/,
  )
  assert.match(
    recorded.state === 'rejected' ? recorded.message : '',
    /先にその録画を削除してください/,
  )
})

test('a refusal with no reason of its own falls back to the status', async () => {
  standing()
  discarding(409, null)

  const result = await discardReservation('a1')

  assert.equal(result.state, 'rejected')
  assert.match(result.state === 'rejected' ? result.message : '', /\(409\)/)
})

test('a session that has run out is not a refusal of the deletion', async () => {
  standing()
  discarding(401, null)

  assert.deepEqual(await discardReservation('a1'), {
    state: 'unauthenticated',
  })
})

/** Every window the fixtures are written for has ended by this moment. */
const AFTER_THEM_ALL = new Date('2026-08-09T00:00:00Z')

test('a cancelled reservation may be thrown away, and one still to come may not', async () => {
  standing([
    reservation({ id: 'a1', state: 'cancelled', standing: 'cancelled' }),
    reservation({ id: 'a2' }),
  ])

  const rows = await listReservations({ cancelled: 'all' }, BEFORE_THEM_ALL)

  assert.deepEqual(
    rows.items.map((one) => [one.id, one.discardable]),
    [
      ['a1', true],
      ['a2', false],
    ],
  )
})

test('a cancelled reservation is brought back only while it still has a window', async () => {
  standing([
    reservation({ id: 'a1', state: 'cancelled', standing: 'cancelled' }),
    reservation({ id: 'a2' }),
  ])

  const ahead = await listReservations({ cancelled: 'all' }, BEFORE_THEM_ALL)

  assert.deepEqual(
    ahead.items.map((one) => [one.id, one.restorable]),
    [
      ['a1', true],
      ['a2', false],
    ],
  )

  const over = await listReservations({ cancelled: 'all' }, AFTER_THEM_ALL)

  assert.equal(
    over.items.find((one) => one.id === 'a1')?.restorable,
    false,
    'the window has closed, and the API refuses a restoration that would leave ' +
      'a row nothing will ever record',
  )
})

test('a reservation a recording came of may not be thrown away', async () => {
  standing([reservation({ id: 'a1', standing: 'complete' })])
  store.recordings = [madeFor('rec-1', 'a1')]

  const rows = await listed(AFTER_THEM_ALL)

  assert.equal(rows[0].recordingId, 'rec-1')
  assert.equal(rows[0].discardable, false)
})

test('a settled reservation whose recording is gone may be thrown away', async () => {
  standing([reservation({ id: 'a1', standing: 'complete' })])
  store.recordings = []

  const rows = await listed(AFTER_THEM_ALL)

  assert.equal(rows[0].recordingId, undefined)
  assert.equal(rows[0].discardable, true)
})

test('a reservation being recorded may not be thrown away', async () => {
  standing([reservation({ id: 'a1', standing: 'recording' })])

  assert.equal((await listed(AFTER_THEM_ALL))[0].discardable, false)
})

/**
 * The moment a reservation still holding a seat becomes one that may be thrown
 * away is the end of the margin it would have run on, not the end of the
 * broadcast: the three moments are read separately so a reading taken off the
 * wrong end passes none of them.
 */
const MARGINED = window('2026-08-08T12:10:00Z', '2026-08-08T13:40:00Z', {
  marginAfterSeconds: 300,
  effectiveEndAt: '2026-08-08T13:45:00Z',
})

test('a conflict is thrown away only once the margin it would have run on is past', async () => {
  const at: [string, boolean][] = [
    ['2026-08-08T13:39:59Z', false],
    ['2026-08-08T13:40:00Z', false],
    ['2026-08-08T13:44:59Z', false],
    ['2026-08-08T13:45:00Z', true],
    ['2026-08-08T13:45:01Z', true],
  ]

  for (const [moment, expected] of at) {
    standing([
      reservation({
        id: 'a1',
        state: 'conflict',
        standing: 'conflict',
        window: MARGINED,
      }),
    ])

    assert.equal(
      (await listed(new Date(moment)))[0].discardable,
      expected,
      moment,
    )
  }
})

test('several thrown away at once are asked for one at a time, in the order given', async () => {
  standing()
  discarding(200, { reservationId: 'a1' })

  const result = await discardReservations(['a3', 'a1', 'a2'])

  assert.deepEqual(result, { state: 'ok', done: 3 })
  assert.deepEqual(
    sent.filter((one) => one.method === 'DELETE').map((one) => one.id),
    ['a3', 'a1', 'a2'],
  )
})

test('a refusal stops the rest, and says how many had gone through', async () => {
  standing()
  discarding(409, { reservationId: 'a1', refusal: 'stillToBeRecorded' })

  const result = await discardReservations(['a1', 'a2'])

  assert.equal(result.state, 'rejected')
  assert.equal(result.done, 0)
  assert.match(
    result.state === 'rejected' ? result.message : '',
    /先に取り消してください/,
  )
  assert.equal(sent.filter((one) => one.method === 'DELETE').length, 1)
})

test('a session that has run out stops the rest of a batch as well', async () => {
  standing()
  store.writeStatus = 401

  const result = await cancelReservations(['a1', 'a2'])

  assert.deepEqual(result, { state: 'unauthenticated', done: 0 })
  assert.equal(sent.filter((one) => one.path.endsWith('/cancel')).length, 1)
})

test('nothing chosen asks for nothing', async () => {
  standing()

  assert.deepEqual(await cancelReservations([]), { state: 'ok', done: 0 })
  assert.equal(sent.filter((one) => one.method === 'POST').length, 0)
})
