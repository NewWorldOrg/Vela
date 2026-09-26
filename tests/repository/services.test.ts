import assert from 'node:assert/strict'
import { mock, test } from 'node:test'
import { formatMoment, formatMonth, formatSpan } from '@/lib/format'
import { NOT_YET_IN_THIS_BUILD } from '@/lib/not-yet-in-this-build'
import {
  INCOMPLETE_TABLES,
  LOCKED_WITHOUT_DATA,
  NO_LOCK,
  UNEXPECTED_STREAM,
} from '@/repository/scan-failures'

interface Sent {
  method: string
  path: string
  body?: unknown
}

interface Reply {
  status: number
  body?: unknown
}

const sent: Sent[] = []

const replies = new Map<string, Reply>()

const SEEN = '2026-08-15T03:20:00Z'

const FOUND = '2025-07-01T00:00:00Z'

const STARTED = '2026-08-15T03:00:00Z'

const FINISHED = '2026-08-15T03:04:30Z'

const LOGO = '/api/services/50001-1024/logo'

const ok = (data: unknown): Reply => ({
  status: 200,
  body: { status: true, message: '', data },
})

const refusing = (status: number, data: unknown = null): Reply => ({
  status,
  body: { status: false, message: 'refused', data },
})

const tuning = (
  system = 'isdbT',
  physicalChannel: number | string = 53,
  transportStreamId: number | string | null = null,
) => ({ system, physicalChannel, transportStreamId })

const measured = (cnrMilliDecibels: number | string | null, locked = true) => ({
  measuredAt: SEEN,
  locked,
  cnrMilliDecibels,
  postViterbiErrorBits: 0,
  postViterbiTotalBits: 0,
})

const candidate = (over: Record<string, unknown> = {}) => ({
  id: 'candidate-53',
  target: tuning(),
  isSelected: true,
  selection: null,
  lastMeasurement: measured(31200),
  needsRevalidation: false,
  rotationState: 'active',
  consecutiveFailures: 0,
  nextAttemptAt: null,
  needsAttentionSince: null,
  discoveredAt: FOUND,
  lastSeenAt: SEEN,
  ...over,
})

const service = (over: Record<string, unknown> = {}) => ({
  networkId: 50001,
  serviceId: 1024,
  name: 'みなと総合1',
  category: 'television',
  remoteControlKeyId: 1,
  reservableByDefault: true,
  discoveredAt: FOUND,
  lastSeenAt: SEEN,
  candidateCount: 1,
  selectedChannel: tuning(),
  betterChannel: null,
  candidates: [candidate()],
  logoDeclaration: 'inTheCommonDataTable',
  logo: { url: LOGO, collectedAt: SEEN },
  ...over,
})

const run = (over: Record<string, unknown> = {}) => ({
  scanId: 'scan-1',
  state: 'completed',
  driverInstanceId: null,
  startedAt: STARTED,
  finishedAt: FINISHED,
  reason: null,
  ...over,
})

const attempt = (over: Record<string, unknown> = {}) => ({
  target: tuning(),
  outcome: 'succeeded',
  detail: null,
  observedTransportStreamId: null,
  measurement: measured(31200),
  startedAt: STARTED,
  finishedAt: '2026-08-15T03:00:12Z',
  ...over,
})

const progress = (over: Record<string, unknown> = {}) => ({
  run: run(),
  attempted: 1,
  succeeded: 1,
  failed: 0,
  attempts: [attempt()],
  difference: null,
  ...over,
})

const change = (over: Record<string, unknown> = {}) => ({
  kind: 'added',
  networkId: 50001,
  serviceId: 1024,
  name: 'みなと総合1',
  category: 'television',
  channels: [
    {
      kind: 'added',
      target: tuning(),
      transportStreamId: null,
      measurement: measured(31200),
    },
  ],
  ...over,
})

const difference = (over: Record<string, unknown> = {}) => ({
  added: [],
  updated: [],
  missing: [],
  leftRotation: [],
  ...over,
})

function resolved(
  template: string,
  init?: { params?: { path?: Record<string, unknown> } },
): string {
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    String(init?.params?.path?.[name]),
  )
}

function answer(
  method: string,
  template: string,
  init?: { params?: { path?: Record<string, unknown> }; body?: unknown },
) {
  const path = resolved(template, init)

  sent.push(
    init?.body === undefined
      ? { method, path }
      : { method, path, body: init.body },
  )

  const reply = replies.get(`${method} ${path}`)

  if (reply === undefined) {
    throw new Error(`nothing stands behind ${method} ${path}`)
  }

  const response = { status: reply.status, ok: reply.status < 300 }

  return reply.status < 300
    ? { data: reply.body, error: undefined, response }
    : { data: undefined, error: reply.body, response }
}

mock.module('@/repository/client/carina', {
  namedExports: {
    carinaClient: () => ({
      GET: async (path: string, init?: never) => answer('GET', path, init),
      POST: async (path: string, init?: never) => answer('POST', path, init),
      PUT: async (path: string, init?: never) => answer('PUT', path, init),
      DELETE: async (path: string, init?: never) =>
        answer('DELETE', path, init),
    }),
    revalidatingCarinaClient: () => {
      throw new Error('the channel screen does not revalidate')
    },
  },
})

const {
  addCandidateChannel,
  applyScan,
  cancelScan,
  deleteCandidateChannel,
  getChannels,
  getScanProposal,
  selectCandidateChannel,
  startScan,
} = await import('@/repository/services')

function standing(
  services: unknown[] = [service()],
  runs: unknown[] = [],
): void {
  sent.length = 0
  replies.clear()
  replies.set('GET /api/services', ok(services))
  replies.set('GET /api/tuners/scan-runs', ok(runs))
}

function progressOf(scanId: string, reply: Reply): void {
  replies.set(`GET /api/tuners/scan/${scanId}`, reply)
}

async function channels() {
  const answer = await getChannels()

  assert.equal(answer.state, 'ok')

  if (answer.state !== 'ok') {
    throw new Error('the channel screen did not open')
  }

  return answer.result
}

async function terrestrial() {
  const result = await channels()
  const group = result.groups.find(({ system }) => system === 'isdbT')

  if (group === undefined) {
    throw new Error('the terrestrial group is missing')
  }

  return group
}

async function onlyRow() {
  const [row] = (await terrestrial()).services

  if (row === undefined) {
    throw new Error('the service did not reach its group')
  }

  return row
}

async function proposal(scanId = 'scan-1') {
  const answer = await getScanProposal(scanId)

  assert.equal(answer.state, 'ok')

  if (answer.state !== 'ok') {
    throw new Error('the proposal did not open')
  }

  return answer.proposal
}

test('a logo the API collected reaches the row with the address it is served from', async () => {
  standing()

  assert.deepEqual((await onlyRow()).logo, {
    declaration: 'inTheCommonDataTable',
    href: LOGO,
  })
})

test('a station that declares it broadcasts no picture says so instead of waiting for one', async () => {
  standing([service({ logo: null, logoDeclaration: 'noPictureIsBroadcast' })])

  assert.deepEqual((await onlyRow()).logo, {
    declaration: 'noPictureIsBroadcast',
  })
})

test('a logo not read yet, or declared in a way this build does not know, is still waited for', async () => {
  for (const logoDeclaration of ['notYetRead', 'drawnSomewhereNew']) {
    standing([service({ logo: null, logoDeclaration })])

    assert.deepEqual((await onlyRow()).logo, { declaration: 'notYetRead' })
  }
})

test('a logo the API carries wins over a declaration that says there is none', async () => {
  standing([service({ logoDeclaration: 'noPictureIsBroadcast' })])

  assert.deepEqual((await onlyRow()).logo, {
    declaration: 'inTheCommonDataTable',
    href: LOGO,
  })
})

test('a service becomes the row the channel screen draws', async () => {
  standing([
    service({
      networkId: '50001',
      serviceId: '1024',
      remoteControlKeyId: '3',
      candidateCount: '2',
      reservableByDefault: false,
      betterChannel: tuning('isdbT', 55),
    }),
  ])

  const row = await onlyRow()

  assert.equal(row.key, '50001-1024')
  assert.equal(row.name, 'みなと総合1')
  assert.equal(row.no, '3')
  assert.equal(row.category, 'TV')
  assert.equal(row.minorCategory, false)
  assert.equal(row.currentChannel, '53ch')
  assert.equal(row.betterChannel, '55ch')
  assert.equal(row.enabled, false)
  assert.equal(row.candidateCount, 2)
  assert.equal(row.lastSeen, formatMoment(SEEN))
})

test('a service with no remote key, no tuned channel and no better one leaves those out', async () => {
  standing([
    service({
      remoteControlKeyId: null,
      selectedChannel: null,
      betterChannel: null,
    }),
  ])

  const row = await onlyRow()

  assert.equal(row.no, undefined)
  assert.equal(row.currentChannel, undefined)
  assert.equal(row.betterChannel, undefined)
})

test('a candidate carries its channel, its reception and when it was found', async () => {
  standing([
    service({
      candidates: [
        candidate({ needsRevalidation: true }),
        candidate({
          id: 'candidate-55',
          target: tuning('isdbT', 55),
          isSelected: false,
          lastMeasurement: measured(null, false),
        }),
        candidate({
          id: 'candidate-57',
          target: tuning('isdbT', 57),
          isSelected: false,
          lastMeasurement: null,
        }),
      ],
    }),
  ])

  const [locked, unlocked, unread] = (await onlyRow()).candidates

  assert.deepEqual(locked, {
    id: 'candidate-53',
    channel: '53ch',
    selected: true,
    measurement: { value: '31.2 dB', percent: 78, tone: 'ok' },
    reception: 'locked',
    needsRevalidation: true,
    rotation: undefined,
    discovered: formatMonth(FOUND),
    lastSeen: formatMoment(SEEN),
  })
  assert.equal(unlocked.channel, '55ch')
  assert.equal(unlocked.selected, false)
  assert.equal(unlocked.reception, 'unlocked')
  assert.equal(unlocked.measurement, undefined)
  assert.equal(unread.reception, 'unread')
  assert.equal(unread.measurement, undefined)
})

test('a candidate taken out of the rotation is counted as needing attention', async () => {
  standing([
    service({
      candidates: [
        candidate(),
        candidate({
          id: 'candidate-55',
          rotationState: 'needsAttention',
          consecutiveFailures: '12',
        }),
      ],
    }),
  ])

  const row = await onlyRow()

  assert.deepEqual(row.candidates[1].rotation, {
    dropped: true,
    label: '要確認 · 連続失敗 12 回',
    note: '巡回対象から外しました',
  })
  assert.equal(row.needsAttentionCount, 1)
})

test('a candidate backing off says when it is tried next, or that it will be', async () => {
  const next = '2026-08-15T04:00:00Z'

  standing([
    service({
      candidates: [
        candidate({
          rotationState: 'backingOff',
          consecutiveFailures: 3,
          nextAttemptAt: next,
        }),
        candidate({
          id: 'candidate-55',
          rotationState: 'backingOff',
          consecutiveFailures: 4,
        }),
      ],
    }),
  ])

  const row = await onlyRow()

  assert.deepEqual(row.candidates[0].rotation, {
    dropped: false,
    label: '再試行待ち · 連続失敗 3 回',
    note: `次の試行 ${formatMoment(next)}`,
  })
  assert.equal(row.candidates[1].rotation?.note, '間隔を空けて試し直します')
  assert.equal(row.needsAttentionCount, 0)
})

test('a rotation state this build does not know draws no rotation note', async () => {
  standing([service({ candidates: [candidate({ rotationState: 'resting' })] })])

  assert.equal((await onlyRow()).candidates[0].rotation, undefined)
})

test('a service lands in the group of the system it is tuned to, or of its first candidate', async () => {
  standing([
    service(),
    service({
      serviceId: 2048,
      selectedChannel: tuning('isdbSBs', 1, 16),
      candidates: [candidate({ target: tuning('isdbSBs', 1, 16) })],
    }),
    service({
      serviceId: 3072,
      selectedChannel: null,
      candidates: [candidate({ target: tuning('isdbSCs110', 2) })],
    }),
  ])

  const result = await channels()

  assert.deepEqual(
    result.groups.map(({ system, services }) => [
      system,
      services.map(({ key }) => key),
    ]),
    [
      ['isdbT', ['50001-1024']],
      ['isdbSBs', ['50001-2048']],
      ['isdbSCs110', ['50001-3072']],
    ],
  )
  assert.equal(result.groups[1].services[0].currentChannel, 'BS1 / TS 16')
  assert.deepEqual(result.unattributed, [])
})

test('a service tuned nowhere, or to an unspecified system, is kept apart rather than dropped', async () => {
  standing([
    service({ selectedChannel: null, candidates: [] }),
    service({
      serviceId: 2048,
      selectedChannel: tuning('unspecified', 0),
      candidates: [],
    }),
  ])

  const result = await channels()

  assert.deepEqual(
    result.unattributed.map(({ key }) => key),
    ['50001-1024', '50001-2048'],
  )
  assert.ok(result.groups.every(({ services }) => services.length === 0))
})

test('a service on a system this build does not know is kept apart rather than dropped', async () => {
  standing([
    service({
      selectedChannel: tuning('isdbS3', 1),
      candidates: [candidate({ target: tuning('isdbS3', 1) })],
    }),
  ])

  const result = await channels()

  assert.deepEqual(
    result.unattributed.map(({ key }) => key),
    ['50001-1024'],
  )
  assert.ok(result.groups.every(({ services }) => services.length === 0))
})

test('a group counts its services by category', async () => {
  standing([
    service(),
    service({ serviceId: 1025 }),
    service({ serviceId: 1026, category: 'radio' }),
  ])

  assert.equal((await terrestrial()).stat, '3 サービス(TV 2 · ラジオ 1)')
})

test('a category this build does not know is named as such and still counted', async () => {
  standing([service({ category: 'hologram' })])

  const group = await terrestrial()

  assert.equal(group.services[0].category, NOT_YET_IN_THIS_BUILD)
  assert.equal(group.services[0].minorCategory, true)
  assert.equal(group.stat, '1 サービス')
})

test('every category the API names reaches the row as its word', async () => {
  const words = {
    television: 'TV',
    oneSeg: 'ワンセグ',
    data: 'データ',
    radio: 'ラジオ',
    temporary: '臨時',
    other: 'その他',
  }

  standing(
    Object.keys(words).map((category, index) =>
      service({ serviceId: 1024 + index, category }),
    ),
  )

  const group = await terrestrial()

  assert.deepEqual(
    group.services.map(({ category }) => category),
    Object.values(words),
  )
  assert.deepEqual(
    group.services.map(({ minorCategory }) => minorCategory),
    [false, true, true, true, true, true],
  )
})

test('a sign-in that ran out on any of the reads closes the screen', async () => {
  standing()
  replies.set('GET /api/services', { status: 401 })
  assert.deepEqual(await getChannels(), { state: 'unauthenticated' })

  standing()
  replies.set('GET /api/tuners/scan-runs', { status: 401 })
  assert.deepEqual(await getChannels(), { state: 'unauthenticated' })

  standing([service()], [run()])
  progressOf('scan-1', { status: 401 })
  assert.deepEqual(await getChannels(), { state: 'unauthenticated' })
})

test('a refusal the API sends in its body is read as the screen being unavailable', async () => {
  standing()
  replies.set('GET /api/services', refusing(500))
  assert.deepEqual(await getChannels(), {
    state: 'unavailable',
    message: 'API は 500 を返しました。',
  })

  standing()
  replies.set('GET /api/tuners/scan-runs', refusing(503))
  assert.deepEqual(await getChannels(), {
    state: 'unavailable',
    message: 'API は 503 を返しました。',
  })
})

test('an answer with no body at all is not taken for an empty list', async () => {
  standing()
  replies.set('GET /api/services', { status: 502 })
  await assert.rejects(getChannels(), /GET \/api\/services answered 502/)

  standing()
  replies.set('GET /api/tuners/scan-runs', { status: 502 })
  await assert.rejects(
    getChannels(),
    /GET \/api\/tuners\/scan-runs answered 502/,
  )
})

test('the history lists every run and reads the progress of the latest eight only', async () => {
  const runs = Array.from({ length: 10 }, (_, index) =>
    run({
      scanId: `scan-${index}`,
      state: index === 0 ? 'failed' : 'completed',
    }),
  )

  standing([service()], runs)
  runs.forEach(({ scanId }) => progressOf(scanId, ok(progress())))

  const result = await channels()

  assert.equal(result.history.length, 10)
  assert.deepEqual(result.history[0], {
    id: 'scan-0',
    state: 'failed',
    stateLabel: '失敗',
    startedAt: formatMoment(STARTED),
    finishedAt: formatMoment(FINISHED),
    took: formatSpan(270),
    reason: undefined,
  })
  assert.equal(
    sent.filter(({ path }) => path.startsWith('/api/tuners/scan/')).length,
    8,
  )
})

test('a run state this build does not know is named as such', async () => {
  standing([service()], [run({ state: 'paused', reason: 'held' })])
  progressOf('scan-1', ok(progress()))

  const [only] = (await channels()).history

  assert.equal(only.state, 'paused')
  assert.equal(only.stateLabel, NOT_YET_IN_THIS_BUILD)
  assert.equal(only.reason, 'held')
})

test('a system is walked, never walked, or unknown when a run could not be read', async () => {
  standing([service()], [run()])
  progressOf('scan-1', ok(progress()))

  assert.deepEqual(
    (await channels()).groups.map(({ walk }) => walk),
    ['walked', 'never', 'never'],
  )

  standing([service()], [run(), run({ scanId: 'scan-2' })])
  progressOf('scan-1', ok(progress()))
  progressOf('scan-2', { status: 404 })

  assert.deepEqual(
    (await channels()).groups.map(({ walk }) => walk),
    ['walked', 'unknown', 'unknown'],
  )
})

test('an empty group is diagnosed from the last finished run that walked it', async () => {
  standing(
    [],
    [
      run({ scanId: 'scan-running', state: 'running', finishedAt: null }),
      run(),
    ],
  )
  progressOf(
    'scan-running',
    ok(progress({ attempts: [attempt({ outcome: 'lockedWithoutData' })] })),
  )
  progressOf(
    'scan-1',
    ok(
      progress({
        attempts: [
          attempt({ outcome: 'noLock' }),
          attempt({ outcome: 'noLock', target: tuning('isdbT', 55) }),
          attempt({ outcome: 'noLock', target: tuning('isdbSBs', 1, 16) }),
        ],
      }),
    ),
  )

  const [isdbT, isdbSBs, isdbSCs110] = (await channels()).groups

  assert.deepEqual(isdbT.diagnosis, {
    scannedAt: formatMoment(STARTED),
    attempted: 2,
    counts: [
      { class: NO_LOCK, count: 2 },
      { class: LOCKED_WITHOUT_DATA, count: 0 },
      { class: INCOMPLETE_TABLES, count: 0 },
      { class: UNEXPECTED_STREAM, count: 0 },
    ],
    verdict: '走査した 2 件すべてが「1 信号を掴めない」で止まっています。',
  })
  assert.equal(isdbSBs.diagnosis?.attempted, 1)
  assert.equal(isdbSCs110.diagnosis, undefined)
})

test('a diagnosis split across failures gives no single verdict', async () => {
  standing([], [run()])
  progressOf(
    'scan-1',
    ok(
      progress({
        attempts: [
          attempt({ outcome: 'noLock' }),
          attempt({ outcome: 'incompleteTables' }),
        ],
      }),
    ),
  )

  const [isdbT] = (await channels()).groups

  assert.deepEqual(
    isdbT.diagnosis?.counts.map(({ count }) => count),
    [1, 0, 1, 0],
  )
  assert.equal(isdbT.diagnosis?.verdict, undefined)
})

test('a group with services carries no diagnosis', async () => {
  standing([service()], [run()])
  progressOf(
    'scan-1',
    ok(progress({ attempts: [attempt({ outcome: 'noLock' })] })),
  )

  assert.equal((await terrestrial()).diagnosis, undefined)
})

test('a running scan is read into its progress, newest attempt first', async () => {
  standing([service()], [run({ state: 'running', finishedAt: null })])
  progressOf(
    'scan-1',
    ok(
      progress({
        run: run({ state: 'running', finishedAt: null }),
        attempted: '2',
        succeeded: '1',
        failed: '1',
        attempts: [
          attempt(),
          attempt({
            target: tuning('isdbSBs', 3, 16),
            outcome: 'unexpectedStream',
            observedTransportStreamId: '17',
          }),
        ],
      }),
    ),
  )

  const running = (await channels()).running

  assert.equal(running?.state, 'read')

  if (running?.state !== 'read') {
    throw new Error('the running scan was not read')
  }

  const { progress: read } = running

  assert.equal(read.run.state, 'running')
  assert.equal(read.run.finishedAt, undefined)
  assert.equal(read.run.took, undefined)
  assert.equal(read.attempted, 2)
  assert.equal(read.succeeded, 1)
  assert.equal(read.failed, 1)
  assert.deepEqual(read.systems, ['isdbT', 'isdbSBs'])
  assert.deepEqual(
    read.attempts.map(({ id, channel, failure, streamMismatch }) => ({
      id,
      channel,
      failure,
      streamMismatch,
    })),
    [
      {
        id: '1',
        channel: 'BS3 / TS 16',
        failure: UNEXPECTED_STREAM,
        streamMismatch: '期待 TSID 16 / 受信 TSID 17',
      },
      {
        id: '0',
        channel: '53ch',
        failure: undefined,
        streamMismatch: undefined,
      },
    ],
  )
  assert.equal(read.attempts[1].took, formatSpan(12))
  assert.equal(read.attempts[1].at, formatMoment(STARTED))
})

test('a running scan the API could not describe is still shown, with why', async () => {
  standing([service()], [run({ state: 'running', finishedAt: null })])
  progressOf('scan-1', refusing(500))

  assert.deepEqual((await channels()).running, {
    state: 'unreadable',
    run: {
      id: 'scan-1',
      state: 'running',
      stateLabel: '実行中',
      startedAt: formatMoment(STARTED),
      finishedAt: undefined,
      took: undefined,
      reason: undefined,
    },
    message: 'スキャンの状況を読み取れませんでした(500)。',
  })

  standing([service()], [run({ state: 'running', finishedAt: null })])
  progressOf('scan-1', { status: 404 })

  const gone = (await channels()).running

  assert.equal(gone?.state, 'unreadable')
  assert.equal(
    gone?.state === 'unreadable' && gone.message,
    'スキャンの状況を API が答えられませんでした。',
  )
})

test('the proposal waiting on the screen is the latest completed run that still holds a difference', async () => {
  standing(
    [service()],
    [
      run({ scanId: 'scan-3', state: 'failed' }),
      run({ scanId: 'scan-2' }),
      run({ scanId: 'scan-1' }),
    ],
  )
  progressOf('scan-3', ok(progress({ difference: difference() })))
  progressOf('scan-2', ok(progress()))
  progressOf(
    'scan-1',
    ok(
      progress({
        run: run({ scanId: 'scan-1' }),
        difference: difference({ added: [change()] }),
      }),
    ),
  )

  const result = await channels()

  assert.equal(result.proposal?.run.id, 'scan-1')
  assert.equal(result.running, undefined)

  standing([service()], [run()])
  progressOf('scan-1', ok(progress()))

  assert.equal((await channels()).proposal, undefined)
})

test('a proposal carries what was added, updated, missed and taken out of the rotation', async () => {
  replies.clear()
  progressOf(
    'scan-1',
    ok(
      progress({
        succeeded: '3',
        attempts: [
          attempt({ outcome: 'noLock' }),
          attempt(),
          attempt({ outcome: 'incompleteTables', target: tuning('isdbT', 55) }),
        ],
        difference: difference({
          added: [change({ category: 'radio' })],
          updated: [
            change({
              kind: 'updated',
              serviceId: '1025',
              name: 'みなと総合2',
              channels: [
                {
                  kind: 'missing',
                  target: tuning('isdbT', 55),
                  transportStreamId: null,
                  measurement: null,
                },
              ],
            }),
          ],
          missing: [change({ kind: 'missing', serviceId: 1026, channels: [] })],
          leftRotation: [
            {
              networkId: '50001',
              serviceId: '1027',
              target: tuning('isdbT', 57),
              consecutiveFailures: '9',
              since: SEEN,
            },
          ],
        }),
      }),
    ),
  )

  const read = await proposal()

  assert.deepEqual(read.added, [
    {
      key: '50001-1024',
      name: 'みなと総合1',
      category: 'ラジオ',
      channels: [
        {
          kind: 'added',
          channel: '53ch',
          measurement: { value: '31.2 dB', percent: 78, tone: 'ok' },
        },
      ],
    },
  ])
  assert.deepEqual(read.updated[0].channels, [
    { kind: 'missing', channel: '55ch', measurement: undefined },
  ])
  assert.equal(read.updated[0].key, '50001-1025')
  assert.equal(read.missing[0].key, '50001-1026')
  assert.deepEqual(read.leftRotation, [
    {
      key: '50001-1027',
      channel: '57ch',
      consecutiveFailures: 9,
      since: formatMoment(SEEN),
    },
  ])
  assert.deepEqual(
    read.failures.map(({ id, failure }) => [id, failure]),
    [
      ['1', INCOMPLETE_TABLES],
      ['0', NO_LOCK],
    ],
  )
  assert.equal(read.succeeded, 3)
  assert.equal(read.empty, false)
})

test('a proposal with nothing in it says it is empty', async () => {
  replies.clear()
  progressOf('scan-1', ok(progress({ difference: difference() })))

  assert.equal((await proposal()).empty, true)
})

test('a category or channel change this build does not know still reaches the proposal', async () => {
  replies.clear()
  progressOf(
    'scan-1',
    ok(
      progress({
        difference: difference({
          added: [
            change({
              category: 'hologram',
              channels: [
                {
                  kind: 'relocated',
                  target: tuning(),
                  transportStreamId: null,
                  measurement: null,
                },
              ],
            }),
          ],
        }),
      }),
    ),
  )

  const [added] = (await proposal()).added

  assert.equal(added.category, NOT_YET_IN_THIS_BUILD)
  assert.equal(added.channels[0].kind, 'relocated')
  assert.equal(added.channels[0].channel, '53ch')
})

test('every failure the API names is read into its own class', async () => {
  replies.clear()
  progressOf(
    'scan-1',
    ok(
      progress({
        attempts: [
          'noLock',
          'lockedWithoutData',
          'incompleteTables',
          'unexpectedStream',
        ].map((outcome) => attempt({ outcome })),
        difference: difference(),
      }),
    ),
  )

  assert.deepEqual(
    (await proposal()).failures.map(({ failure }) => failure),
    [UNEXPECTED_STREAM, INCOMPLETE_TABLES, LOCKED_WITHOUT_DATA, NO_LOCK],
  )
})

test('a stream mismatch without the stream it expected still names the one it received', async () => {
  replies.clear()
  progressOf(
    'scan-1',
    ok(
      progress({
        attempts: [
          attempt({
            outcome: 'unexpectedStream',
            observedTransportStreamId: 17,
          }),
          attempt({ outcome: 'unexpectedStream' }),
        ],
        difference: difference(),
      }),
    ),
  )

  assert.deepEqual(
    (await proposal()).failures.map(({ streamMismatch }) => streamMismatch),
    [undefined, '期待 TSID — / 受信 TSID 17'],
  )
})

test('a proposal that cannot be opened says why', async () => {
  replies.clear()
  progressOf('scan-1', { status: 401 })
  assert.deepEqual(await getScanProposal('scan-1'), {
    state: 'unauthenticated',
  })

  progressOf('scan-1', refusing(404))
  assert.deepEqual(await getScanProposal('scan-1'), { state: 'missing' })

  progressOf('scan-1', refusing(500))
  assert.deepEqual(await getScanProposal('scan-1'), {
    state: 'unavailable',
    message: 'スキャンの状況を読み取れませんでした(500)。',
  })

  progressOf('scan-1', { status: 502 })
  assert.deepEqual(await getScanProposal('scan-1'), {
    state: 'unavailable',
    message: 'スキャンの状況を読み取れませんでした(502)。',
  })

  progressOf('scan-1', ok(progress()))
  assert.deepEqual(await getScanProposal('scan-1'), { state: 'gone' })
})

test('a scan is started over the systems asked for', async () => {
  replies.clear()
  sent.length = 0
  replies.set('POST /api/tuners/scan', ok({ scanId: 'scan-9' }))

  assert.deepEqual(await startScan(['isdbT', 'isdbSBs']), {
    state: 'started',
    scanId: 'scan-9',
  })
  assert.deepEqual(sent, [
    {
      method: 'POST',
      path: '/api/tuners/scan',
      body: { systems: ['isdbT', 'isdbSBs'] },
    },
  ])
})

test('a scan refused because one is running points at the one that is', async () => {
  replies.clear()
  replies.set(
    'POST /api/tuners/scan',
    refusing(409, { runningScanId: 'scan-running' }),
  )

  const refused = await startScan(['isdbT'])

  assert.equal(refused.state, 'refused')
  assert.equal(refused.state === 'refused' && refused.scanId, 'scan-running')

  replies.set('POST /api/tuners/scan', refusing(409))

  const blind = await startScan(['isdbT'])

  assert.equal(blind.state, 'refused')
  assert.equal(blind.state === 'refused' && blind.scanId, undefined)
})

test('a scan refused for want of a tuner, or for anything else, is rejected with a reason', async () => {
  replies.clear()
  replies.set('POST /api/tuners/scan', refusing(503))

  const busy = await startScan(['isdbT'])

  assert.equal(busy.state, 'rejected')
  assert.match(
    busy.state === 'rejected' ? busy.message : '',
    /チューナーが空いていません/,
  )

  replies.set('POST /api/tuners/scan', refusing(500))

  assert.deepEqual(await startScan(['isdbT']), {
    state: 'rejected',
    message: 'スキャンを開始できませんでした(500)。',
  })
})

test('a scan the API says it started without naming it is not taken as started', async () => {
  replies.clear()
  replies.set('POST /api/tuners/scan', ok(null))

  await assert.rejects(
    startScan(['isdbT']),
    /POST \/api\/tuners\/scan answered 200/,
  )
})

const WRITES: {
  name: string
  call: () => Promise<unknown>
  sent: Sent
  refusals: Record<number, RegExp>
  fallback: string
}[] = [
  {
    name: 'cancelling a scan',
    call: () => cancelScan('scan-1'),
    sent: { method: 'POST', path: '/api/tuners/scan/scan-1/cancel' },
    refusals: { 404: /すでに終わっている/, 409: /すでに終わっている/ },
    fallback: 'スキャンをキャンセルできませんでした。',
  },
  {
    name: 'applying a scan',
    call: () => applyScan('scan-1'),
    sent: { method: 'POST', path: '/api/tuners/scan/scan-1/apply' },
    refusals: {
      404: /残っていない/,
      409: /別の保存が処理しています/,
      410: /もう保持されていない/,
    },
    fallback: 'スキャンの結果を保存できませんでした。',
  },
  {
    name: 'adding a candidate channel',
    call: () =>
      addCandidateChannel('50001-1024', {
        system: 'isdbT',
        physicalChannel: 55,
      }),
    sent: {
      method: 'POST',
      path: '/api/services/50001-1024/candidate-channels',
      body: {
        tuning: {
          system: 'isdbT',
          physicalChannel: 55,
          transportStreamId: null,
        },
      },
    },
    refusals: {
      400: /物理チャンネルの指定/,
      404: /サービスが見つからない/,
      409: /すでに候補として登録されています/,
      422: /受信できるチューナーがない/,
      503: /driver に接続できない/,
    },
    fallback: '候補チャンネルを追加できませんでした。',
  },
  {
    name: 'deleting a candidate channel',
    call: () => deleteCandidateChannel('50001-1024', 'candidate-55'),
    sent: {
      method: 'DELETE',
      path: '/api/services/50001-1024/candidate-channels/candidate-55',
    },
    refusals: { 404: /残っていない/, 409: /別のサービスのもの/ },
    fallback: '候補チャンネルを削除できませんでした。',
  },
  {
    name: 'selecting a candidate channel',
    call: () => selectCandidateChannel('50001-1024', 'candidate-55'),
    sent: {
      method: 'PUT',
      path: '/api/services/50001-1024/selected-channel',
      body: { candidateChannelId: 'candidate-55' },
    },
    refusals: { 404: /見つからない/, 409: /選局先にできない/ },
    fallback: '選局先を切り替えられませんでした。',
  },
]

for (const write of WRITES) {
  test(`${write.name} goes to its own address and is answered ok`, async () => {
    replies.clear()
    sent.length = 0
    replies.set(`${write.sent.method} ${write.sent.path}`, ok(null))

    assert.deepEqual(await write.call(), { state: 'ok' })
    assert.deepEqual(sent, [write.sent])
  })

  test(`${write.name} reads each refusal the API sends into its own reason`, async () => {
    const key = `${write.sent.method} ${write.sent.path}`

    replies.clear()

    for (const [status, reason] of Object.entries(write.refusals)) {
      replies.set(key, refusing(Number(status)))

      const refused = await write.call()

      assert.ok(
        typeof refused === 'object' &&
          refused !== null &&
          'state' in refused &&
          refused.state === 'rejected' &&
          'message' in refused &&
          typeof refused.message === 'string' &&
          reason.test(refused.message),
        `${status} was not read as ${reason}: ${JSON.stringify(refused)}`,
      )
    }

    replies.set(key, refusing(500))
    assert.deepEqual(await write.call(), {
      state: 'rejected',
      message: `${write.fallback}(500)`,
    })

    replies.set(key, { status: 401 })
    assert.deepEqual(await write.call(), { state: 'unauthenticated' })
  })
}

test('a candidate named with the stream it carries sends that stream, and clearing the choice sends none', async () => {
  replies.clear()
  sent.length = 0
  replies.set('POST /api/services/50001-2048/candidate-channels', ok(null))
  replies.set('PUT /api/services/50001-2048/selected-channel', ok(null))

  await addCandidateChannel('50001-2048', {
    system: 'isdbSBs',
    physicalChannel: 1,
    transportStreamId: 16,
  })
  await selectCandidateChannel('50001-2048', null)

  assert.deepEqual(
    sent.map(({ body }) => body),
    [
      {
        tuning: {
          system: 'isdbSBs',
          physicalChannel: 1,
          transportStreamId: 16,
        },
      },
      { candidateChannelId: null },
    ],
  )
})
