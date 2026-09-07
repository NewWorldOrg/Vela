import assert from 'node:assert/strict'
import { mock, test } from 'node:test'

interface Sent {
  path: string
  query: Record<string, unknown>
}

const sent: Sent[] = []

const store: {
  services: unknown[]
  rules: unknown[]
  outcomes: unknown[]
  reservations: unknown[]
  recordings: unknown[]
} = {
  services: [],
  rules: [],
  outcomes: [],
  reservations: [],
  recordings: [],
}

interface Over {
  [key: string]: unknown
}

const service = (networkId: number, serviceId: number, name: string) => ({
  networkId,
  serviceId,
  name,
  category: 'television',
  remoteControlKeyId: 5,
  selectedChannel: { system: 'isdbT' },
  candidates: [],
})

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

const outcome = (over: Over = {}) => ({
  id: 'o-1',
  reservationId: 'r-1',
  programme: {
    id: '131-1310-40001',
    networkId: 131,
    serviceId: 1310,
    eventId: 40001,
    startsAt: '2026-08-27T12:00:00Z',
    name: '週末キッチンの手帖',
  },
  kind: 'recordingFailure',
  tuneFailure: null,
  recordingOutcome: 'failed',
  recordedInstead: [],
  effectiveStartAt: '2026-08-27T11:59:50Z',
  effectiveEndAt: '2026-08-27T13:00:30Z',
  priority: 10,
  ruleId: null,
  occurredAt: '2026-08-27T13:01:00Z',
  ...over,
})

const reservation = (id: string, name: string) => ({
  id,
  programme: {
    id: '131-1310-40002',
    networkId: 131,
    serviceId: 1310,
    eventId: 40002,
    startsAt: '2026-08-27T12:00:00Z',
    name,
    summary: '',
    extended: '',
    genres: [],
    capturedAt: '2026-08-27T10:00:00Z',
  },
  origin: 'byHand',
  ruleId: null,
  priority: 20,
  window: {
    startAt: '2026-08-27T12:00:00Z',
    endAt: '2026-08-27T13:00:00Z',
    endAtConfirmed: true,
    marginBeforeSeconds: 0,
    marginAfterSeconds: 0,
    effectiveStartAt: '2026-08-27T12:00:00Z',
    effectiveEndAt: '2026-08-27T13:00:00Z',
  },
  standing: 'complete',
  startedAt: '2026-08-27T12:00:00Z',
  recordingOutcome: 'complete',
  reception: { unavailable: false, since: null },
  epg: {
    diverged: false,
    detail: [],
    programmeMissing: false,
    acknowledgedAt: null,
  },
  broadcastGroup: { key: null, role: 'standalone' },
  createdAt: '2026-08-27T10:00:00Z',
})

const answered = (status: number) => ({ status, ok: status < 400 })

const page = (items: unknown[], over: Over = {}) => ({
  items,
  total: items.length,
  currentPage: 1,
  lastPage: 1,
  perPage: 50,
  ...over,
})

interface Asking {
  params?: { query?: Record<string, unknown> }
}

mock.module('@/repository/client/carina', {
  namedExports: {
    revalidatingCarinaClient: () => ({
      GET: async () => ({ data: { data: [] }, response: answered(200) }),
    }),
    carinaClient: () => ({
      GET: async (path: string, init?: Asking) => {
        sent.push({ path, query: init?.params?.query ?? {} })

        if (path === '/api/services') {
          return { data: { data: store.services }, response: answered(200) }
        }

        if (path === '/api/rules') {
          return {
            data: {
              data: { rules: store.rules, total: store.rules.length },
            },
            response: answered(200),
          }
        }

        if (path === '/api/recordings') {
          return {
            data: { data: page(store.recordings) },
            response: answered(200),
          }
        }

        if (path === '/api/reservations') {
          return {
            data: { data: page(store.reservations) },
            response: answered(200),
          }
        }

        return {
          data: { data: page(store.outcomes) },
          response: answered(200),
        }
      },
    }),
  },
})

const { listReservationOutcomes } =
  await import('@/repository/reservation-outcomes')

const NOW = new Date('2026-09-06T00:00:00Z')

function standing(outcomes: unknown[]) {
  sent.length = 0
  store.services = [service(131, 1310, '湾岸放送1')]
  store.rules = []
  store.reservations = []
  store.recordings = []
  store.outcomes = outcomes
}

function askedFor(path: string): Record<string, unknown> | undefined {
  return sent.find((one) => one.path === path)?.query
}

test('台帳は発生時刻の新しい順のまま、ページだけを進む', async () => {
  standing([outcome()])

  const result = await listReservationOutcomes({ page: 3 }, NOW)
  const query = askedFor('/api/reservations/outcomes')

  assert.equal(query?.page, 3)
  assert.equal(query?.perPage, 50)
  assert.equal(query?.kind, undefined)
  assert.equal(query?.channel, undefined)
  assert.equal(query?.rule, undefined)
  assert.equal(query?.from, undefined)
  assert.equal(result.items.length, 1)
})

test('絞り込みは API のクエリ名でそのまま渡る', async () => {
  standing([outcome()])
  store.rules = [RULE]

  await listReservationOutcomes(
    { kind: 'missed', days: '30', ch: '131-1310', rule: RULE.id },
    NOW,
  )

  const query = askedFor('/api/reservations/outcomes')

  assert.deepEqual(query?.kind, ['missed'])
  assert.deepEqual(query?.channel, ['131-1310'])
  assert.equal(query?.rule, RULE.id)
  assert.equal(query?.from, '2026-08-07T00:00:00.000Z')
})

test('この機械が持たない絞り込みは、400 を招く前に落とされる', async () => {
  standing([outcome()])

  const result = await listReservationOutcomes(
    {
      kind: 'somethingElse' as never,
      days: '365',
      ch: '999-9999',
      rule: '00000000-0000-0000-0000-000000000000',
    },
    NOW,
  )
  const query = askedFor('/api/reservations/outcomes')

  assert.equal(query?.kind, undefined)
  assert.equal(query?.channel, undefined)
  assert.equal(query?.rule, undefined)
  assert.equal(query?.from, undefined)
  assert.deepEqual(result.filter, {
    kind: undefined,
    days: undefined,
    ch: undefined,
    rule: undefined,
  })
})

test('一行は、台帳が書いた語とこの機械の名前で読める', async () => {
  standing([
    outcome({
      kind: 'tuneFailure',
      tuneFailure: 'incompletePsi',
      recordingOutcome: null,
      ruleId: RULE.id,
    }),
  ])
  store.rules = [RULE]

  const [row] = (await listReservationOutcomes({}, NOW)).items

  assert.equal(row.title, '週末キッチンの手帖')
  assert.equal(row.channelName, '湾岸放送1')
  assert.equal(row.channelNo, '5')
  assert.equal(row.whenLabel, '2026/08/27 21:00')
  assert.equal(row.occurredLabel, '2026/08/27 22:01')
  assert.equal(row.origin, 'ルール')
  assert.equal(row.ruleName, RULE.name)
  assert.equal(row.priority, 10)
  assert.equal(row.kind, 'tuneFailure')
  assert.equal(row.tuneFailure?.no, 3)
  assert.equal(row.tuneFailure?.label, '情報が揃わない')
  assert.equal(row.recordingResult, undefined)
})

test('録画から報告された結果は、台帳が書いたとおりに残る', async () => {
  standing([
    outcome({ kind: 'recordingFailure', recordingOutcome: 'truncated' }),
  ])

  const [row] = (await listReservationOutcomes({}, NOW)).items

  assert.equal(row.recordingResult, 'truncated')
  assert.equal(row.tuneFailure, undefined)
  assert.equal(row.origin, '手動')
  assert.equal(row.ruleName, undefined)
})

test('代わりに録られた予約は、番組名で名指される', async () => {
  standing([
    outcome({
      kind: 'competing',
      recordingOutcome: null,
      recordedInstead: ['r-9'],
    }),
  ])
  store.reservations = [reservation('r-9', '金曜シネマ「星の渡り鳥」')]

  const [row] = (await listReservationOutcomes({}, NOW)).items

  assert.equal(row.instead.length, 1)
  assert.equal(row.instead[0].title, '金曜シネマ「星の渡り鳥」')
  assert.match(row.instead[0].meta ?? '', /湾岸放送1/)
})

test('もう残っていない予約は、識別子ではなく名前の無い一行になる', async () => {
  standing([
    outcome({
      kind: 'competing',
      recordingOutcome: null,
      recordedInstead: ['r-gone'],
    }),
  ])

  const [row] = (await listReservationOutcomes({}, NOW)).items

  assert.equal(row.instead.length, 1)
  assert.equal(row.instead[0].title, undefined)
  assert.equal(row.instead[0].meta, undefined)
})

test('誰も代わりに録っていない台帳では、予約一覧を読みに行かない', async () => {
  standing([outcome()])

  await listReservationOutcomes({}, NOW)

  assert.equal(askedFor('/api/reservations'), undefined)
})

test('空の台帳は、読めなかったことにはならない', async () => {
  standing([])

  const result = await listReservationOutcomes({}, NOW)

  assert.deepEqual(result.items, [])
  assert.equal(result.total, 0)
  assert.equal(result.lastPage, 1)
})
