import assert from 'node:assert/strict'
import { mock, test } from 'node:test'

interface Sent {
  path: string
  query: Record<string, unknown>
  body?: unknown
}

const sent: Sent[] = []

const store: {
  summary: unknown
  channels: unknown[]
  tuners: unknown[]
  recordings: unknown[]
  whole: unknown[]
  thresholds: unknown[]
  services: unknown[]
  ledger: unknown[]
  refusal?: { status: number; message: string }
} = {
  summary: null,
  channels: [],
  tuners: [],
  recordings: [],
  whole: [],
  thresholds: [],
  services: [],
  ledger: [],
}

const tally = (over: Record<string, unknown> = {}) => ({
  state: 'good',
  subjects: 3,
  measured: 3,
  unmeasured: 0,
  beyondThreshold: 0,
  good: 3,
  warning: 0,
  mayNotBeWatchable: 0,
  unsupported: 0,
  unreachable: 0,
  average: 0,
  lowest: 0,
  highest: 0,
  ...over,
})

const measures = (over: Record<string, unknown> = {}) => [
  { metric: 'packetsLost', reading: tally(over) },
  { metric: 'packetsLeftScrambled', reading: tally() },
  { metric: 'overflows', reading: tally() },
]

const signal = () =>
  ['lockRate', 'carrierToNoiseFloor', 'bitErrorRateCeiling'].map((metric) => ({
    metric,
    reading: {
      state: 'unmeasured',
      subjects: 1,
      measured: 0,
      unmeasured: 1,
      beyondThreshold: 0,
    },
    lastTakenAt: null,
  }))

const threshold = (
  key: string,
  value: number,
  over: Record<string, unknown> = {},
) => ({
  key,
  metric: null,
  sense: 'ceiling',
  defaultValue: value,
  currentValue: value,
  lowest: 0,
  highest: 1,
  provisional: true,
  observations: 0,
  stored: false,
  updatedAt: null,
  updatedBy: null,
  lastChange: null,
  ...over,
})

const SHIPPED = [
  threshold('packetsLostWarning', 0.0002),
  threshold('packetsLostUnwatchable', 0.001),
  threshold('packetsLeftScrambled', 0.0005),
  threshold('overflows', 1, { lowest: 0, highest: 1000000 }),
  threshold('lockRate', 0.99, { sense: 'floor' }),
  threshold('carrierToNoiseFloor', 15000, {
    sense: 'floor',
    lowest: -100000,
    highest: 100000,
  }),
  threshold('bitErrorRateCeiling', 0.0001),
  threshold('supplySilence', 300, { lowest: 1, highest: 86400 }),
]

const answered = (status: number) => ({ status, ok: status < 400 })

const paged = (items: unknown[], over: Record<string, unknown> = {}) => ({
  period: { from: '2026-09-07T00:00:00Z', until: '2026-09-08T00:00:00Z' },
  metrics: ['packetsLost', 'packetsLeftScrambled', 'overflows'],
  items,
  total: items.length,
  currentPage: 1,
  lastPage: 1,
  perPage: 50,
  provisional: true,
  ...over,
})

interface Asking {
  params?: { query?: Record<string, unknown>; path?: Record<string, unknown> }
  body?: unknown
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

        if (path === '/api/recordings') {
          return {
            data: {
              data: {
                items: store.ledger,
                total: store.ledger.length,
                currentPage: 1,
                lastPage: 1,
                perPage: 200,
              },
            },
            response: answered(200),
          }
        }

        if (path === '/api/quality/summary') {
          return { data: { data: store.summary }, response: answered(200) }
        }

        if (path === '/api/quality/channels') {
          return {
            data: { data: paged(store.channels) },
            response: answered(200),
          }
        }

        if (path === '/api/quality/tuners') {
          return {
            data: { data: paged(store.tuners) },
            response: answered(200),
          }
        }

        if (path === '/api/quality/recordings') {
          return {
            data: { data: paged(store.recordings, { whole: store.whole }) },
            response: answered(200),
          }
        }

        return {
          data: { data: { items: store.thresholds } },
          response: answered(200),
        }
      },
      PATCH: async (path: string, init?: Asking) => {
        sent.push({
          path: path.replace('{key}', String(init?.params?.path?.key)),
          query: {},
          body: init?.body,
        })

        if (store.refusal) {
          return {
            error: { message: store.refusal.message },
            response: answered(store.refusal.status),
          }
        }

        return { data: { data: {} }, response: answered(200) }
      },
    }),
  },
})

const { getQuality, reviseThreshold } = await import('@/repository/quality')

const service = (networkId: number, serviceId: number, name: string) => ({
  networkId,
  serviceId,
  name,
  category: 'television',
  remoteControlKeyId: 5,
  selectedChannel: { system: 'isdbT' },
  candidates: [],
})

function standing() {
  sent.length = 0
  store.refusal = undefined
  store.services = [service(32736, 1024, '湾岸放送1')]
  store.ledger = []
  store.thresholds = SHIPPED
  store.channels = [
    { networkId: 32736, serviceId: 1024, kind: 'isdbT', measures: measures() },
  ]
  store.tuners = [
    { deviceId: 'adapter3.frontend0', measures: measures(), signal: signal() },
  ]
  store.recordings = []
  store.whole = measures()
  store.summary = {
    period: { from: '2026-09-07T00:00:00Z', until: '2026-09-08T00:00:00Z' },
    recordings: 3,
    measures: measures(),
    signal: signal(),
    provisional: true,
  }
}

test('信号品質は、良好ではなく未計測のまま出る', async () => {
  standing()

  const result = await getQuality()
  const tuner = result.tuners[0]

  assert.equal(tuner.device, 'adapter3.frontend0')
  assert.equal(tuner.state.label, '健全')
  assert.equal(tuner.drop.value, '0.000')
  assert.deepEqual(
    [tuner.lock.level, tuner.cnr.level, tuner.ber.level],
    ['unmeasured', 'unmeasured', 'unmeasured'],
  )
  assert.deepEqual(
    [tuner.lock.sub, tuner.cnr.sub, tuner.ber.sub],
    [undefined, undefined, undefined],
  )
  assert.equal(
    result.stats.find((one) => one.key === 'health')?.foot,
    '信号品質 未計測',
  )
})

test('期間は URL が持ち、押された幅がそのまま口に渡る', async () => {
  standing()

  const result = await getQuality('7')
  const asked = sent.find((one) => one.path === '/api/quality/summary')
  const span =
    Date.parse(String(asked?.query.until)) -
    Date.parse(String(asked?.query.from))

  assert.equal(span, 7 * 24 * 60 * 60 * 1000)
  assert.deepEqual(
    result.windows.map((one) => one.current),
    [false, true, false],
  )
  assert.equal(
    result.stats.find((one) => one.key === 'drop')?.label,
    '直近 7 日のドロップ率',
  )
})

test('閾値は現在値・既定・根拠件数を口から取り、暫定の印を持つ', async () => {
  standing()

  const result = await getQuality()
  const warning = result.thresholds.find(
    (one) => one.key === 'packetsLostWarning',
  )
  const silence = result.thresholds.find((one) => one.key === 'supplySilence')

  assert.equal(result.thresholds.length, 8)
  assert.equal(warning?.value, '0.02%')
  assert.equal(warning?.basis, '既定 0.02% · 根拠 0 件')
  assert.equal(warning?.provisional, true)
  assert.equal(silence?.value, '5分')
  assert.equal(result.warnMarkPct, 20)
})

test('閾値の変更は、画面の単位で受けて口の単位で送る', async () => {
  standing()

  const write = await reviseThreshold('packetsLostWarning', 0.05)
  const asked = sent.find(
    (one) => one.path === '/api/quality/thresholds/packetsLostWarning',
  )

  assert.deepEqual(write, { state: 'ok' })
  assert.deepEqual(asked?.body, { value: 0.0005 })
})

test('閾値が越えられないときの断りは日本語の一文になる', async () => {
  standing()
  store.refusal = {
    status: 400,
    message:
      'A reading passes the warning level before it passes the unwatchable one, so PacketsLostWarning cannot be moved past the level beside it.',
  }

  assert.deepEqual(await reviseThreshold('packetsLostWarning', 0.5), {
    state: 'rejected',
    message:
      '警告水準が視聴不可の恐れを越えてしまうため、変更できませんでした。',
  })
})

test('範囲の外と、名前の無い閾値も日本語で断る', async () => {
  standing()
  store.refusal = {
    status: 400,
    message:
      'The level kept under PacketsLostWarning lies between 0 and 1, and a level outside that is refused rather than saved and warned about.',
  }

  assert.deepEqual(await reviseThreshold('packetsLostWarning', 500), {
    state: 'rejected',
    message: '指定できる範囲の外の値のため、変更できませんでした。',
  })

  store.refusal = {
    status: 404,
    message:
      'A threshold is asked for by one of the keys this domain names: PacketsLostWarning.',
  }

  assert.deepEqual(await reviseThreshold('overflows', 2), {
    state: 'rejected',
    message: 'この閾値は残っていないため、変更できませんでした。',
  })
})

test('BS / CS の録画が無ければ衛星の面は空のまま', async () => {
  standing()

  const result = await getQuality()

  assert.equal(result.channels.length, 1)
  assert.equal(result.channels[0].name, '湾岸放送1')
  assert.equal(result.satellites.length, 0)
  assert.equal(result.problemRecordings.length, 0)
})
